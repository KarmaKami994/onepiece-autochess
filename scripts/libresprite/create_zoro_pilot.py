"""Create the original Zoro weapon-animation pilot as 64x64 SVG frames."""

from __future__ import annotations

import argparse
from pathlib import Path

from pixel_svg import SvgDraw, ellipse, limb, line, rect, write_frames


PALETTE = {
    "outline": (18, 23, 32),
    "hair": (72, 151, 73),
    "hair_light": (119, 195, 89),
    "skin": (211, 133, 83),
    "skin_light": (249, 181, 116),
    "skin_shade": (157, 80, 62),
    "shirt": (226, 218, 182),
    "shirt_shadow": (167, 166, 139),
    "sash": (43, 111, 66),
    "sash_light": (72, 153, 83),
    "pants": (39, 48, 62),
    "pants_light": (57, 68, 82),
    "boot": (63, 40, 31),
    "steel": (205, 221, 214),
    "steel_light": (250, 245, 207),
    "hilt": (164, 52, 55),
    "gold": (220, 172, 59),
    "energy": (133, 226, 180),
    "energy_light": (229, 255, 220),
}


def new_frame() -> SvgDraw:
    return SvgDraw(PALETTE)


def sword(draw: SvgDraw, hand: tuple[int, int], tip: tuple[int, int], *, glow: bool = False) -> None:
    if glow:
        line(draw, hand, tip, "energy", 6)
    line(draw, hand, tip, "outline", 5)
    line(draw, hand, tip, "steel", 3)
    line(draw, (hand[0] - 3, hand[1] - 2), (hand[0] + 3, hand[1] + 2), "gold", 3)
    rect(draw, hand[0] - 2, hand[1] - 2, 4, 4, "hilt")
    rect(draw, tip[0] - 1, tip[1] - 1, 2, 2, "steel_light")


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
    body_x = 30 + lean
    head_y = 20 + bob
    front_arm = front_arm or (body_x + 6, 31 + bob, body_x + 10, 39 + bob)
    back_arm = back_arm or (body_x - 6, 31 + bob, body_x - 10, 39 + bob)

    limb(draw, back_arm[:2], back_arm[2:], 4, "skin")
    ellipse(draw, back_arm[2:], (3, 3), "outline")
    ellipse(draw, back_arm[2:], (2, 2), "skin")

    limb(draw, (body_x - 3, 45 + bob), (body_x - 7 + leg_back, 56), 6, "pants")
    limb(draw, (body_x + 4, 45 + bob), (body_x + 8 + leg_front, 56), 6, "pants_light")
    rect(draw, body_x - 12 + leg_back, 54, 10, 5, "outline")
    rect(draw, body_x - 11 + leg_back, 54, 9, 3, "boot")
    rect(draw, body_x + 3 + leg_front, 54, 11, 5, "outline")
    rect(draw, body_x + 4 + leg_front, 54, 10, 3, "boot")

    rect(draw, body_x - 8, 39 + bob, 17, 12, "outline")
    rect(draw, body_x - 6, 40 + bob, 7, 10, "pants")
    rect(draw, body_x + 1, 40 + bob, 6, 10, "pants_light")
    rect(draw, body_x - 8, 37 + bob, 18, 5, "sash")
    rect(draw, body_x + 7, 40 + bob, 6, 3, "sash_light")

    rect(draw, body_x - 8, 27 + bob, 17, 13, "outline")
    rect(draw, body_x - 6, 28 + bob, 13, 11, "shirt")
    rect(draw, body_x - 6, 34 + bob, 13, 5, "shirt_shadow")
    rect(draw, body_x - 1, 27 + bob, 3, 12, "skin")
    rect(draw, body_x - 4, 24 + bob, 8, 6, "outline")
    rect(draw, body_x - 3, 24 + bob, 6, 5, "skin")

    ellipse(draw, (body_x, head_y), (9, 9), "outline")
    ellipse(draw, (body_x + 1, head_y + 1), (7, 7), "skin_light")
    rect(draw, body_x - 8, head_y - 8, 17, 5, "hair")
    rect(draw, body_x - 7, head_y - 12, 4, 6, "hair_light")
    rect(draw, body_x - 2, head_y - 14, 4, 8, "hair")
    rect(draw, body_x + 3, head_y - 12, 4, 7, "hair_light")
    rect(draw, body_x + 7, head_y - 8, 3, 6, "hair")
    rect(draw, body_x - 3, head_y, 2, 2, "outline")
    rect(draw, body_x + 4, head_y, 2, 2, "outline")
    rect(draw, body_x - 1, head_y + 5, 6, 1, "outline")
    line(draw, (body_x - 6, head_y + 1), (body_x - 3, head_y + 3), "skin_shade")

    limb(draw, front_arm[:2], front_arm[2:], 4, "skin_light")
    ellipse(draw, front_arm[2:], (3, 3), "outline")
    ellipse(draw, front_arm[2:], (2, 2), "skin_light")
    return front_arm[2], front_arm[3]


def draw_fallen(draw: SvgDraw, settled: bool) -> None:
    y = 1 if settled else 0
    limb(draw, (36, 49 + y), (55, 55 + y), 6, "pants")
    rect(draw, 51, 53 + y, 10, 5, "outline")
    rect(draw, 52, 53 + y, 9, 3, "boot")
    rect(draw, 29, 43 + y, 20, 12, "outline")
    rect(draw, 31, 44 + y, 14, 10, "shirt")
    rect(draw, 43, 47 + y, 8, 7, "sash")
    limb(draw, (34, 48 + y), (24, 56 + y), 4, "skin")
    ellipse(draw, (22, 56 + y), (3, 3), "skin_light")
    ellipse(draw, (22, 46 + y), (9, 8), "outline")
    ellipse(draw, (21, 46 + y), (7, 6), "skin_light")
    rect(draw, 14, 38 + y, 17, 5, "hair")
    rect(draw, 18, 34 + y, 4, 7, "hair_light")
    rect(draw, 23, 35 + y, 4, 6, "hair")
    line(draw, (18, 46 + y), (21, 49 + y), "outline")
    line(draw, (21, 46 + y), (18, 49 + y), "outline")
    sword(draw, (42, 54), (61, 47), glow=False)
    if settled:
        rect(draw, 8, 58, 5, 1, "skin_shade")


def create_frames() -> list[SvgDraw]:
    frames: list[SvgDraw] = []
    for index in range(17):
        draw = new_frame()
        if index < 4:
            bob = (0, -1, 0, 1)[index]
            hand = draw_body(draw, bob=bob)
            sword(draw, hand, (47, 55 + bob))
            line(draw, (20, 35 + bob), (14, 54), "hilt", 3)
        elif index < 8:
            step = index - 4
            if step == 0:
                hand = draw_body(draw, lean=-1, front_arm=(35, 30, 25, 24))
                sword(draw, hand, (11, 12))
            elif step == 1:
                hand = draw_body(draw, lean=1, front_arm=(37, 30, 45, 31), leg_back=-2)
                sword(draw, hand, (59, 30))
            elif step == 2:
                line(draw, (37, 18), (62, 38), "energy_light", 5)
                line(draw, (39, 16), (63, 34), "energy", 2)
                hand = draw_body(draw, lean=4, front_arm=(40, 30, 49, 37), leg_back=-4, leg_front=2)
                sword(draw, hand, (62, 49), glow=True)
            else:
                hand = draw_body(draw, lean=1, front_arm=(37, 31, 40, 41))
                sword(draw, hand, (48, 57))
        elif index < 12:
            step = index - 8
            if step == 0:
                line(draw, (18, 13), (48, 47), "energy", 3)
                hand = draw_body(draw, bob=-1, back_arm=(24, 29, 19, 25), front_arm=(36, 29, 42, 24))
                sword(draw, hand, (58, 10), glow=True)
                sword(draw, (19, 25), (8, 11), glow=True)
            elif step == 1:
                hand = draw_body(draw, lean=3, front_arm=(39, 30, 48, 31), back_arm=(27, 29, 38, 35), leg_back=-5)
                sword(draw, hand, (62, 27), glow=True)
                sword(draw, (38, 35), (57, 43), glow=True)
            elif step == 2:
                line(draw, (37, 10), (63, 49), "energy_light", 5)
                line(draw, (63, 13), (38, 51), "energy_light", 5)
                line(draw, (39, 10), (62, 48), "energy", 2)
                line(draw, (62, 14), (39, 50), "energy", 2)
                hand = draw_body(draw, lean=4, front_arm=(40, 30, 51, 25), back_arm=(30, 31, 48, 42), leg_back=-5, leg_front=3)
                sword(draw, hand, (63, 14), glow=True)
                sword(draw, (48, 42), (62, 51), glow=True)
            else:
                hand = draw_body(draw, lean=1)
                sword(draw, hand, (48, 55))
        elif index < 14:
            step = index - 12
            if step == 0:
                line(draw, (47, 17), (58, 12), "energy_light", 2)
                line(draw, (48, 20), (60, 23), "energy", 2)
            hand = draw_body(draw, lean=-4 if step == 0 else -1, bob=2 if step == 0 else 0,
                             front_arm=(32, 33, 39, 42), back_arm=(21, 33, 15, 39), leg_back=-2)
            sword(draw, hand, (47, 57))
        elif index == 14:
            hand = draw_body(draw, lean=-6, bob=4, front_arm=(30, 35, 35, 47),
                             back_arm=(18, 35, 12, 43), leg_back=-4)
            sword(draw, hand, (47, 57))
            line(draw, (12, 15), (17, 10), "gold", 2)
            line(draw, (16, 15), (11, 10), "gold", 2)
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
