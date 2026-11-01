// 관람객 실시간 결과
//   - /view      : 휴대폰으로 보는 관람객 화면 (같은 와이파이). /view#send 는 인터넷(접수 홈페이지)으로 보내는 송출 화면
//   - /api/view  : 코트 진행 상황·입상 결과 모음 (본부 노트북은 모든 코트, 코트 노트북은 자기 코트)
//     심판 연결 같은 운영 정보는 빼고, 관람객에게 필요한 것만 담습니다.
package main

import (
	"encoding/json"
	"net/http"
	"sort"
	"time"
)

type viewApp struct {
	App     string `json:"app"`
	AppName string `json:"appName"`
	Board   any    `json:"board"`
	Results any    `json:"results"`
}

type viewCourt struct {
	Court  string    `json:"court"`
	Online bool      `json:"online"`
	Apps   []viewApp `json:"apps"`
}

// 관람객 화면에 쓰는 것만 남김
func slimBoard(raw json.RawMessage) (map[string]any, string, string) {
	var b map[string]any
	if len(raw) == 0 || json.Unmarshal(raw, &b) != nil || b == nil {
		return nil, "", ""
	}
	out := map[string]any{}
	for _, k := range []string{"now", "curDiv", "progress", "nextDiv", "at"} {
		if v, ok := b[k]; ok {
			out[k] = v
		}
	}
	if nx, ok := b["next"].([]any); ok {
		if len(nx) > 5 {
			nx = nx[:5]
		}
		out["next"] = nx
	}
	comp, _ := b["comp"].(string)
	name, _ := b["appName"].(string)
	return out, comp, name
}

func slimResults(raw json.RawMessage) map[string]any {
	var r struct {
		Divs []struct {
			Div    string `json:"div"`
			Done   bool   `json:"done"`
			Podium []struct {
				Rank int    `json:"rank"`
				Name string `json:"name"`
				Team string `json:"team"`
			} `json:"podium"`
		} `json:"divs"`
	}
	if len(raw) == 0 || json.Unmarshal(raw, &r) != nil {
		return nil
	}
	divs := []any{}
	for _, d := range r.Divs {
		if len(d.Podium) == 0 {
			continue
		}
		divs = append(divs, d)
	}
	return map[string]any{"divs": divs}
}

func courtApps(feed json.RawMessage, comp *string) []viewApp {
	var m map[string]struct {
		Board   json.RawMessage `json:"board"`
		Results json.RawMessage `json:"results"`
	}
	if len(feed) == 0 || json.Unmarshal(feed, &m) != nil {
		return nil
	}
	out := []viewApp{}
	for _, a := range apps {
		v, ok := m[a.Key]
		if !ok {
			continue
		}
		b, c, name := slimBoard(v.Board)
		r := slimResults(v.Results)
		if b == nil && r == nil {
			continue
		}
		if *comp == "" && c != "" {
			*comp = c
		}
		if name == "" {
			name = map[string]string{"poomsae": "품새", "kyorugi": "겨루기", "gyeokpa": "격파"}[a.Key]
		}
		out = append(out, viewApp{App: a.Key, AppName: name, Board: b, Results: r})
	}
	return out
}

// 자기 노트북의 진행 정보 (handleFeed 와 같은 자료)
func ownFeed() json.RawMessage {
	m := map[string]map[string]json.RawMessage{}
	for _, a := range apps {
		s := stores[a.Key]
		if s == nil {
			continue
		}
		s.mu.Lock()
		b, okb := s.docs["hq/board"]
		res, okr := s.docs["hq/results"]
		s.mu.Unlock()
		if okb || okr {
			x := map[string]json.RawMessage{}
			if okb {
				x["board"] = b
			}
			if okr {
				x["results"] = res
			}
			m[a.Key] = x
		}
	}
	j, _ := json.Marshal(m)
	return j
}

func viewSnapshot() map[string]any {
	c := getConfig()
	comp := ""
	list := []viewCourt{}
	if c.Role == "hq" {
		type cp struct {
			court  string
			online bool
			feed   json.RawMessage
		}
		var cs []cp
		hqMu.Lock()
		for _, e := range courts {
			cs = append(cs, cp{e.court, e.online, append(json.RawMessage(nil), e.lastFeed...)})
		}
		hqMu.Unlock()
		sort.Slice(cs, func(i, j int) bool { return cs[i].court < cs[j].court })
		for _, x := range cs {
			if a := courtApps(x.feed, &comp); len(a) > 0 {
				list = append(list, viewCourt{Court: x.court, Online: x.online, Apps: a})
			}
		}
	} else if a := courtApps(ownFeed(), &comp); len(a) > 0 {
		list = append(list, viewCourt{Court: c.Court, Online: true, Apps: a})
	}
	return map[string]any{"v": 1, "sig": "KICKSTART", "role": c.Role, "at": time.Now().UnixMilli(), "comp": comp, "courts": list}
}

func handleView(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, 200, viewSnapshot())
}
