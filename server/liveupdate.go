package main

// v1.4.67 화면에서 업데이트
//   - 켤 때만 확인하던 것을, 켜져 있는 동안에도 10분마다 깃허브 최신 버전을 확인합니다 (인터넷이 있을 때만)
//   - 새 버전이 있으면 첫 화면·본부 화면에 「새 버전이 있습니다 · 지금 업데이트」 띠가 나옵니다
//   - 누르면 새 프로그램을 받아 바꾸고, 같은 포트로 다시 켭니다. 열려 있던 화면(본부 모니터 포함)은 저절로 새로 고침됩니다
//   - 경기 데이터는 그대로입니다. 바꾸기 직전에 모든 데이터를 저장합니다

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"sync"
	"sync/atomic"
	"time"
)

var (
	mainLn  net.Listener
	exePath string
	upMu    sync.Mutex
	upTag   string
	upAsset *ghAsset
	upAt    int64
	upBusy  bool
	upErr   string

	restarting atomic.Bool // 업데이트로 다시 켜는 중 (서버가 닫혀도 오류로 보지 않음)
)

func fetchLatest() (string, *ghAsset, error) {
	api := os.Getenv("KS_UPDATE_API")
	if api == "" {
		api = "https://api.github.com"
	}
	c := &http.Client{Timeout: 8 * time.Second}
	req, _ := http.NewRequest("GET", api+"/repos/"+updateRepo+"/releases/latest", nil)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "kickstart-field/"+version)
	res, err := c.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		return "", nil, fmt.Errorf("응답 %d", res.StatusCode)
	}
	var rel ghRelease
	if err := json.NewDecoder(io.LimitReader(res.Body, 2<<20)).Decode(&rel); err != nil || rel.Draft || rel.Pre {
		return "", nil, fmt.Errorf("업데이트 정보를 읽지 못했습니다")
	}
	for i := range rel.Assets {
		if rel.Assets[i].Name == assetName() {
			return rel.Tag, &rel.Assets[i], nil
		}
	}
	return rel.Tag, nil, nil
}

func checkLatestNow() {
	tag, a, err := fetchLatest()
	upMu.Lock()
	if err == nil {
		upTag, upAsset, upAt = tag, a, time.Now().UnixMilli()
	}
	upMu.Unlock()
}

func startUpdateWatch() {
	if os.Getenv("KS_NO_UPDATE") != "" {
		return
	}
	go func() {
		time.Sleep(8 * time.Second)
		for {
			if getConfig().updateSwitch() {
				checkLatestNow()
			}
			time.Sleep(10 * time.Minute)
		}
	}()
}

// GET /api/update — 지금 버전·최신 버전 · POST (이 노트북에서만) — 받아서 바꾸고 다시 켜기 · POST ?check=1 — 바로 확인
func handleUpdate(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		if !isLocalReq(r) {
			writeJSON(w, 403, map[string]any{"error": "업데이트는 그 노트북 화면에서만 할 수 있습니다"})
			return
		}
		if r.URL.Query().Get("check") != "" {
			checkLatestNow()
		} else {
			upMu.Lock()
			a, tag, busy := upAsset, upTag, upBusy
			if a != nil && newerThan(tag, version) && !busy {
				upBusy, upErr = true, ""
			}
			upMu.Unlock()
			if a == nil || !newerThan(tag, version) {
				writeJSON(w, 400, map[string]any{"error": "받을 새 버전이 없습니다"})
				return
			}
			if !busy {
				go runLiveUpdate(a, tag)
			}
		}
	}
	upMu.Lock()
	v := map[string]any{"version": version, "latest": upTag, "newer": upAsset != nil && newerThan(upTag, version),
		"at": upAt, "busy": upBusy, "error": upErr, "live": getConfig().Mode == "live", "auto": getConfig().updateSwitch()}
	upMu.Unlock()
	writeJSON(w, 200, v)
}

func runLiveUpdate(a *ghAsset, tag string) {
	fail := func(m string) {
		upMu.Lock()
		upBusy, upErr = false, m
		upMu.Unlock()
	}
	exe := exePath
	if exe == "" {
		fail("프로그램 위치를 찾지 못했습니다")
		return
	}
	cleanupOld(exe)
	if err := download(a, exe+".new"); err != nil {
		_ = os.Remove(exe + ".new")
		fail("내려받지 못했습니다: " + err.Error())
		return
	}
	for _, s := range stores {
		if s != nil {
			s.flush()
		}
	}
	if err := os.Rename(exe, exe+".old"); err != nil {
		_ = os.Remove(exe + ".new")
		fail("프로그램 파일을 바꿀 권한이 없습니다")
		return
	}
	if err := os.Rename(exe+".new", exe); err != nil {
		_ = os.Rename(exe+".old", exe)
		fail("프로그램 파일을 바꾸지 못했습니다")
		return
	}
	fmt.Printf("\n  %s(으)로 업데이트했습니다. 새 버전으로 다시 켭니다…\n", tag)
	cmd := exec.Command(exe, os.Args[1:]...)
	cmd.Stdin, cmd.Stdout, cmd.Stderr = os.Stdin, os.Stdout, os.Stderr
	cmd.Env = append(os.Environ(), "KS_JUST_UPDATED="+version, "KS_RESTART_PORT="+strconv.Itoa(port))
	if err := cmd.Start(); err != nil {
		_ = os.Rename(exe, exe+".new")
		_ = os.Rename(exe+".old", exe)
		fmt.Println("  새 버전을 켜지 못했습니다. 이 창을 닫고 프로그램을 다시 실행해 주세요.")
		fail("새 버전을 켜지 못했습니다. 프로그램을 닫고 다시 실행해 주세요")
		return
	}
	// 새 프로그램은 이 포트가 빌 때까지 기다렸다가 같은 주소로 켜집니다
	restarting.Store(true)
	if mainLn != nil {
		_ = mainLn.Close()
	}
	for _, s := range stores {
		if s != nil {
			s.flush()
		}
	}
	time.Sleep(300 * time.Millisecond)
	os.Exit(0)
}
