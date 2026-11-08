//go:build windows

package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
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

// 브라우저 열기: 윈도우의 「기본 앱」 연결을 거치지 않고 크롬(없으면 엣지)을 직접 실행합니다.
// 예전 방식(rundll32 url.dll)은 연결 정보가 꼬인 컴퓨터에서 「어떤 앱으로 열까요?」 창을 띄우고 멈춘 것처럼 보였습니다.
func browserExe() string {
	pf := os.Getenv("ProgramFiles")
	pf86 := os.Getenv("ProgramFiles(x86)")
	la := os.Getenv("LocalAppData")
	for _, c := range []string{
		filepath.Join(pf, "Google", "Chrome", "Application", "chrome.exe"),
		filepath.Join(pf86, "Google", "Chrome", "Application", "chrome.exe"),
		filepath.Join(la, "Google", "Chrome", "Application", "chrome.exe"),
		filepath.Join(pf86, "Microsoft", "Edge", "Application", "msedge.exe"),
		filepath.Join(pf, "Microsoft", "Edge", "Application", "msedge.exe"),
	} {
		if c == "" || strings.HasPrefix(c, string(filepath.Separator)) {
			continue
		}
		if st, err := os.Stat(c); err == nil && !st.IsDir() {
			return c
		}
	}
	return ""
}

func openBrowser(url string) {
	if b := browserExe(); b != "" {
		// 「기본 브라우저로 설정」·「기본 PDF 뷰어로 설정」 안내 막기: 이 안내를 누르면 윈도우 설정 창을 기다리며 화면이 멈춘 것처럼 보였음
		// (크롬이 이미 켜져 있으면 크롬이 이 옵션을 무시하므로, 그때는 안내 오른쪽 X로 닫으면 됩니다)
		if exec.Command(b, "--no-default-browser-check", "--disable-features=PdfInfoBar,DefaultBrowserPromptRefresh,DefaultBrowserPromptRefreshTrial", "--new-window", url).Start() == nil {
			return
		}
	}
	cmd := exec.Command("cmd", "/c", "start", "", url)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
	if cmd.Start() == nil {
		return
	}
	fmt.Println("브라우저를 열지 못했습니다. 크롬을 켜고 주소창에 직접 넣어 주세요:", url)
}

// 엣지로 본부 화면 열기: 엣지에는 자연스러운 한국어 AI 목소리(선히·인준·현수, 인터넷 필요)가 있어 전광판 방송이 훨씬 자연스럽습니다.
func openEdge(url string) bool {
	pf := os.Getenv("ProgramFiles")
	pf86 := os.Getenv("ProgramFiles(x86)")
	for _, c := range []string{
		filepath.Join(pf86, "Microsoft", "Edge", "Application", "msedge.exe"),
		filepath.Join(pf, "Microsoft", "Edge", "Application", "msedge.exe"),
	} {
		if c == "" || strings.HasPrefix(c, string(filepath.Separator)) {
			continue
		}
		if st, err := os.Stat(c); err == nil && !st.IsDir() {
			if exec.Command(c, "--no-default-browser-check", "--no-first-run", "--disable-features=PdfInfoBar,DefaultBrowserPromptRefresh", "--new-window", url).Start() == nil {
				return true
			}
		}
	}
	return false
}

func pause() {
	fmt.Println("엔터 키를 누르면 창이 닫힙니다.")
	var s string
	fmt.Scanln(&s)
}

// 탐색기로 폴더 열기
func openFolder(dir string) error { return exec.Command("explorer", dir).Start() }

// 상장 자동 출력 창: 엣지(또는 크롬)를 「인쇄 창 없이 바로 기본 프린터로」(--kiosk-printing) 옵션으로 따로 엽니다.
// 평소 쓰는 브라우저 설정과 섞이지 않게 프로그램 폴더 안의 별도 프로필을 씁니다.
func openPrintWindow(url, profile string) string {
	pf := os.Getenv("ProgramFiles")
	pf86 := os.Getenv("ProgramFiles(x86)")
	la := os.Getenv("LocalAppData")
	cands := []string{
		filepath.Join(pf86, "Microsoft", "Edge", "Application", "msedge.exe"),
		filepath.Join(pf, "Microsoft", "Edge", "Application", "msedge.exe"),
		filepath.Join(pf, "Google", "Chrome", "Application", "chrome.exe"),
		filepath.Join(pf86, "Google", "Chrome", "Application", "chrome.exe"),
		filepath.Join(la, "Google", "Chrome", "Application", "chrome.exe"),
	}
	_ = os.MkdirAll(profile, 0o755)
	for _, c := range cands {
		if c == "" {
			continue
		}
		if _, err := os.Stat(c); err == nil {
			if exec.Command(c, "--kiosk-printing", "--user-data-dir="+profile, "--no-first-run", "--no-default-browser-check", "--disable-features=Translate,PdfInfoBar,DefaultBrowserPromptRefresh", "--new-window", "--app="+url).Start() == nil {
				return "kiosk"
			}
		}
	}
	openBrowser(url)
	return "normal"
}

// 윈도우 기본 프린터 이름 (없으면 ""). 8초 안에 답이 없으면 포기합니다.
func defaultPrinter() string {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "powershell", "-NoProfile", "-NonInteractive", "-Command",
		"[Console]::OutputEncoding=[Text.Encoding]::UTF8; (Get-CimInstance Win32_Printer -Filter 'Default=TRUE').Name")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
	out, err := cmd.Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

// 하드 남은 공간·전체 크기 (바이트)
func diskFree(path string) (int64, int64) {
	k := syscall.NewLazyDLL("kernel32.dll").NewProc("GetDiskFreeSpaceExW")
	p, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return 0, 0
	}
	var free, total, all uint64
	r, _, _ := k.Call(uintptr(unsafe.Pointer(p)), uintptr(unsafe.Pointer(&free)), uintptr(unsafe.Pointer(&total)), uintptr(unsafe.Pointer(&all)))
	if r == 0 {
		return 0, 0
	}
	return int64(free), int64(total)
}
