"""Create the original Luffy pilot frames for headless LibreSprite import."""

from __future__ import annotations

import argparse
from pathlib import Path


COLORS = {
    "clear": (0, 0, 0),
    "outline": (20, 24, 38),
    "hair": (28, 24, 25),
    "skin": (222, 145, 92),
    "skin_light": (255, 190, 128),
    "skin_shade": (177, 91, 63),
    "hat": (231, 178, 54),
    "hat_light": (255, 218, 96),
    "hat_band": (184, 47, 44),
    "vest": (196, 39, 47),
    "vest_light": (238, 65, 58),
    "shorts": (39, 91, 164),
    "shorts_light": (61, 137, 205),
    "sash": (242, 191, 48),
    "sandal": (91, 52, 34),
    "white": (255, 241, 204),
    "energy": (105, 211, 238),
    "energy_light": (216, 251, 255),
}
INDEX = {name: position for position, name in enumerate(COLORS)}
PALETTE = [channel for color in COLORS.values() for channel in color]
PALETTE.extend([0] * (768 - len(PALETTE)))


class SvgDraw:
    def __init__(self) -> None:
        self.elements: list[str] = []

    @staticmethod
    def color(index: int) -> str:
        rgb = list(COLORS.values())[index]
        return f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}"

    def rectangle(self, bounds: tuple[int, int, int, int], *, fill: int) -> None:
        x1, y1, x2, y2 = bounds
        self.elements.append(
            f'<rect x="{x1}" y="{y1}" width="{x2 - x1 + 1}" height="{y2 - y1 + 1}" fill="{self.color(fill)}"/>'
        )

    def line(self, points: tuple[tuple[int, int], tuple[int, int]], *, fill: int, width: int) -> None:
        (x1, y1), (x2, y2) = points
        self.elements.append(
            f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{self.color(fill)}" stroke-width="{width}" stroke-linecap="square"/>'
        )

    def ellipse(self, bounds: tuple[int, int, int, int], *, fill: int) -> None:
        x1, y1, x2, y2 = bounds
        self.elements.append(
            f'<ellipse cx="{(x1 + x2) / 2}" cy="{(y1 + y2) / 2}" rx="{(x2 - x1 + 1) / 2}" ry="{(y2 - y1 + 1) / 2}" fill="{self.color(fill)}"/>'
        )

    def to_svg(self) -> str:
        body = "".join(self.elements)
        return f'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" shape-rendering="crispEdges">{body}</svg>'


def new_frame() -> SvgDraw:
    return SvgDraw()


def rect(draw: SvgDraw, x: int, y: int, width: int, height: int, color: str) -> None:
    draw.rectangle((x, y, x + width - 1, y + height - 1), fill=INDEX[color])


def line(draw: SvgDraw, start: tuple[int, int], end: tuple[int, int], color: str, width: int = 1) -> None:
    draw.line((start, end), fill=INDEX[color], width=width)


def ellipse(draw: SvgDraw, center: tuple[int, int], radii: tuple[int, int], color: str) -> None:
    x, y = center
    rx, ry = radii
    draw.ellipse((x - rx, y - ry, x + rx, y + ry), fill=INDEX[color])


def limb(draw: SvgDraw, start: tuple[int, int], end: tuple[int, int], width: int, color: str) -> None:
    line(draw, start, end, "outline", width + 2)
    line(draw, start, end, color, width)


def fist(draw: SvgDraw, x: int, y: int, scale: int = 1) -> None:
    ellipse(draw, (x, y), (4 * scale, 3 * scale), "outline")
    ellipse(draw, (x, y - 1), (3 * scale, 2 * scale), "skin_light")
    rect(draw, x - 2 * scale, y + scale, 4 * scale, scale, "skin_shade")


def draw_body(draw: SvgDraw, *, bob: int = 0, lean: int = 0,
              leg_back: int = 0, leg_front: int = 0,
              front_arm: tuple[int, int, int, int] | None = None,
              back_arm: tuple[int, int, int, int] | None = None,
              arm_width: int = 4, fist_scale: int = 1) -> None:
    body_x = 31 + lean
    head_y = 20 + bob
    back_arm = back_arm or (body_x - 4, 31 + bob, body_x - 10, 41 + bob)
    front_arm = front_arm or (body_x + 6, 31 + bob, body_x + 12, 40 + bob)

    limb(draw, back_arm[:2], back_arm[2:], 4, "skin")
    fist(draw, back_arm[2], back_arm[3])
    limb(draw, (body_x - 3, 44 + bob), (body_x - 6 + leg_back, 55), 5, "skin")
    limb(draw, (body_x + 4, 44 + bob), (body_x + 8 + leg_front, 55), 5, "skin_light")
    rect(draw, body_x - 11 + leg_back, 54, 9, 4, "outline")
    rect(draw, body_x - 10 + leg_back, 54, 8, 2, "sandal")
    rect(draw, body_x + 3 + leg_front, 54, 10, 4, "outline")
    rect(draw, body_x + 4 + leg_front, 54, 9, 2, "sandal")

    rect(draw, body_x - 8, 40 + bob, 17, 11, "outline")
    rect(draw, body_x - 6, 41 + bob, 6, 9, "shorts")
    rect(draw, body_x + 1, 41 + bob, 6, 9, "shorts_light")
    rect(draw, body_x - 7, 39 + bob, 15, 4, "sash")
    rect(draw, body_x + 6, 41 + bob, 5, 2, "sash")

    rect(draw, body_x - 7, 27 + bob, 15, 14, "outline")
    rect(draw, body_x - 5, 28 + bob, 11, 12, "skin")
    rect(draw, body_x - 7, 27 + bob, 5, 14, "vest")
    rect(draw, body_x + 4, 27 + bob, 5, 14, "vest_light")
    rect(draw, body_x - 1, 30 + bob, 2, 8, "skin_light")

    rect(draw, body_x - 3, 24 + bob, 7, 6, "outline")
    rect(draw, body_x - 2, 24 + bob, 5, 5, "skin")
    ellipse(draw, (body_x, head_y), (9, 9), "outline")
    ellipse(draw, (body_x + 1, head_y), (7, 7), "skin_light")
    rect(draw, body_x - 7, head_y - 7, 12, 4, "hair")
    rect(draw, body_x - 8, head_y - 4, 3, 6, "hair")
    rect(draw, body_x + 5, head_y - 4, 3, 5, "hair")
    rect(draw, body_x - 12, head_y - 10, 24, 4, "outline")
    rect(draw, body_x - 10, head_y - 10, 20, 2, "hat_light")
    rect(draw, body_x - 7, head_y - 15, 14, 7, "outline")
    rect(draw, body_x - 5, head_y - 14, 10, 5, "hat")
    rect(draw, body_x - 6, head_y - 10, 12, 2, "hat_band")
    rect(draw, body_x - 2, head_y - 1, 2, 2, "outline")
    rect(draw, body_x + 5, head_y - 1, 2, 2, "outline")
    rect(draw, body_x, head_y + 4, 5, 1, "outline")
    rect(draw, body_x - 2, head_y + 2, 1, 3, "skin_shade")
    rect(draw, body_x - 4, head_y + 3, 3, 1, "skin_shade")

    limb(draw, front_arm[:2], front_arm[2:], arm_width, "skin_light")
    fist(draw, front_arm[2], front_arm[3], fist_scale)


def draw_defeated(draw: SvgDraw, settled: bool) -> None:
    y = 1 if settled else 0
    # A compact horizontal pose that stays on the same baseline as standing frames.
    limb(draw, (39, 48 + y), (56, 54 + y), 5, "skin_light")
    rect(draw, 50, 53 + y, 10, 4, "outline")
    rect(draw, 51, 53 + y, 9, 2, "sandal")
    rect(draw, 31, 43 + y, 18, 11, "outline")
    rect(draw, 33, 44 + y, 8, 9, "vest")
    rect(draw, 41, 44 + y, 6, 9, "skin")
    rect(draw, 45, 48 + y, 7, 6, "shorts")
    rect(draw, 46, 47 + y, 7, 3, "sash")
    limb(draw, (36, 48 + y), (27, 55 + y), 4, "skin")
    fist(draw, 25, 55 + y)
    ellipse(draw, (24, 46 + y), (9, 8), "outline")
    ellipse(draw, (23, 46 + y), (7, 6), "skin_light")
    rect(draw, 17, 40 + y, 12, 4, "hair")
    rect(draw, 13, 38 + y, 23, 4, "outline")
    rect(draw, 15, 38 + y, 19, 2, "hat_light")
    rect(draw, 18, 34 + y, 13, 6, "outline")
    rect(draw, 20, 35 + y, 9, 4, "hat")
    rect(draw, 19, 39 + y, 11, 2, "hat_band")
    line(draw, (20, 46 + y), (22, 48 + y), "outline")
    line(draw, (22, 46 + y), (20, 48 + y), "outline")
    if settled:
        rect(draw, 8, 57, 5, 1, "skin_shade")
        rect(draw, 61, 57, 2, 1, "skin_shade")


def create_frames() -> list[SvgDraw]:
    frames: list[SvgDraw] = []
    for index in range(17):
        draw = new_frame()
        if index < 4:
            bob = (0, -1, 0, 1)[index]
            draw_body(draw, bob=bob,
                      front_arm=(37, 31 + bob, 42, 39 + bob),
                      back_arm=(27, 31 + bob, 22, 40 + bob))
        elif index < 8:
            step = index - 4
            reach = (4, 11, 20, 8)[step]
            if step == 2:
                line(draw, (40, 29), (60, 26), "white")
                line(draw, (42, 34), (61, 36), "hat_light")
            draw_body(draw, lean=3 if step == 2 else 1 if step == 1 else 0,
                      leg_back=-3 if step == 2 else 0,
                      leg_front=2 if step == 2 else 0,
                      front_arm=(38, 31, 39 + reach, 29 if step == 2 else 34),
                      back_arm=(27, 31, 22, 39),
                      arm_width=3 if step == 2 else 4,
                      fist_scale=2 if step == 2 else 1)
        elif index < 12:
            step = index - 8
            radius = (7, 10, 13, 9)[step]
            ellipse(draw, (32, 31), (radius, radius), "energy")
            ellipse(draw, (32, 31), (max(2, radius - 3), max(2, radius - 3)), "energy_light")
            for trail in range(step + 1):
                y = 25 + trail * 6
                line(draw, (42, y), (60 - trail * 2, y - 2), "hat_light" if trail % 2 else "energy", 2)
                fist(draw, 58 - trail * 2, y - 2)
            draw_body(draw, bob=-1 if step == 1 else 0, lean=1,
                      front_arm=(38, 30, 48, 26 + step * 2),
                      back_arm=(27, 30, 18, 27 + step * 2))
        elif index < 14:
            step = index - 12
            if step == 0:
                line(draw, (47, 19), (57, 13), "white", 2)
                line(draw, (48, 20), (59, 20), "hat_light", 2)
                line(draw, (47, 21), (57, 28), "white", 2)
            draw_body(draw, lean=-3 if step == 0 else -1, bob=1 if step == 0 else 0,
                      leg_back=-2, front_arm=(34, 32, 42, 42),
                      back_arm=(24, 32, 18, 36))
        elif index == 14:
            draw_body(draw, lean=-5, bob=3, leg_back=-3,
                      front_arm=(32, 35, 39, 45),
                      back_arm=(21, 35, 15, 42))
            line(draw, (13, 17), (17, 13), "hat_light", 2)
            line(draw, (16, 17), (12, 13), "hat_light", 2)
        else:
            draw_defeated(draw, settled=index == 16)
        frames.append(draw)
    return frames


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    frames = create_frames()
    for index, frame in enumerate(frames):
        (args.output_dir / f"frame-{index:02d}.svg").write_text(frame.to_svg(), encoding="utf-8")


if __name__ == "__main__":
    main()
