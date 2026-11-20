#!/usr/bin/env python3
"""3단계: 편집 계획(edl.json)대로 1080x1920 세로 릴스를 만든다.

사용법:
  python3 render.py edl.json

edl.json 예시는 edl.example.json 참고. 세그먼트 종류:
  clip   : 일반 장면.  start/end(원본 초), speed(0.5=절반 속도), caption, zoom 등
  impact : 격파/타격 장면. impact(원본에서 깨지는·닿는 순간, 초)를 기준으로
           [impact-pre ~ impact-slow_before] 정상 속도  → 깨지기 직전부터 시작
           [impact-slow_before ~ impact+slow_after] 느린 화면 + 확대 + 번쩍임 + 흔들림
           [impact+slow_after ~ impact+post] 정상 속도
공통 옵션: crop_x(0~1, 세로로 자를 가로 위치), cx/cy(0~1, 확대 중심), caption

결과: output 경로의 mp4 + 같은 이름의 _report.json / _report.md
      (완성본 몇 초 ← 원본 어느 파일 몇 초인지, 격파 순간이 완성본 몇 초에 있는지)
"""
import json
import os
import subprocess
import sys
import tempfile

W, H, FPS = 1080, 1920, 30
FONT = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
GRADE = ("eq=contrast=1.18:saturation=1.32:brightness=-0.015:gamma=0.97,"
         "colorbalance=rs=-0.04:bs=0.06:rh=0.05:bh=-0.03,"
         "curves=preset=medium_contrast,vignette=PI/5")


def esc(s):
    return s.replace("\\", "\\\\").replace("'", "’").replace(":", "\\:").replace("%", "\\%")


def atempo_chain(speed):
    parts, s = [], speed
    while s < 0.5:
        parts.append("atempo=0.5")
        s /= 0.5
    while s > 2.0:
        parts.append("atempo=2.0")
        s /= 2.0
    parts.append(f"atempo={s:.4f}")
    return ",".join(parts)


def text_filters(lines, y_expr, size, appear=0.0, dur=None, fade=True):
    """굵은 큰 자막: 흰 글씨 + 검은 외곽선, 0.12초 페이드인."""
    out = []
    for i, line in enumerate(lines):
        en = f"gte(t,{appear})" if dur is None else f"between(t,{appear},{appear + dur})"
        out.append(
            f"drawtext=fontfile={FONT}:text='{esc(line)}':fontsize={size}:fontcolor=white:"
            f"borderw={max(4, size // 14)}:bordercolor=black:shadowx=0:shadowy=6:shadowcolor=black@0.6:"
            f"x=(w-text_w)/2:y={y_expr}+{i}*{int(size * 1.25)}:"
            + (f"alpha='min(max((t-{appear})/0.12,0),1)':" if fade else "")
            + f"enable='{en}'")
    return out


def video_chain(seg, dur_out):
    """원본 → 속도 → 30fps → 세로 크롭 → 확대 → 색보정 → 흔들림/번쩍임 → 자막."""
    speed = seg.get("speed", 1.0)
    f = [f"setpts=PTS/{speed}"]   # 원본 시각 유지(STARTPTS로 당기면 격파 순간이 앞당겨짐)
    if speed < 1 and seg.get("smooth", False):   # 섞인 프레임은 격파 순간을 왜곡하므로 기본 끔
        f.append(f"minterpolate=fps={FPS}:mi_mode=blend")
    f.append(f"fps={FPS}:start_time=0")
    cx = seg.get("crop_x", 0.5)
    # 가로 영상이면 세로 9:16 만큼 잘라내고, 세로 영상이면 위아래를 맞춘다
    f.append(f"crop=w='if(gt(iw/ih,{W}/{H}),ih*{W}/{H},iw)':h='if(gt(iw/ih,{W}/{H}),ih,iw*{H}/{W})':"
             f"x='(iw-ow)*{cx}':y='(ih-oh)/2'")
    f.append(f"scale={W}:{H}:flags=lanczos,setsar=1")
    z0, z1 = seg.get("zoom_from", 1.0), seg.get("zoom", 1.0)
    if z0 != 1.0 or z1 != 1.0:
        n = max(1, int(dur_out * FPS) - 1)
        zx, zy = seg.get("cx", 0.5), seg.get("cy", 0.5)
        f.append(
            f"zoompan=z='{z0}+({z1}-{z0})*min(in/{n},1)':d=1:s={W}x{H}:fps={FPS}:"
            f"x='max(0,min(iw-iw/zoom,iw*{zx}-iw/zoom/2))':y='max(0,min(ih-ih/zoom,ih*{zy}-ih/zoom/2))'")
    f.append(GRADE)
    fx = round(seg.get("fx_at", 0.0), 3)   # 번쩍임·흔들림이 터지는 시각(이 조각 안에서)
    if seg.get("shake"):
        a = seg.get("shake_px", 24)
        u = f"(t-{fx})"
        win = f"between({u},0,0.3)"
        f.append(f"scale={int(W * 1.06)}:{int(H * 1.06)}")
        f.append(f"crop={W}:{H}:x='(iw-ow)/2+if({win},{a}*sin({u}*95)*(1-{u}/0.3),0)':"
                 f"y='(ih-oh)/2+if({win},{a}*cos({u}*83)*(1-{u}/0.3),0)'")
    if seg.get("flash"):
        f.append(f"drawbox=x=0:y=0:w=iw:h=ih:color=white@0.75:t=fill:enable='between(t,{fx},{fx + 0.07})'")
        f.append(f"drawbox=x=0:y=0:w=iw:h=ih:color=white@0.35:t=fill:enable='between(t,{fx + 0.07},{fx + 0.14})'")
    if seg.get("fade_in"):
        f.append(f"fade=t=in:st=0:d={seg['fade_in']}")
    if seg.get("fade_out"):
        f.append(f"fade=t=out:st={dur_out - seg['fade_out']:.3f}:d={seg['fade_out']}")
    if seg.get("title"):
        f += text_filters(seg["title"], "h*0.36", seg.get("title_size", 104), seg.get("title_at", 0.0))
    if seg.get("caption"):
        f += text_filters([seg["caption"]], "h*0.70", seg.get("caption_size", 110), 0.0,
                          fade=seg.get("caption_fade", True))
    if seg.get("ending"):
        f += text_filters(seg["ending"], "h*0.68", seg.get("ending_size", 76), seg.get("ending_at", 0.3))
    return ",".join(f)


def render_piece(seg, src_dir, out):
    src = os.path.join(src_dir, seg["src"])
    start, end = seg["start"], seg["end"]
    speed = seg.get("speed", 1.0)
    dur_out = (end - start) / speed
    vf = video_chain(seg, dur_out)
    af = [atempo_chain(speed) if speed != 1.0 else "anull",
          f"volume={seg.get('volume', 1.0)}", "aresample=48000",
          "aformat=sample_fmts=fltp:channel_layouts=stereo",
          f"apad,atrim=0:{dur_out:.3f}"]
    if seg.get("audio") == "mute":
        af.insert(1, "volume=0")
    cmd = ["ffmpeg", "-v", "error", "-y", "-ss", f"{start:.3f}", "-t", f"{end - start:.3f}",
           "-i", src, "-filter_complex",
           f"[0:v]{vf}[v];[0:a]{','.join(af)}[a]", "-map", "[v]", "-map", "[a]",
           "-t", f"{dur_out:.3f}", "-r", str(FPS), "-c:v", "libx264", "-preset", "medium",
           "-crf", "17", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", out]
    subprocess.run(cmd, check=True)
    real = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                           "format=duration", "-of", "default=nw=1:nk=1", out],
                          capture_output=True, text=True, check=True).stdout.strip()
    return float(real)


def expand(seg):
    """impact 세그먼트를 직전(정상) / 순간(느림+확대+번쩍) / 직후(정상) 3조각으로 나눈다."""
    if seg.get("kind") != "impact":
        return [dict(seg, part="clip")]
    t = seg["impact"]
    pre, post = seg.get("pre", 0.8), seg.get("post", 0.6)
    sb, sa = seg.get("slow_before", 0.15), seg.get("slow_after", 0.35)
    slow = seg.get("slow", 0.35)
    base = {k: seg[k] for k in ("src", "crop_x", "cx", "cy") if k in seg}
    z = seg.get("zoom", 1.4)
    parts = [
        dict(base, part="pre", start=t - pre, end=t - sb, speed=1.0,
             zoom_from=1.0, zoom=seg.get("pre_zoom", 1.08), caption=seg.get("caption")),
        dict(base, part="hit", start=t - sb, end=t + sa, speed=slow,
             zoom_from=seg.get("pre_zoom", 1.08), zoom=z, flash=True, shake=True,
             volume=seg.get("hit_volume", 1.4), caption=seg.get("caption"), caption_fade=False,
             smooth=seg.get("smooth", False), impact_at=sb / slow,
             fx_at=sb / slow),
        dict(base, part="post", start=t + sa, end=t + post, speed=1.0,
             zoom_from=z, zoom=z, caption=seg.get("caption"), caption_fade=False),
    ]
    return [p for p in parts if p["end"] - p["start"] > 0.02]


def main():
    edl = json.load(open(sys.argv[1], encoding="utf-8"))
    src_dir = edl.get("source_dir", ".")
    out = edl["output"]
    tmp = tempfile.mkdtemp(prefix="reel_")
    pieces, report, t_out = [], [], 0.0
    for si, seg in enumerate(edl["segments"]):
        for pi, p in enumerate(expand(seg)):
            fn = os.path.join(tmp, f"{si:03d}_{pi}.mp4")
            d = render_piece(p, src_dir, fn)
            pieces.append(fn)
            row = {"seg": si, "label": seg.get("label", ""), "part": p["part"],
                   "out_start": round(t_out, 2), "out_end": round(t_out + d, 2),
                   "src": p["src"], "src_start": round(p["start"], 2), "src_end": round(p["end"], 2),
                   "speed": p.get("speed", 1.0)}
            if p["part"] == "hit":
                row["src_impact"] = seg["impact"]
                row["out_impact"] = round(t_out + p["impact_at"], 2)
            report.append(row)
            t_out += d
            print(f"[{t_out:6.2f}s] {seg.get('label', '')} {p['part']}", file=sys.stderr)
    lst = os.path.join(tmp, "list.txt")
    with open(lst, "w") as f:
        f.writelines(f"file '{p}'\n" for p in pieces)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst,
                    "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.0:LRA=11", "-c:a", "aac",
                    "-b:a", "256k", "-movflags", "+faststart", out], check=True)
    base = os.path.splitext(out)[0]
    json.dump(report, open(base + "_report.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    with open(base + "_report.md", "w", encoding="utf-8") as f:
        f.write(f"# 편집 내역 (총 {t_out:.1f}초)\n\n| 완성본 | 장면 | 구간 | 원본 파일 | 원본 시각 | 속도 | 격파·타격 순간 |\n"
                "|---|---|---|---|---|---|---|\n")
        for r in report:
            hit = f"원본 {r['src_impact']:.2f}s → 완성본 {r['out_impact']:.2f}s" if "out_impact" in r else ""
            f.write(f"| {r['out_start']:.2f}–{r['out_end']:.2f}s | {r['label']} | {r['part']} | {r['src']} | "
                    f"{r['src_start']:.2f}–{r['src_end']:.2f}s | {r['speed']}x | {hit} |\n")
    print(out)


if __name__ == "__main__":
    main()
