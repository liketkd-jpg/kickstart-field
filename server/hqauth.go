package main

// v1.7.50 본부 잠금
//   - 접수 홈페이지 「운영자」 계정(대표·관리자)으로 한 번 로그인한 노트북만 「대회 본부」로 쓸 수 있습니다.
//   - 로그인은 인터넷이 될 때 한 번만 하면 이 노트북이 기억합니다. 그 뒤에는 인터넷이 없어도 본부로 씁니다.
//   - 기억한 로그인은 이 노트북 이름과 묶여 있어, 설정.json을 다른 노트북에 복사해도 통하지 않습니다.
//   - 이 판으로 업데이트하기 전부터 본부였던 노트북은 그대로 본부로 쓸 수 있습니다(대회 날 갑자기 잠기지 않게).
//     코트로 바꿨다가 다시 본부로 바꿀 때는 로그인이 필요합니다.

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

type hqAuth struct {
	Email string `json:"email"`
	Name  string `json:"name,omitempty"`
	Role  string `json:"role"`
	At    int64  `json:"at"`
	Sig   string `json:"sig"`
}

const (
	sbURLDefault = "https://nwdptjumclgzbwbsaoxr.supabase.co"
	sbKey        = "sb_publishable_IdccZOLa0qHGA80kLLD15g__obCiOiG"
	hqAuthSecret = "KS-HQ-lock-7f3c91e2a4b8d06c5e1f"
)

func sbURL() string {
	if v := os.Getenv("KS_SB_URL"); v != "" { // 시험용
		return strings.TrimRight(v, "/")
	}
	return sbURLDefault
}

func machineName() string {
	h, _ := os.Hostname()
	return strings.ToLower(strings.TrimSpace(h))
}

func hqAuthSig(a hqAuth) string {
	m := hmac.New(sha256.New, []byte(hqAuthSecret))
	fmt.Fprintf(m, "%s|%s|%d|%s", strings.ToLower(a.Email), a.Role, a.At, machineName())
	return hex.EncodeToString(m.Sum(nil))
}

func hqAuthValid(a *hqAuth) bool {
	if a == nil || a.Email == "" || a.Sig == "" || !opsRole(a.Role) {
		return false
	}
	return hmac.Equal([]byte(a.Sig), []byte(hqAuthSig(*a)))
}

// 본부를 열 수 있는 계정: 대표(admin) · 관리자(manager)
func opsRole(r string) bool { return r == "admin" || r == "manager" }

// 이 노트북이 본부로 쓰여도 되는지
func hqAllowed(c nodeConfig) bool {
	if hqAuthValid(c.HQAuth) {
		return true
	}
	if c.Role == "hq" && c.HQOld { // 업데이트 전부터 본부였던 노트북
		return true
	}
	return os.Getenv("KS_ROLE") == "hq" // 시험용
}

// 처음 켤 때: 예전부터 본부였던 노트북은 그대로 쓰게 표시
func initHQLock() {
	c := getConfig()
	if c.Role == "hq" && !c.HQLockSeen && !hqAuthValid(c.HQAuth) {
		c.HQOld = true
	}
	if !c.HQLockSeen {
		c.HQLockSeen = true
		setConfig(c)
	} else if c.Role == "hq" && !hqAllowed(c) { // 설정 파일을 손으로 고쳐 본부로 만든 경우
		c.Role, c.Court = "", ""
		setConfig(c)
		fmt.Println("\n  본부 잠금: 운영자 로그인이 없어 본부로 열지 않았습니다. 첫 화면에서 다시 골라 주세요.")
	}
}

func hqLockState() map[string]any {
	c := getConfig()
	v := map[string]any{"allowed": hqAllowed(c), "old": c.Role == "hq" && c.HQOld && !hqAuthValid(c.HQAuth)}
	if hqAuthValid(c.HQAuth) {
		v["email"], v["name"], v["role"], v["at"] = c.HQAuth.Email, c.HQAuth.Name, c.HQAuth.Role, c.HQAuth.At
	}
	return v
}

type sbErr struct{ msg string }

func (e sbErr) Error() string { return e.msg }

// 접수 홈페이지(Supabase)에 로그인해서 운영자 계정인지 확인
func sbOpsLogin(email, pw string) (hqAuth, error) {
	cl := &http.Client{Timeout: 15 * time.Second}
	body, _ := json.Marshal(map[string]string{"email": email, "password": pw})
	req, _ := http.NewRequest("POST", sbURL()+"/auth/v1/token?grant_type=password", bytes.NewReader(body))
	req.Header.Set("apikey", sbKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := cl.Do(req)
	if err != nil {
		return hqAuth{}, sbErr{"인터넷에 연결되어 있지 않습니다. 인터넷이 되는 와이파이나 휴대폰 테더링으로 잠깐 연결한 뒤 다시 눌러 주세요."}
	}
	b, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<16))
	resp.Body.Close()
	var tok struct {
		AccessToken string `json:"access_token"`
		User        struct {
			ID    string `json:"id"`
			Email string `json:"email"`
		} `json:"user"`
	}
	if resp.StatusCode != 200 || json.Unmarshal(b, &tok) != nil || tok.AccessToken == "" || tok.User.ID == "" {
		if resp.StatusCode == 400 || resp.StatusCode == 401 {
			return hqAuth{}, sbErr{"이메일이나 비밀번호가 맞지 않습니다. 접수 홈페이지에 로그인하는 계정으로 넣어 주세요."}
		}
		return hqAuth{}, sbErr{fmt.Sprintf("로그인하지 못했습니다 (HTTP %d). 잠시 뒤 다시 해 주세요.", resp.StatusCode)}
	}
	req, _ = http.NewRequest("GET", sbURL()+"/rest/v1/profiles?select=role,name&id=eq."+url.QueryEscape(tok.User.ID), nil)
	req.Header.Set("apikey", sbKey)
	req.Header.Set("Authorization", "Bearer "+tok.AccessToken)
	resp, err = cl.Do(req)
	if err != nil {
		return hqAuth{}, sbErr{"인터넷 연결이 끊겼습니다. 다시 눌러 주세요."}
	}
	b, _ = io.ReadAll(io.LimitReader(resp.Body, 1<<16))
	resp.Body.Close()
	var ps []struct {
		Role string `json:"role"`
		Name string `json:"name"`
	}
	if resp.StatusCode != 200 || json.Unmarshal(b, &ps) != nil || len(ps) == 0 {
		return hqAuth{}, sbErr{"계정 정보를 읽지 못했습니다. 잠시 뒤 다시 해 주세요."}
	}
	if !opsRole(ps[0].Role) {
		return hqAuth{}, sbErr{"이 계정은 본부를 열 수 없습니다. 대표·관리자 계정으로 로그인해 주세요."}
	}
	em := tok.User.Email
	if em == "" {
		em = email
	}
	a := hqAuth{Email: em, Name: ps[0].Name, Role: ps[0].Role, At: time.Now().UnixMilli()}
	a.Sig = hqAuthSig(a)
	return a, nil
}

// GET /api/node/hqlock — 이 노트북의 본부 잠금 상태
// POST /api/node/hqlock {op:"login",email,password} — 운영자 로그인 (이 노트북에서만)
// POST /api/node/hqlock {op:"logout"} — 로그인 지우기 (본부였다면 역할도 비움)
func handleHQLock(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 200, hqLockState())
		return
	}
	if !isLocalReq(r) {
		writeJSON(w, 403, map[string]any{"error": "이 노트북에서만 할 수 있습니다"})
		return
	}
	var q struct {
		Op       string `json:"op"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := readBody(r, 1<<12, &q); err != nil {
		writeJSON(w, 400, map[string]any{"error": "invalid_argument"})
		return
	}
	switch q.Op {
	case "login":
		email := strings.TrimSpace(q.Email)
		if email == "" || q.Password == "" {
			writeJSON(w, 400, map[string]any{"error": "이메일과 비밀번호를 넣어 주세요"})
			return
		}
		a, err := sbOpsLogin(email, q.Password)
		if err != nil {
			writeJSON(w, 200, map[string]any{"ok": false, "error": err.Error()})
			return
		}
		c := getConfig()
		c.HQAuth = &a
		setConfig(c)
		fmt.Printf("\n  본부 운영자 로그인: %s\n", a.Email)
		v := hqLockState()
		v["ok"] = true
		writeJSON(w, 200, v)
	case "logout":
		c := getConfig()
		c.HQAuth = nil
		c.HQOld = false
		if c.Role == "hq" {
			c.Role, c.Court = "", ""
		}
		setConfig(c)
		v := hqLockState()
		v["ok"] = true
		writeJSON(w, 200, v)
	default:
		writeJSON(w, 400, map[string]any{"error": "invalid_argument"})
	}
}

// 본부가 아닌(또는 잠긴) 노트북에서 /hq/ 를 열면 보여 줄 안내
const hqLockedPage = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>본부 잠김</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0B0D12;color:#F3F4F6;font:16px/1.6 "Noto Sans KR",-apple-system,sans-serif}
.b{max-width:520px;padding:36px 32px;border:1px solid #2A2F3A;border-radius:18px;background:#141821;text-align:center}
h1{font-size:24px;margin:8px 0 10px}p{color:#B6BCC8;margin:0 0 22px}a{display:inline-block;padding:12px 22px;border-radius:999px;background:#E11D48;color:#fff;text-decoration:none;font-weight:700}</style></head>
<body><div class="b"><div style="font-size:42px">🔒</div><h1>이 노트북은 본부로 열려 있지 않습니다</h1>
<p>본부 화면은 접수 홈페이지 운영자 계정(대표·관리자)으로 로그인한 노트북에서만 열 수 있습니다.<br>첫 화면에서 「대회 본부」를 누르고 운영자 계정으로 로그인해 주세요.</p>
<a href="/">첫 화면으로</a></div></body></html>`
