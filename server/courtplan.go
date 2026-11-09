// 코트 노트북 첫 화면 · 종목 자동 전환 (v1.4.54)
//
// GET /api/court/plan → 이 코트 노트북의 종목 앱마다 부문 목록(이름·끝난 경기·전체 경기)과 지금 경기.
// 부문 이름 앞 번호(01, 02 …)는 본부 「대회 운영표」의 이 코트 순서이므로, 첫 화면이 그 순서대로
// 「지금 할 종목」 카드를 보여 주고, 운영석은 한 종목이 끝나면 다음 종목 운영석으로 넘어가도록 안내합니다.
package main

import (
	"encoding/json"
	"net/http"
	"sort"
	"strings"
	"time"
)

type planDiv struct {
	Name  string `json:"name"`
	Done  int    `json:"done"`
	Total int    `json:"total"`
	At    string `json:"at,omitempty"` // 운영표 예상 시작 (HH:MM)
}

func courtPlan() map[string]any {
	var list []map[string]any
	nowMs := time.Now().UnixMilli()
	for _, a := range apps {
		s := stores[a.Key]
		if s == nil {
			continue
		}
		s.mu.Lock()
		braw, okb := s.docs["hq/board"]
		var chunks []json.RawMessage
		var keys []string
		for k := range s.docs {
			if strings.HasPrefix(k, "divc/") {
				keys = append(keys, k)
			}
		}
		sort.Strings(keys)
		for _, k := range keys {
			chunks = append(chunks, s.docs[k])
		}
		inb, okin := s.docs["inbox/roster"]
		traw, okt := s.docs["hq/times"]
		s.mu.Unlock()
		var times map[string]string
		if okt {
			var t struct {
				Times map[string]string `json:"times"`
			}
			if json.Unmarshal(traw, &t) == nil {
				times = t.Times
			}
		}
		e := map[string]any{"app": a.Key, "title": a.Title}
		// 본부가 보냈지만 운영석이 아직 넣지 않은 명단 (그 종목 운영석을 열면 들어감)
		var pending []planDiv
		if okin {
			var ib struct {
				Rows [][]any `json:"rows"`
				Done bool    `json:"done"`
			}
			if json.Unmarshal(inb, &ib) == nil && !ib.Done && len(ib.Rows) > 1 {
				col := -1
				for i, h := range ib.Rows[0] {
					if hs, _ := h.(string); hs == "부문" {
						col = i
					}
				}
				if col >= 0 {
					idx := map[string]int{}
					for _, r := range ib.Rows[1:] {
						if col >= len(r) {
							continue
						}
						nm, _ := r[col].(string)
						if nm == "" {
							continue
						}
						if j, ok := idx[nm]; ok {
							pending[j].Total++
						} else {
							idx[nm] = len(pending)
							pending = append(pending, planDiv{Name: nm, Total: 1})
						}
					}
				}
			}
		}
		var divs []planDiv
		if okb {
			var b struct {
				Now  json.RawMessage `json:"now"`
				Divs []planDiv       `json:"divs"`
				At   int64           `json:"at"`
			}
			if json.Unmarshal(braw, &b) == nil {
				divs = b.Divs
				e["at"] = b.At
				e["fresh"] = nowMs-b.At < 90*1000
				if len(b.Now) > 0 && string(b.Now) != "null" {
					e["now"] = b.Now
				}
			}
		}
		// 운영석을 아직 연 적이 없으면(진행 정보 없음) 저장된 부문 목록으로
		if len(divs) == 0 {
			for _, c := range chunks {
				var ch struct {
					List []struct {
						Name  string   `json:"name"`
						Order []string `json:"order"`
					} `json:"list"`
				}
				if json.Unmarshal(c, &ch) == nil {
					for _, d := range ch.List {
						divs = append(divs, planDiv{Name: d.Name, Total: len(d.Order)})
					}
				}
			}
		}
		if len(pending) > 0 {
			divs = pending
			e["pending"] = true
		}
		// 생활체육 「· 1조」처럼 나뉜 부문도 원래 부문 시각을 씀
		for i := range divs {
			nm := divs[i].Name
			if j := strings.LastIndex(nm, " · "); j > 0 && strings.HasSuffix(nm, "조") {
				nm = nm[:j]
			}
			if t, ok := times[nm]; ok {
				divs[i].At = t
			}
		}
		e["divs"] = divs
		list = append(list, e)
	}
	c := getConfig()
	return map[string]any{"court": c.Court, "role": c.Role, "apps": list, "time": nowMs}
}

func handleCourtPlan(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, courtPlan())
}
