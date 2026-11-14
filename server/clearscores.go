package main

// v1.7.18 본부 「🗑 모든 경기 기록 지우기」 — 실제 대회 모드에서도 됨 (실제 점수까지)
//   명단·부문(대진)·종목별 경기 규칙·대회 설정·허가 코드는 그대로 두고,
//   모든 코트의 점수·결과·지정 품새 추첨·호출 상태를 지움 → 처음 경기 전 상태로
//   1) 본부와 각 코트가 먼저 「대회결과\백업\경기기록지우기_시각」에 백업
//   2) 코트: scores/ · results/ · pdraw/ · ev/ 문서를 지우고, 진행 상태(comp/state)를 처음으로,
//      부문의 예선→결선 진행(stages)을 처음으로, 자동 저장 결과 파일은 백업 폴더로 옮김
//   3) 본부: 호출 기록·시상 기록·대기실 연락·출석을 지우고, 본부에 모인 결과 파일을 백업 폴더로 옮김

import (
	"encoding/json"
	"net/http"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

var clearPrefixApp = []string{"scores/", "results/", "pdraw/", "ev/", "calllog/", "hqatt/", "hqnote/"}
var clearPrefixHQ = []string{"calllog/", "award/", "att/", "roommsg/", "hq/announce"}

// prefix 로 시작하는 문서를 지움. 지운 개수
func (s *Store) delPrefixes(prefixes []string) int {
	s.mu.Lock()
	var del []string
	for p := range s.docs {
		for _, x := range prefixes {
			if strings.HasPrefix(p, x) {
				del = append(del, p)
				break
			}
		}
	}
	sort.Strings(del)
	for _, p := range del {
		delete(s.docs, p)
		s.seq++
		s.broadcast(sse("chg", map[string]any{"seq": s.seq, "path": p, "data": nil}))
	}
	if len(del) > 0 {
		s.dirty = true
	}
	s.mu.Unlock()
	return len(del)
}

func (s *Store) rawDoc(p string) []byte {
	s.mu.Lock()
	defer s.mu.Unlock()
	if b, ok := s.docs[p]; ok {
		return append([]byte(nil), b...)
	}
	return nil
}

// 한 앱의 경기 기록을 처음으로
func clearAppScores(key string, s *Store) int {
	n := s.delPrefixes(clearPrefixApp)
	// 진행 상태: 다음 epoch 로 (채점판이 예전 점수를 다시 보내지 않게)
	ep := 0.0
	if raw := s.rawDoc("comp/state"); raw != nil {
		var o map[string]any
		if json.Unmarshal(raw, &o) == nil {
			if v, ok := o["epoch"].(float64); ok {
				ep = v
			}
		}
	}
	if key == "kyorugi" {
		s.setDoc("comp/state", map[string]any{"phase": "idle", "epoch": ep + 1})
	} else {
		s.setDoc("comp/state", map[string]any{"status": "idle", "epoch": ep + 1, "current": nil, "deduction": map[string]any{}, "timer": nil})
	}
	// 부문의 예선 → 결선 진행을 처음으로 (품새·격파)
	if key != "kyorugi" {
		s.mu.Lock()
		var paths []string
		for p := range s.docs {
			if strings.HasPrefix(p, "divc/") || p == "comp/divisions" {
				paths = append(paths, p)
			}
		}
		s.mu.Unlock()
		for _, p := range paths {
			var o map[string]any
			if json.Unmarshal(s.rawDoc(p), &o) != nil {
				continue
			}
			L, ok := o["list"].([]any)
			if !ok {
				continue
			}
			ch := false
			for _, x := range L {
				if d, ok := x.(map[string]any); ok {
					if d["stages"] != nil {
						d["stages"] = nil
						ch = true
					}
				}
			}
			if ch {
				s.setDoc(p, o)
			}
		}
	}
	zeroBoard(s, time.Now().UnixMilli())
	return n
}

// 이 노트북(코트)의 경기 기록 지우기
func clearCourtScores() (string, int) {
	flushAll()
	bk := backupData("경기기록지우기")
	if bk != "" {
		moveInto(autoDir(), bk)
	}
	n := 0
	for k, s := range stores {
		if s == nil || k == "hq" {
			continue
		}
		n += clearAppScores(k, s)
		s.flush()
	}
	go cleanCerts(true)
	return bk, n
}

// POST /api/inbox/clearscores (본부 → 코트)
func handleInboxClearScores(w http.ResponseWriter, r *http.Request) {
	var b struct {
		Confirm string `json:"confirm"`
	}
	if err := readBody(r, 1024, &b); err != nil || b.Confirm != "경기 기록 지우기" {
		writeJSON(w, 400, map[string]any{"error": "확인 글자가 맞지 않습니다"})
		return
	}
	bk, n := clearCourtScores()
	writeJSON(w, 200, map[string]any{"ok": true, "backup": bk, "docs": n})
}

// POST /api/hq/clearscores {confirm:"경기 기록 지우기"} — 본부 노트북 화면에서만
func handleHQClearScores(w http.ResponseWriter, r *http.Request) {
	if !isLocalReq(r) {
		writeJSON(w, 403, map[string]any{"error": "본부 노트북 화면에서만 할 수 있습니다"})
		return
	}
	if getConfig().Role != "hq" {
		writeJSON(w, 400, map[string]any{"error": "이 노트북이 「본부」가 아닙니다"})
		return
	}
	var b struct {
		Confirm string `json:"confirm"`
	}
	if err := readBody(r, 1024, &b); err != nil || b.Confirm != "경기 기록 지우기" {
		writeJSON(w, 400, map[string]any{"error": "확인 글자가 맞지 않습니다"})
		return
	}
	type tgt struct{ addr, court string }
	var list []tgt
	res := map[string]string{}
	hqMu.Lock()
	for a, ct := range courts {
		if ct.online {
			list = append(list, tgt{a, ct.court})
		} else if ct.court != "" && res[ct.court] == "" {
			res[ct.court] = "끊김 · 연결한 뒤 다시 눌러 주세요"
		}
	}
	hqMu.Unlock()
	done := map[string]bool{}
	for _, t := range list {
		if t.court != "" && done[t.court] {
			continue
		}
		done[t.court] = true
		j, err := postJSON(t.addr, "/api/inbox/clearscores", b, 20*time.Second)
		switch {
		case err != nil:
			res[t.court] = "실패: " + err.Error()
		case j["error"] != nil:
			res[t.court] = "실패: " + toStr(j["error"])
		default:
			res[t.court] = "ok"
		}
	}
	flushAll()
	bk := backupData("경기기록지우기")
	moveInto(filepath.Join(resultsDir, "본부수집"), bk)
	n := 0
	if s := stores["hq"]; s != nil {
		n = s.delPrefixes(clearPrefixHQ)
		s.flush()
	}
	for k, s := range stores {
		if s != nil && k != "hq" {
			n += clearAppScores(k, s)
			s.flush()
		}
	}
	go cleanCerts(true)
	tidyStores(true)
	writeJSON(w, 200, map[string]any{"ok": true, "backup": bk, "docs": n, "courts": res})
}
