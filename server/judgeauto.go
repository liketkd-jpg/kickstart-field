// 코트 심판 링크 (종목 자동): /judge/<번호>
//
// 심판이 이 링크(또는 QR)로 한 번 들어오면, 이 코트에서 지금 경기 중인 종목(품새·격파·겨루기)의 채점기로 열립니다.
// 코트에서 다른 종목 경기가 시작되면 심판 화면이 그 종목 채점기로 알아서 바뀝니다 (각 앱의 자동 전환 코드가 /api/court/active 를 봄).
// 예전 링크(/poomsae/#judge-1 처럼 종목이 정해진 링크)는 그대로 쓸 수 있습니다 — 자동 전환이 안 될 때 예비로.
package main

import (
	"encoding/json"
	"net/http"
	"regexp"
	"time"
)

var judgeNum = regexp.MustCompile(`^[1-7]$`)

// 지금 이 노트북에서 경기가 호출되어 있는 종목. 운영석이 15초마다 올리는 hq/board 의 now 로 판단합니다
func courtActive() map[string]any {
	type st struct {
		Now bool  `json:"now"`
		At  int64 `json:"at"`
	}
	out := map[string]st{}
	active, best, last, lastAt := "", int64(0), "", int64(0)
	nowMs := time.Now().UnixMilli()
	for _, a := range apps {
		s := stores[a.Key]
		if s == nil {
			continue
		}
		s.mu.Lock()
		raw, ok := s.docs["hq/board"]
		s.mu.Unlock()
		if !ok {
			continue
		}
		var b struct {
			Now json.RawMessage `json:"now"`
			At  int64           `json:"at"`
		}
		if json.Unmarshal(raw, &b) != nil {
			continue
		}
		fresh := nowMs-b.At < 90*1000
		// 「채점 중」인 경기만 (점수 공개·경기 끝 상태는 아님)
		var cur struct {
			Status string `json:"status"`
		}
		has := fresh && len(b.Now) > 0 && string(b.Now) != "null" && json.Unmarshal(b.Now, &cur) == nil && cur.Status != "점수 공개" && cur.Status != "경기 끝"
		out[a.Key] = st{Now: has, At: b.At}
		if has && b.At > best {
			active, best = a.Key, b.At
		}
		if fresh && b.At > lastAt {
			last, lastAt = a.Key, b.At
		}
	}
	return map[string]any{"active": active, "last": last, "apps": out, "time": nowMs}
}

func serveJudgeAuto(w http.ResponseWriter, n string) {
	if !judgeNum.MatchString(n) {
		http.Error(w, "심판 번호는 1~7입니다", 404)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	_, _ = w.Write([]byte(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>` + n + `심 채점기</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0B0D12;color:#F1E7CF;font:700 18px/1.5 "Malgun Gothic",sans-serif;text-align:center}small{display:block;color:#9A927F;font-weight:500;font-size:14px;margin-top:8px}</style></head>
<body><div>` + n + `심 채점기를 여는 중…<small>이 코트에서 지금 경기 중인 종목으로 자동 연결됩니다</small></div>
<script>
try{sessionStorage.setItem('ks_jauto','1');}catch(e){}
(async function(){let app='';
  for(let i=0;i<3&&!app;i++){try{const j=await (await fetch('/api/court/active',{cache:'no-store'})).json();app=j.active||j.last||'';}catch(e){}if(!app)await new Promise(r=>setTimeout(r,700));}
  if(!app){try{app=localStorage.getItem('ks_jauto_last')||'';}catch(e){}}
  location.replace('/'+(app||'poomsae')+'/#judge-` + n + `');})();
</script></body></html>`))
}
