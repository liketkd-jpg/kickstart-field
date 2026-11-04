//go:build windows

package main

import (
	"fmt"
	"os/exec"
	"syscall"
	"unsafe"
)

var (
	kernel32                    = syscall.NewLazyDLL("kernel32.dll")
	procSetConsoleOutputCP      = kernel32.NewProc("SetConsoleOutputCP")
	procSetConsoleTitleW        = kernel32.NewProc("SetConsoleTitleW")
	procSetThreadExecutionState = kernel32.NewProc("SetThreadExecutionState")
)

// 한글이 깨지지 않게 콘솔을 UTF-8로, 창 제목 설정
func setupConsole() {
	procSetConsoleOutputCP.Call(65001)
	t, _ := syscall.UTF16PtrFromString("KICKSTART UP 현장 모드 (이 창을 닫으면 멈춥니다)")
	procSetConsoleTitleW.Call(uintptr(unsafe.Pointer(t)))
}

// 대회 중 노트북이 잠들지 않게 (ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED)
func keepAwake() {
	procSetThreadExecutionState.Call(uintptr(0x80000000 | 0x00000001 | 0x00000002))
}

func openBrowser(url string) {
	if err := exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start(); err != nil {
		fmt.Println("브라우저를 열지 못했습니다. 크롬에서 직접 열어 주세요:", url)
	}
}

func pause() {
	fmt.Println("엔터 키를 누르면 창이 닫힙니다.")
	var s string
	fmt.Scanln(&s)
}

// 탐색기로 폴더 열기
func openFolder(dir string) error { return exec.Command("explorer", dir).Start() }
