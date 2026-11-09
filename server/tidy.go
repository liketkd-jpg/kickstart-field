package main

// v1.4.55 저장 공간 정리
//   - 경기 기록(logs/)·호출 기록(calllog/)은 최근 것만 남김 (가상 경기를 여러 번 돌려도 계속 쌓이지 않게)
//   - 가상 경기 초기화 때는 그 기록을 모두 지움
//   - 프로그램 기록 파일(기록.log)이 5MB를 넘으면 새로 시작
//   - 상장 자동 출력 창(엣지 별도 프로필)의 임시 캐시 폴더를 시작할 때 지움
//   - /api/disk : 남은 하드 공간과 현장 프로그램 폴더 크기 (첫 화면에 표시)

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

var tidyKeep = map[string]int{"logs/": 20000, "calllog/": 3000} // 실제 대회 하루치(800명)보다 넉넉하게

// 접두어로 시작하는 문서를 「at」이 최근인 순으로 keep 개만 남기고 지움. 지운 개수를 돌려줌
func (s *Store) pruneDocs(prefix string, keep int) int {
	type it struct {
		p  string
		at int64
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	var L []it
	for p, raw := range s.docs {
		if !strings.HasPrefix(p, prefix) {
			continue
		}
		var v struct {
			At int64 `json:"at"`
		}
		_ = json.Unmarshal(raw, &v)
		L = append(L, it{p, v.At})
	}
	if len(L) <= keep {
		return 0
	}
	sort.Slice(L, func(i, j int) bool { return L[i].at > L[j].at })
	n := 0
	for _, x := range L[keep:] {
		delete(s.docs, x.p)
		s.seq++
		s.broadcast(sse("chg", map[string]any{"seq": s.seq, "path": x.p, "data": nil}))
		n++
	}
	s.dirty = true
	return n
}

func tidyStores(reset bool) {
	for _, s := range stores {
		if s == nil {
			continue
		}
		for p, k := range tidyKeep {
			if reset {
				k = 0
			}
			s.pruneDocs(p, k)
		}
	}
}

// 시작할 때 한 번 + 10분마다
func startTidy() {
	rotateLog()
	clearPrintCache()
	go cleanCerts(false) // 7일 지난 상장 파일
	go func() {
		time.Sleep(20 * time.Second)
		for {
			tidyStores(false)
			time.Sleep(10 * time.Minute)
		}
	}()
}

func rotateLog() {
	p := filepath.Join(dataDir, "기록.log")
	if fi, err := os.Stat(p); err == nil && fi.Size() > 5<<20 {
		old := filepath.Join(dataDir, "기록(이전).log")
		_ = os.Remove(old)
		_ = os.Rename(p, old)
	}
}

// 엣지 별도 프로필의 캐시만 지움 (인쇄 설정은 그대로)
func clearPrintCache() {
	base := filepath.Join(dataDir, "자동출력창")
	for _, d := range []string{"Cache", "Code Cache", "GPUCache", "Service Worker", "GrShaderCache", "ShaderCache", "DawnCache", "DawnGraphiteCache", "DawnWebGPUCache", "Crashpad"} {
		_ = os.RemoveAll(filepath.Join(base, "Default", d))
		_ = os.RemoveAll(filepath.Join(base, d))
	}
}

func dirSize(p string) int64 {
	var n int64
	_ = filepath.Walk(p, func(_ string, fi os.FileInfo, err error) error {
		if err == nil && !fi.IsDir() {
			n += fi.Size()
		}
		return nil
	})
	return n
}

// GET /api/disk
func handleDisk(w http.ResponseWriter, r *http.Request) {
	free, total := diskFree(baseDir)
	parts := map[string]int64{}
	if es, err := os.ReadDir(baseDir); err == nil {
		for _, e := range es {
			p := filepath.Join(baseDir, e.Name())
			if e.IsDir() {
				parts[e.Name()] = dirSize(p)
			} else if fi, err := e.Info(); err == nil {
				parts["(파일)"] += fi.Size()
			}
		}
	}
	var used int64
	for _, v := range parts {
		used += v
	}
	writeJSON(w, 200, map[string]any{"free": free, "total": total, "used": used, "parts": parts, "dir": baseDir})
}
