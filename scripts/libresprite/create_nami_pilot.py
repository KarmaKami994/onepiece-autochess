"""Create an original Nami ranged-animation pilot as 64x64 SVG frames."""

from __future__ import annotations

import argparse
from pathlib import Path

from pixel_svg import SvgDraw, ellipse, limb, line, rect, write_frames


PALETTE = {
    "outline": (20, 25, 38),
    "hair": (210, 85, 37),
    "hair_light": (247, 132, 48),
    "hair_shadow": (145, 52, 37),
    "skin": (211, 132, 88),
    "skin_light": (250, 183, 125),
    "skin_shadow": (161, 82, 68),
    "top": (40, 151, 156),
    "top_light": (76, 205, 195),
    "shorts": (48, 93, 153),
    "shorts_light": (76, 129, 188),
    "boot": (106, 62, 43),
    "gold": (226, 172, 55),
    "staff": (114, 158, 178),
    "staff_light": (205, 235, 231),
    "cloud": (186, 213, 222),
    "cloud_light": (239, 250, 244),
    "weather": (71, 206, 230),
    "weather_light": (210, 250, 255),
    "lightning": (255, 226, 76),
    "lightning_light": (255, 249, 181),
}


def new_frame() -> SvgDraw:
    return SvgDraw(PALETTE)


def weather_orb(draw: SvgDraw, center: tuple[int, int], radius: int = 3) -> None:
    ellipse(draw, center, (radius + 1, radius + 1), "outline")
    ellipse(draw, center, (radius, radius), "weather")
    rect(draw, center[0] - 1, center[1] - radius, 2, 2, "weather_light")


def staff(
    draw: SvgDraw,
    hand: tuple[int, int],
    tip: tuple[int, int],
    *,
    charged: bool = False,
) -> None:
    if charged:
        line(draw, hand, tip, "weather", 7)
    line(draw, hand, tip, "outline", 5)
    line(draw, hand, tip, "staff", 3)
    line(draw, hand, tip, "staff_light", 1)
    ellipse(draw, tip, (3, 3), "outline")
    ellipse(draw, tip, (2, 2), "gold")
    if charged:
        weather_orb(draw, tip, 3)


def storm_cloud(draw: SvgDraw, x: int, y: int, *, bright: bool = False) -> None:
    color = "cloud_light" if bright else "cloud"
    ellipse(draw, (x, y), (7, 3), "outline")
    ellipse(draw, (x - 5, y - 2), (4, 4), "outline")
    ellipse(draw, (x + 3, y - 3), (5, 4), "outline")
    ellipse(draw, (x, y), (6, 2), color)
    ellipse(draw, (x - 5, y - 2), (3, 3), color)
    ellipse(draw, (x + 3, y - 3), (4, 3), color)


def lightning(draw: SvgDraw, points: list[tuple[int, int]], *, wide: bool = False) -> None:
    for start, end in zip(points, points[1:]):
        line(draw, start, end, "outline", 5 if wide else 4)
        line(draw, start, end, "lightning", 3 if wide else 2)
        if wide:
            line(draw, start, end, "lightning_light", 1)


def draw_body(
    draw: SvgDraw,
    *,
    bob: int = 0,
    lean: int = 0,
    front_arm: tuple[int, int, int, int] | None = None,
    back_arm: tuple[int, int, int, int] | None = None,
    leg_back: int = 0,
    leg_front: int = 0,
) -> tuple[int, int]:
    body_x = 27 + lean
    head_y = 19 + bob
    front_arm = front_arm or (body_x + 6, 31 + bob, body_x + 10, 38 + bob)
    back_arm = back_arm or (body_x - 6, 31 + bob, body_x - 10, 39 + bob)

    # Long orange hair stays behind the body and makes the silhouette readable.
    rect(draw, body_x - 10, head_y - 5, 8, 24, "outline")
    rect(draw, body_x - 8, head_y - 4, 6, 22, "hair_shadow")
    rect(draw, body_x + 5, head_y - 4, 7, 22, "outline")
    rect(draw, body_x + 6, head_y - 3, 5, 20, "hair")
    rect(draw, body_x + 8, head_y + 5, 4, 10, "hair_light")

    limb(draw, back_arm[:2], back_arm[2:], 4, "skin")
    ellipse(draw, back_arm[2:], (3, 3), "outline")
    ellipse(draw, back_arm[2:], (2, 2), "skin")

    limb(draw, (body_x - 4, 46 + bob), (body_x - 7 + leg_back, 57), 5, "skin")
    limb(draw, (body_x + 4, 46 + bob), (body_x + 8 + leg_front, 57), 5, "skin_light")
    rect(draw, body_x - 11 + leg_back, 55, 9, 4, "outline")
    rect(draw, body_x - 10 + leg_back, 55, 8, 2, "boot")
    rect(draw, body_x + 4 + leg_front, 55, 10, 4, "outline")
    rect(draw, body_x + 5 + leg_front, 55, 9, 2, "boot")

    rect(draw, body_x - 8, 39 + bob, 17, 9, "outline")
    rect(draw, body_x - 6, 40 + bob, 7, 7, "shorts")
    rect(draw, body_x + 1, 40 + bob, 6, 7, "shorts_light")
    rect(draw, body_x - 7, 39 + bob, 15, 2, "gold")

    rect(draw, body_x - 8, 28 + bob, 17, 13, "outline")
    rect(draw, body_x - 6, 29 + bob, 13, 11, "top")
    rect(draw, body_x - 5, 29 + bob, 11, 3, "top_light")
    rect(draw, body_x - 5, 37 + bob, 11, 3, "skin_light")
    rect(draw, body_x - 3, 24 + bob, 7, 6, "outline")
    rect(draw, body_x - 2, 24 + bob, 5, 5, "skin")

    ellipse(draw, (body_x, head_y), (9, 9), "outline")
    ellipse(draw, (body_x + 1, head_y + 1), (7, 7), "skin_light")
    rect(draw, body_x - 8, head_y - 8, 17, 5, "hair")
    rect(draw, body_x - 7, head_y - 11, 5, 6, "hair_light")
    rect(draw, body_x - 2, head_y - 13, 5, 8, "hair")
    rect(draw, body_x + 3, head_y - 11, 5, 7, "hair_light")
    rect(draw, body_x + 7, head_y - 6, 4, 7, "hair")
    rect(draw, body_x - 3, head_y, 2, 2, "outline")
    rect(draw, body_x + 4, head_y, 2, 2, "outline")
    rect(draw, body_x, head_y + 5, 5, 1, "hair_shadow")
    rect(draw, body_x - 7, head_y + 3, 2, 5, "hair_light")

    limb(draw, front_arm[:2], front_arm[2:], 4, "skin_light")
    ellipse(draw, front_arm[2:], (3, 3), "outline")
    ellipse(draw, front_arm[2:], (2, 2), "skin_light")
    rect(draw, front_arm[2] - 3, front_arm[3] - 3, 2, 5, "gold")
    return front_arm[2], front_arm[3]


def draw_fallen(draw: SvgDraw, *, settled: bool) -> None:
    y = 1 if settled else 0
    limb(draw, (36, 49 + y), (55, 56 + y), 5, "skin")
    rect(draw, 51, 54 + y, 10, 4, "outline")
    rect(draw, 52, 54 + y, 9, 2, "boot")
    rect(draw, 27, 43 + y, 21, 12, "outline")
    rect(draw, 29, 44 + y, 15, 10, "top")
    rect(draw, 42, 47 + y, 8, 7, "shorts")
    limb(draw, (33, 49 + y), (22, 57 + y), 4, "skin_light")
    ellipse(draw, (20, 57 + y), (3, 2), "skin_light")
    ellipse(draw, (21, 46 + y), (9, 8), "outline")
    ellipse(draw, (20, 46 + y), (7, 6), "skin_light")
    rect(draw, 12, 38 + y, 18, 6, "hair")
    rect(draw, 11, 42 + y, 8, 14, "hair_shadow")
    rect(draw, 17, 35 + y, 5, 7, "hair_light")
    line(draw, (17, 46 + y), (20, 49 + y), "outline")
    line(draw, (20, 46 + y), (17, 49 + y), "outline")
    staff(draw, (40, 55), (61, 49))
    if settled:
        rect(draw, 7, 58, 5, 1, "hair_shadow")


def create_frames() -> list[SvgDraw]:
    frames: list[SvgDraw] = []
    for index in range(17):
        draw = new_frame()
        if index < 4:
            bob = (0, -1, 0, 1)[index]
            hand = draw_body(draw, bob=bob)
            staff(draw, hand, (46, 55 + bob))
            if index == 1:
                rect(draw, 46, 47, 2, 2, "weather_light")
        elif index < 8:
            step = index - 4
            if step == 0:
                hand = draw_body(draw, lean=-1, front_arm=(32, 30, 37, 22))
                staff(draw, hand, (47, 10))
            elif step == 1:
                hand = draw_body(draw, lean=1, front_arm=(34, 30, 43, 31), leg_back=-2)
                staff(draw, hand, (59, 31), charged=True)
            elif step == 2:
                hand = draw_body(draw, lean=3, front_arm=(37, 31, 46, 35), leg_back=-4, leg_front=2)
                staff(draw, hand, (59, 39), charged=True)
                weather_orb(draw, (61, 25), 3)
                line(draw, (55, 25), (48, 25), "weather_light", 2)
            else:
                hand = draw_body(draw, lean=1, front_arm=(34, 31, 39, 39))
                staff(draw, hand, (48, 56))
                weather_orb(draw, (57, 24), 2)
        elif index < 12:
            step = index - 8
            if step == 0:
                hand = draw_body(draw, bob=-1, front_arm=(33, 29, 40, 22), back_arm=(21, 30, 16, 25))
                staff(draw, hand, (49, 8), charged=True)
                storm_cloud(draw, 51, 18)
            elif step == 1:
                hand = draw_body(draw, lean=1, front_arm=(35, 30, 43, 24), back_arm=(22, 30, 17, 24))
                staff(draw, hand, (53, 10), charged=True)
                storm_cloud(draw, 51, 18, bright=True)
                lightning(draw, [(51, 21), (47, 28), (52, 32)])
            elif step == 2:
                hand = draw_body(draw, lean=2, front_arm=(36, 30, 44, 24), back_arm=(23, 30, 17, 23), leg_back=-3)
                staff(draw, hand, (54, 9), charged=True)
                storm_cloud(draw, 51, 17, bright=True)
                lightning(draw, [(51, 20), (45, 30), (51, 34), (43, 47), (49, 51)], wide=True)
                line(draw, (58, 23), (62, 29), "lightning", 2)
            else:
                hand = draw_body(draw, bob=1)
                staff(draw, hand, (47, 55))
                storm_cloud(draw, 54, 16)
                rect(draw, 54, 22, 2, 2, "weather")
        elif index < 14:
            step = index - 12
            if step == 0:
                line(draw, (45, 17), (57, 12), "lightning_light", 2)
                line(draw, (47, 21), (60, 24), "weather", 2)
            hand = draw_body(
                draw,
                lean=-4 if step == 0 else -1,
                bob=2 if step == 0 else 0,
                front_arm=(29, 33, 36, 42),
                back_arm=(17, 33, 12, 39),
                leg_back=-2,
            )
            staff(draw, hand, (46, 57))
        elif index == 14:
            hand = draw_body(
                draw,
                lean=-6,
                bob=4,
                front_arm=(27, 35, 33, 47),
                back_arm=(15, 35, 10, 44),
                leg_back=-4,
            )
            staff(draw, hand, (46, 58))
            line(draw, (10, 15), (15, 10), "lightning", 2)
            line(draw, (14, 15), (9, 10), "lightning", 2)
        else:
            draw_fallen(draw, settled=index == 16)
        frames.append(draw)
    return frames


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()
    write_frames(create_frames(), args.output_dir)


if __name__ == "__main__":
    main()
