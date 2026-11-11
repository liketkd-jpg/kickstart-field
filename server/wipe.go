package main

// v1.4.75 본부 「전체 초기화」
//   본부에서 한 번 누르면 (시험 모드에서만, 두 번 확인):
//   1) 본부와 각 코트 노트북이 먼저 「대회결과\백업\전체초기화_시각」에 지금 데이터를 백업
//   2) 코트: 품새·격파·겨루기 앱의 명단·부문(대진)·점수·결과·호출 기록·상장 파일을 지움
//      (대회 설정·허가 코드·음악·심판 자리는 그대로)
//   3) 본부: 대회 운영표·호출 기록·대기실 연락·출석을 지움 (본부 설정·코트 주소·대회명·종목별 규칙은 그대로)
//   4) 자동 저장 파일·본부에 모인 파일은 지우지 않고 백업 폴더로 옮김 (통합 결과에 예전 기록이 다시 나오지 않게)

import (
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

type wipeMsg struct {
	At int64 `json:"at"`
}

var wipeKeepApp = []string{"comp/settings", "comp/music", "comp/snd_", "music/", "voicefile/", "seats/"}
var wipeKeepHQ = []string{"hqcfg/", "hqbackup/", "hq/speaker", "courts/"}

// keep 접두어로 시작하지 않는 문서를 모두 지움. 지운 개수
func (s *Store) wipe(keep []string) int {
	s.mu.Lock()
	var del []string
	for p := range s.docs {
		k := false
		for _, x := range keep {
			if strings.HasPrefix(p, x) {
				k = true
				break
			}
		}
		if !k {
			del = append(del, p)
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
	if len(del) > 0 {
		s.flush()
	}
	return len(del)
}

func flushAll() {
	for _, s := range stores {
		if s != nil {
			s.flush()
		}
	}
}

// 폴더를 백업 폴더 안으로 옮김 (없으면 그냥 넘어감)
func moveInto(src, backupDir string) {
	if backupDir == "" {
		return
	}
	if fi, err := os.Stat(src); err != nil || !fi.IsDir() {
		return
	}
	dst := filepath.Join(backupDir, filepath.Base(src))
	if err := os.Rename(src, dst); err != nil {
		_ = os.MkdirAll(dst, 0o755)
	}
}

// 이 노트북(코트)의 경기 데이터 지우기
func wipeCourt() (string, int) {
	flushAll()
	bk := backupData("전체초기화")
	if bk != "" {
		moveInto(autoDir(), bk)
	}
	n := 0
	for k, s := range stores {
		if s == nil || k == "hq" {
			continue
		}
		n += s.wipe(wipeKeepApp)
	}
	go cleanCerts(true)
	return bk, n
}

// POST /api/inbox/wipe (본부 → 코트)
func handleInboxWipe(w http.ResponseWriter, r *http.Request) {
	var m wipeMsg
	_ = readBody(r, 1024, &m)
	if getConfig().Mode == "live" {
		writeJSON(w, 409, map[string]any{"error": "실제 대회 모드라서 지우지 않았습니다"})
		return
	}
	bk, n := wipeCourt()
	c := getConfig()
	if m.At > 0 {
		c.WipeAt = m.At
	} else {
		c.WipeAt = time.Now().UnixMilli()
	}
	setConfig(c)
	writeJSON(w, 200, map[string]any{"ok": true, "backup": bk, "docs": n})
}

// POST /api/hq/wipe {confirm:"전체 초기화"} — 본부 노트북 화면에서만, 시험 모드에서만
func handleHQWipe(w http.ResponseWriter, r *http.Request) {
	if !isLocalReq(r) {
		writeJSON(w, 403, map[string]any{"error": "전체 초기화는 본부 노트북 화면에서만 할 수 있습니다"})
		return
	}
	c := getConfig()
	if c.Role != "hq" {
		writeJSON(w, 400, map[string]any{"error": "이 노트북이 「본부」가 아닙니다"})
		return
	}
	if c.Mode == "live" {
		writeJSON(w, 409, map[string]any{"error": "실제 대회 모드에서는 전체 초기화가 잠겨 있습니다 · 시험 모드로 바꾼 뒤 하세요"})
		return
	}
	var b struct {
		Confirm string `json:"confirm"`
	}
	if err := readBody(r, 1024, &b); err != nil || b.Confirm != "전체 초기화" {
		writeJSON(w, 400, map[string]any{"error": "확인 글자가 맞지 않습니다"})
		return
	}
	m := wipeMsg{At: time.Now().UnixMilli()}
	c.WipeAt = m.At // 지금 꺼져 있는 코트도 다시 연결되면 이 초기화를 받음
	setConfig(c)
	// 1) 코트부터 (본부 백업에 코트 결과가 남아 있도록 본부는 나중에)
	type tgt struct{ addr, court string }
	var list []tgt
	res := map[string]string{}
	hqMu.Lock()
	for a, ct := range courts {
		if ct.online {
			list = append(list, tgt{a, ct.court})
		} else if ct.court != "" && res[ct.court] == "" {
			res[ct.court] = "끊김 · 다시 연결되면 저절로 지움"
		}
	}
	hqMu.Unlock()
	done := map[string]bool{}
	for _, t := range list {
		if t.court != "" && done[t.court] { // 같은 노트북이 주소 두 개로 보일 때 두 번 지우지 않게 (백업이 덮이지 않게)
			continue
		}
		done[t.court] = true
		j, err := postJSON(t.addr, "/api/inbox/wipe", m, 20*time.Second)
		switch {
		case err != nil:
			res[t.court] = "실패: " + err.Error()
		case j["error"] != nil:
			res[t.court] = "실패: " + toStr(j["error"])
		default:
			res[t.court] = "ok"
		}
	}
	// 2) 본부
	flushAll()
	bk := backupData("전체초기화")
	moveInto(filepath.Join(resultsDir, "본부수집"), bk)
	n := 0
	if s := stores["hq"]; s != nil {
		n = s.wipe(wipeKeepHQ)
	}
	// 본부 노트북이 코트 역할 앱 데이터도 가지고 있으면 함께
	for k, s := range stores {
		if s != nil && k != "hq" {
			n += s.wipe(wipeKeepApp)
		}
	}
	go cleanCerts(true)
	writeJSON(w, 200, map[string]any{"ok": true, "backup": bk, "docs": n, "courts": res})
}

func toStr(v any) string {
	if s, ok := v.(string); ok {
		return s
	}
	return "알 수 없음"
}
