package main

// v1.4.64 시험 모드 / 실제 대회 모드
//   - 본부에서 바꾸면 연결된 모든 코트 노트북에 같이 적용 (/api/inbox/mode)
//   - 실제 대회로 바꿀 때: 각 노트북이 지금 데이터를 「대회결과\백업\실제대회전환_시각」에 먼저 복사해 둠
//     (시험 기록 지우기는 본부 화면이 이어서 「가상 경기 초기화」로 보냄)
//   - 실제 대회 모드에서는 자동 업데이트를 하지 않음 · 화면의 위험한 단추(초기화·명단 지우기 등)는 mode.js 가 잠금
//   - 「자동 업데이트 멈춤」 스위치: 설정.json autoUpdate 값을 본부에서 켜고 끔

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type modeMsg struct {
	Mode   string `json:"mode,omitempty"`   // "live" | "test" | "" (그대로)
	Update *bool  `json:"update,omitempty"` // 자동 업데이트 켜기/끄기 (nil 이면 그대로)
	At     int64  `json:"at,omitempty"`
}

func modeState() map[string]any {
	c := getConfig()
	m := "test"
	if c.Mode == "live" {
		m = "live"
	}
	return map[string]any{"mode": m, "at": c.ModeAt, "update": c.updateSwitch(), "updating": c.autoUpdate(), "role": c.Role, "court": c.Court, "version": version}
}

// 이 노트북에 적용 · 실제 대회로 바뀌는 순간 데이터 백업
func applyMode(m modeMsg) (backup string) {
	c := getConfig()
	// v1.4.82 예전 명령(다른 본부가 더 나중에 바꾼 뒤 들어온 것)은 무시 — 노트북 한두 대가 혼자 다른 모드로 돌아가던 문제
	if (m.Mode == "live" || m.Mode == "test") && m.At > 0 && c.ModeAt > 0 && m.At < c.ModeAt && modeName(c) != m.Mode {
		m.Mode = ""
	}
	if m.Mode == "live" || m.Mode == "test" {
		if m.Mode == "live" && c.Mode != "live" {
			backup = backupData("실제대회전환")
			go stopSimAll() // 실제 대회로 바뀌면 가상 경기는 저절로 멈춤
		}
		if modeName(c) != m.Mode || c.ModeAt == 0 {
			if m.At > 0 {
				c.ModeAt = m.At
			} else {
				c.ModeAt = time.Now().UnixMilli()
			}
		}
		if m.Mode == "test" {
			c.Mode = ""
		} else {
			c.Mode = "live"
		}
	}
	if m.Update != nil {
		if *m.Update {
			c.AutoUpdate = ""
		} else {
			c.AutoUpdate = "꺼짐"
		}
	}
	setConfig(c)
	return backup
}

// 현장모드_데이터 의 JSON(경기 데이터·설정)을 날짜·시각 폴더로 복사
func backupData(tag string) string {
	dir := filepath.Join(resultsDir, "백업", tag+"_"+time.Now().Format("2006-01-02_150405"))
	for i := 2; i < 50; i++ { // 같은 초에 두 번 백업해도 덮어쓰지 않게
		if _, err := os.Stat(dir); err != nil {
			break
		}
		dir = filepath.Join(resultsDir, "백업", fmt.Sprintf("%s_%s_%d", tag, time.Now().Format("2006-01-02_150405"), i))
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return ""
	}
	es, err := os.ReadDir(dataDir)
	if err != nil {
		return ""
	}
	n := 0
	for _, e := range es {
		if e.IsDir() || !strings.HasSuffix(strings.ToLower(e.Name()), ".json") {
			continue
		}
		b, err := os.ReadFile(filepath.Join(dataDir, e.Name()))
		if err != nil {
			continue
		}
		if os.WriteFile(filepath.Join(dir, e.Name()), b, 0o644) == nil {
			n++
		}
	}
	if n == 0 {
		return ""
	}
	return dir
}

// GET /api/mode · POST /api/mode (이 노트북에서만; 본부면 모든 코트에도 보냄)
func handleMode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 200, modeState())
		return
	}
	if !isLocalReq(r) {
		writeJSON(w, 403, map[string]any{"error": "이 노트북에서만 바꿀 수 있습니다"})
		return
	}
	var m modeMsg
	if err := readBody(r, 1<<12, &m); err != nil || (m.Mode != "" && m.Mode != "live" && m.Mode != "test") {
		writeJSON(w, 400, map[string]any{"error": "invalid_argument"})
		return
	}
	m.At = time.Now().UnixMilli()
	if getConfig().Role == "court" && m.Mode != "" && hqConnected() {
		writeJSON(w, 409, map[string]any{"error": "이 코트 노트북은 본부와 연결되어 있어, 모드는 본부 노트북에서만 바꿀 수 있습니다"})
		return
	}
	res := map[string]string{}
	if m.Mode != "" {
		c := getConfig()
		c.ModeAt = 0 // 본부에서 직접 바꾸면 늘 가장 새 명령
		setConfig(c)
	}
	bk := applyMode(m)
	if getConfig().Role == "hq" {
		hqMu.Lock()
		type tgt struct{ addr, court string }
		var ts []tgt
		for a, c := range courts {
			if c.online && c.court != "" {
				ts = append(ts, tgt{a, c.court})
			}
		}
		hqMu.Unlock()
		b, _ := json.Marshal(m)
		done := make(chan [2]string, len(ts))
		for _, t := range ts {
			go func(t tgt) {
				ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
				defer cancel()
				req, _ := http.NewRequestWithContext(ctx, "POST", "http://"+t.addr+"/api/inbox/mode", bytes.NewReader(b))
				req.Header.Set("Content-Type", "application/json")
				resp, err := http.DefaultClient.Do(req)
				if err != nil {
					done <- [2]string{t.court, "✕ 연결 안 됨"}
					return
				}
				io.Copy(io.Discard, resp.Body)
				resp.Body.Close()
				if resp.StatusCode != 200 {
					done <- [2]string{t.court, "✕ 받지 못함 (예전 버전일 수 있음)"}
					return
				}
				done <- [2]string{t.court, "✓"}
			}(t)
		}
		for range ts {
			x := <-done
			res[x[0]] = x[1]
		}
	}
	v := modeState()
	v["courts"] = res
	v["backup"] = bk
	writeJSON(w, 200, v)
}

// POST /api/inbox/mode (본부 → 코트)
func handleInboxMode(w http.ResponseWriter, r *http.Request) {
	var m modeMsg
	if err := readBody(r, 1<<12, &m); err != nil || (m.Mode != "" && m.Mode != "live" && m.Mode != "test") {
		writeJSON(w, 400, map[string]any{"error": "invalid_argument"})
		return
	}
	bk := applyMode(m)
	v := modeState()
	v["backup"] = bk
	writeJSON(w, 200, v)
}

// 본부 노트북: 처음 켤 때 모드 시각이 없으면 지금으로 (코트들이 이 본부의 모드를 따르게)
func initModeAt() {
	c := getConfig()
	if c.Role == "hq" && c.ModeAt == 0 {
		c.ModeAt = time.Now().UnixMilli()
		setConfig(c)
	}
}

// 이 노트북의 모든 경기 앱에서 가상 경기를 끔
func stopSimAll() {
	for k, s := range stores {
		if s == nil || k == "hq" {
			continue
		}
		s.mu.Lock()
		_, has := s.docs["sim/main"]
		s.mu.Unlock()
		if has {
			s.setDoc("sim/main", map[string]any{"on": false, "speed": 30, "at": 0, "from": "실제 대회 전환"})
		}
	}
}

var (
	wipeSyncMu sync.Mutex
	wipeSyncAt = map[string]time.Time{}
)

// 같은 코트에 1분에 한 번까지만 자동 초기화
func wipeSyncOK(court string) bool {
	wipeSyncMu.Lock()
	defer wipeSyncMu.Unlock()
	if time.Since(wipeSyncAt[court]) < time.Minute {
		return false
	}
	wipeSyncAt[court] = time.Now()
	return true
}

func modeName(c nodeConfig) string {
	if c.Mode == "live" {
		return "live"
	}
	return "test"
}

var (
	modeSyncMu sync.Mutex
	modeSyncAt = map[string]time.Time{}
)

// 같은 코트에 10초에 한 번까지만
func modeSyncOK(addr string) bool {
	modeSyncMu.Lock()
	defer modeSyncMu.Unlock()
	if time.Since(modeSyncAt[addr]) < 10*time.Second {
		return false
	}
	modeSyncAt[addr] = time.Now()
	return true
}
