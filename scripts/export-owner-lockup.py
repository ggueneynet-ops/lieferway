#!/usr/bin/env python3
"""Export official owner lockup into public header / splash / favicon rasters."""

from __future__ import annotations

from collections import deque
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path("/workspace")
SRC = ROOT / "lieferway/brand-premium/logo/OWNER-LOCKUP-FINAL.png"
PUBLIC = ROOT / "public"

PINK = (233, 30, 99, 255)  # #E91E63


def knockout_white(im: Image.Image, tol: int = 16) -> Image.Image:
    a = np.array(im.convert("RGBA"))
    h, w = a.shape[:2]
    rgb = a[:, :, :3].astype(np.int16)
    vis = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    def is_white(y: int, x: int) -> bool:
        r, g, b = rgb[y, x]
        return r >= 255 - tol and g >= 255 - tol and b >= 255 - tol

    for y in range(h):
        for x in (0, w - 1):
            if is_white(y, x):
                vis[y, x] = True
                q.append((y, x))
    for x in range(w):
        for y in (0, h - 1):
            if not vis[y, x] and is_white(y, x):
                vis[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not vis[ny, nx] and is_white(ny, nx):
                vis[ny, nx] = True
                q.append((ny, nx))
    a[:, :, 3] = np.where(vis, 0, 255)
    # Soften leftover near-white fringe on opaque pixels
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    luma = rgb.max(axis=2)
    fringe = (~vis) & (luma > 245) & (chroma < 10)
    a[:, :, 3] = np.where(fringe, 0, a[:, :, 3])
    return Image.fromarray(a)


def trim(im: Image.Image, pad: int = 0) -> Image.Image:
    a = np.array(im)
    alpha = a[:, :, 3]
    ys, xs = np.where(alpha > 8)
    if len(xs) == 0:
        return im
    left, right = int(xs.min()), int(xs.max()) + 1
    top, bottom = int(ys.min()), int(ys.max()) + 1
    cropped = im.crop((left, top, right, bottom))
    if pad <= 0:
        return cropped
    out = Image.new("RGBA", (cropped.width + pad * 2, cropped.height + pad * 2), (0, 0, 0, 0))
    out.paste(cropped, (pad, pad))
    return out


def scale_to_height(im: Image.Image, height: int) -> Image.Image:
    w = max(1, round(im.width * (height / im.height)))
    return im.resize((w, height), Image.Resampling.LANCZOS)


def square_pad(im: Image.Image, size: int, bg: tuple[int, int, int, int] = (0, 0, 0, 0)) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), bg)
    if im.width == 0 or im.height == 0:
        return canvas
    fit = int(size * 0.84)
    scale = min(fit / im.width, fit / im.height)
    nw, nh = max(1, round(im.width * scale)), max(1, round(im.height * scale))
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas.paste(resized, ((size - nw) // 2, (size - nh) // 2), resized)
    return canvas


def navy_to_white(im: Image.Image) -> Image.Image:
    a = np.array(im.convert("RGBA"))
    rgb = a[:, :, :3].astype(np.int16)
    luma = 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    dark = (a[:, :, 3] > 20) & (luma < 70) & (chroma < 55)
    a[dark, 0] = 255
    a[dark, 1] = 255
    a[dark, 2] = 255
    return Image.fromarray(a)


def png_to_svg(im: Image.Image, dest: Path, size: int = 128) -> None:
    squared = square_pad(im, size)
    buf = BytesIO()
    squared.save(buf, format="PNG")
    import base64

    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    dest.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">\n'
        f'  <image href="data:image/png;base64,{b64}" width="{size}" height="{size}"/>\n'
        f"</svg>\n",
        encoding="utf-8",
    )


def save(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, format="PNG", optimize=True)
    print(f"{path.name:40s} {im.size[0]:4d}x{im.size[1]:<4d} {im.mode}")


def main() -> None:
    raw = Image.open(SRC).convert("RGBA")
    save(raw, PUBLIC / "OWNER-LOCKUP-FINAL.png")

    full = knockout_white(raw)
    save(full, PUBLIC / "Lieferway-splash-lockup.png")
    save(full, PUBLIC / "Lieferway-lockup.png")
    splash_hi = full.resize((2048, round(2048 * full.height / full.width)), Image.Resampling.LANCZOS)
    save(splash_hi, PUBLIC / "Lieferway-splash-2048.png")

    header = full.copy()
    arr = np.array(header)
    # Drop slogan band to the right of the pin; keep the pin tip.
    arr[158:186, 155:, 3] = 0
    header = trim(Image.fromarray(arr), pad=2)
    save(header, PUBLIC / "Lieferway-header-from-owner.png")
    for h, name in ((64, "h64"), (96, "h96"), (128, "h128"), (256, "h256")):
        save(scale_to_height(header, h), PUBLIC / f"Lieferway-header-{name}.png")
    save(scale_to_height(navy_to_white(header), 128), PUBLIC / "Lieferway-header-white.png")

    pin = trim(full.crop((0, 0, 152, full.height)), pad=2)
    save(pin, PUBLIC / "icon-pin-fork.png")
    save(square_pad(pin, 32), PUBLIC / "favicon-32.png")
    save(square_pad(pin, 64), PUBLIC / "favicon-64.png")
    save(square_pad(pin, 180, bg=(255, 255, 255, 255)), PUBLIC / "apple-touch-icon.png")
    save(square_pad(pin, 192), PUBLIC / "icon-192.png")
    save(square_pad(pin, 512), PUBLIC / "icon-512.png")
    save(square_pad(pin, 1024, bg=(255, 255, 255, 255)), PUBLIC / "Lieferway-app-icon-pink-bg-1024.png")

    png_to_svg(pin, PUBLIC / "icon-pin-fork.svg")
    png_to_svg(pin, PUBLIC / "favicon.svg")
    png_to_svg(pin, PUBLIC / "icon.svg")


if __name__ == "__main__":
    main()
