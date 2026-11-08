// 본부 「종목별 경기 규칙」 (v1.4.51)
//
// 본부에서 품새(공인·자유·태권체조·팀 대항)·격파·겨루기의 경기 방식과 심판 수를 한 번 정하면,
// 본부가 모든 코트 노트북에 나눠 주고(POST /api/rules), 각 경기 앱(rules.js)이 받아 대회 설정과
// 「아직 점수가 없는 부문」에 똑같이 적용합니다. 코트를 옮겨도 받는 코트가 같은 규칙으로 돌아갑니다.
package main

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"
)

var (
	rulesMu  sync.Mutex
	rulesCur json.RawMessage
	rulesAt  int64
)

func rulesPath() string { return filepath.Join(dataDir, "경기규칙.json") }

func loadRules() {
	b, err := os.ReadFile(rulesPath())
	if err != nil {
		return
	}
	var d struct {
		At int64 `json:"at"`
	}
	if json.Unmarshal(b, &d) == nil && d.At > 0 {
		rulesMu.Lock()
		rulesCur, rulesAt = b, d.At
		rulesMu.Unlock()
	}
}

func getRules() (json.RawMessage, int64) {
	rulesMu.Lock()
	defer rulesMu.Unlock()
	return rulesCur, rulesAt
}

// 더 새로운(at 이 큰) 규칙만 받음
func setRules(b []byte) bool {
	var d struct {
		At int64 `json:"at"`
	}
	if json.Unmarshal(b, &d) != nil || d.At <= 0 {
		return false
	}
	rulesMu.Lock()
	defer rulesMu.Unlock()
	if d.At <= rulesAt {
		return false
	}
	rulesCur, rulesAt = append(json.RawMessage(nil), b...), d.At
	_ = os.WriteFile(rulesPath(), b, 0o644)
	return true
}

func pushRulesTo(addr string) {
	r, at := getRules()
	if at == 0 {
		return
	}
	_, _ = postJSON(addr, "/api/rules", json.RawMessage(r), 4*time.Second)
}

func pushRulesToCourts() {
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
		go pushRulesTo(a)
	}
}

// GET /api/rules → 지금 규칙 · POST /api/rules → 저장 (본부면 모든 코트에 나눠 줌)
func handleRules(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var raw json.RawMessage
		if err := readBody(r, 1<<15, &raw); err != nil {
			writeJSON(w, 400, map[string]any{"error": "invalid_argument"})
			return
		}
		if setRules(raw) {
			go pushRulesToCourts()
		}
		_, at := getRules()
		writeJSON(w, 200, map[string]any{"ok": true, "at": at})
		return
	}
	rr, at := getRules()
	if at == 0 {
		writeJSON(w, 200, map[string]any{"rules": nil, "at": 0})
		return
	}
	writeJSON(w, 200, map[string]any{"rules": rr, "at": at})
}
