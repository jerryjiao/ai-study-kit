#!/usr/bin/env python3
"""生成官网 OG 分享图（1200x630，C 风视觉基准：indigo→cyan 渐变）。

用法：python3 apps/site/scripts/gen-og.py [--out apps/site/public/og.png]
产物 og.png 提交入库（CI 不装 PIL，避免运行期依赖）；改视觉时本地重跑再提交。
"""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
INDIGO = (79, 70, 229)
CYAN = (6, 182, 212)

CJK_FONTS = [
    "/System/Library/Fonts/PingFang.ttc",  # macOS（旧版路径，新版系统可能没有）
    "/System/Library/Fonts/Hiragino Sans GB.ttc",  # macOS 冬青黑体（本机实测可用）
    "/System/Library/Fonts/STHeiti Medium.ttc",  # macOS 备用黑体
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",  # Linux (noto-cjk)
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",  # Linux fallback（无中文）
]


def load_font(size: int) -> ImageFont.FreeTypeFont:
    for p in CJK_FONTS:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "public" / "og.png"))
    args = ap.parse_args()

    # 对角渐变：2x2 角色块 + 双线性放大
    grad = Image.new("RGB", (2, 2))
    grad.putpixel((0, 0), INDIGO)
    grad.putpixel((1, 0), (60, 100, 230))
    grad.putpixel((0, 1), (30, 130, 235))
    grad.putpixel((1, 1), CYAN)
    img = grad.resize((W, H), Image.BILINEAR)
    draw = ImageDraw.Draw(img)

    # 左上角色徽标：白色描边圆角块 + 「学」（RGB 图不支持半透明填充，白 fill 会盖掉字，故只描边）
    badge = 118
    draw.rounded_rectangle((64, 64, 64 + badge, 64 + badge), radius=26, outline=(255, 255, 255), width=3)
    draw.text((64 + badge // 2, 64 + badge // 2), "学", font=load_font(74),
              fill=(255, 255, 255), anchor="mm")

    # 标题区（2026-09-16 随首页「零准备」翻转同步：主句改「说一句就开学」）
    draw.text((66, 268), "ai-study-kit", font=load_font(96), fill=(255, 255, 255), anchor="lm")
    draw.text((68, 372), "对 AI 说「我想学 X」，带你练到会", font=load_font(52), fill=(255, 255, 255), anchor="lm")
    draw.text((68, 456), "出题 · 课程 · 闪卡 · 错题精讲 · 间隔重复", font=load_font(34),
              fill=(230, 240, 255), anchor="lm")
    # 底部标签条
    draw.text((68, H - 64), "开源 MIT · GitHub Pages", font=load_font(28),
              fill=(210, 225, 255), anchor="lm")

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "PNG")
    print(f"og image -> {out} ({W}x{H})")


if __name__ == "__main__":
    main()
