"""Derive lightweight portrait and board-token PNGs from canonical sprite art.

The canonical transparent cutouts remain in public/assets/characters and
public/assets/enemies. This script trims their transparent margins, then fits
the same source art onto consistent transparent canvases for the React HUD and
Phaser board.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


PORTRAIT_SIZE = 256
TOKEN_SIZE = 160


def trimmed_with_padding(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    bbox = rgba.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("image contains no visible pixels")

    left, top, right, bottom = bbox
    width = right - left
    height = bottom - top
    pad_x = max(2, round(width * 0.025))
    pad_y = max(2, round(height * 0.025))
    expanded = (
        max(0, left - pad_x),
        max(0, top - pad_y),
        min(rgba.width, right + pad_x),
        min(rgba.height, bottom + pad_y),
    )
    return rgba.crop(expanded)


def fit_transparent(image: Image.Image, size: int) -> Image.Image:
    scale = min(size / image.width, size / image.height)
    resized = image.resize(
        (
            max(1, round(image.width * scale)),
            max(1, round(image.height * scale)),
        ),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    x = (size - resized.width) // 2
    y = size - resized.height
    canvas.alpha_composite(resized, (x, y))
    return canvas


def derive_group(asset_root: Path, group: str) -> int:
    source_dir = asset_root / group
    portrait_dir = asset_root / "portraits"
    token_dir = asset_root / "tokens"
    portrait_dir.mkdir(parents=True, exist_ok=True)
    token_dir.mkdir(parents=True, exist_ok=True)

    count = 0
    for source_path in sorted(source_dir.glob("*.png")):
        with Image.open(source_path) as source:
            trimmed = trimmed_with_padding(source)
            portrait = fit_transparent(trimmed, PORTRAIT_SIZE)
            token = fit_transparent(trimmed, TOKEN_SIZE)

        portrait.save(
            portrait_dir / source_path.name,
            "PNG",
            optimize=True,
            compress_level=9,
        )
        token.save(
            token_dir / source_path.name,
            "PNG",
            optimize=True,
            compress_level=9,
        )
        count += 1
    return count


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--asset-root",
        type=Path,
        default=Path("public/assets"),
        help="Directory containing characters/ and enemies/.",
    )
    args = parser.parse_args()

    total = derive_group(args.asset_root, "characters")
    total += derive_group(args.asset_root, "enemies")
    print(
        f"Derived {total} portrait ({PORTRAIT_SIZE}px) and "
        f"token ({TOKEN_SIZE}px) variants."
    )


if __name__ == "__main__":
    main()
