#!/usr/bin/env python3
"""5단계: 완성본을 처음부터 다시 확인한다.

사용법:
  python3 verify.py 완성본.mp4 [-d work/verify]

- 완성본 전체를 0.5초 간격으로 훑어보는 개요표(overview_XX.png)
- 리포트의 격파·타격 순간마다 앞뒤 1초를 초당 10장으로 뽑은 확인표(hit_XX.png)
를 만든다. 격파 순간이 아닌 장면이 들어갔으면 edl.json에서 그 세그먼트를 빼거나
impact 시각을 고친 뒤 render.py를 다시 돌린다.
"""
import argparse
import json
import os
import subprocess
import sys

from sheets import FONT, sheet


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("-d", "--dir", default="verify")
    a = ap.parse_args()
    os.makedirs(a.dir, exist_ok=True)
    rep = json.load(open(os.path.splitext(a.video)[0] + "_report.json", encoding="utf-8"))

    label = (f"drawtext=fontfile={FONT}:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.7:"
             f"x=4:y=4:text='%{{pts\\:flt}}s'")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a.video, "-vf",
                    f"fps=2,scale=180:-2,{label},tile=10x4:padding=3:color=gray",
                    os.path.join(a.dir, "overview_%02d.png")], check=True)

    for i, r in enumerate([r for r in rep if "out_impact" in r], 1):
        out = os.path.join(a.dir, f"hit_{i:02d}_{r['label'] or 'impact'}.png")
        sheet(a.video, r["out_impact"], out, width=270)
        print(f"{out}  (완성본 {r['out_impact']}s ← {r['src']} {r['src_impact']}s)", file=sys.stderr)


if __name__ == "__main__":
    main()
