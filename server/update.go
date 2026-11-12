// 자동 업데이트: 켤 때 한 번만 깃허브(liketkd-jpg/kickstart-field)의 최신 릴리스를 확인합니다.
// 새 버전이 있으면 프로그램 파일만 바꾸고 다시 켭니다. 대회 데이터(현장모드_데이터, 대회결과)는 그대로 둡니다.
// 인터넷이 없거나 깃허브에 닿지 않으면 조용히 건너뛰고 지금 버전으로 실행합니다.
package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"
)

const updateRepo = "liketkd-jpg/kickstart-field"

var updateNote = "" // 화면 안내용 (예: "최신 버전입니다")

type ghAsset struct {
	Name   string `json:"name"`
	URL    string `json:"browser_download_url"`
	Size   int64  `json:"size"`
	Digest string `json:"digest"`
}
type ghRelease struct {
	Tag    string    `json:"tag_name"`
	Draft  bool      `json:"draft"`
	Pre    bool      `json:"prerelease"`
	Assets []ghAsset `json:"assets"`
}

// 운영체제별로 받을 파일 이름
func assetName() string {
	switch runtime.GOOS {
	case "windows":
		return "KICKSTART-field-windows.exe"
	case "darwin":
		return "KICKSTART-field-mac"
	}
	return "KICKSTART-field-linux"
}

// "v1.10.2" → [1 10 2]
func parseVer(s string) []int {
	s = strings.TrimPrefix(strings.TrimSpace(s), "v")
	if i := strings.IndexAny(s, "-+ "); i >= 0 {
		s = s[:i]
	}
	var out []int
	for _, p := range strings.Split(s, ".") {
		n, err := strconv.Atoi(p)
		if err != nil {
			return nil
		}
		out = append(out, n)
	}
	return out
}

func newerThan(a, b string) bool {
	x, y := parseVer(a), parseVer(b)
	if x == nil || y == nil {
		return false
	}
	for len(x) < 3 {
		x = append(x, 0)
	}
	for len(y) < 3 {
		y = append(y, 0)
	}
	for i := 0; i < 3; i++ {
		if x[i] != y[i] {
			return x[i] > y[i]
		}
	}
	return false
}

// 지난 업데이트에서 남은 옛 파일 정리
func cleanupOld(exe string) {
	_ = os.Remove(exe + ".old")
	_ = os.Remove(exe + ".new")
}

// 켤 때 한 번 호출. 업데이트해서 새 프로그램을 띄웠으면 true (이 프로세스는 끝내야 함)
func checkForUpdate(exe string) bool {
	cleanupOld(exe)
	if os.Getenv("KS_JUST_UPDATED") != "" {
		return false // 방금 업데이트로 다시 켜진 경우: 한 번 더 확인하지 않음 (같은 버전을 계속 받는 일 방지)
	}
	if anotherRunning() {
		return false // 이미 켜져 있으면 그 창을 씁니다
	}
	if os.Getenv("KS_NO_UPDATE") != "" || !getConfig().autoUpdate() {
		updateNote = "자동 업데이트 꺼짐"
		return false
	}
	api := os.Getenv("KS_UPDATE_API")
	if api == "" {
		api = "https://api.github.com"
	}
	fmt.Println("  업데이트 확인 중… (인터넷이 없으면 바로 건너뜁니다)")
	c := &http.Client{Timeout: 5 * time.Second}
	req, _ := http.NewRequest("GET", api+"/repos/"+updateRepo+"/releases/latest", nil)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "kickstart-field/"+version)
	res, err := c.Do(req)
	var rel ghRelease
	if err == nil && res.StatusCode == 200 {
		dec := json.NewDecoder(io.LimitReader(res.Body, 2<<20)).Decode(&rel)
		res.Body.Close()
		if dec != nil || rel.Draft || rel.Pre {
			updateNote = "업데이트 정보를 읽지 못했습니다"
			return false
		}
	} else {
		if err == nil {
			res.Body.Close()
		}
		// v1.6.5 깃허브 API가 막혀도(노트북 여러 대 · 1시간 60번 제한) 웹 주소로 다시 확인
		tag, a, werr := latestViaWeb(err)
		if werr != nil || a == nil {
			if err != nil {
				updateNote = "인터넷 없음 · 업데이트 확인 건너뜀"
			} else {
				updateNote = "업데이트 확인이 잠시 막혔습니다 (잠시 뒤 다시 켜 주세요)"
			}
			return false
		}
		rel = ghRelease{Tag: tag, Assets: []ghAsset{*a}}
	}
	if !newerThan(rel.Tag, version) {
		updateNote = "최신 버전입니다"
		return false
	}
	var asset *ghAsset
	for i := range rel.Assets {
		if rel.Assets[i].Name == assetName() {
			asset = &rel.Assets[i]
		}
	}
	if asset == nil {
		updateNote = "새 버전 " + rel.Tag + "에 이 컴퓨터용 파일이 없습니다"
		return false
	}
	fmt.Printf("  새 버전 %s 이(가) 있습니다. 내려받는 중…\n", rel.Tag)
	if err := download(asset, exe+".new"); err != nil {
		_ = os.Remove(exe + ".new")
		fmt.Println("  업데이트를 내려받지 못했습니다:", err)
		fmt.Println("  지금 버전으로 계속 실행합니다.")
		updateNote = "업데이트 실패 · 지금 버전으로 실행"
		return false
	}
	// 실행 중인 파일은 지울 수 없어도 이름은 바꿀 수 있습니다 (윈도우 포함)
	if err := os.Rename(exe, exe+".old"); err != nil {
		_ = os.Remove(exe + ".new")
		updateNote = "업데이트 실패 (파일을 바꿀 권한 없음)"
		return false
	}
	if err := os.Rename(exe+".new", exe); err != nil {
		_ = os.Rename(exe+".old", exe)
		updateNote = "업데이트 실패 · 지금 버전으로 실행"
		return false
	}
	fmt.Printf("  %s(으)로 업데이트했습니다. 새 버전으로 다시 켭니다…\n", rel.Tag)
	cmd := exec.Command(exe, os.Args[1:]...)
	cmd.Stdin, cmd.Stdout, cmd.Stderr = os.Stdin, os.Stdout, os.Stderr
	cmd.Env = append(os.Environ(), "KS_JUST_UPDATED="+version)
	if err := cmd.Start(); err != nil {
		// 새 파일을 켜지 못하면 되돌림
		_ = os.Rename(exe, exe+".new")
		_ = os.Rename(exe+".old", exe)
		updateNote = "업데이트 실패 · 지금 버전으로 실행"
		return false
	}
	return true
}

func download(a *ghAsset, dst string) error {
	c := &http.Client{Timeout: 3 * time.Minute}
	req, _ := http.NewRequest("GET", a.URL, nil)
	req.Header.Set("User-Agent", "kickstart-field/"+version)
	res, err := c.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		return fmt.Errorf("응답 %d", res.StatusCode)
	}
	f, err := os.OpenFile(dst, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o755)
	if err != nil {
		return err
	}
	h := sha256.New()
	n, err := io.Copy(io.MultiWriter(f, h), io.LimitReader(res.Body, 200<<20))
	if cerr := f.Close(); err == nil {
		err = cerr
	}
	if err != nil {
		return err
	}
	if a.Size > 0 && n != a.Size {
		return errors.New("파일 크기가 맞지 않습니다")
	}
	if n < 1<<20 {
		return errors.New("파일이 너무 작습니다")
	}
	if d := strings.TrimPrefix(a.Digest, "sha256:"); d != "" && d != a.Digest && !strings.EqualFold(d, hex.EncodeToString(h.Sum(nil))) {
		return errors.New("파일 확인값(SHA-256)이 맞지 않습니다")
	}
	return nil
}

// 바뀐 뒤 처음 켰을 때 알림
func justUpdatedNote() string {
	if v := os.Getenv("KS_JUST_UPDATED"); v != "" {
		return "v" + v + " → v" + version + " 업데이트 완료"
	}
	return ""
}

// 현장 모드가 이미 켜져 있는지 (8080~8099)
func anotherRunning() bool {
	c := http.Client{Timeout: 400 * time.Millisecond}
	for p := 8080; p < 8100; p++ {
		r, err := c.Get(fmt.Sprintf("http://127.0.0.1:%d/__ks", p))
		if err != nil {
			continue
		}
		b, _ := io.ReadAll(io.LimitReader(r.Body, 200))
		r.Body.Close()
		if strings.Contains(string(b), "KICKSTART") {
			return true
		}
	}
	return false
}

var _ = filepath.Join
