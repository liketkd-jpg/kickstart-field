#!/usr/bin/env python3
"""1단계: 소리가 갑자기 크게 터지는 순간(격파음, 발차기 타격음, 기합)을 모두 찾는다.

사용법:
  python3 onsets.py 원본.mp4 [원본2.mp4 ...] -o work/onsets.csv

원리:
  - 오디오를 16kHz 모노로 뽑아 10ms 간격으로 음량(dB)을 계산한다.
  - 직전 0.5초 평균(중앙값)보다 갑자기 THRESH dB 이상 커지는 지점을 후보로 잡는다.
  - 고역(날카로운 소리) 에너지도 따로 보고, 둘 중 큰 쪽의 점프를 쓴다.
  - 소리가 짧게 끊기면 '타격음(transient)', 길게 이어지면 '기합/함성(sustained)'으로 분류한다.
  여기서는 '후보'만 찾는다. 실제 격파/타격인지는 2단계 화면 확인으로 판단한다.
"""
import argparse
import csv
import subprocess
import sys

import numpy as np

SR = 16000
HOP = 160   # 10ms
WIN = 400   # 25ms


def load_audio(path):
    cmd = ["ffmpeg", "-v", "error", "-i", path, "-vn", "-ac", "1", "-ar", str(SR),
           "-f", "s16le", "-"]
    raw = subprocess.run(cmd, check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def frame_db(x):
    n = 1 + max(0, (len(x) - WIN) // HOP)
    idx = np.arange(WIN)[None, :] + HOP * np.arange(n)[:, None]
    fr = x[idx]
    rms = np.sqrt(np.mean(fr * fr, axis=1) + 1e-12)
    return 20 * np.log10(rms + 1e-9)


def rolling_median_prev(db, k):
    """각 프레임 직전 k 프레임의 중앙값 (현재 프레임 미포함)."""
    out = np.empty_like(db)
    for i in range(len(db)):
        lo = max(0, i - k)
        out[i] = np.median(db[lo:i]) if i > lo else db[i]
    return out


def detect(path, thresh, min_gap, min_level_pct):
    x = load_audio(path)
    if len(x) < WIN:
        return []
    full = frame_db(x)
    hf = frame_db(np.diff(x, prepend=x[0]))          # 1차 차분 = 간단한 고역 강조
    k = int(0.5 * SR / HOP)
    jump = np.maximum(full - rolling_median_prev(full, k), hf - rolling_median_prev(hf, k))
    floor = np.percentile(full, min_level_pct)
    gap = int(min_gap * SR / HOP)

    cand = np.where((jump >= thresh) & (full >= floor))[0]
    events = []
    last = -10 ** 9
    for i in cand:
        if i - last < gap:
            continue
        # 시작점 이후 150ms 안의 최대 음량 위치 = 피크
        seg = full[i:i + 15]
        p = i + int(np.argmax(seg))
        peak = full[p]
        # 피크에서 -10dB 아래로 떨어질 때까지 걸린 시간 → 지속시간
        j = p
        while j < len(full) - 1 and full[j] > peak - 10 and (j - p) < 200:
            j += 1
        dur = (j - p) * HOP / SR
        events.append({
            "file": path,
            "onset": round(i * HOP / SR, 3),
            "peak": round(p * HOP / SR, 3),
            "peak_db": round(float(peak), 1),
            "jump_db": round(float(jump[i]), 1),
            "decay_s": round(dur, 3),
            "kind": "transient" if dur < 0.15 else "sustained",
        })
        last = i
    return events


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("videos", nargs="+")
    ap.add_argument("-o", "--out", default="onsets.csv")
    ap.add_argument("--thresh", type=float, default=12.0, help="갑자기 커지는 정도(dB)")
    ap.add_argument("--min-gap", type=float, default=0.35, help="후보 사이 최소 간격(초)")
    ap.add_argument("--min-level-pct", type=float, default=60.0,
                    help="전체 음량 중 이 백분위 이상인 소리만 후보로")
    a = ap.parse_args()

    rows = []
    for v in a.videos:
        ev = detect(v, a.thresh, a.min_gap, a.min_level_pct)
        print(f"{v}: 후보 {len(ev)}개", file=sys.stderr)
        rows += ev
    for n, r in enumerate(rows, 1):
        r["id"] = f"E{n:03d}"
    fields = ["id", "file", "onset", "peak", "peak_db", "jump_db", "decay_s", "kind"]
    with open(a.out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in rows:
            w.writerow({k: r[k] for k in fields})
    print(a.out)


if __name__ == "__main__":
    main()
