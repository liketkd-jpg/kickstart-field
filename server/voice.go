// 구령 녹음 파일: 프로그램 폴더의 「구령음성」 폴더에 준비.mp3·시작.mp3·바로.mp3·쉬어.mp3·청승.mp3·홍승.mp3·차렷.mp3·경례.mp3 를 넣으면
// 인터넷 없이 그 파일로 구령이 나옵니다. (없는 구령은 노트북의 한국어 기기 음성으로 나옵니다)
package main

import (
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
)

var voiceExt = map[string]string{".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".wav": "audio/wav", ".ogg": "audio/ogg", ".aac": "audio/aac"}

func voiceDir() string { return filepath.Join(baseDir, "구령음성") }

func setupVoiceDir() {
	d := voiceDir()
	_ = os.MkdirAll(d, 0o755)
	readme := filepath.Join(d, "여기에 구령 녹음 파일을 넣으세요.txt")
	if _, err := os.Stat(readme); err != nil {
		_ = os.WriteFile(readme, []byte("이 폴더에 구령 녹음 파일을 넣으면 인터넷 없이 그 목소리로 구령이 나옵니다.\r\n\r\n"+
			"파일 이름(확장자 mp3·m4a·wav):\r\n  준비.mp3  시작.mp3  바로.mp3  쉬어.mp3\r\n  청승.mp3  홍승.mp3  차렷.mp3  경례.mp3\r\n\r\n"+
			"없는 구령은 노트북의 한국어 기기 음성(예: Microsoft Heami)으로 나옵니다.\r\n파일을 넣은 뒤 운영석 화면을 새로 고침(F5)하면 바로 적용됩니다.\r\n"), 0o644)
	}
}

func handleVoice(w http.ResponseWriter, r *http.Request) {
	p := strings.TrimPrefix(r.URL.Path, "/voice/")
	if p == "list" {
		type f struct {
			Base string `json:"base"`
			URL  string `json:"url"`
		}
		out := []f{}
		ents, _ := os.ReadDir(voiceDir())
		for _, e := range ents {
			ext := strings.ToLower(filepath.Ext(e.Name()))
			if e.IsDir() || voiceExt[ext] == "" {
				continue
			}
			out = append(out, f{Base: strings.TrimSuffix(e.Name(), filepath.Ext(e.Name())), URL: "/voice/" + url.PathEscape(e.Name())})
		}
		writeJSON(w, 200, map[string]any{"files": out})
		return
	}
	name, err := url.PathUnescape(p)
	if err != nil || name == "" || strings.ContainsAny(name, `/\`) || strings.Contains(name, "..") {
		http.NotFound(w, r)
		return
	}
	ct := voiceExt[strings.ToLower(filepath.Ext(name))]
	if ct == "" {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", ct)
	w.Header().Set("Cache-Control", "no-store")
	http.ServeFile(w, r, filepath.Join(voiceDir(), name))
}
