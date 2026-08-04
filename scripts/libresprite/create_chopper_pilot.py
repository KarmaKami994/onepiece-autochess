"""Create an original Chopper support-animation pilot as 64x64 SVG frames."""

from __future__ import annotations

import argparse
from pathlib import Path

from pixel_svg import SvgDraw, ellipse, limb, line, rect, write_frames


PALETTE = {
    "outline": (20, 25, 37),
    "fur": (144, 85, 57),
    "fur_light": (205, 137, 88),
    "fur_shadow": (93, 52, 46),
    "muzzle": (235, 179, 125),
    "hat": (213, 70, 114),
    "hat_light": (245, 111, 148),
    "hat_shadow": (139, 43, 83),
    "antler": (189, 141, 83),
    "antler_light": (231, 190, 118),
    "vest": (220, 174, 66),
    "vest_light": (248, 217, 111),
    "shorts": (52, 105, 157),
    "shorts_light": (84, 151, 197),
    "hoof": (65, 47, 47),
    "medicine": (84, 202, 135),
    "medicine_light": (213, 255, 219),
    "medicine_dark": (38, 132, 100),
    "spark": (255, 243, 159),
}


def new_frame() -> SvgDraw:
    return SvgDraw(PALETTE)


def antlers(draw: SvgDraw, x: int, y: int, *, spread: int = 0) -> None:
    for direction in (-1, 1):
        base = (x + direction * 6, y + 2)
        outer = (x + direction * (13 + spread), y - 7)
        line(draw, base, outer, "outline", 5)
        line(draw, base, outer, "antler", 3)
        branch_x = x + direction * (10 + spread)
        line(draw, (branch_x, y - 4), (branch_x + direction * 1, y - 11), "outline", 5)
        line(draw, (branch_x, y - 4), (branch_x + direction * 1, y - 11), "antler_light", 3)
        line(draw, (x + direction * 8, y - 2), (x + direction * (15 + spread), y - 2), "outline", 5)
        line(draw, (x + direction * 8, y - 2), (x + direction * (15 + spread), y - 2), "antler", 3)


def medical_cross(draw: SvgDraw, center: tuple[int, int], size: int = 3) -> None:
    x, y = center
    rect(draw, x - 1, y - size, 3, size * 2 + 1, "medicine_light")
    rect(draw, x - size, y - 1, size * 2 + 1, 3, "medicine_light")


def heal_orb(draw: SvgDraw, center: tuple[int, int], radius: int = 5) -> None:
    ellipse(draw, center, (radius + 1, radius + 1), "outline")
    ellipse(draw, center, (radius, radius), "medicine")
    medical_cross(draw, center, max(2, radius - 2))


def heal_ring(draw: SvgDraw, center: tuple[int, int], radius: int) -> None:
    x, y = center
    line(draw, (x - radius, y), (x - radius + 4, y - 3), "medicine", 2)
    line(draw, (x - radius + 4, y - 3), (x + radius - 4, y - 3), "medicine_light", 2)
    line(draw, (x + radius - 4, y - 3), (x + radius, y), "medicine", 2)
    line(draw, (x + radius, y), (x + radius - 4, y + 3), "medicine", 2)
    line(draw, (x + radius - 4, y + 3), (x - radius + 4, y + 3), "medicine_light", 2)
    line(draw, (x - radius + 4, y + 3), (x - radius, y), "medicine", 2)


def draw_body(
    draw: SvgDraw,
    *,
    bob: int = 0,
    lean: int = 0,
    front_arm: tuple[int, int, int, int] | None = None,
    back_arm: tuple[int, int, int, int] | None = None,
    leg_back: int = 0,
    leg_front: int = 0,
    antler_spread: int = 0,
) -> tuple[int, int]:
    body_x = 28 + lean
    head_y = 23 + bob
    front_arm = front_arm or (body_x + 6, 38 + bob, body_x + 10, 44 + bob)
    back_arm = back_arm or (body_x - 6, 38 + bob, body_x - 10, 44 + bob)

    antlers(draw, body_x, head_y - 8, spread=antler_spread)

    limb(draw, back_arm[:2], back_arm[2:], 5, "fur")
    ellipse(draw, back_arm[2:], (3, 3), "outline")
    ellipse(draw, back_arm[2:], (2, 2), "hoof")

    limb(draw, (body_x - 4, 49 + bob), (body_x - 7 + leg_back, 57), 6, "fur")
    limb(draw, (body_x + 4, 49 + bob), (body_x + 8 + leg_front, 57), 6, "fur_light")
    rect(draw, body_x - 11 + leg_back, 55, 9, 5, "outline")
    rect(draw, body_x - 10 + leg_back, 55, 8, 3, "hoof")
    rect(draw, body_x + 4 + leg_front, 55, 10, 5, "outline")
    rect(draw, body_x + 5 + leg_front, 55, 9, 3, "hoof")

    rect(draw, body_x - 9, 43 + bob, 19, 8, "outline")
    rect(draw, body_x - 7, 44 + bob, 8, 6, "shorts")
    rect(draw, body_x + 1, 44 + bob, 7, 6, "shorts_light")
    rect(draw, body_x - 8, 35 + bob, 18, 11, "outline")
    rect(draw, body_x - 6, 36 + bob, 14, 9, "vest")
    rect(draw, body_x - 4, 36 + bob, 10, 3, "vest_light")
    rect(draw, body_x - 1, 36 + bob, 3, 10, "fur_light")

    ellipse(draw, (body_x, head_y), (11, 10), "outline")
    ellipse(draw, (body_x, head_y + 1), (9, 8), "fur_light")
    ellipse(draw, (body_x + 2, head_y + 4), (6, 4), "muzzle")

    # Oversized medic hat and small ears are the primary support silhouette.
    rect(draw, body_x - 12, head_y - 9, 25, 7, "outline")
    rect(draw, body_x - 10, head_y - 8, 21, 5, "hat")
    rect(draw, body_x - 8, head_y - 14, 17, 8, "outline")
    rect(draw, body_x - 6, head_y - 13, 13, 7, "hat_light")
    rect(draw, body_x - 2, head_y - 12, 4, 5, "medicine_light")
    rect(draw, body_x - 4, head_y - 10, 8, 2, "medicine_light")
    ellipse(draw, (body_x - 10, head_y), (3, 4), "outline")
    ellipse(draw, (body_x - 10, head_y), (2, 3), "fur")
    ellipse(draw, (body_x + 10, head_y), (3, 4), "outline")
    ellipse(draw, (body_x + 10, head_y), (2, 3), "fur")
    rect(draw, body_x - 5, head_y, 2, 3, "outline")
    rect(draw, body_x + 4, head_y, 2, 3, "outline")
    rect(draw, body_x, head_y + 4, 3, 2, "fur_shadow")
    rect(draw, body_x - 1, head_y + 8, 5, 1, "outline")

    limb(draw, front_arm[:2], front_arm[2:], 5, "fur_light")
    ellipse(draw, front_arm[2:], (3, 3), "outline")
    ellipse(draw, front_arm[2:], (2, 2), "hoof")
    return front_arm[2], front_arm[3]


def draw_fallen(draw: SvgDraw, *, settled: bool) -> None:
    y = 1 if settled else 0
    limb(draw, (37, 49 + y), (55, 56 + y), 6, "fur")
    rect(draw, 51, 54 + y, 10, 5, "outline")
    rect(draw, 52, 54 + y, 9, 3, "hoof")
    rect(draw, 28, 43 + y, 21, 12, "outline")
    rect(draw, 30, 44 + y, 15, 10, "vest")
    rect(draw, 43, 48 + y, 8, 6, "shorts")
    limb(draw, (34, 49 + y), (22, 57 + y), 5, "fur_light")
    ellipse(draw, (20, 57 + y), (3, 2), "hoof")
    ellipse(draw, (21, 46 + y), (11, 9), "outline")
    ellipse(draw, (20, 46 + y), (9, 7), "fur_light")
    rect(draw, 9, 37 + y, 24, 7, "outline")
    rect(draw, 11, 38 + y, 20, 5, "hat")
    rect(draw, 13, 34 + y, 16, 7, "hat_light")
    line(draw, (12, 39 + y), (4, 32 + y), "outline", 5)
    line(draw, (12, 39 + y), (4, 32 + y), "antler", 3)
    line(draw, (27, 39 + y), (36, 34 + y), "outline", 5)
    line(draw, (27, 39 + y), (36, 34 + y), "antler", 3)
    line(draw, (16, 46 + y), (20, 50 + y), "outline", 2)
    line(draw, (20, 46 + y), (16, 50 + y), "outline", 2)
    if settled:
        rect(draw, 7, 58, 5, 1, "fur_shadow")


def create_frames() -> list[SvgDraw]:
    frames: list[SvgDraw] = []
    for index in range(17):
        draw = new_frame()
        if index < 4:
            bob = (0, -1, 0, 1)[index]
            draw_body(draw, bob=bob, antler_spread=1 if index == 1 else 0)
            if index == 2:
                rect(draw, 43, 36, 2, 2, "medicine_light")
        elif index < 8:
            step = index - 4
            if step == 0:
                draw_body(draw, lean=-2, front_arm=(32, 38, 36, 31), leg_back=-2)
            elif step == 1:
                draw_body(draw, lean=2, front_arm=(36, 38, 47, 38), leg_back=-4, leg_front=2)
                line(draw, (48, 35), (57, 31), "spark", 2)
                line(draw, (49, 39), (60, 40), "spark", 2)
            elif step == 2:
                draw_body(draw, lean=5, front_arm=(39, 38, 51, 40), leg_back=-5, leg_front=3, antler_spread=1)
                ellipse(draw, (55, 40), (5, 5), "outline")
                ellipse(draw, (55, 40), (3, 3), "fur_light")
                line(draw, (58, 34), (63, 29), "spark", 2)
                line(draw, (59, 42), (63, 44), "spark", 2)
            else:
                draw_body(draw, lean=1, front_arm=(35, 39, 41, 45))
        elif index < 12:
            step = index - 8
            if step == 0:
                draw_body(draw, bob=-1, front_arm=(34, 37, 40, 30), back_arm=(22, 37, 17, 31))
                heal_orb(draw, (46, 24), 3)
            elif step == 1:
                draw_body(draw, bob=-1, front_arm=(34, 37, 42, 29), back_arm=(22, 37, 16, 29), antler_spread=1)
                heal_orb(draw, (48, 21), 5)
                rect(draw, 54, 13, 2, 2, "spark")
                rect(draw, 39, 14, 2, 2, "medicine_light")
            elif step == 2:
                heal_ring(draw, (29, 55), 23)
                draw_body(draw, bob=-2, front_arm=(34, 36, 43, 27), back_arm=(22, 36, 15, 27), antler_spread=2)
                heal_orb(draw, (49, 19), 6)
                medical_cross(draw, (9, 28), 3)
                medical_cross(draw, (57, 38), 2)
                rect(draw, 13, 17, 2, 2, "spark")
            else:
                heal_ring(draw, (29, 56), 17)
                draw_body(draw, bob=1)
                medical_cross(draw, (49, 27), 2)
        elif index < 14:
            step = index - 12
            if step == 0:
                line(draw, (44, 18), (56, 14), "spark", 2)
                line(draw, (45, 22), (59, 25), "medicine", 2)
            draw_body(
                draw,
                lean=-4 if step == 0 else -1,
                bob=2 if step == 0 else 0,
                front_arm=(30, 40, 36, 47),
                back_arm=(18, 40, 12, 46),
                leg_back=-2,
            )
        elif index == 14:
            draw_body(
                draw,
                lean=-6,
                bob=4,
                front_arm=(28, 42, 34, 50),
                back_arm=(16, 42, 10, 49),
                leg_back=-4,
                antler_spread=1,
            )
            line(draw, (9, 19), (14, 14), "spark", 2)
            line(draw, (13, 19), (8, 14), "spark", 2)
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
