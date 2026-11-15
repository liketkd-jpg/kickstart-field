// v1.7.22 「점수 뒤 전광판」 — 경기 점수 공개가 끝나면 코트 전광판에 대회 이름 · 후원사 · 코트 이름을 차례로
//
// 본부에서 켜기·순서·시간·후원사 그림을 정하면(POST /api/show) 본부가 모든 코트 노트북에 나눠 주고,
// 각 경기 앱 전광판(show.js)이 받아 씁니다. 후원사 그림이 들어가 「경기 규칙」과 따로 둡니다(크기가 큼).
package main

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"time"
)

var (
	showMu  sync.Mutex
	showCur json.RawMessage
	showAt  int64
)

func showPath() string { return filepath.Join(dataDir, "전광판순서.json") }

func loadShow() {
	b, err := os.ReadFile(showPath())
	if err != nil {
		return
	}
	var d struct {
		At int64 `json:"at"`
	}
	if json.Unmarshal(b, &d) == nil && d.At > 0 {
		showMu.Lock()
		showCur, showAt = b, d.At
		showMu.Unlock()
	}
}

func getShow() (json.RawMessage, int64) {
	showMu.Lock()
	defer showMu.Unlock()
	return showCur, showAt
}

func setShow(b []byte) bool {
	var d struct {
		At int64 `json:"at"`
	}
	if json.Unmarshal(b, &d) != nil || d.At <= 0 {
		return false
	}
	showMu.Lock()
	defer showMu.Unlock()
	// v1.7.27 코트 노트북은 본부가 보낸 것을 그대로 따름 (노트북 시계가 서로 달라 본부 것이 「옛것」으로 보여도)
	if d.At == showAt || (d.At < showAt && getConfig().Role == "hq") {
		return false
	}
	showCur, showAt = append(json.RawMessage(nil), b...), d.At
	_ = os.WriteFile(showPath(), b, 0o644)
	return true
}

func pushShowTo(addr string) {
	r, at := getShow()
	if at == 0 {
		return
	}
	_, _ = postJSON(addr, "/api/show", json.RawMessage(r), 30*time.Second)
}

func pushShowToCourts() {
	if getConfig().Role != "hq" {
		return
	}
	hqMu.Lock()
	var addrs []string
	for a, c := range courts {
		if c.online {
			addrs = append(addrs, a)
		}
	}
	hqMu.Unlock()
	for _, a := range addrs {
		go pushShowTo(a)
	}
}

// GET /api/show[?at=N] → 지금 설정 (N 이 지금 것과 같으면 at 만) · POST /api/show → 저장 (본부면 모든 코트에 나눠 줌)
func handleShow(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var raw json.RawMessage
		if err := readBody(r, 24<<20, &raw); err != nil {
			writeJSON(w, 400, map[string]any{"error": "invalid_argument"})
			return
		}
		if setShow(raw) {
			go pushShowToCourts()
		}
		_, at := getShow()
		writeJSON(w, 200, map[string]any{"ok": true, "at": at})
		return
	}
	cur, at := getShow()
	if q, _ := strconv.ParseInt(r.URL.Query().Get("at"), 10, 64); at == 0 || (q > 0 && q >= at) {
		writeJSON(w, 200, map[string]any{"at": at})
		return
	}
	writeJSON(w, 200, map[string]any{"show": cur, "at": at})
}
