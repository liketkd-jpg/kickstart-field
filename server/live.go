// 유튜브 생중계
// 운영석 브라우저가 영상 판독용 웹캠 화면(+ 점수 띠)을 H.264 로 압축해 보내면,
// 이 프로그램이 그대로 유튜브 RTMPS(rtmps://a.rtmps.youtube.com/live2)로 보냅니다.
// 따로 설치할 프로그램(OBS·ffmpeg)이 필요 없습니다. 소리가 없으면 무음을 넣습니다(유튜브는 소리 트랙을 요구).
package main

import (
	"bufio"
	"bytes"
	"crypto/rand"
	"crypto/tls"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

const defaultLiveURL = "rtmps://a.rtmps.youtube.com:443/live2"

// 무음 AAC-LC 44.1kHz 스테레오 (1024 샘플 = 약 23ms)
var silentASC = []byte{0x12, 0x10}
var silentAAC = []byte{0x21, 0x10, 0x04, 0x60, 0x8c, 0x1c}

type livePkt struct {
	typ  byte // 1 영상 설정, 2 영상, 3 소리 설정, 4 소리
	key  bool
	ts   uint32 // ms
	data []byte
}

type liveSession struct {
	mu        sync.Mutex
	on        bool
	state     string // connecting | live | retry | error
	errMsg    string
	app       string
	since     time.Time
	lastIn    time.Time
	q         chan livePkt
	quit      chan struct{}
	needKey   bool
	clientAud bool
	sent      int64
	kbps      float64
	dropped   int
	slow      bool
	vcfg      []byte
	acfg      []byte
	width     int
	height    int
}

var live = &liveSession{state: "idle"}

func liveTarget() (string, string) {
	c := getConfig()
	u := strings.TrimSpace(c.LiveURL)
	if v := os.Getenv("KS_LIVE_URL"); v != "" { // 시험용
		u = v
	}
	if u == "" {
		u = defaultLiveURL
	}
	return u, strings.TrimSpace(c.LiveKey)
}

func maskKey(k string) string {
	if k == "" {
		return ""
	}
	if len(k) <= 4 {
		return "****"
	}
	return strings.Repeat("•", 6) + k[len(k)-4:]
}

func (l *liveSession) status() map[string]any {
	l.mu.Lock()
	defer l.mu.Unlock()
	u, k := liveTarget()
	host := u
	if p, err := url.Parse(u); err == nil {
		host = p.Host
	}
	st := map[string]any{"on": l.on, "state": l.state, "err": l.errMsg, "app": l.app, "keySet": k != "", "keyHint": maskKey(k), "host": host,
		"kbps": math.Round(l.kbps), "needKey": l.needKey, "slow": l.slow, "dropped": l.dropped, "audio": l.clientAud}
	if l.on {
		st["since"] = l.since.UnixMilli()
		st["sec"] = int(time.Since(l.since).Seconds())
	}
	return st
}

func (l *liveSession) setState(s, e string) {
	l.mu.Lock()
	l.state, l.errMsg = s, e
	l.mu.Unlock()
}

// ---------------- HTTP ----------------

func handleLive(w http.ResponseWriter, r *http.Request) {
	p := strings.TrimPrefix(r.URL.Path, "/live/")
	if p != "status" && !isLocalReq(r) {
		writeJSON(w, 403, map[string]any{"error": "생중계는 이 노트북의 운영석에서만 켤 수 있습니다"})
		return
	}
	switch p {
	case "status":
		writeJSON(w, 200, live.status())
	case "key":
		var b struct {
			Key string `json:"key"`
			URL string `json:"url"`
		}
		if json.NewDecoder(io.LimitReader(r.Body, 4096)).Decode(&b) != nil {
			writeJSON(w, 400, map[string]any{"error": "bad json"})
			return
		}
		c := getConfig()
		c.LiveKey = strings.TrimSpace(b.Key)
		if b.URL != "" {
			c.LiveURL = strings.TrimSpace(b.URL)
		}
		setConfig(c)
		writeJSON(w, 200, live.status())
	case "start":
		var b struct {
			App    string `json:"app"`
			Audio  bool   `json:"audio"`
			Width  int    `json:"width"`
			Height int    `json:"height"`
		}
		_ = json.NewDecoder(io.LimitReader(r.Body, 4096)).Decode(&b)
		if _, k := liveTarget(); k == "" {
			writeJSON(w, 400, map[string]any{"error": "유튜브 스트림 키가 없습니다"})
			return
		}
		live.start(b.App, b.Audio, b.Width, b.Height)
		writeJSON(w, 200, live.status())
	case "stop":
		live.stop()
		writeJSON(w, 200, live.status())
	case "data":
		body, err := io.ReadAll(io.LimitReader(r.Body, 32<<20))
		if err != nil {
			writeJSON(w, 400, map[string]any{"error": "read"})
			return
		}
		live.push(body)
		writeJSON(w, 200, live.status())
	default:
		http.NotFound(w, r)
	}
}

func (l *liveSession) start(app string, audio bool, wd, ht int) {
	l.mu.Lock()
	if l.on {
		l.app, l.clientAud = app, audio
		l.mu.Unlock()
		return
	}
	l.on, l.state, l.errMsg, l.app, l.clientAud = true, "connecting", "", app, audio
	l.since, l.lastIn = time.Now(), time.Now()
	l.q = make(chan livePkt, 2000)
	l.quit = make(chan struct{})
	l.needKey, l.sent, l.kbps, l.dropped, l.slow = true, 0, 0, 0, false
	l.vcfg, l.acfg = nil, nil
	l.width, l.height = wd, ht
	q, quit := l.q, l.quit
	l.mu.Unlock()
	fmt.Println("  🔴 유튜브 생중계 시작 (" + app + ")")
	go l.run(q, quit)
}

func (l *liveSession) stop() {
	l.mu.Lock()
	if !l.on {
		l.mu.Unlock()
		return
	}
	l.on = false
	l.state = "idle"
	close(l.quit)
	l.mu.Unlock()
	fmt.Println("  ⏹ 유튜브 생중계 끝")
}

// 브라우저가 보낸 묶음: [종류 1][표시 1][시간 4][길이 4][내용] 반복
func (l *liveSession) push(b []byte) {
	l.mu.Lock()
	on, q := l.on, l.q
	l.lastIn = time.Now()
	l.mu.Unlock()
	if !on {
		return
	}
	for len(b) >= 10 {
		typ, fl := b[0], b[1]
		ts := binary.BigEndian.Uint32(b[2:6])
		n := int(binary.BigEndian.Uint32(b[6:10]))
		if n < 0 || 10+n > len(b) {
			return
		}
		p := livePkt{typ: typ, key: fl&1 == 1, ts: ts, data: append([]byte(nil), b[10:10+n]...)}
		b = b[10+n:]
		l.mu.Lock()
		if typ == 1 {
			l.vcfg = p.data
		} else if typ == 3 {
			l.acfg = p.data
		}
		l.mu.Unlock()
		select {
		case q <- p:
		default: // 인터넷이 느려 밀림 → 영상 몇 장을 버리고 다음 기준 화면부터
			l.mu.Lock()
			l.dropped++
			l.slow = true
			l.needKey = true
			l.mu.Unlock()
		}
	}
}

// ---------------- 송출 ----------------

func (l *liveSession) run(q chan livePkt, quit chan struct{}) {
	backoff := 2 * time.Second
	for {
		select {
		case <-quit:
			return
		default:
		}
		u, key := liveTarget()
		l.setState("connecting", "")
		c, err := rtmpDial(u, key)
		if err != nil {
			msg := err.Error()
			l.setState("retry", msg)
			fmt.Println("  생중계 연결 실패:", msg)
			select {
			case <-quit:
				return
			case <-time.After(backoff):
			}
			if backoff < 15*time.Second {
				backoff *= 2
			}
			continue
		}
		backoff = 2 * time.Second
		l.setState("live", "")
		l.mu.Lock()
		l.needKey = true
		l.mu.Unlock()
		err = l.pump(c, q, quit)
		c.close()
		if err == nil {
			return // 끝내기
		}
		l.setState("retry", "연결이 끊겼습니다: "+err.Error())
		fmt.Println("  생중계 끊김, 다시 연결합니다:", err)
		select {
		case <-quit:
			return
		case <-time.After(2 * time.Second):
		}
	}
}

func (l *liveSession) pump(c *rtmpConn, q chan livePkt, quit chan struct{}) error {
	l.mu.Lock()
	vcfg, acfg, cliAud, wd, ht := l.vcfg, l.acfg, l.clientAud, l.width, l.height
	l.mu.Unlock()
	_ = c.sendMeta(wd, ht, cliAud && acfg != nil)
	sentV, sentA, gotKey := false, false, false
	var aNext float64 // 무음 소리의 다음 시각(ms)
	useSilent := !cliAud
	lastMeasure, lastBytes := time.Now(), int64(0)
	tick := time.NewTicker(1 * time.Second)
	defer tick.Stop()
	for {
		select {
		case <-quit:
			return nil
		case <-c.dead:
			return c.readErr()
		case <-tick.C:
			l.mu.Lock()
			if time.Since(l.lastIn) > 6*time.Second {
				l.errMsg = "운영석에서 영상이 오지 않습니다 (판독 카메라·화면을 확인해 주세요)"
			} else if l.state == "live" {
				l.errMsg = ""
			}
			dt := time.Since(lastMeasure).Seconds()
			if dt >= 2 {
				l.kbps = float64(c.written-lastBytes) * 8 / 1000 / dt
				lastBytes, lastMeasure = c.written, time.Now()
				if len(q) < 30 {
					l.slow = false
				}
			}
			l.sent = c.written
			l.mu.Unlock()
		case p := <-q:
			switch p.typ {
			case 1:
				vcfg = p.data
				if err := c.video(append([]byte{0x17, 0, 0, 0, 0}, vcfg...), 0); err != nil {
					return err
				}
				sentV = true
			case 3:
				if !cliAud {
					continue
				}
				acfg = p.data
				if err := c.audio(append([]byte{0xAF, 0}, acfg...), 0); err != nil {
					return err
				}
				sentA = true
			case 2:
				if !sentV {
					if vcfg == nil {
						continue
					}
					if err := c.video(append([]byte{0x17, 0, 0, 0, 0}, vcfg...), 0); err != nil {
						return err
					}
					sentV = true
				}
				if !gotKey {
					if !p.key {
						l.mu.Lock()
						l.needKey = true
						l.mu.Unlock()
						continue
					}
					gotKey = true
					l.mu.Lock()
					l.needKey = false
					l.mu.Unlock()
				}
				if useSilent {
					if !sentA {
						if err := c.audio(append([]byte{0xAF, 0}, silentASC...), 0); err != nil {
							return err
						}
						sentA = true
						aNext = float64(p.ts)
					}
					for aNext <= float64(p.ts)+40 {
						if err := c.audio(append([]byte{0xAF, 1}, silentAAC...), uint32(aNext)); err != nil {
							return err
						}
						aNext += 1024.0 * 1000 / 44100
					}
				}
				hdr := byte(0x27)
				if p.key {
					hdr = 0x17
				}
				if err := c.video(append([]byte{hdr, 1, 0, 0, 0}, p.data...), p.ts); err != nil {
					return err
				}
			case 4:
				if useSilent {
					continue
				}
				if !sentA {
					if acfg == nil {
						continue
					}
					if err := c.audio(append([]byte{0xAF, 0}, acfg...), 0); err != nil {
						return err
					}
					sentA = true
				}
				if err := c.audio(append([]byte{0xAF, 1}, p.data...), p.ts); err != nil {
					return err
				}
			}
		}
	}
}

// ---------------- RTMP (보내기 전용, 필요한 만큼만) ----------------

type rtmpConn struct {
	nc        net.Conn
	br        *bufio.Reader
	wmu       sync.Mutex
	outChunk  int
	inChunk   int
	streamID  uint32
	written   int64
	readBytes int64
	ackWin    int64
	lastAck   int64
	dead      chan struct{}
	errMu     sync.Mutex
	rerr      error
	inbox     chan rtmpMsg
	hdrs      map[uint32]*chunkHdr
}

type rtmpMsg struct {
	typ  byte
	sid  uint32
	data []byte
}

type chunkHdr struct {
	ts, length uint32
	typ        byte
	sid        uint32
	ext        bool
	buf        []byte
}

func rtmpDial(raw, key string) (*rtmpConn, error) {
	if key == "" {
		return nil, errors.New("스트림 키가 없습니다")
	}
	u, err := url.Parse(raw)
	if err != nil {
		return nil, errors.New("송출 주소가 잘못되었습니다")
	}
	host := u.Host
	tlsOn := u.Scheme == "rtmps"
	if u.Port() == "" {
		if tlsOn {
			host += ":443"
		} else {
			host += ":1935"
		}
	}
	d := &net.Dialer{Timeout: 8 * time.Second}
	var nc net.Conn
	if tlsOn {
		nc, err = tls.DialWithDialer(d, "tcp", host, &tls.Config{ServerName: u.Hostname()})
	} else {
		nc, err = d.Dial("tcp", host)
	}
	if err != nil {
		return nil, errors.New("유튜브 서버에 연결하지 못했습니다 (인터넷 연결 확인)")
	}
	c := &rtmpConn{nc: nc, br: bufio.NewReaderSize(nc, 64<<10), outChunk: 128, inChunk: 128, dead: make(chan struct{}), inbox: make(chan rtmpMsg, 64), hdrs: map[uint32]*chunkHdr{}}
	_ = nc.SetDeadline(time.Now().Add(15 * time.Second))
	if err := c.handshake(); err != nil {
		nc.Close()
		return nil, errors.New("유튜브 서버와 연결 절차 실패")
	}
	go c.readLoop()
	app := strings.Trim(u.Path, "/")
	tc := u.Scheme + "://" + u.Host + "/" + app
	if err := c.setChunk(4096); err != nil {
		c.close()
		return nil, err
	}
	_ = c.cmd(3, 0, amf("connect", 1.0, amfObj{{"app", app}, {"type", "nonprivate"}, {"flashVer", "FMLE/3.0 (compatible; KICKSTART)"}, {"tcUrl", tc}}))
	if _, err := c.waitResult(1.0); err != nil {
		c.close()
		return nil, err
	}
	_ = c.cmd(3, 0, amf("releaseStream", 2.0, nil, key))
	_ = c.cmd(3, 0, amf("FCPublish", 3.0, nil, key))
	_ = c.cmd(3, 0, amf("createStream", 4.0, nil))
	res, err := c.waitResult(4.0)
	if err != nil {
		c.close()
		return nil, err
	}
	sid := uint32(1)
	if len(res) > 1 {
		if f, ok := res[len(res)-1].(float64); ok {
			sid = uint32(f)
		}
	}
	c.streamID = sid
	_ = c.cmd(8, sid, amf("publish", 5.0, nil, key, "live"))
	if err := c.waitPublish(); err != nil {
		c.close()
		return nil, err
	}
	_ = nc.SetDeadline(time.Time{})
	return c, nil
}

func (c *rtmpConn) handshake() error {
	c1 := make([]byte, 1537)
	c1[0] = 3
	_, _ = rand.Read(c1[9:])
	if _, err := c.nc.Write(c1); err != nil {
		return err
	}
	s := make([]byte, 1+1536+1536)
	if _, err := io.ReadFull(c.br, s); err != nil {
		return err
	}
	_, err := c.nc.Write(s[1 : 1+1536]) // C2 = S1
	return err
}

func (c *rtmpConn) close() {
	c.nc.Close()
}

func (c *rtmpConn) readErr() error {
	c.errMu.Lock()
	defer c.errMu.Unlock()
	if c.rerr == nil {
		return errors.New("연결 끊김")
	}
	return c.rerr
}

// 메시지 쓰기 (fmt0 머리 + 조각)
func (c *rtmpConn) writeMsg(csid uint32, typ byte, sid uint32, ts uint32, payload []byte) error {
	c.wmu.Lock()
	defer c.wmu.Unlock()
	var b bytes.Buffer
	ext := ts >= 0xFFFFFF
	b.WriteByte(byte(csid & 0x3F))
	t3 := ts
	if ext {
		t3 = 0xFFFFFF
	}
	b.Write([]byte{byte(t3 >> 16), byte(t3 >> 8), byte(t3)})
	n := len(payload)
	b.Write([]byte{byte(n >> 16), byte(n >> 8), byte(n), typ})
	sb := make([]byte, 4)
	binary.LittleEndian.PutUint32(sb, sid)
	b.Write(sb)
	if ext {
		eb := make([]byte, 4)
		binary.BigEndian.PutUint32(eb, ts)
		b.Write(eb)
	}
	for i := 0; i < n; i += c.outChunk {
		if i > 0 {
			b.WriteByte(0xC0 | byte(csid&0x3F))
			if ext {
				eb := make([]byte, 4)
				binary.BigEndian.PutUint32(eb, ts)
				b.Write(eb)
			}
		}
		e := i + c.outChunk
		if e > n {
			e = n
		}
		b.Write(payload[i:e])
	}
	_ = c.nc.SetWriteDeadline(time.Now().Add(10 * time.Second))
	k, err := c.nc.Write(b.Bytes())
	c.written += int64(k)
	return err
}

func (c *rtmpConn) setChunk(n int) error {
	p := make([]byte, 4)
	binary.BigEndian.PutUint32(p, uint32(n))
	if err := c.writeMsg(2, 1, 0, 0, p); err != nil {
		return err
	}
	c.outChunk = n
	return nil
}

func (c *rtmpConn) cmd(csid, sid uint32, payload []byte) error {
	return c.writeMsg(csid, 20, sid, 0, payload)
}

func (c *rtmpConn) video(p []byte, ts uint32) error { return c.writeMsg(6, 9, c.streamID, ts, p) }
func (c *rtmpConn) audio(p []byte, ts uint32) error { return c.writeMsg(4, 8, c.streamID, ts, p) }

func (c *rtmpConn) sendMeta(w, h int, aud bool) error {
	if w == 0 {
		w, h = 1280, 720
	}
	var b bytes.Buffer
	amfWrite(&b, "@setDataFrame")
	amfWrite(&b, "onMetaData")
	amfWrite(&b, amfObj{{"width", float64(w)}, {"height", float64(h)}, {"framerate", 30.0}, {"videocodecid", 7.0}, {"audiocodecid", 10.0}, {"videodatarate", 2500.0}, {"encoder", "KICKSTART field " + version}})
	return c.writeMsg(4, 18, c.streamID, 0, b.Bytes())
}

// 받은 메시지 읽기 (조각 이어 붙이기)
func (c *rtmpConn) readLoop() {
	fail := func(err error) {
		c.errMu.Lock()
		if c.rerr == nil {
			c.rerr = err
		}
		c.errMu.Unlock()
		select {
		case <-c.dead:
		default:
			close(c.dead)
		}
	}
	for {
		b0, err := c.br.ReadByte()
		if err != nil {
			fail(err)
			return
		}
		c.readBytes++
		fmtv := b0 >> 6
		csid := uint32(b0 & 0x3F)
		if csid == 0 {
			x, err := c.br.ReadByte()
			if err != nil {
				fail(err)
				return
			}
			csid = uint32(x) + 64
			c.readBytes++
		} else if csid == 1 {
			x := make([]byte, 2)
			if _, err := io.ReadFull(c.br, x); err != nil {
				fail(err)
				return
			}
			csid = uint32(x[1])*256 + uint32(x[0]) + 64
			c.readBytes += 2
		}
		h := c.hdrs[csid]
		if h == nil {
			h = &chunkHdr{}
			c.hdrs[csid] = h
		}
		hl := []int{11, 7, 3, 0}[fmtv]
		mh := make([]byte, hl)
		if _, err := io.ReadFull(c.br, mh); err != nil {
			fail(err)
			return
		}
		c.readBytes += int64(hl)
		if hl >= 3 {
			t := uint32(mh[0])<<16 | uint32(mh[1])<<8 | uint32(mh[2])
			h.ext = t == 0xFFFFFF
			if fmtv == 0 {
				h.ts = t
			} else {
				h.ts += t
			}
		}
		if hl >= 7 {
			h.length = uint32(mh[3])<<16 | uint32(mh[4])<<8 | uint32(mh[5])
			h.typ = mh[6]
		}
		if hl == 11 {
			h.sid = binary.LittleEndian.Uint32(mh[7:11])
		}
		if h.ext {
			x := make([]byte, 4)
			if _, err := io.ReadFull(c.br, x); err != nil {
				fail(err)
				return
			}
			c.readBytes += 4
		}
		need := int(h.length) - len(h.buf)
		if need > c.inChunk {
			need = c.inChunk
		}
		if need < 0 {
			need = 0
		}
		part := make([]byte, need)
		if _, err := io.ReadFull(c.br, part); err != nil {
			fail(err)
			return
		}
		c.readBytes += int64(need)
		h.buf = append(h.buf, part...)
		if c.ackWin > 0 && c.readBytes-c.lastAck >= c.ackWin {
			c.lastAck = c.readBytes
			ab := make([]byte, 4)
			binary.BigEndian.PutUint32(ab, uint32(c.readBytes))
			_ = c.writeMsg(2, 3, 0, 0, ab)
		}
		if len(h.buf) < int(h.length) {
			continue
		}
		m := rtmpMsg{typ: h.typ, sid: h.sid, data: h.buf}
		h.buf = nil
		switch m.typ {
		case 1:
			if len(m.data) >= 4 {
				c.inChunk = int(binary.BigEndian.Uint32(m.data) & 0x7FFFFFFF)
			}
		case 5:
			if len(m.data) >= 4 {
				c.ackWin = int64(binary.BigEndian.Uint32(m.data))
			}
		case 4:
			if len(m.data) >= 6 && binary.BigEndian.Uint16(m.data) == 6 { // 핑 → 응답
				resp := append([]byte{0, 7}, m.data[2:6]...)
				_ = c.writeMsg(2, 4, 0, 0, resp)
			}
		case 20:
			select {
			case c.inbox <- m:
			default:
			}
		}
	}
}

func (c *rtmpConn) nextCmd(timeout time.Duration) ([]any, error) {
	select {
	case m := <-c.inbox:
		return amfDecodeAll(m.data), nil
	case <-c.dead:
		return nil, errors.New("유튜브 서버가 연결을 끊었습니다 (스트림 키를 확인해 주세요)")
	case <-time.After(timeout):
		return nil, errors.New("유튜브 서버가 응답하지 않습니다")
	}
}

func (c *rtmpConn) waitResult(txn float64) ([]any, error) {
	end := time.Now().Add(10 * time.Second)
	for time.Now().Before(end) {
		v, err := c.nextCmd(time.Until(end))
		if err != nil {
			return nil, err
		}
		if len(v) < 2 {
			continue
		}
		name, _ := v[0].(string)
		id, _ := v[1].(float64)
		if id != txn {
			continue
		}
		if name == "_error" {
			return nil, errors.New("유튜브 서버가 거절했습니다: " + statusText(v))
		}
		return v, nil
	}
	return nil, errors.New("유튜브 서버가 응답하지 않습니다")
}

func (c *rtmpConn) waitPublish() error {
	end := time.Now().Add(10 * time.Second)
	for time.Now().Before(end) {
		v, err := c.nextCmd(time.Until(end))
		if err != nil {
			return err
		}
		if len(v) == 0 {
			continue
		}
		name, _ := v[0].(string)
		if name == "onStatus" || name == "_error" {
			code := statusText(v)
			if strings.Contains(code, "Publish.Start") {
				return nil
			}
			if strings.Contains(code, "BadName") || strings.Contains(code, "Rejected") || name == "_error" || strings.Contains(code, "Failed") {
				return errors.New("스트림 키가 맞지 않거나 유튜브 방송이 준비되지 않았습니다 (" + code + ")")
			}
		}
	}
	return errors.New("방송 시작 확인을 받지 못했습니다")
}

func statusText(v []any) string {
	for _, x := range v {
		if m, ok := x.(map[string]any); ok {
			if s, ok := m["code"].(string); ok {
				if d, ok := m["description"].(string); ok && d != "" {
					return s + " " + d
				}
				return s
			}
		}
	}
	return "알 수 없음"
}

// ---------------- AMF0 ----------------

type amfKV struct {
	k string
	v any
}
type amfObj []amfKV

func amf(vals ...any) []byte {
	var b bytes.Buffer
	for _, v := range vals {
		amfWrite(&b, v)
	}
	return b.Bytes()
}

func amfStr(b *bytes.Buffer, s string) {
	b.Write([]byte{byte(len(s) >> 8), byte(len(s))})
	b.WriteString(s)
}

func amfWrite(b *bytes.Buffer, v any) {
	switch x := v.(type) {
	case nil:
		b.WriteByte(5)
	case float64:
		b.WriteByte(0)
		_ = binary.Write(b, binary.BigEndian, x)
	case bool:
		b.WriteByte(1)
		if x {
			b.WriteByte(1)
		} else {
			b.WriteByte(0)
		}
	case string:
		b.WriteByte(2)
		amfStr(b, x)
	case amfObj:
		b.WriteByte(3)
		for _, kv := range x {
			amfStr(b, kv.k)
			amfWrite(b, kv.v)
		}
		b.Write([]byte{0, 0, 9})
	}
}

func amfDecodeAll(d []byte) []any {
	r := bytes.NewReader(d)
	var out []any
	for r.Len() > 0 {
		v, err := amfRead(r)
		if err != nil {
			break
		}
		out = append(out, v)
	}
	return out
}

func amfReadStr(r *bytes.Reader) (string, error) {
	var n uint16
	if err := binary.Read(r, binary.BigEndian, &n); err != nil {
		return "", err
	}
	s := make([]byte, n)
	_, err := io.ReadFull(r, s)
	return string(s), err
}

func amfRead(r *bytes.Reader) (any, error) {
	t, err := r.ReadByte()
	if err != nil {
		return nil, err
	}
	switch t {
	case 0:
		var f float64
		err := binary.Read(r, binary.BigEndian, &f)
		return f, err
	case 1:
		b, err := r.ReadByte()
		return b != 0, err
	case 2:
		return amfReadStr(r)
	case 3, 8:
		if t == 8 {
			_, _ = r.Seek(4, io.SeekCurrent)
		}
		m := map[string]any{}
		for {
			k, err := amfReadStr(r)
			if err != nil {
				return m, err
			}
			if k == "" {
				_, err := r.ReadByte() // 9
				return m, err
			}
			v, err := amfRead(r)
			if err != nil {
				return m, err
			}
			m[k] = v
		}
	case 5, 6:
		return nil, nil
	case 10:
		var n uint32
		if err := binary.Read(r, binary.BigEndian, &n); err != nil {
			return nil, err
		}
		arr := make([]any, 0, n)
		for i := uint32(0); i < n; i++ {
			v, err := amfRead(r)
			if err != nil {
				return arr, err
			}
			arr = append(arr, v)
		}
		return arr, nil
	}
	return nil, fmt.Errorf("amf type %d", t)
}
