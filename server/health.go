package main

// v1.4.57 대회 기기 상태
//   - 심판 태블릿 배터리: 심판 화면이 1분마다 POST /api/bat → 코트 → 본부(hqfeed 「bat」)
//   - 하드 남은 공간: hqfeed 「disk」 · 시작 전 점검표
//   - 프린터(본부): GET /api/printer — 기본 프린터 이름·오프라인·대기 중 인쇄 수 (윈도우)
//   - 하드 원인 찾기: GET /api/disk?scan=1 — 큰 폴더(임시 파일·브라우저 캐시·인쇄 대기열·다운로드·현장 프로그램) 크기
//   - 상장 파일(.cert.json) 정리: 가상 경기 초기화 때 · 7일 지난 것

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

type batInfo struct {
	ID       string  `json:"id"`
	App      string  `json:"app"`
	Seat     int     `json:"seat"`
	Level    float64 `json:"level"`
	Charging bool    `json:"charging"`
	At       int64   `json:"at"`
}

var (
	batMu sync.Mutex
	bats  = map[string]batInfo{}
)

// POST /api/bat {id, app, seat, level(0~1), charging}
func handleBat(w http.ResponseWriter, r *http.Request) {
	var b batInfo
	if err := readBody(r, 4096, &b); err != nil || b.ID == "" || len(b.ID) > 80 || b.Level < 0 || b.Level > 1 {
		writeJSON(w, 400, map[string]any{"error": "invalid_argument"})
		return
	}
	b.At = time.Now().UnixMilli()
	batMu.Lock()
	// 같은 자리(종목·심판 번호)를 다른 기기가 이어받으면 예전 기기는 지움
	for k, v := range bats {
		if k != b.ID && b.Seat > 0 && v.Seat == b.Seat && v.App == b.App {
			delete(bats, k)
		}
	}
	bats[b.ID] = b
	batMu.Unlock()
	writeJSON(w, 200, map[string]any{"ok": true})
}

// 5분 안에 알려 온 기기만, 심판 번호 순
func batList() []batInfo {
	now := time.Now().UnixMilli()
	batMu.Lock()
	out := []batInfo{}
	for k, v := range bats {
		if now-v.At > 5*60*1000 {
			delete(bats, k)
			continue
		}
		v.Level = float64(int(v.Level*100+0.5)) / 100
		out = append(out, v)
	}
	batMu.Unlock()
	sort.Slice(out, func(i, j int) bool {
		if out[i].Seat != out[j].Seat {
			return out[i].Seat < out[j].Seat
		}
		return out[i].ID < out[j].ID
	})
	return out
}

func diskNow() map[string]int64 {
	f, t := diskFree(baseDir)
	return map[string]int64{"free": f, "total": t}
}

// ---------- 프린터 ----------
var (
	prMu  sync.Mutex
	prAt  time.Time
	prVal map[string]any
)

func handlePrinter(w http.ResponseWriter, r *http.Request) {
	prMu.Lock()
	if prVal == nil || time.Since(prAt) > 30*time.Second {
		prVal = printerStatus()
		prAt = time.Now()
	}
	v := prVal
	prMu.Unlock()
	writeJSON(w, 200, v)
}

// ---------- 하드 원인 찾기 ----------
type scanItem struct {
	Name  string `json:"name"`
	Path  string `json:"path"`
	Size  int64  `json:"size"`
	Hint  string `json:"hint"`
	Clean bool   `json:"clean"` // 현장 프로그램이 직접 정리할 수 있는 곳
}

var (
	scMu    sync.Mutex
	scBusy  bool
	scAt    int64
	scItems []scanItem
)

// 시간 제한을 두고 폴더 크기 재기
func dirSizeLimit(p string, limit time.Duration) int64 {
	var n int64
	end := time.Now().Add(limit)
	_ = filepath.Walk(p, func(_ string, fi os.FileInfo, err error) error {
		if time.Now().After(end) {
			return filepath.SkipAll
		}
		if err == nil && !fi.IsDir() {
			n += fi.Size()
		}
		return nil
	})
	return n
}

func runScan() {
	var L []scanItem
	add := func(name, p, hint string, clean bool) {
		if p == "" {
			return
		}
		if _, err := os.Stat(p); err != nil {
			return
		}
		L = append(L, scanItem{name, p, dirSizeLimit(p, 20*time.Second), hint, clean})
	}
	add("현장 프로그램 · 대회결과(자동저장·본부수집·상장)", resultsDir, "상장 파일(.cert.json)이 가장 큽니다. 가상 경기 초기화나 「정리」로 지울 수 있습니다", true)
	add("현장 프로그램 · 데이터", dataDir, "경기 데이터와 상장 출력 창 캐시", false)
	for _, x := range scanPlaces() {
		add(x[0], x[1], x[2], false)
	}
	sort.Slice(L, func(i, j int) bool { return L[i].Size > L[j].Size })
	scMu.Lock()
	scItems, scAt, scBusy = L, time.Now().UnixMilli(), false
	scMu.Unlock()
}

// ---------- 상장 파일 정리 ----------
// all=true: 모두(가상 경기 초기화) · false: 7일 지난 것만
func cleanCerts(all bool) (int, int64) {
	n, sz := 0, int64(0)
	cut := time.Now().Add(-7 * 24 * time.Hour)
	_ = filepath.Walk(resultsDir, func(p string, fi os.FileInfo, err error) error {
		if err != nil || fi.IsDir() || !strings.HasSuffix(strings.ToLower(fi.Name()), ".cert.json") {
			return nil
		}
		if all || fi.ModTime().Before(cut) {
			if os.Remove(p) == nil {
				n++
				sz += fi.Size()
			}
		}
		return nil
	})
	return n, sz
}

// GET /api/disk?scan=1  ·  POST /api/disk/clean (상장 파일 모두 지우기, 이 노트북에서만)
func handleDiskScan(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		if !isLocalReq(r) {
			writeJSON(w, 403, map[string]any{"error": "local_only"})
			return
		}
		n, sz := cleanCerts(true)
		writeJSON(w, 200, map[string]any{"ok": true, "files": n, "bytes": sz})
		return
	}
	scMu.Lock()
	if !scBusy && (scAt == 0 || time.Now().UnixMilli()-scAt > 60*1000) {
		scBusy = true
		go runScan()
	}
	v := map[string]any{"busy": scBusy, "at": scAt, "items": scItems}
	scMu.Unlock()
	f, t := diskFree(baseDir)
	v["free"], v["total"] = f, t
	writeJSON(w, 200, v)
}

// ---------- 예비 노트북: 본부에 모인 이 코트 백업 가져오기 ----------
// 본부는 몇 초마다 코트의 /api/hqfeed 를 부르므로, 그 주소를 본부 주소로 기억해 둠.
var (
	hqSeenMu sync.Mutex
	hqSeen   string
)

func noteHQ(r *http.Request) {
	h := r.RemoteAddr
	if i := strings.LastIndex(h, ":"); i > 0 {
		h = h[:i]
	}
	h = strings.Trim(h, "[]")
	if h == "" || h == "127.0.0.1" || h == "::1" {
		return
	}
	hqSeenMu.Lock()
	hqSeen = h
	hqSeenMu.Unlock()
}

// POST /api/backup/fromhq — 본부의 「본부수집\X코트」에서 가장 최근 백업(자동저장).json 을 종목마다 받아
// 이 노트북 「대회결과\자동저장」에 「…_본부에서 받은 백업.json」으로 저장
func handleBackupFromHQ(w http.ResponseWriter, r *http.Request) {
	if !isLocalReq(r) {
		writeJSON(w, 403, map[string]any{"error": "local_only"})
		return
	}
	c := getConfig()
	if c.Court == "" {
		writeJSON(w, 400, map[string]any{"error": "먼저 첫 화면에서 코트를 골라 주세요"})
		return
	}
	hqSeenMu.Lock()
	h := hqSeen
	hqSeenMu.Unlock()
	if q := r.URL.Query().Get("hq"); q != "" {
		h = q
	}
	if h == "" {
		writeJSON(w, 400, map[string]any{"error": "아직 본부 노트북과 연결되지 않았습니다. 본부 「코트 연결」에서 이 노트북이 보이는지 확인해 주세요"})
		return
	}
	base := fmt.Sprintf("http://%s:%d", h, port)
	cli := &http.Client{Timeout: 20 * time.Second}
	resp, err := cli.Get(base + "/api/hq/collected")
	if err != nil {
		writeJSON(w, 502, map[string]any{"error": "본부 노트북에 연결하지 못했습니다"})
		return
	}
	var lst struct {
		Courts map[string][]fileInfo `json:"courts"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&lst)
	resp.Body.Close()
	folder := c.Court + "코트"
	best := map[string]fileInfo{}
	for _, f := range lst.Courts[folder] {
		if !strings.HasSuffix(f.Name, "_백업(자동저장).json") {
			continue
		}
		app := ""
		for _, a := range []string{"품새", "격파", "겨루기"} {
			if strings.Contains(f.Name, "_"+a+"_백업") {
				app = a
			}
		}
		if b, ok := best[app]; !ok || f.At > b.At {
			best[app] = f
		}
	}
	if len(best) == 0 {
		writeJSON(w, 404, map[string]any{"error": "본부에 " + folder + " 백업이 아직 없습니다"})
		return
	}
	var got []string
	for _, f := range best {
		u := base + "/api/hq/cfile?court=" + url.QueryEscape(folder) + "&name=" + url.QueryEscape(f.Name)
		rr, err := cli.Get(u)
		if err != nil {
			continue
		}
		b, err := io.ReadAll(io.LimitReader(rr.Body, 30<<20))
		rr.Body.Close()
		if err != nil || rr.StatusCode != 200 || len(b) == 0 {
			continue
		}
		name := strings.TrimSuffix(f.Name, "_백업(자동저장).json") + "_본부에서 받은 백업.json"
		if _, err := writeOver(autoDir(), name, b); err == nil {
			got = append(got, name)
		}
	}
	if len(got) == 0 {
		writeJSON(w, 502, map[string]any{"error": "백업 파일을 받지 못했습니다"})
		return
	}
	sort.Strings(got)
	writeJSON(w, 200, map[string]any{"ok": true, "files": got, "dir": autoDir()})
}
