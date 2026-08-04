"""Build a local QA contact sheet for every generated unit cutout."""

from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


TILE_WIDTH = 240
TILE_HEIGHT = 290
ART_HEIGHT = 246
CHECKER = 16


def checkerboard(size: tuple[int, int]) -> Image.Image:
    image = Image.new("RGBA", size, "#16242a")
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], CHECKER):
        for x in range(0, size[0], CHECKER):
            if (x // CHECKER + y // CHECKER) % 2 == 0:
                draw.rectangle(
                    (x, y, x + CHECKER - 1, y + CHECKER - 1),
                    fill="#26383d",
                )
    return image


def fit_cutout(path: Path) -> Image.Image:
    with Image.open(path) as source:
        rgba = source.convert("RGBA")
    bbox = rgba.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError(f"{path} has no visible pixels")
    cropped = rgba.crop(bbox)
    scale = min((TILE_WIDTH - 24) / cropped.width, (ART_HEIGHT - 18) / cropped.height)
    return cropped.resize(
        (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale))),
        Image.Resampling.NEAREST,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset-root", type=Path, default=Path("public/assets"))
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(".codex-local/asset-contact-sheet.png"),
    )
    parser.add_argument("--columns", type=int, default=5)
    args = parser.parse_args()

    paths = [
        *sorted((args.asset_root / "characters").glob("*.png")),
        *sorted((args.asset_root / "enemies").glob("*.png")),
    ]
    if not paths:
        raise SystemExit("No canonical sprites found.")

    rows = math.ceil(len(paths) / args.columns)
    sheet = Image.new(
        "RGBA",
        (args.columns * TILE_WIDTH, rows * TILE_HEIGHT),
        "#07171e",
    )
    font = ImageFont.load_default(size=16)
    for index, path in enumerate(paths):
        x = (index % args.columns) * TILE_WIDTH
        y = (index // args.columns) * TILE_HEIGHT
        tile = checkerboard((TILE_WIDTH - 8, ART_HEIGHT))
        cutout = fit_cutout(path)
        tile.alpha_composite(
            cutout,
            ((tile.width - cutout.width) // 2, tile.height - cutout.height - 5),
        )
        sheet.alpha_composite(tile, (x + 4, y + 4))
        draw = ImageDraw.Draw(sheet)
        draw.rectangle(
            (x + 4, y + 4, x + TILE_WIDTH - 5, y + TILE_HEIGHT - 5),
            outline="#b88d43",
            width=2,
        )
        label = path.stem.replace("-", " ").upper()
        draw.text((x + 12, y + ART_HEIGHT + 13), label, fill="#f0d899", font=font)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(args.output, "PNG", optimize=True)
    print(f"Wrote {len(paths)} assets to {args.output}.")


if __name__ == "__main__":
    main()
