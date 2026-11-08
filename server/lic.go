// 허가 코드 함께 쓰기 (v1.4.50)
//
// 허가 코드는 경기 앱의 대회 설정(settings.lic)에 저장되어 노트북·종목마다 따로였습니다.
// 이제 한 곳에서 넣으면 이 노트북의 모든 종목 앱이 함께 쓰고(GET /api/lic), 본부 노트북은 연결된 모든 코트 노트북에 나눠 줍니다.
// 코트 노트북에서 넣은 코드도 본부가 진행 상황을 가져갈 때(/api/feed 의 lic) 받아 다른 코트에 나눠 줍니다.
// 코드의 기간(starts~ends)과 1년권의 인터넷 재확인(14일)은 각 앱의 허가 코드 확인 그대로 따릅니다.
package main

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type licDoc struct {
	Code    string `json:"code"`
	Kind    string `json:"kind"`
	Holder  string `json:"holder"`
	Starts  string `json:"starts"`
	Ends    string `json:"ends"`
	Checked string `json:"checked"`
}

var (
	licMu  sync.Mutex
	licCur *licDoc
)

func licPath() string { return filepath.Join(dataDir, "허가코드.json") }

func loadLic() {
	b, err := os.ReadFile(licPath())
	if err != nil {
		return
	}
	var l licDoc
	if json.Unmarshal(b, &l) == nil && l.Code != "" {
		licMu.Lock()
		licCur = &l
		licMu.Unlock()
	}
}

func getLic() *licDoc {
	licMu.Lock()
	defer licMu.Unlock()
	if licCur == nil {
		return nil
	}
	c := *licCur
	return &c
}

// 더 늦게 끝나는(또는 더 최근에 확인한) 코드만 받아들임. 바뀌었으면 true
func setLic(l *licDoc) bool {
	if l == nil || l.Code == "" || l.Ends == "" {
		return false
	}
	licMu.Lock()
	defer licMu.Unlock()
	if c := licCur; c != nil && (c.Ends > l.Ends || (c.Ends == l.Ends && c.Code == l.Code && c.Checked >= l.Checked)) {
		return false
	}
	cp := *l
	licCur = &cp
	b, _ := json.MarshalIndent(cp, "", "  ")
	_ = os.WriteFile(licPath(), b, 0o644)
	return true
}

// 본부: 연결된 모든 코트 노트북에 코드 나눠 주기
func pushLicToCourts() {
	l := getLic()
	if l == nil || getConfig().Role != "hq" {
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
		go func(a string) { _, _ = postJSON(a, "/api/lic", l, 4*time.Second) }(a)
	}
}

// GET /api/lic → 이 노트북에 저장된 코드 · POST /api/lic {code,…} → 저장 (본부면 코트들에 나눠 줌)
func handleLic(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var l licDoc
		if err := readBody(r, 1<<12, &l); err != nil || l.Code == "" || l.Ends == "" {
			writeJSON(w, 400, map[string]any{"error": "invalid_argument"})
			return
		}
		if setLic(&l) {
			go pushLicToCourts()
		}
		writeJSON(w, 200, map[string]any{"ok": true, "lic": getLic()})
		return
	}
	writeJSON(w, 200, map[string]any{"lic": getLic()})
}

// 본부: 코트 피드에 실려 온 코드 받기 (pollCourt 가 부름)
func adoptCourtLic(raw json.RawMessage) {
	if len(raw) < 4 {
		return
	}
	var l licDoc
	if json.Unmarshal(raw, &l) == nil && setLic(&l) {
		go pushLicToCourts()
	}
}
