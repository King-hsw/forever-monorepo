#!/usr/bin/env python3
# iOS PWA 启动图生成器：由 public/icons/avatar.png 合成 public/splash/ 下全部设备尺寸。
# 需 python3 + Pillow（本机无 sharp/ImageMagick）。设备表与 nuxt.config.ts 的
# SPLASH_DEVICES 一一对应，新增设备时两处同步改。
# 用法：python3 scripts/gen-ios-splash.py
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
AVATAR = ROOT / "public" / "icons" / "avatar.png"
OUT = ROOT / "public" / "splash"

# 站点玉墨底（main.css --c-body-bg 暗色），Android manifest background_color 同值
BG = (0x13, 0x15, 0x14)
PAPER = (0xF4, 0xF7, 0xF1)  # --c-bg 淡玉纸，题字与描环用
SITE_NAME = "补陋阁"
# 宋体（楷体macOS不自带），补陋阁站名题字
FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Songti.ttc",
    "/System/Library/Fonts/Supplemental/STSong.ttf",
]

# (宽px, 高px, pt宽, pt高, dpr)：现代 iOS 全系在役设备
IPHONES = [
    (750, 1334, 375, 667, 2),   # 6/7/8/SE2/SE3
    (1242, 2208, 414, 736, 3),  # 6/7/8 Plus
    (1125, 2436, 375, 812, 3),  # X/XS/11 Pro
    (828, 1792, 414, 896, 2),   # XR/11
    (1242, 2688, 414, 896, 3),  # XS Max/11 Pro Max
    (1170, 2532, 390, 844, 3),  # 12/13/14/16e
    (1179, 2556, 393, 852, 3),  # 12-15 Pro/14/15
    (1284, 2778, 428, 926, 3),  # 12/13 Pro Max, 14 Plus
    (1290, 2796, 430, 932, 3),  # 14-16 Plus/Pro Max
    (1206, 2622, 402, 874, 3),  # 16/17 Pro
    (1320, 2868, 440, 956, 3),  # 16/17 Pro Max
    (1260, 2736, 420, 912, 3),  # iPhone Air
]
IPADS = [
    (1536, 2048, 768, 1024, 2),   # mini 4 / Air 2 / 9.7
    (1620, 2160, 810, 1080, 2),   # iPad 7-9
    (1640, 2360, 820, 1180, 2),   # iPad 10/11
    (1488, 2266, 744, 1133, 2),   # mini 6/7
    (1668, 2224, 834, 1112, 2),   # Air 3 / Pro 10.5
    (1668, 2388, 834, 1194, 2),   # Pro 11 / Air 4-5
    (1668, 2420, 838, 1210, 2),   # Pro 11 M4
    (2048, 2732, 1024, 1366, 2),  # Pro 12.9
    (2064, 2752, 1032, 1376, 2),  # Pro 13 M4
]


def load_font(size: int):
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return None


def render(w: int, h: int, avatar: Image.Image) -> Image.Image:
    img = Image.new("RGB", (w, h), BG)

    d = round(min(w, h) * 0.24)  # 头像直径
    font = load_font(round(d * 0.26))
    gap = round(d * 0.18)  # 头像与题字间距
    text_h = round(d * 0.26 * 1.2) if font else 0
    block_h = d + (gap + text_h if font else 0)
    top = (h - block_h) // 2
    cx = w // 2

    # 头像圆形裁切（4x 超采样抗锯齿），上移让整体块垂直居中
    mask = Image.new("L", (d * 4, d * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, d * 4 - 1, d * 4 - 1), fill=255)
    mask = mask.resize((d, d), Image.LANCZOS)
    face = avatar.resize((d, d), Image.LANCZOS)
    img.paste(face, (cx - d // 2, top), mask)

    draw = ImageDraw.Draw(img, "RGBA")
    # 发丝描环：勾出头像轮廓，免得墨底头像融进墨底画布
    ring_w = max(2, d // 150)
    ring_gap = max(3, d // 90)
    r = d / 2 + ring_gap
    draw.ellipse(
        (cx - r, top + d / 2 - r, cx + r, top + d / 2 + r),
        outline=PAPER + (36,),
        width=ring_w,
    )

    # 站名题字，加字距
    if font:
        fs = font.size
        sp = round(fs * 0.18)
        cy = top + d + gap + text_h / 2
        widths = [draw.textlength(ch, font=font) for ch in SITE_NAME]
        total = sum(widths) + sp * (len(SITE_NAME) - 1)
        x = cx - total / 2
        for ch, cw in zip(SITE_NAME, widths):
            draw.text((x + cw / 2, cy), ch, font=font, fill=PAPER, anchor="mm")
            x += cw + sp
    return img


def main():
    avatar = Image.open(AVATAR).convert("RGB")
    OUT.mkdir(parents=True, exist_ok=True)
    n = 0
    for w, h, *_ in IPHONES + IPADS:
        render(w, h, avatar).save(OUT / f"{w}x{h}.png", optimize=True)
        render(h, w, avatar).save(OUT / f"{h}x{w}.png", optimize=True)  # 横屏
        n += 2
    print(f"generated {n} splash images -> {OUT}")


if __name__ == "__main__":
    main()
