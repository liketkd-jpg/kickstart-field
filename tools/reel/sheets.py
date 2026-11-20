#!/usr/bin/env python3
"""2단계: 후보 순간마다 앞뒤 1초를 초당 10장(0.1초 간격, 총 21장)으로 뽑아 한 장의 확인표로 만든다.

사용법:
  python3 sheets.py work/onsets.csv -d work/sheets            # onsets.py 결과 전체
  python3 sheets.py --file 완성본.mp4 --at 3.2 7.85 -d work/verify   # 특정 시각만

각 칸에는 원본 기준 시각(초)과 후보 순간 기준 칸 번호(-10 ~ +10)가 찍힌다.
후보 순간(0번 칸)은 빨간 테두리로 표시된다.
이 표를 한 장씩 보면서 '송판이 실제로 깨지는 칸' / '발이 실제로 닿는 칸'을 고르고,
확실하지 않으면 제외한다.
"""
import argparse
import csv
import os
import subprocess
import sys

FONT = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"


def sheet(src, center, out_png, width=360, span=1.0, rate=10, cols=7):
    start = max(0.0, center - span)
    n = int(round((center - start) * rate))          # 0번 칸(후보 순간)의 인덱스
    total = int(round(2 * span * rate)) + 1
    rows = (total + cols - 1) // cols
    label = (
        f"drawtext=fontfile={FONT}:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.7:"
        f"x=6:y=6:text='%{{pts\\:flt\\:{start:.3f}}}s  [%{{eif\\:n-{n}\\:d}}]'"
    )
    mark = f"drawbox=x=0:y=0:w=iw:h=ih:color=red:t=8:enable='eq(n\\,{n})'"
    vf = f"fps={rate},scale={width}:-2,{label},{mark},tile={cols}x{rows}:padding=4:color=gray"
    cmd = ["ffmpeg", "-v", "error", "-y", "-ss", f"{start:.3f}", "-i", src,
           "-t", f"{(total - 0.5) / rate:.3f}", "-vf", vf, "-frames:v", "1", out_png]
    subprocess.run(cmd, check=True)
    return out_png


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv", nargs="?")
    ap.add_argument("--file")
    ap.add_argument("--at", nargs="*", type=float, default=[])
    ap.add_argument("-d", "--dir", default="sheets")
    ap.add_argument("--width", type=int, default=360)
    a = ap.parse_args()
    os.makedirs(a.dir, exist_ok=True)

    jobs = []
    if a.csv:
        with open(a.csv, encoding="utf-8") as f:
            for r in csv.DictReader(f):
                jobs.append((r["id"], r["file"], float(r["onset"])))
    for i, t in enumerate(a.at, 1):
        jobs.append((f"T{i:02d}_{t:.2f}", a.file, t))

    for jid, src, t in jobs:
        out = os.path.join(a.dir, f"{jid}.png")
        sheet(src, t, out, width=a.width)
        print(out, file=sys.stderr)


if __name__ == "__main__":
    main()
