// 코트 노트북 ↔ 본부 노트북 연동
//   - 역할: 노트북마다 「코트 A·B·C…」 또는 「본부」를 고릅니다 (현장모드_데이터/설정.json).
//   - 코트: 2초마다 같은 와이파이에 "나 A코트예요" 신호(UDP)를 보내고, 본부가 물으면 진행 상황(hqfeed)을 알려 줍니다.
//   - 본부: 신호를 듣거나(자동), 와이파이 주소를 훑어 찾거나(예비), 직접 넣은 주소로 코트를 찾아 2초마다 진행 상황을 모읍니다.
//     코트가 새 부문을 시작하면 「다음 부문 준비」 호출을 자동으로 만듭니다.
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

const beaconPort = 47800

type nodeConfig struct {
	Role  string `json:"role"`  // "court" | "hq" | ""
	Court string `json:"court"` // "A" …
	// 자동 업데이트: 비워 두면 켜짐. "꺼짐"/"off"/"false" 이면 끔 (설정.json에서 바꿈)
	AutoUpdate string `json:"autoUpdate,omitempty"`
	// 유튜브 생중계: 스트림 키(이 노트북에만 저장)와 송출 주소(비우면 유튜브 기본)
	LiveKey string `json:"liveKey,omitempty"`
	LiveURL string `json:"liveUrl,omitempty"`
}

func (c nodeConfig) autoUpdate() bool {
	v := strings.ToLower(strings.TrimSpace(c.AutoUpdate))
	return !(v == "꺼짐" || v == "off" || v == "false" || v == "no")
}

var (
	cfgMu sync.Mutex
	cfg   nodeConfig
)

func cfgFile() string { return filepath.Join(dataDir, "설정.json") }

func loadConfig() {
	b, err := os.ReadFile(cfgFile())
	if err == nil {
		_ = json.Unmarshal(b, &cfg)
	}
	if v := os.Getenv("KS_ROLE"); v != "" { // 시험용
		parts := strings.SplitN(v, ":", 2)
		cfg.Role = parts[0]
		if len(parts) > 1 {
			cfg.Court = parts[1]
		}
	}
}

func getConfig() nodeConfig {
	cfgMu.Lock()
	defer cfgMu.Unlock()
	return cfg
}

func setConfig(c nodeConfig) {
	cfgMu.Lock()
	cfg = c
	cfgMu.Unlock()
	b, _ := json.MarshalIndent(c, "", "  ")
	_ = os.WriteFile(cfgFile(), b, 0o644)
}

func validCourt(c string) bool {
	return len(c) == 1 && c[0] >= 'A' && c[0] <= 'H'
}

// ---------------- 노트북 정보 / 설정 ----------------

func isLocalReq(r *http.Request) bool {
	h, _, _ := net.SplitHostPort(r.RemoteAddr)
	ip := net.ParseIP(h)
	return ip != nil && ip.IsLoopback()
}

func handleNode(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		if !isLocalReq(r) {
			writeJSON(w, 403, map[string]any{"error": "이 노트북에서만 바꿀 수 있습니다"})
			return
		}
		var req nodeConfig
		if err := readBody(r, 1<<12, &req); err != nil || (req.Role != "court" && req.Role != "hq") || (req.Role == "court" && !validCourt(req.Court)) {
			writeJSON(w, 400, map[string]any{"error": "invalid_argument"})
			return
		}
		if req.Role == "hq" {
			req.Court = ""
		}
		old := getConfig()
		req.AutoUpdate = old.AutoUpdate // 업데이트 설정은 그대로 둠
		req.LiveKey, req.LiveURL = old.LiveKey, old.LiveURL
		setConfig(req)
		fmt.Printf("\n  역할을 바꿨습니다: %s\n", roleLabel(req))
	}
	c := getConfig()
	appKeys := []string{}
	for _, a := range apps {
		appKeys = append(appKeys, a.Key)
	}
	writeJSON(w, 200, map[string]any{"sig": "KICKSTART", "version": version, "role": c.Role, "court": c.Court, "port": port, "ips": lanIPs(), "apps": appKeys, "label": roleLabel(c)})
}

func roleLabel(c nodeConfig) string {
	switch c.Role {
	case "court":
		return c.Court + "코트"
	case "hq":
		return "본부"
	}
	return "역할 미정"
}

// 코트: 본부가 가져가는 진행 상황 (각 종목 운영석이 올린 hq/board · hq/results)
func handleFeed(w http.ResponseWriter, r *http.Request) {
	c := getConfig()
	out := map[string]any{}
	for _, a := range apps {
		s := stores[a.Key]
		if s == nil {
			continue
		}
		s.mu.Lock()
		b, okb := s.docs["hq/board"]
		res, okr := s.docs["hq/results"]
		s.mu.Unlock()
		if okb || okr {
			m := map[string]any{}
			if okb {
				m["board"] = b
			}
			if okr {
				m["results"] = res
			}
			out[a.Key] = m
		}
	}
	writeJSON(w, 200, map[string]any{"sig": "KICKSTART", "version": version, "role": c.Role, "court": c.Court, "port": port, "apps": out, "live": live.status(), "time": time.Now().UnixMilli()})
}

// ---------------- 코트: 신호 보내기 ----------------

func broadcastAddrs() []string {
	out := []string{"255.255.255.255"}
	ifs, _ := net.Interfaces()
	for _, ifc := range ifs {
		if ifc.Flags&net.FlagUp == 0 || ifc.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, _ := ifc.Addrs()
		for _, a := range addrs {
			ipn, ok := a.(*net.IPNet)
			if !ok {
				continue
			}
			ip := ipn.IP.To4()
			if ip == nil || len(ipn.Mask) < 4 {
				continue
			}
			m := ipn.Mask[len(ipn.Mask)-4:]
			b := net.IPv4(ip[0]|^m[0], ip[1]|^m[1], ip[2]|^m[2], ip[3]|^m[3])
			out = append(out, b.String())
		}
	}
	return out
}

func beaconLoop() {
	for {
		c := getConfig()
		if c.Role == "court" {
			msg, _ := json.Marshal(map[string]any{"sig": "KICKSTART", "role": "court", "court": c.Court, "port": port, "version": version})
			for _, a := range broadcastAddrs() {
				if conn, err := net.Dial("udp4", fmt.Sprintf("%s:%d", a, beaconPort)); err == nil {
					_, _ = conn.Write(msg)
					conn.Close()
				}
			}
		}
		time.Sleep(2 * time.Second)
	}
}

// ---------------- 본부: 코트 찾기·모으기 ----------------

type courtEntry struct {
	addr      string // ip:port
	via       string // beacon | scan | manual
	court     string
	online    bool
	lastSeen  time.Time
	lastFeed  json.RawMessage
	lastLive  []byte
	curDiv    map[string]string // app -> 현재 부문
	announced map[string]time.Time
	written   bool
}

var (
	hqMu    sync.Mutex
	courts  = map[string]*courtEntry{}
	httpCli = &http.Client{Timeout: 1500 * time.Millisecond}
)

func addCourt(addr, via string) {
	hqMu.Lock()
	defer hqMu.Unlock()
	if _, ok := courts[addr]; ok {
		return
	}
	courts[addr] = &courtEntry{addr: addr, via: via, curDiv: map[string]string{}, announced: map[string]time.Time{}}
	go pollCourt(addr) // 바로 한 번
}

func listenBeacons() {
	pc, err := net.ListenPacket("udp4", fmt.Sprintf(":%d", beaconPort))
	if err != nil {
		fmt.Println("  (자동 찾기 신호를 받을 수 없습니다. 와이파이 주소 훑기로 찾습니다)")
		return
	}
	buf := make([]byte, 2048)
	for {
		n, from, err := pc.ReadFrom(buf)
		if err != nil {
			continue
		}
		var m struct {
			Sig   string `json:"sig"`
			Role  string `json:"role"`
			Court string `json:"court"`
			Port  int    `json:"port"`
		}
		if json.Unmarshal(buf[:n], &m) != nil || m.Sig != "KICKSTART" || m.Role != "court" || m.Port == 0 {
			continue
		}
		ua, ok := from.(*net.UDPAddr)
		if !ok {
			continue
		}
		if getConfig().Role == "hq" {
			addCourt(fmt.Sprintf("%s:%d", ua.IP.String(), m.Port), "beacon")
		}
	}
}

// 신호가 막힌 공유기(AP 격리 등)를 대비해 같은 와이파이 주소를 훑어 코트를 찾습니다.
func scanLoop() {
	time.Sleep(3 * time.Second)
	for {
		if getConfig().Role == "hq" {
			scanOnce()
		}
		hqMu.Lock()
		n := 0
		for _, c := range courts {
			if c.online {
				n++
			}
		}
		hqMu.Unlock()
		if n == 0 {
			time.Sleep(15 * time.Second)
		} else {
			time.Sleep(45 * time.Second)
		}
	}
}

func scanOnce() {
	own := map[string]bool{}
	for _, ip := range lanIPs() {
		own[ip] = true
	}
	type target struct{ addr string }
	targets := []string{}
	for _, ip := range lanIPs() {
		p := net.ParseIP(ip).To4()
		if p == nil {
			continue
		}
		for h := 1; h < 255; h++ {
			host := fmt.Sprintf("%d.%d.%d.%d", p[0], p[1], p[2], h)
			hi := 8082
			if own[host] {
				hi = 8099 // 같은 노트북에서 여러 개를 켠 경우
			}
			for pt := 8080; pt <= hi; pt++ {
				if own[host] && pt == port {
					continue
				}
				targets = append(targets, fmt.Sprintf("%s:%d", host, pt))
			}
		}
		break // 대표 주소 하나만 (가상 어댑터 제외)
	}
	cli := &http.Client{Timeout: 450 * time.Millisecond}
	sem := make(chan struct{}, 96)
	var wg sync.WaitGroup
	for _, t := range targets {
		hqMu.Lock()
		_, known := courts[t]
		hqMu.Unlock()
		if known {
			continue
		}
		wg.Add(1)
		sem <- struct{}{}
		go func(addr string) {
			defer wg.Done()
			defer func() { <-sem }()
			resp, err := cli.Get("http://" + addr + "/api/node")
			if err != nil {
				return
			}
			defer resp.Body.Close()
			var m struct {
				Sig  string `json:"sig"`
				Role string `json:"role"`
			}
			if json.NewDecoder(io.LimitReader(resp.Body, 1<<16)).Decode(&m) == nil && m.Sig == "KICKSTART" && m.Role == "court" {
				addCourt(addr, "scan")
			}
		}(t)
	}
	wg.Wait()
}

func manualAddrs() []string {
	s := stores["hq"]
	s.mu.Lock()
	b := s.docs["hqcfg/main"]
	s.mu.Unlock()
	var m struct {
		Manual []string `json:"manual"`
	}
	_ = json.Unmarshal(b, &m)
	return m.Manual
}

func normAddr(a string) string {
	a = strings.TrimSpace(a)
	a = strings.TrimPrefix(a, "http://")
	a = strings.TrimSuffix(strings.SplitN(a, "/", 2)[0], "/")
	if a == "" {
		return ""
	}
	if !strings.Contains(a, ":") {
		a += ":8080"
	}
	return a
}

func pollLoop() {
	for {
		if getConfig().Role == "hq" {
			for _, a := range manualAddrs() {
				if n := normAddr(a); n != "" {
					addCourt(n, "manual")
				}
			}
			hqMu.Lock()
			addrs := []string{}
			for a := range courts {
				addrs = append(addrs, a)
			}
			hqMu.Unlock()
			var wg sync.WaitGroup
			for _, a := range addrs {
				wg.Add(1)
				go func(a string) { defer wg.Done(); pollCourt(a) }(a)
			}
			wg.Wait()
		}
		time.Sleep(2 * time.Second)
	}
}

type feedMsg struct {
	Sig   string                     `json:"sig"`
	Role  string                     `json:"role"`
	Court string                     `json:"court"`
	Apps  map[string]json.RawMessage `json:"apps"`
	Live  struct {
		On    bool   `json:"on"`
		State string `json:"state"`
		App   string `json:"app"`
		Err   string `json:"err"`
		Slow  bool   `json:"slow"`
		Since int64  `json:"since"`
	} `json:"live"`
}

func pollCourt(addr string) {
	ctx, cancel := context.WithTimeout(context.Background(), 1800*time.Millisecond)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, "GET", "http://"+addr+"/api/hqfeed", nil)
	resp, err := httpCli.Do(req)
	var body []byte
	var fm feedMsg
	ok := false
	if err == nil {
		body, _ = io.ReadAll(io.LimitReader(resp.Body, 8<<20))
		resp.Body.Close()
		ok = resp.StatusCode == 200 && json.Unmarshal(body, &fm) == nil && fm.Sig == "KICKSTART" && fm.Role == "court"
	}
	hqMu.Lock()
	c, exists := courts[addr]
	if !exists {
		hqMu.Unlock()
		return
	}
	now := time.Now()
	changed := false
	var calls []map[string]any
	if ok {
		if !c.online {
			changed = true
		}
		c.online = true
		if c.court != fm.Court {
			changed = true
		}
		c.court = fm.Court
		lv, _ := json.Marshal(fm.Live)
		if !bytes.Equal(lv, c.lastLive) {
			changed = true
			c.lastLive = lv
		}
		apps, _ := json.Marshal(fm.Apps)
		if !bytes.Equal(apps, c.lastFeed) {
			changed = true
			c.lastFeed = apps
			// 새 부문을 시작하면 → 다음 부문 준비 호출
			for app, raw := range fm.Apps {
				var a struct {
					Board struct {
						CurDiv  string `json:"curDiv"`
						NextDiv string `json:"nextDiv"`
						AppName string `json:"appName"`
					} `json:"board"`
				}
				if json.Unmarshal(raw, &a) != nil {
					continue
				}
				prev, seen := c.curDiv[app]
				c.curDiv[app] = a.Board.CurDiv
				if seen && a.Board.CurDiv != "" && prev != a.Board.CurDiv && a.Board.NextDiv != "" && now.Sub(c.announced[app]) > 20*time.Second {
					c.announced[app] = now
					calls = append(calls, map[string]any{"court": c.court, "app": app, "appName": a.Board.AppName, "div": a.Board.NextDiv, "auto": true})
				}
			}
		}
		if now.Sub(c.lastSeen) > 10*time.Second {
			changed = true
		}
		c.lastSeen = now
	} else if c.online && now.Sub(c.lastSeen) > 5*time.Second {
		c.online = false
		changed = true
	}
	if !c.written {
		changed = true
		c.written = true
	}
	ls := int64(0)
	if !c.lastSeen.IsZero() {
		ls = c.lastSeen.UnixMilli()
	}
	doc := map[string]any{"addr": c.addr, "via": c.via, "court": c.court, "online": c.online, "lastSeen": ls, "apps": json.RawMessage(nonEmpty(c.lastFeed)), "live": json.RawMessage(nonEmpty(c.lastLive))}
	hqMu.Unlock()
	s := stores["hq"]
	if changed {
		s.setDoc("courts/"+strings.NewReplacer(".", "_", ":", "_").Replace(addr), doc)
	}
	for _, cl := range calls {
		autoCall(cl)
	}
}

func nonEmpty(b json.RawMessage) []byte {
	if len(b) == 0 {
		return []byte("{}")
	}
	return b
}

// 자동 호출: 본부 설정에서 꺼 두면 만들지 않음
func autoCall(cl map[string]any) {
	s := stores["hq"]
	s.mu.Lock()
	b := s.docs["hqcfg/main"]
	s.mu.Unlock()
	var m struct {
		AutoCall *bool `json:"autoCall"`
	}
	_ = json.Unmarshal(b, &m)
	if m.AutoCall != nil && !*m.AutoCall {
		return
	}
	text := fmt.Sprintf("%s코트, %s 선수는 준비해 주세요.", cl["court"], cl["div"])
	id := fmt.Sprintf("a%d", time.Now().UnixNano())
	s.setDoc("hq/announce", map[string]any{"id": id, "text": text, "court": cl["court"], "div": cl["div"], "app": cl["app"], "auto": true, "at": time.Now().UnixMilli()})
	s.setDoc("calllog/"+id, map[string]any{"text": text, "court": cl["court"], "auto": true, "at": time.Now().UnixMilli()})
}

// 서버 안에서 문서 저장 + 화면에 알림
func (s *Store) setDoc(path string, v any) {
	b, err := json.Marshal(v)
	if err != nil {
		return
	}
	s.mu.Lock()
	s.seq++
	s.docs[path] = b
	s.dirty = true
	s.broadcast(sse("chg", map[string]any{"seq": s.seq, "path": path, "data": json.RawMessage(b)}))
	s.mu.Unlock()
}

// 본부 운영 화면에서 코트를 목록에서 지우기
func forgetCourt(addr string) {
	hqMu.Lock()
	delete(courts, addr)
	hqMu.Unlock()
	s := stores["hq"]
	path := "courts/" + strings.NewReplacer(".", "_", ":", "_").Replace(addr)
	s.mu.Lock()
	s.seq++
	delete(s.docs, path)
	s.dirty = true
	s.broadcast(sse("chg", map[string]any{"seq": s.seq, "path": path, "data": nil}))
	s.mu.Unlock()
}

func handleHQCtl(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Op   string `json:"op"`
		Addr string `json:"addr"`
	}
	if err := readBody(r, 1<<12, &req); err != nil {
		writeJSON(w, 400, map[string]any{"error": "invalid_argument"})
		return
	}
	switch req.Op {
	case "forget":
		forgetCourt(req.Addr)
	case "scan":
		go scanOnce()
	case "add":
		if n := normAddr(req.Addr); n != "" {
			addCourt(n, "manual")
		}
	}
	writeJSON(w, 200, map[string]any{"ok": true})
}

func startNode() {
	go beaconLoop()
	go listenBeacons()
	go scanLoop()
	go pollLoop()
	// 본부: 처음 켤 때 지난번 코트 목록은 연결 끊김으로 표시 (새로 찾을 때까지)
	if s := stores["hq"]; s != nil {
		s.mu.Lock()
		keys := []string{}
		for k := range s.docs {
			if strings.HasPrefix(k, "courts/") {
				keys = append(keys, k)
			}
		}
		sort.Strings(keys)
		for _, k := range keys {
			var m map[string]any
			if json.Unmarshal(s.docs[k], &m) == nil {
				m["online"] = false
				b, _ := json.Marshal(m)
				s.docs[k] = b
				if a, ok := m["addr"].(string); ok {
					courts[a] = &courtEntry{addr: a, via: fmt.Sprint(m["via"]), court: fmt.Sprint(m["court"]), curDiv: map[string]string{}, announced: map[string]time.Time{}}
				}
			}
		}
		s.mu.Unlock()
	}
}
