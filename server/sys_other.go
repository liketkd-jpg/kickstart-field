//go:build !windows

package main

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"syscall"
)

func setupConsole() {}
func keepAwake()    {}

func openBrowser(url string) {
	cmd := "xdg-open"
	if runtime.GOOS == "darwin" {
		cmd = "open"
	}
	if err := exec.Command(cmd, url).Start(); err != nil {
		fmt.Println("브라우저에서 직접 열어 주세요:", url)
	}
}

// 윈도우가 아니면 엣지를 따로 찾지 않습니다
func openEdge(url string) bool { return false }

func pause() {}

func openFolder(dir string) error {
	cmd := "xdg-open"
	if runtime.GOOS == "darwin" {
		cmd = "open"
	}
	return exec.Command(cmd, dir).Start()
}

// 윈도우가 아니면 보통 브라우저로 엽니다 (인쇄 창이 뜹니다)
func openPrintWindow(url, profile string) string {
	openBrowser(url)
	return "normal"
}

// 윈도우가 아니면 기본 프린터를 확인하지 않습니다
func defaultPrinter() string { return "" }

func diskFree(path string) (int64, int64) {
	var st syscall.Statfs_t
	if syscall.Statfs(path, &st) != nil {
		return 0, 0
	}
	return int64(st.Bavail) * int64(st.Bsize), int64(st.Blocks) * int64(st.Bsize)
}

func scanPlaces() [][3]string {
	return [][3]string{{"임시 파일", os.TempDir(), ""}}
}

func printerStatus() map[string]any {
	return map[string]any{"ok": false, "err": "윈도우 노트북에서만 확인합니다"}
}
