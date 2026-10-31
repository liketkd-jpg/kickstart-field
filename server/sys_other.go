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
