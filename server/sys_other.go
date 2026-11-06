//go:build !windows

package main

import (
	"fmt"
	"os/exec"
	"runtime"
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
