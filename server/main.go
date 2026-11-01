// KICKSTART UP 현장 모드: 인터넷 없이 노트북 한 대로 대회를 운영하는 작은 서버.
// 노트북이 데이터를 보관하고, 공유기 와이파이로 접속한 운영석·심판·전광판이 실시간으로 같은 데이터를 봅니다.
package main

import (
	"bytes"
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log"
	"mime"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

//go:embed assets
var assets embed.FS

var version = "1.4.7" // 빌드할 때 -ldflags "-X main.version=…" 로 바꿀 수 있음

type appInfo struct {
	Key   string `json:"key"`
	Title string `json:"title"`
	File  string `json:"-"`
}

var apps = []appInfo{
	{"poomsae", "품새 대회", "assets/apps/poomsae.html"},
	{"gyeokpa", "격파 대회", "assets/apps/gyeokpa.html"},
	{"kyorugi", "겨루기 대회", "assets/apps/kyorugi.html"},
}

var (
	baseDir    string
	dataDir    string
	resultsDir string
	port       int
	stores     = map[string]*Store{}
)

func main() {
	setupConsole()
	exe, err := os.Executable()
	if err != nil {
		exe = "."
	}
	baseDir = filepath.Dir(exe)
	if v := os.Getenv("KS_FIELD_DIR"); v != "" {
		baseDir = v
	}
	dataDir = filepath.Join(baseDir, "현장모드_데이터")
	resultsDir = filepath.Join(baseDir, "대회결과")
	_ = os.MkdirAll(dataDir, 0o755)
	_ = os.MkdirAll(resultsDir, 0o755)
	setupVoiceDir()
	logf, _ := os.OpenFile(filepath.Join(dataDir, "기록.log"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	if logf != nil {
		log.SetOutput(io.MultiWriter(logf, io.Discard))
	}

	var avail []appInfo
	for _, a := range apps {
		if _, err := fs.Stat(assets, a.File); err == nil {
			avail = append(avail, a)
			stores[a.Key] = openStore(a.Key)
		}
	}
	apps = avail
	stores["hq"] = openStore("hq")
	loadConfig()

	if checkForUpdate(exe) {
		return // 새 버전이 이어서 실행됩니다
	}

	ln, p, existing := listen()
	if existing {
		fmt.Println("현장 모드가 이미 켜져 있습니다. 브라우저를 엽니다.")
		openBrowser(fmt.Sprintf("http://localhost:%d/", p))
		time.Sleep(2 * time.Second)
		return
	}
	port = p
	keepAwake()
	startNode()

	mux := http.NewServeMux()
	mux.HandleFunc("/", handleRoot)
	srv := &http.Server{Handler: mux, ReadHeaderTimeout: 10 * time.Second}

	printBanner()
	go func() {
		time.Sleep(600 * time.Millisecond)
		if os.Getenv("KS_NO_BROWSER") == "" {
			openBrowser(fmt.Sprintf("http://localhost:%d/", port))
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sig
		for _, s := range stores {
			s.flush()
		}
		os.Exit(0)
	}()
	go func() {
		t := time.NewTicker(2 * time.Second)
		for range t.C {
			for _, s := range stores {
				s.flushIfDirty()
				s.expireGhosts()
			}
		}
	}()
	if err := srv.Serve(ln); err != nil && !errors.Is(err, http.ErrServerClosed) {
		fmt.Println("서버 오류:", err)
		pause()
	}
}

// 8080부터 비어 있는 포트를 찾습니다. 이미 현장 모드가 켜져 있으면 그 포트를 알려 줍니다.
func listen() (net.Listener, int, bool) {
	start := 8080
	if v := os.Getenv("KS_FIELD_PORT"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			start = n
		}
	}
	for p := start; p < start+20; p++ {
		ln, err := net.Listen("tcp", fmt.Sprintf(":%d", p))
		if err == nil {
			return ln, p, false
		}
		c := http.Client{Timeout: 800 * time.Millisecond}
		if r, err := c.Get(fmt.Sprintf("http://127.0.0.1:%d/__ks", p)); err == nil {
			b, _ := io.ReadAll(r.Body)
			r.Body.Close()
			if strings.Contains(string(b), "KICKSTART") {
				return nil, p, true
			}
		}
	}
	fmt.Println("사용할 수 있는 포트를 찾지 못했습니다 (8080~8099).")
	pause()
	os.Exit(1)
	return nil, 0, false
}

func printBanner() {
	ips := lanIPs()
	line := strings.Repeat("━", 52)
	fmt.Println(line)
	fmt.Println("  KICKSTART UP 현장 모드  v" + version + "   [" + roleLabel(getConfig()) + "]")
	if n := justUpdatedNote(); n != "" {
		fmt.Println("  ✓ " + n)
	} else if updateNote != "" {
		fmt.Println("  업데이트: " + updateNote)
	}
	fmt.Println("  인터넷 없이 이 노트북 한 대로 대회를 운영합니다.")
	fmt.Println(line)
	fmt.Println()
	fmt.Printf("  운영석(이 노트북):  http://localhost:%d/\n", port)
	if len(ips) == 0 {
		fmt.Println("  ⚠ 와이파이(공유기)에 연결되어 있지 않습니다.")
		fmt.Println("    공유기 와이파이에 연결한 뒤 이 창을 닫고 다시 실행해 주세요.")
	} else {
		for i, ip := range ips {
			lbl := "  심판·전광판 주소: "
			if i > 0 {
				lbl = "  (다른 주소)      "
			}
			fmt.Printf("%shttp://%s:%d/\n", lbl, ip, port)
		}
	}
	fmt.Println()
	fmt.Println("  • 심판 휴대폰은 같은 공유기 와이파이에 연결한 뒤,")
	fmt.Println("    운영석 화면의 QR코드를 찍으면 바로 열립니다.")
	fmt.Println("  • 대회 데이터:  " + dataDir)
	fmt.Println("  • 결과 파일:    " + resultsDir)
	fmt.Println()
	fmt.Println("  ※ 이 검은 창을 닫으면 현장 모드가 멈춥니다. 대회 중에는 열어 두세요.")
	fmt.Println(line)
}

// ---------------- 라우팅 ----------------

func handleRoot(w http.ResponseWriter, r *http.Request) {
	p := r.URL.Path
	switch {
	case p == "/__ks":
		w.Write([]byte("KICKSTART field " + version))
		return
	case p == "/" || p == "/index.html":
		serveLanding(w, r)
		return
	case p == "/field.js":
		serveAsset(w, "assets/field.js", "application/javascript; charset=utf-8")
		return
	case strings.HasPrefix(p, "/vendor/"):
		serveAsset(w, "assets"+p, "")
		return
	case p == "/api/node":
		handleNode(w, r)
		return
	case p == "/view" || p == "/view/":
		serveAsset(w, "assets/view.html", "text/html; charset=utf-8")
		return
	case p == "/view.js":
		serveAsset(w, "assets/view.js", "application/javascript; charset=utf-8")
		return
	case p == "/api/view":
		handleView(w, r)
		return
	case p == "/api/hqfeed":
		handleFeed(w, r)
		return
	case p == "/api/hqctl" && r.Method == http.MethodPost:
		handleHQCtl(w, r)
		return
	case strings.HasPrefix(p, "/voice/"):
		handleVoice(w, r)
		return
	case strings.HasPrefix(p, "/live/"):
		handleLive(w, r)
		return
	case p == "/guide" || p == "/guide/":
		serveAsset(w, "assets/guide.html", "text/html; charset=utf-8")
		return
	}
	parts := strings.SplitN(strings.TrimPrefix(p, "/"), "/", 3)
	key := parts[0]
	st, ok := stores[key]
	if !ok {
		http.NotFound(w, r)
		return
	}
	if len(parts) == 1 {
		http.Redirect(w, r, "/"+key+"/", http.StatusFound)
		return
	}
	if parts[1] == "" {
		serveApp(w, r, key)
		return
	}
	if parts[1] == "api" && len(parts) == 3 {
		st.api(w, r, parts[2])
		return
	}
	http.NotFound(w, r)
}

func serveAsset(w http.ResponseWriter, name, ctype string) {
	b, err := assets.ReadFile(name)
	if err != nil {
		http.Error(w, "not found", 404)
		return
	}
	if ctype == "" {
		ctype = mime.TypeByExtension(path.Ext(name))
		if strings.HasSuffix(name, ".woff2") {
			ctype = "font/woff2"
		}
		if ctype == "" {
			ctype = "application/octet-stream"
		}
	}
	w.Header().Set("Content-Type", ctype)
	if strings.HasPrefix(name, "assets/vendor/") {
		w.Header().Set("Cache-Control", "public, max-age=86400")
	} else {
		w.Header().Set("Cache-Control", "no-cache")
	}
	w.Write(b)
}

var (
	reFontLink = regexp.MustCompile(`<link rel="stylesheet" href="https://fonts\.googleapis\.com/[^"]*">`)
	rePrecon   = regexp.MustCompile(`<link rel="preconnect" href="https://fonts\.googleapis\.com">`)
)

const skeleton = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0B0D12"><style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style>`

func serveApp(w http.ResponseWriter, r *http.Request, key string) {
	var file string
	for _, a := range apps {
		if a.Key == key {
			file = a.File
		}
	}
	if key == "hq" {
		file = "assets/hq.html"
	}
	b, err := assets.ReadFile(file)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	html := string(b)
	html = strings.ReplaceAll(html, "https://cdnjs.cloudflare.com/ajax/libs/", "/vendor/cdnjs/")
	html = rePrecon.ReplaceAllString(html, "")
	html = reFontLink.ReplaceAllString(html, `<link rel="stylesheet" href="/vendor/fonts/fonts.css">`)

	host := r.Host
	h, _, _ := net.SplitHostPort(host)
	if h == "" {
		h = host
	}
	ips := lanIPs()
	isLocal := h == "localhost" || h == "127.0.0.1" || h == "::1"
	baseHost := host
	if isLocal && len(ips) > 0 {
		baseHost = fmt.Sprintf("%s:%d", ips[0], port)
	}
	cfg := map[string]any{
		"app":     key,
		"base":    "http://" + baseHost + "/" + key + "/",
		"ips":     ips,
		"port":    port,
		"local":   isLocal,
		"version": version,
		"dataDir": dataDir,
		"results": resultsDir,
		"role":    getConfig().Role,
		"court":   getConfig().Court,
	}
	cj, _ := json.Marshal(cfg)
	var out bytes.Buffer
	out.WriteString(skeleton)
	out.WriteString(`<script>window.KS_FIELD=` + string(cj) + `;</script><script src="/field.js"></script></head><body>`)
	out.WriteString(html)
	out.WriteString(`</body></html>`)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.Write(out.Bytes())
}

func serveLanding(w http.ResponseWriter, r *http.Request) {
	b, _ := assets.ReadFile("assets/landing.html")
	list, _ := json.Marshal(apps)
	s := strings.Replace(string(b), "__APPS__", string(list), 1)
	s = strings.Replace(s, "__VERSION__", version, 1)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.Write([]byte(s))
}

// ---------------- 데이터 저장소 ----------------

type lease struct {
	holder string
	until  time.Time
}

type client struct {
	id       string
	ch       chan []byte
	presence json.RawMessage
	done     chan struct{}
}

type Store struct {
	key     string
	mu      sync.Mutex
	docs    map[string]json.RawMessage
	seq     int64
	file    string
	dirty   bool
	clients map[string]*client
	leases  map[string]lease
	// 실시간 연결을 다른 화면과 나눠 쓰는 화면의 접속 표시 (6초마다 다시 알림, 20초 지나면 지움)
	ghosts map[string]ghost
}

type ghost struct {
	presence json.RawMessage
	until    time.Time
}

func openStore(key string) *Store {
	s := &Store{key: key, docs: map[string]json.RawMessage{}, clients: map[string]*client{}, leases: map[string]lease{}, ghosts: map[string]ghost{},
		file: filepath.Join(dataDir, key+".json")}
	if b, err := os.ReadFile(s.file); err == nil {
		var saved struct {
			Seq  int64                      `json:"seq"`
			Docs map[string]json.RawMessage `json:"docs"`
		}
		if json.Unmarshal(b, &saved) == nil && saved.Docs != nil {
			s.docs = saved.Docs
			s.seq = saved.Seq
		} else {
			// 파일이 깨졌으면 옆에 남겨 두고 새로 시작
			_ = os.Rename(s.file, s.file+".broken-"+time.Now().Format("20060102-150405"))
		}
	}
	return s
}

// 20초 동안 다시 알리지 않은 화면의 접속 표시를 지움
func (s *Store) expireGhosts() {
	s.mu.Lock()
	defer s.mu.Unlock()
	now, changed := time.Now(), false
	for id, g := range s.ghosts {
		if now.After(g.until) {
			delete(s.ghosts, id)
			changed = true
		}
	}
	if changed {
		s.broadcast(s.peersMsg())
	}
}

func (s *Store) flushIfDirty() {
	s.mu.Lock()
	d := s.dirty
	s.mu.Unlock()
	if d {
		s.flush()
	}
}

func (s *Store) flush() {
	s.mu.Lock()
	b, err := json.Marshal(map[string]any{"seq": s.seq, "docs": s.docs, "app": s.key, "savedAt": time.Now().Format(time.RFC3339)})
	s.dirty = false
	s.mu.Unlock()
	if err != nil {
		return
	}
	tmp := s.file + ".tmp"
	if err := os.WriteFile(tmp, b, 0o644); err == nil {
		if err := os.Rename(tmp, s.file); err != nil {
			// 윈도우에서 이름 바꾸기가 막히면 직접 덮어쓰기
			_ = os.WriteFile(s.file, b, 0o644)
			_ = os.Remove(tmp)
		}
	}
}

func validPath(p string) bool {
	if p == "" || len(p) > 300 || strings.Contains(p, "..") || strings.HasPrefix(p, "/") {
		return false
	}
	return true
}

func (s *Store) broadcast(msg []byte) {
	for id, c := range s.clients {
		select {
		case c.ch <- msg:
		default:
			// 너무 밀린 기기는 끊고 다시 접속하게 해서 처음부터 받게 함
			close(c.done)
			delete(s.clients, id)
		}
	}
}

func sse(event string, v any) []byte {
	b, _ := json.Marshal(v)
	return []byte("event: " + event + "\ndata: " + string(b) + "\n\n")
}

func (s *Store) peersMsg() []byte {
	type peer struct {
		ID       string          `json:"id"`
		Presence json.RawMessage `json:"presence"`
	}
	ps := []peer{}
	for _, c := range s.clients {
		if c.presence != nil {
			ps = append(ps, peer{c.id, c.presence})
		}
	}
	now := time.Now()
	for id, g := range s.ghosts {
		if _, live := s.clients[id]; !live && now.Before(g.until) {
			ps = append(ps, peer{id, g.presence})
		}
	}
	sort.Slice(ps, func(i, j int) bool { return ps[i].ID < ps[j].ID })
	return sse("peers", ps)
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

func readBody(r *http.Request, max int64, v any) error {
	b, err := io.ReadAll(io.LimitReader(r.Body, max))
	if err != nil {
		return err
	}
	return json.Unmarshal(b, v)
}

func (s *Store) api(w http.ResponseWriter, r *http.Request, op string) {
	switch op {
	case "events":
		s.events(w, r)
	case "get":
		p := r.URL.Query().Get("path")
		s.mu.Lock()
		d, ok := s.docs[p]
		s.mu.Unlock()
		if !ok {
			writeJSON(w, 200, map[string]any{"exists": false})
			return
		}
		writeJSON(w, 200, map[string]any{"exists": true, "data": d})
	case "put":
		var req struct {
			Path string          `json:"path"`
			Data json.RawMessage `json:"data"`
		}
		if err := readBody(r, 8<<20, &req); err != nil || !validPath(req.Path) || len(req.Data) == 0 {
			writeJSON(w, 400, map[string]any{"error": "invalid_argument"})
			return
		}
		s.mu.Lock()
		s.seq++
		s.docs[req.Path] = req.Data
		s.dirty = true
		s.broadcast(sse("chg", map[string]any{"seq": s.seq, "path": req.Path, "data": req.Data}))
		seq := s.seq
		s.mu.Unlock()
		writeJSON(w, 200, map[string]any{"ok": true, "seq": seq})
	case "del":
		var req struct {
			Path string `json:"path"`
		}
		if err := readBody(r, 1<<16, &req); err != nil || !validPath(req.Path) {
			writeJSON(w, 400, map[string]any{"error": "invalid_argument"})
			return
		}
		s.mu.Lock()
		s.seq++
		delete(s.docs, req.Path)
		s.dirty = true
		s.broadcast(sse("chg", map[string]any{"seq": s.seq, "path": req.Path, "data": nil}))
		seq := s.seq
		s.mu.Unlock()
		writeJSON(w, 200, map[string]any{"ok": true, "seq": seq})
	case "acquire":
		var req struct {
			Path   string `json:"path"`
			Holder string `json:"holder"`
			TTL    int64  `json:"ttlMs"`
		}
		if err := readBody(r, 1<<16, &req); err != nil || !validPath(req.Path) {
			writeJSON(w, 400, map[string]any{"error": "invalid_argument"})
			return
		}
		if req.TTL <= 0 || req.TTL > 60000 {
			req.TTL = 3000
		}
		now := time.Now()
		s.mu.Lock()
		l, ok := s.leases[req.Path]
		acq := !ok || l.until.Before(now) || l.holder == req.Holder
		if acq {
			s.leases[req.Path] = lease{req.Holder, now.Add(time.Duration(req.TTL) * time.Millisecond)}
		}
		holder := s.leases[req.Path].holder
		s.mu.Unlock()
		writeJSON(w, 200, map[string]any{"acquired": acq, "holder": holder})
	case "presence":
		var req struct {
			CID      string          `json:"cid"`
			Presence json.RawMessage `json:"presence"`
		}
		if err := readBody(r, 1<<16, &req); err != nil {
			writeJSON(w, 400, map[string]any{"error": "invalid_argument"})
			return
		}
		s.mu.Lock()
		c, ok := s.clients[req.CID]
		if ok {
			c.presence = req.Presence
			s.broadcast(s.peersMsg())
		} else if req.CID != "" {
			// 실시간 연결을 나눠 쓰는 화면: 따로 기억해 두고 20초 동안 접속으로 표시
			old, had := s.ghosts[req.CID]
			had = had && string(old.presence) == string(req.Presence)
			if len(req.Presence) == 0 || string(req.Presence) == "null" {
				delete(s.ghosts, req.CID)
			} else if len(s.ghosts) < 500 {
				s.ghosts[req.CID] = ghost{presence: req.Presence, until: time.Now().Add(20 * time.Second)}
			}
			if !had || len(req.Presence) == 0 || string(req.Presence) == "null" {
				s.broadcast(s.peersMsg())
			}
			ok = true
		}
		s.mu.Unlock()
		writeJSON(w, 200, map[string]any{"ok": ok})
	case "save":
		name := sanitizeName(r.URL.Query().Get("name"))
		if name == "" {
			writeJSON(w, 400, map[string]any{"error": "invalid_argument"})
			return
		}
		b, err := io.ReadAll(io.LimitReader(r.Body, 100<<20))
		if err != nil {
			writeJSON(w, 400, map[string]any{"error": "read"})
			return
		}
		dir := filepath.Join(resultsDir, time.Now().Format("2006-01-02"))
		if r.URL.Query().Get("folder") == "video" { // 영상 판독 저장: 프로그램 폴더의 「판독영상」/날짜
			dir = filepath.Join(baseDir, "판독영상", time.Now().Format("2006-01-02"))
		}
		_ = os.MkdirAll(dir, 0o755)
		full := uniqueName(filepath.Join(dir, name))
		if err := os.WriteFile(full, b, 0o644); err != nil {
			writeJSON(w, 500, map[string]any{"error": "write"})
			return
		}
		writeJSON(w, 200, map[string]any{"ok": true, "path": full, "dir": dir})
	case "info":
		writeJSON(w, 200, map[string]any{"version": version, "ips": lanIPs(), "port": port, "dataDir": dataDir, "results": resultsDir, "time": time.Now().UnixMilli()})
	case "ping":
		writeJSON(w, 200, map[string]any{"ok": true, "time": time.Now().UnixMilli()})
	default:
		http.NotFound(w, r)
	}
}

var badName = regexp.MustCompile(`[\\/:*?"<>|\x00-\x1f]`)

func sanitizeName(n string) string {
	n = badName.ReplaceAllString(strings.TrimSpace(n), "_")
	n = strings.Trim(n, ". ")
	if len([]rune(n)) > 150 {
		r := []rune(n)
		n = string(r[len(r)-150:])
	}
	return n
}

func uniqueName(p string) string {
	if _, err := os.Stat(p); err != nil {
		return p
	}
	ext := filepath.Ext(p)
	base := strings.TrimSuffix(p, ext)
	for i := 2; i < 1000; i++ {
		q := fmt.Sprintf("%s (%d)%s", base, i, ext)
		if _, err := os.Stat(q); err != nil {
			return q
		}
	}
	return p
}

func (s *Store) events(w http.ResponseWriter, r *http.Request) {
	fl, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "stream unsupported", 500)
		return
	}
	cid := r.URL.Query().Get("cid")
	if cid == "" {
		cid = strconv.FormatInt(time.Now().UnixNano(), 36)
	}
	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	c := &client{id: cid, ch: make(chan []byte, 512), done: make(chan struct{})}
	s.mu.Lock()
	if old, ok := s.clients[cid]; ok {
		c.presence = old.presence
		close(old.done)
	}
	s.clients[cid] = c
	init := sse("init", map[string]any{"seq": s.seq, "docs": s.docs, "cid": cid})
	peers := s.peersMsg()
	s.broadcast(peers)
	s.mu.Unlock()

	w.Write([]byte("retry: 1500\n\n"))
	w.Write(init)
	fl.Flush()

	ka := time.NewTicker(4 * time.Second)
	defer ka.Stop()
	defer func() {
		s.mu.Lock()
		if cur, ok := s.clients[cid]; ok && cur == c {
			delete(s.clients, cid)
			s.broadcast(s.peersMsg())
		}
		s.mu.Unlock()
	}()
	for {
		select {
		case <-r.Context().Done():
			return
		case <-c.done:
			return
		case m := <-c.ch:
			if _, err := w.Write(m); err != nil {
				return
			}
			// 밀린 메시지를 한 번에 보냄
			for n := len(c.ch); n > 0; n-- {
				if _, err := w.Write(<-c.ch); err != nil {
					return
				}
			}
			fl.Flush()
		case t := <-ka.C:
			if _, err := w.Write([]byte("event: ka\ndata: " + strconv.FormatInt(t.Unix(), 10) + "\n\n")); err != nil {
				return
			}
			fl.Flush()
		}
	}
}

// ---------------- 네트워크 주소 ----------------

// 공유기에서 받은 주소(192.168.x.x 등)를 앞에 둡니다. 가상 어댑터는 뒤로.
func lanIPs() []string {
	type cand struct {
		ip    string
		score int
	}
	var cs []cand
	ifs, _ := net.Interfaces()
	for _, ifc := range ifs {
		if ifc.Flags&net.FlagUp == 0 || ifc.Flags&net.FlagLoopback != 0 {
			continue
		}
		name := strings.ToLower(ifc.Name)
		virtual := strings.Contains(name, "vethernet") || strings.Contains(name, "virtualbox") || strings.Contains(name, "vmware") ||
			strings.Contains(name, "docker") || strings.Contains(name, "wsl") || strings.HasPrefix(name, "veth") || strings.HasPrefix(name, "br-")
		addrs, _ := ifc.Addrs()
		for _, a := range addrs {
			ipn, ok := a.(*net.IPNet)
			if !ok {
				continue
			}
			ip := ipn.IP.To4()
			if ip == nil || ip.IsLinkLocalUnicast() {
				continue
			}
			sc := 1
			switch {
			case ip[0] == 192 && ip[1] == 168:
				sc = 5
			case ip[0] == 10:
				sc = 4
			case ip[0] == 172 && ip[1] >= 16 && ip[1] <= 31:
				sc = 3
			}
			if virtual {
				sc -= 3
			}
			cs = append(cs, cand{ip.String(), sc})
		}
	}
	sort.SliceStable(cs, func(i, j int) bool { return cs[i].score > cs[j].score })
	out := []string{}
	for _, c := range cs {
		out = append(out, c.ip)
	}
	return out
}
