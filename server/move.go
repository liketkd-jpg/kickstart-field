// 본부: 시작 전 부문을 다른 코트로 옮기기
//
//	1. 본부 화면에서 「A코트 · 품새 · ○○부 → C코트」를 누르면 (POST /api/hq/move)
//	   본부 프로그램이 A코트 노트북에 「옮겨 달라」는 요청을 넣습니다 (/api/inbox/move → inbox/mv_<id>).
//	2. A코트 운영석이 그 부문이 아직 시작 전인지 확인하고, 그 부문 명단(엑셀 줄)과 음원 이름을 hq/moves 에 올립니다.
//	3. 본부가 그 명단을 C코트 노트북으로 보내고(음원 파일도 함께), A코트에는 「이제 빼라」를 보냅니다.
//	4. C코트 운영석은 받은 부문을 명단에 추가하고, A코트 운영석은 그 부문을 명단에서 뺍니다.
//	5. 본부 노트북의 경기 앱(코트 나누기)에도 그 부문의 코트를 C로 고치고, 홈페이지 대진표를 다시 올립니다.
//	이미 점수가 들어간 부문은 어느 단계에서도 옮기지 않습니다 (두 노트북에 점수가 나뉘는 일을 막기 위해).
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

type moveDoc struct {
	ID       string `json:"id"`
	App      string `json:"app"`
	Div      string `json:"div"`
	From     string `json:"from"`
	To       string `json:"to"`
	State    string `json:"state"` // req(요청) · sending(보내는 중) · sent(받는 코트에 보냄) · done(끝) · err(못 옮김)
	Err      string `json:"err,omitempty"`
	N        int    `json:"n"`
	Music    int    `json:"music"`
	MusicErr int    `json:"musicErr,omitempty"`
	Removed  bool   `json:"removed"`
	Taken    bool   `json:"taken"`
	Site     string `json:"site,omitempty"` // 본부 경기 앱: ok(홈페이지 대진표도 고침) · local(코트 나누기만 고침) · err
	SiteErr  string `json:"siteErr,omitempty"`
	At       int64  `json:"at"`
	Updated  int64  `json:"updated"`
}

// 코트 운영석이 hq/moves 에 올리는 보고
type moveReport struct {
	State string          `json:"state"` // ready · removed · taken · err
	Err   string          `json:"err"`
	Rows  json.RawMessage `json:"rows"`
	Music []string        `json:"music"`
	N     int             `json:"n"`
}

var (
	moveMu     sync.Mutex
	moves      = map[string]*moveDoc{}
	moveActive = map[string]bool{}
)

func saveMove(m *moveDoc) {
	m.Updated = time.Now().UnixMilli()
	if s := stores["hq"]; s != nil {
		s.setDoc("moves/"+m.ID, m)
	}
}

func postJSON(addr, path string, v any, timeout time.Duration) (map[string]any, error) {
	b, _ := json.Marshal(v)
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, "POST", "http://"+addr+path, bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	resp, err := (&http.Client{Timeout: timeout}).Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<16))
	out := map[string]any{}
	_ = json.Unmarshal(body, &out)
	if resp.StatusCode != 200 {
		if s, ok := out["error"].(string); ok && s != "" {
			return out, fmt.Errorf("%s", s)
		}
		return out, fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	return out, nil
}

// 본부 화면: 옮기기 요청  POST /api/hq/move {app, div, from, to}
func handleHQMove(w http.ResponseWriter, r *http.Request) {
	if getConfig().Role != "hq" {
		writeJSON(w, 400, map[string]any{"error": "이 노트북이 「본부」가 아닙니다"})
		return
	}
	var q struct {
		App    string `json:"app"`
		Div    string `json:"div"`
		From   string `json:"from"`
		To     string `json:"to"`
		Cancel string `json:"cancel"`
	}
	if err := readBody(r, 1<<14, &q); err == nil && q.Cancel != "" {
		cancelMove(w, q.Cancel)
		return
	}
	if !validApp(q.App) || !validCourt(q.From) || !validCourt(q.To) || strings.TrimSpace(q.Div) == "" {
		writeJSON(w, 400, map[string]any{"error": "invalid_argument"})
		return
	}
	if q.From == q.To {
		writeJSON(w, 400, map[string]any{"error": "같은 코트로는 옮길 수 없습니다"})
		return
	}
	src, dst := courtAddr(q.From), courtAddr(q.To)
	if src == "" {
		writeJSON(w, 404, map[string]any{"error": q.From + "코트 노트북을 찾지 못했습니다"})
		return
	}
	if dst == "" {
		writeJSON(w, 404, map[string]any{"error": q.To + "코트 노트북을 찾지 못했습니다. 받을 코트 노트북이 켜져 있고 같은 와이파이인지 확인해 주세요"})
		return
	}
	moveMu.Lock()
	for _, m := range moves {
		if m.App == q.App && m.Div == q.Div && m.From == q.From && (m.State == "req" || m.State == "sending" || m.State == "sent") {
			moveMu.Unlock()
			writeJSON(w, 409, map[string]any{"error": "이 부문은 이미 옮기는 중입니다"})
			return
		}
	}
	now := time.Now().UnixMilli()
	m := &moveDoc{ID: fmt.Sprintf("mv%x", now), App: q.App, Div: q.Div, From: q.From, To: q.To, State: "req", At: now}
	moves[m.ID] = m
	moveMu.Unlock()
	if _, err := postJSON(src, "/api/inbox/move", map[string]any{"id": m.ID, "app": m.App, "div": m.Div, "from": m.From, "to": m.To, "state": "req", "at": now}, 6*time.Second); err != nil {
		moveMu.Lock()
		m.State, m.Err = "err", m.From+"코트 노트북에 요청을 보내지 못했습니다 ("+err.Error()+")"
		saveMove(m)
		moveMu.Unlock()
		writeJSON(w, 502, map[string]any{"error": m.Err})
		return
	}
	moveMu.Lock()
	saveMove(m)
	moveMu.Unlock()
	writeJSON(w, 200, map[string]any{"ok": true, "id": m.ID})
}

// 코트: 본부의 옮기기 요청 받기  POST /api/inbox/move
func handleInboxMove(w http.ResponseWriter, r *http.Request) {
	var q map[string]any
	if err := readBody(r, 1<<14, &q); err != nil {
		writeJSON(w, 400, map[string]any{"error": "invalid_argument"})
		return
	}
	id, _ := q["id"].(string)
	app, _ := q["app"].(string)
	s := stores[app]
	if id == "" || !validApp(app) || s == nil {
		writeJSON(w, 400, map[string]any{"error": "invalid_argument"})
		return
	}
	c := getConfig()
	if from, _ := q["from"].(string); c.Role == "court" && from != "" && from != c.Court {
		writeJSON(w, 409, map[string]any{"error": "이 노트북은 " + c.Court + "코트입니다"})
		return
	}
	q["got"] = time.Now().UnixMilli()
	s.setDoc("inbox/mv_"+id, q)
	writeJSON(w, 200, map[string]any{"ok": true})
}

// 본부: 코트 피드에서 옮기기 보고를 읽어 다음 단계로 (pollCourt 가 부름)
func handleMoveReports(addr, court string, apps map[string]json.RawMessage) {
	for app, raw := range apps {
		var a struct {
			Moves map[string]moveReport `json:"moves"`
		}
		if json.Unmarshal(raw, &a) != nil || len(a.Moves) == 0 {
			continue
		}
		for id, rep := range a.Moves {
			moveMu.Lock()
			m := moves[id]
			if m == nil || m.App != app {
				moveMu.Unlock()
				continue
			}
			changed := false
			switch {
			case court == m.From && rep.State == "err" && m.State != "err" && m.State != "done":
				m.State, m.Err = "err", rep.Err
				changed = true
			case court == m.From && rep.State == "ready" && m.State == "req" && !moveActive[id]:
				moveActive[id] = true
				m.State, m.N = "sending", rep.N
				changed = true
				go deliverMove(m.ID, addr, rep)
			case court == m.From && rep.State == "removed" && !m.Removed:
				m.Removed = true
				changed = true
			case court == m.To && rep.State == "taken" && !m.Taken:
				m.Taken = true
				changed = true
			case court == m.To && rep.State == "err" && m.State != "err" && !m.Taken:
				m.State, m.Err = "err", m.To+"코트: "+rep.Err
				changed = true
			}
			if m.Removed && m.Taken && m.State != "done" && m.State != "err" {
				m.State = "done"
				changed = true
			}
			if changed {
				saveMove(m)
			}
			moveMu.Unlock()
		}
	}
}

// 받는 코트로 명단 · 음원 보내고, 원래 코트에 「빼기」 보내기
func deliverMove(id, srcAddr string, rep moveReport) {
	moveMu.Lock()
	m := moves[id]
	cp := *m
	moveMu.Unlock()
	fail := func(msg string) {
		moveMu.Lock()
		m.State, m.Err = "err", msg
		delete(moveActive, id)
		saveMove(m)
		moveMu.Unlock()
		// 원래 코트에는 그대로 두라고 알림 (요청 취소)
		_, _ = postJSON(srcAddr, "/api/inbox/move", map[string]any{"id": cp.ID, "app": cp.App, "div": cp.Div, "from": cp.From, "to": cp.To, "state": "cancel", "err": msg}, 5*time.Second)
	}
	dst := courtAddr(cp.To)
	if dst == "" {
		fail(cp.To + "코트 노트북과 연결이 끊겼습니다. 부문은 " + cp.From + "코트에 그대로 있습니다")
		return
	}
	if len(rep.Rows) < 4 {
		fail(cp.From + "코트에서 보낼 명단이 비어 있습니다")
		return
	}
	// 음원 먼저 (받는 코트가 명단을 넣을 때 바로 연결되도록)
	nm, nf := 0, 0
	for _, name := range rep.Music {
		name = sanitizeName(name)
		if name == "" || !audioExt.MatchString(name) {
			continue
		}
		ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
		req, _ := http.NewRequestWithContext(ctx, "GET", "http://"+srcAddr+"/api/music/file?app="+url.QueryEscape(cp.App)+"&name="+url.QueryEscape(name), nil)
		resp, err := (&http.Client{Timeout: 60 * time.Second}).Do(req)
		var b []byte
		if err == nil {
			if resp.StatusCode == 200 {
				b, _ = io.ReadAll(io.LimitReader(resp.Body, 40<<20))
			}
			resp.Body.Close()
		}
		cancel()
		if len(b) == 0 {
			nf++
			continue
		}
		ctx2, cancel2 := context.WithTimeout(context.Background(), 60*time.Second)
		req2, _ := http.NewRequestWithContext(ctx2, "POST", "http://"+dst+"/api/music/save?app="+url.QueryEscape(cp.App)+"&name="+url.QueryEscape(name), bytes.NewReader(b))
		req2.Header.Set("Content-Type", "application/octet-stream")
		resp2, err := (&http.Client{Timeout: 60 * time.Second}).Do(req2)
		if err == nil && resp2.StatusCode == 200 {
			nm++
		} else {
			nf++
		}
		if err == nil {
			resp2.Body.Close()
		}
		cancel2()
	}
	msg := pushMsg{Court: cp.To, App: cp.App, From: "본부", Divs: 1, Rows: rep.Rows, At: time.Now().UnixMilli(),
		Move: &moveInfo{ID: cp.ID, From: cp.From, Div: cp.Div}}
	if _, err := postJSON(dst, "/api/inbox", msg, 8*time.Second); err != nil {
		fail(cp.To + "코트 노트북에 명단을 보내지 못했습니다 (" + err.Error() + "). 부문은 " + cp.From + "코트에 그대로 있습니다")
		return
	}
	_, _ = postJSON(srcAddr, "/api/inbox/move", map[string]any{"id": cp.ID, "app": cp.App, "div": cp.Div, "from": cp.From, "to": cp.To, "state": "remove"}, 6*time.Second)
	// 본부 노트북의 경기 앱(코트 나누기 · 홈페이지 대진표)에도 알림
	if s := stores[cp.App]; s != nil {
		s.setDoc("inbox/court_"+cp.ID, map[string]any{"id": cp.ID, "app": cp.App, "div": cp.Div, "from": cp.From, "to": cp.To, "at": time.Now().UnixMilli(), "done": false})
	}
	moveMu.Lock()
	m.State, m.Music, m.MusicErr = "sent", nm, nf
	delete(moveActive, id)
	if m.Removed && m.Taken {
		m.State = "done"
	}
	saveMove(m)
	moveMu.Unlock()
}

// 본부 경기 앱이 「코트 나누기 · 홈페이지 대진표」를 고쳤는지 (inbox/court_<id> 의 site) 읽어 옮기기 기록에 붙임
func moveSiteLoop() {
	for range time.Tick(2 * time.Second) {
		moveMu.Lock()
		for _, m := range moves {
			if m.Site != "" && m.Site != "pending" {
				continue
			}
			s := stores[m.App]
			if s == nil {
				continue
			}
			s.mu.Lock()
			raw, ok := s.docs["inbox/court_"+m.ID]
			s.mu.Unlock()
			if !ok {
				continue
			}
			var d struct {
				Done    bool   `json:"done"`
				Site    string `json:"site"`
				SiteErr string `json:"siteErr"`
			}
			if json.Unmarshal(raw, &d) == nil && d.Done && d.Site != m.Site {
				m.Site, m.SiteErr = d.Site, d.SiteErr
				saveMove(m)
			}
		}
		moveMu.Unlock()
	}
}

// 본부 프로그램을 다시 켜도 옮기기 기록이 남도록 (hq 저장소의 moves/ 문서에서 읽음)
func loadMoves() {
	s := stores["hq"]
	if s == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	moveMu.Lock()
	defer moveMu.Unlock()
	for k, raw := range s.docs {
		if !strings.HasPrefix(k, "moves/") {
			continue
		}
		var m moveDoc
		if json.Unmarshal(raw, &m) == nil && m.ID != "" {
			if m.State == "sending" {
				m.State = "req" // 보내다 꺼졌으면 다시 보냄
			}
			mm := m
			moves[m.ID] = &mm
		}
	}
}

// 본부 화면: 「원래 코트 확인 중」에서 멈춘 옮기기를 취소 (아직 명단을 보내기 전일 때만)
func cancelMove(w http.ResponseWriter, id string) {
	moveMu.Lock()
	m := moves[id]
	if m == nil {
		moveMu.Unlock()
		writeJSON(w, 404, map[string]any{"error": "옮기기 기록을 찾지 못했습니다"})
		return
	}
	if m.State != "req" {
		moveMu.Unlock()
		writeJSON(w, 409, map[string]any{"error": "이미 명단을 보내는 중이라 취소할 수 없습니다"})
		return
	}
	m.State, m.Err = "cancel", "본부에서 취소했습니다"
	saveMove(m)
	cp := *m
	moveMu.Unlock()
	if src := courtAddr(cp.From); src != "" {
		_, _ = postJSON(src, "/api/inbox/move", map[string]any{"id": cp.ID, "app": cp.App, "div": cp.Div, "from": cp.From, "to": cp.To, "state": "cancel", "err": cp.Err}, 5*time.Second)
	}
	writeJSON(w, 200, map[string]any{"ok": true})
}
