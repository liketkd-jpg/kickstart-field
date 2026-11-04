// 음원 폴더 · 결과 자동 저장 (현장 모드)
//   - 음원: 프로그램 폴더의 「음원\품새」 같은 눈에 보이는 폴더에 팀명(이름) 파일로 저장합니다.
//     경기 앱이 음원을 담을 때마다 여기에도 저장하고, 앱이 안 되면 이 폴더에서 바로 틀 수 있습니다.
//     본부가 코트로 명단을 보낼 때 음원도 이 폴더로 보내면, 코트 경기 앱이 폴더에서 자동으로 가져갑니다.
//   - 결과 자동 저장: 경기가 끝날 때마다 경기 앱이 결과 엑셀을 「대회결과\자동저장」에 덮어써 저장하고,
//     본부 노트북은 코트들의 자동 저장 파일을 「대회결과\본부수집\A코트」에 모아 둡니다.
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
)

var appFolder = map[string]string{"poomsae": "품새", "gyeokpa": "격파", "kyorugi": "겨루기"}
var audioExt = regexp.MustCompile(`(?i)\.(mp3|m4a|aac|wav|ogg|oga|flac|wma|mp4|webm)$`)
var fileMu sync.Mutex

func musicDir(app string) string {
	f := appFolder[app]
	if f == "" {
		f = "기타"
	}
	return filepath.Join(baseDir, "음원", f)
}
func autoDir() string { return filepath.Join(resultsDir, "자동저장") }

type fileInfo struct {
	Name string `json:"name"`
	Size int64  `json:"size"`
	At   int64  `json:"at"`
}

func listDir(dir string, filter *regexp.Regexp) []fileInfo {
	out := []fileInfo{}
	ents, err := os.ReadDir(dir)
	if err != nil {
		return out
	}
	for _, e := range ents {
		if e.IsDir() || strings.HasPrefix(e.Name(), ".") || strings.HasSuffix(e.Name(), ".tmp") {
			continue
		}
		if filter != nil && !filter.MatchString(e.Name()) {
			continue
		}
		if fi, err := e.Info(); err == nil {
			out = append(out, fileInfo{Name: e.Name(), Size: fi.Size(), At: fi.ModTime().UnixMilli()})
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out
}

// 같은 이름이면 덮어씁니다 (임시 파일 → 이름 바꾸기, 쓰다 끊겨도 반쪽 파일이 남지 않게)
func writeOver(dir, name string, b []byte) (string, error) {
	fileMu.Lock()
	defer fileMu.Unlock()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	full := filepath.Join(dir, name)
	tmp := full + ".tmp"
	if err := os.WriteFile(tmp, b, 0o644); err != nil {
		return "", err
	}
	_ = os.Remove(full)
	if err := os.Rename(tmp, full); err != nil {
		return "", err
	}
	return full, nil
}

func serveFile(w http.ResponseWriter, r *http.Request, dir, name string) {
	name = sanitizeName(name)
	if name == "" {
		http.NotFound(w, r)
		return
	}
	full := filepath.Join(dir, name)
	if filepath.Dir(full) != filepath.Clean(dir) {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	http.ServeFile(w, r, full)
}

// /api/music/{save|list|file|open}?app=poomsae&name=…
func handleMusic(w http.ResponseWriter, r *http.Request) {
	op := strings.TrimPrefix(r.URL.Path, "/api/music/")
	app := r.URL.Query().Get("app")
	if !validApp(app) {
		writeJSON(w, 400, map[string]any{"error": "invalid_app"})
		return
	}
	dir := musicDir(app)
	switch {
	case op == "save" && r.Method == http.MethodPost:
		name := sanitizeName(r.URL.Query().Get("name"))
		if name == "" || !audioExt.MatchString(name) {
			writeJSON(w, 400, map[string]any{"error": "음악 파일 이름이 아닙니다"})
			return
		}
		b, err := io.ReadAll(io.LimitReader(r.Body, 40<<20))
		if err != nil || len(b) == 0 {
			writeJSON(w, 400, map[string]any{"error": "read"})
			return
		}
		full, err := writeOver(dir, name, b)
		if err != nil {
			writeJSON(w, 500, map[string]any{"error": "저장하지 못했습니다"})
			return
		}
		writeJSON(w, 200, map[string]any{"ok": true, "path": full, "dir": dir})
	case op == "list":
		writeJSON(w, 200, map[string]any{"dir": dir, "files": listDir(dir, audioExt)})
	case op == "file":
		serveFile(w, r, dir, r.URL.Query().Get("name"))
	case op == "del" && r.Method == http.MethodPost:
		if !isLocalReq(r) {
			writeJSON(w, 403, map[string]any{"error": "이 노트북에서만 지울 수 있습니다"})
			return
		}
		n := 0
		for _, f := range listDir(dir, audioExt) {
			if os.Remove(filepath.Join(dir, f.Name)) == nil {
				n++
			}
		}
		writeJSON(w, 200, map[string]any{"ok": true, "n": n})
	case op == "open" && r.Method == http.MethodPost:
		if !isLocalReq(r) {
			writeJSON(w, 403, map[string]any{"error": "이 노트북에서만 열 수 있습니다"})
			return
		}
		_ = os.MkdirAll(dir, 0o755)
		if err := openFolder(dir); err != nil {
			writeJSON(w, 500, map[string]any{"error": "폴더를 열지 못했습니다", "dir": dir})
			return
		}
		writeJSON(w, 200, map[string]any{"ok": true, "dir": dir})
	default:
		http.NotFound(w, r)
	}
}

// 본부: 코트 노트북 음원 폴더로 음원 보내기  POST /api/hq/pushmusic?court=A&app=poomsae&name=…
func handleHQPushMusic(w http.ResponseWriter, r *http.Request) {
	if getConfig().Role != "hq" {
		writeJSON(w, 400, map[string]any{"error": "이 노트북이 「본부」가 아닙니다"})
		return
	}
	q := r.URL.Query()
	court, app, name := q.Get("court"), q.Get("app"), sanitizeName(q.Get("name"))
	if !validCourt(court) || !validApp(app) || name == "" || !audioExt.MatchString(name) {
		writeJSON(w, 400, map[string]any{"error": "invalid_argument"})
		return
	}
	b, err := io.ReadAll(io.LimitReader(r.Body, 40<<20))
	if err != nil || len(b) == 0 {
		writeJSON(w, 400, map[string]any{"error": "read"})
		return
	}
	addr := courtAddr(court)
	if addr == "" {
		writeJSON(w, 404, map[string]any{"error": court + "코트 노트북을 찾지 못했습니다"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()
	u := "http://" + addr + "/api/music/save?app=" + url.QueryEscape(app) + "&name=" + url.QueryEscape(name)
	req, _ := http.NewRequestWithContext(ctx, "POST", u, bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/octet-stream")
	resp, err := (&http.Client{Timeout: 90 * time.Second}).Do(req)
	if err != nil {
		writeJSON(w, 502, map[string]any{"error": court + "코트 노트북에 음원을 보내지 못했습니다 (연결 끊김)"})
		return
	}
	io.Copy(io.Discard, resp.Body)
	resp.Body.Close()
	if resp.StatusCode != 200 {
		writeJSON(w, 502, map[string]any{"error": court + "코트 노트북이 음원을 받지 않았습니다"})
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true})
}

func courtAddr(court string) string {
	hqMu.Lock()
	defer hqMu.Unlock()
	for a, c := range courts {
		if c.court == court && c.online {
			return a
		}
	}
	return ""
}

// 결과 자동 저장  POST /api/results/auto?name=…  ·  GET /api/results/list  ·  GET /api/results/file?name=…
func handleResultsAuto(w http.ResponseWriter, r *http.Request) {
	op := strings.TrimPrefix(r.URL.Path, "/api/results/")
	switch {
	case op == "auto" && r.Method == http.MethodPost:
		if !isLocalReq(r) {
			writeJSON(w, 403, map[string]any{"error": "local_only"})
			return
		}
		name := sanitizeName(r.URL.Query().Get("name"))
		if name == "" || !strings.HasSuffix(strings.ToLower(name), ".xlsx") {
			writeJSON(w, 400, map[string]any{"error": "invalid_argument"})
			return
		}
		b, err := io.ReadAll(io.LimitReader(r.Body, 30<<20))
		if err != nil || len(b) == 0 {
			writeJSON(w, 400, map[string]any{"error": "read"})
			return
		}
		full, err := writeOver(autoDir(), name, b)
		if err != nil {
			writeJSON(w, 500, map[string]any{"error": "write"})
			return
		}
		writeJSON(w, 200, map[string]any{"ok": true, "path": full, "dir": autoDir()})
	case op == "list":
		writeJSON(w, 200, map[string]any{"dir": autoDir(), "files": listDir(autoDir(), nil)})
	case op == "file":
		serveFile(w, r, autoDir(), r.URL.Query().Get("name"))
	case op == "open" && r.Method == http.MethodPost:
		if !isLocalReq(r) {
			writeJSON(w, 403, map[string]any{"error": "local_only"})
			return
		}
		d := autoDir()
		if getConfig().Role == "hq" && r.URL.Query().Get("hq") == "1" {
			d = filepath.Join(resultsDir, "본부수집")
		}
		_ = os.MkdirAll(d, 0o755)
		if err := openFolder(d); err != nil {
			writeJSON(w, 500, map[string]any{"error": "open", "dir": d})
			return
		}
		writeJSON(w, 200, map[string]any{"ok": true, "dir": d})
	default:
		http.NotFound(w, r)
	}
}

// 코트 hqfeed 에 실어 보내는 자동 저장 목록
func autoSaves() []fileInfo { return listDir(autoDir(), regexp.MustCompile(`(?i)\.xlsx$`)) }

// 본부: 코트의 새 자동 저장 파일을 가져와 「대회결과\본부수집\A코트」에 저장
var collectMu sync.Mutex
var collected = map[string]int64{} // addr|name -> at
var collecting = map[string]bool{}

func collectSaves(addr, court string, saves []fileInfo) {
	if court == "" {
		return
	}
	for _, f := range saves {
		key := addr + "|" + f.Name
		collectMu.Lock()
		if collected[key] >= f.At || collecting[key] {
			collectMu.Unlock()
			continue
		}
		collecting[key] = true
		collectMu.Unlock()
		go func(f fileInfo, key string) {
			defer func() { collectMu.Lock(); delete(collecting, key); collectMu.Unlock() }()
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
			req, _ := http.NewRequestWithContext(ctx, "GET", "http://"+addr+"/api/results/file?name="+url.QueryEscape(f.Name), nil)
			resp, err := httpCli.Do(req)
			if err != nil {
				return
			}
			b, _ := io.ReadAll(io.LimitReader(resp.Body, 30<<20))
			resp.Body.Close()
			if resp.StatusCode != 200 || len(b) == 0 {
				return
			}
			if _, err := writeOver(filepath.Join(resultsDir, "본부수집", court+"코트"), f.Name, b); err == nil {
				collectMu.Lock()
				collected[key] = f.At
				collectMu.Unlock()
				log.Printf("결과 모으기: %s코트 %s", court, f.Name)
			}
		}(f, key)
	}
}

func hqCollectedList() map[string][]fileInfo {
	out := map[string][]fileInfo{}
	base := filepath.Join(resultsDir, "본부수집")
	ents, _ := os.ReadDir(base)
	for _, e := range ents {
		if e.IsDir() {
			out[e.Name()] = listDir(filepath.Join(base, e.Name()), nil)
		}
	}
	return out
}

var _ = json.Marshal
var _ = fmt.Sprint
