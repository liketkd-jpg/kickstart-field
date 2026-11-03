// 본부 → 코트 노트북 명단 보내기 (와이파이)
//   - 본부 노트북의 경기 앱(코트 나누기)이 /api/hq/push 로 「A코트 · 품새 · 명단」을 보내면
//     본부 프로그램이 찾아 둔 A코트 노트북의 /api/inbox 로 그대로 넘깁니다.
//   - 코트 노트북은 받은 명단을 그 종목 앱의 inbox/roster 문서로 저장 → 운영석에 「본부에서 명단이 왔습니다」가 뜨고
//     운영자가 「가져오기」를 눌러야 실제 명단에 들어갑니다 (실수로 덮어쓰지 않게).
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"time"
)

type pushMsg struct {
	Court string          `json:"court"`
	App   string          `json:"app"`
	Name  string          `json:"name"`
	From  string          `json:"from"`
	Divs  int             `json:"divs"`
	Rows  json.RawMessage `json:"rows"`
	At    int64           `json:"at"`
}

func validApp(k string) bool {
	for _, a := range apps {
		if a.Key == k {
			return true
		}
	}
	return false
}

// 본부: 코트 노트북으로 넘기기
func handleHQPush(w http.ResponseWriter, r *http.Request) {
	if getConfig().Role != "hq" {
		writeJSON(w, 400, map[string]any{"error": "이 노트북이 「본부」가 아닙니다. 본부 노트북에서 보내 주세요"})
		return
	}
	var m pushMsg
	if err := readBody(r, 8<<20, &m); err != nil || !validCourt(m.Court) || !validApp(m.App) || len(m.Rows) < 2 {
		writeJSON(w, 400, map[string]any{"error": "invalid_argument"})
		return
	}
	hqMu.Lock()
	addr := ""
	for a, c := range courts {
		if c.court == m.Court && c.online {
			addr = a
			break
		}
	}
	hqMu.Unlock()
	if addr == "" {
		writeJSON(w, 404, map[string]any{"error": m.Court + "코트 노트북을 찾지 못했습니다. 그 노트북에서 현장 프로그램이 「" + m.Court + "코트」로 켜져 있고 같은 와이파이인지 확인해 주세요"})
		return
	}
	m.At = time.Now().UnixMilli()
	if m.From == "" {
		m.From = "본부"
	}
	b, _ := json.Marshal(m)
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, "POST", "http://"+addr+"/api/inbox", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	resp, err := (&http.Client{Timeout: 8 * time.Second}).Do(req)
	if err != nil {
		writeJSON(w, 502, map[string]any{"error": m.Court + "코트 노트북에 보내지 못했습니다 (연결 끊김)"})
		return
	}
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<16))
	resp.Body.Close()
	if resp.StatusCode != 200 {
		var e map[string]any
		_ = json.Unmarshal(body, &e)
		msg := m.Court + "코트 노트북이 받지 않았습니다"
		if s, ok := e["error"].(string); ok && s != "" {
			msg = s
		}
		writeJSON(w, 502, map[string]any{"error": msg})
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true, "addr": addr, "court": m.Court})
}

// 코트: 본부가 보낸 명단 받기
func handleInbox(w http.ResponseWriter, r *http.Request) {
	var m pushMsg
	if err := readBody(r, 8<<20, &m); err != nil || !validApp(m.App) || len(m.Rows) < 2 {
		writeJSON(w, 400, map[string]any{"error": "invalid_argument"})
		return
	}
	c := getConfig()
	if c.Role == "court" && m.Court != "" && m.Court != c.Court {
		writeJSON(w, 409, map[string]any{"error": "이 노트북은 " + c.Court + "코트입니다 (" + m.Court + "코트 명단을 받지 않음)"})
		return
	}
	s := stores[m.App]
	if s == nil {
		writeJSON(w, 404, map[string]any{"error": "앱을 찾지 못했습니다"})
		return
	}
	if m.At == 0 {
		m.At = time.Now().UnixMilli()
	}
	s.setDoc("inbox/roster", map[string]any{"court": m.Court, "app": m.App, "name": m.Name, "from": m.From, "divs": m.Divs, "rows": m.Rows, "at": m.At, "done": false})
	writeJSON(w, 200, map[string]any{"ok": true})
}
