"""Generate clean-room 64x64 animation frames for the remaining crew roster."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

from pixel_svg import SvgDraw, ellipse, limb, line, rect, write_frames


@dataclass(frozen=True)
class Character:
    slug: str
    skin: tuple[int, int, int]
    skin_light: tuple[int, int, int]
    hair: tuple[int, int, int]
    hair_light: tuple[int, int, int]
    top: tuple[int, int, int]
    top_light: tuple[int, int, int]
    bottom: tuple[int, int, int]
    bottom_light: tuple[int, int, int]
    accent: tuple[int, int, int]
    effect: tuple[int, int, int]
    effect_light: tuple[int, int, int]
    hair_style: str
    headgear: str
    prop: str
    ability: str
    silhouette: str = "standard"


ROSTER = {
    "usopp": Character("usopp", (181, 111, 71), (228, 157, 101), (43, 35, 34), (92, 69, 49),
                       (184, 132, 54), (231, 183, 82), (91, 63, 49), (134, 90, 57),
                       (219, 70, 53), (244, 130, 42), (255, 229, 130), "curls", "goggles", "slingshot", "explosion"),
    "tashigi": Character("tashigi", (210, 137, 91), (248, 185, 126), (39, 64, 86), (75, 111, 132),
                         (47, 86, 127), (79, 133, 174), (32, 44, 65), (59, 77, 99),
                         (215, 62, 69), (128, 224, 232), (231, 255, 247), "bob", "glasses", "sword", "flash_cut", "slim"),
    "sanji": Character("sanji", (214, 139, 91), (250, 190, 129), (219, 181, 69), (251, 220, 104),
                       (39, 48, 62), (60, 73, 88), (37, 43, 53), (57, 63, 73),
                       (69, 126, 177), (239, 100, 30), (255, 226, 89), "sweep", "none", "none", "fire_kick", "slim"),
    "robin": Character("robin", (198, 123, 83), (241, 172, 116), (31, 32, 43), (67, 65, 79),
                       (105, 64, 136), (153, 91, 171), (48, 50, 73), (75, 76, 105),
                       (225, 111, 152), (221, 118, 174), (255, 217, 233), "long", "none", "none", "clutch", "slim"),
    "smoker": Character("smoker", (190, 122, 83), (235, 169, 113), (213, 220, 217), (248, 247, 222),
                        (58, 103, 105), (88, 148, 143), (43, 55, 65), (66, 78, 87),
                        (221, 222, 208), (171, 201, 202), (245, 252, 244), "spike", "cigar", "jitte", "white_blow", "large"),
    "sabo": Character("sabo", (205, 132, 84), (247, 181, 119), (224, 183, 74), (255, 226, 119),
                      (43, 86, 133), (70, 128, 175), (42, 49, 62), (65, 72, 87),
                      (205, 161, 53), (235, 92, 34), (255, 220, 83), "sweep", "top_hat", "pipe", "dragon_claw"),
    "kid": Character("kid", (202, 124, 81), (244, 174, 114), (180, 43, 46), (237, 76, 58),
                     (111, 54, 66), (163, 75, 82), (42, 48, 60), (66, 72, 87),
                     (198, 163, 85), (101, 174, 206), (224, 246, 242), "spike", "goggles", "metal_arm", "magnetic_crush", "large"),
    "crocodile": Character("crocodile", (184, 115, 76), (226, 157, 103), (37, 38, 39), (76, 70, 58),
                           (64, 104, 72), (96, 147, 93), (39, 47, 53), (59, 68, 74),
                           (207, 168, 68), (209, 166, 80), (253, 226, 143), "slick", "scar", "hook", "desert_spada", "large"),
    "law": Character("law", (202, 130, 85), (244, 178, 119), (32, 36, 45), (78, 75, 76),
                     (43, 57, 70), (66, 82, 94), (53, 61, 72), (76, 84, 96),
                     (223, 180, 63), (88, 212, 224), (220, 255, 249), "short", "spotted_hat", "sword", "room", "slim"),
    "ace": Character("ace", (198, 121, 77), (242, 169, 108), (37, 35, 34), (82, 64, 47),
                     (169, 66, 44), (219, 101, 61), (178, 91, 40), (224, 139, 61),
                     (223, 166, 58), (235, 75, 29), (255, 211, 76), "messy", "orange_hat", "none", "fire_fist"),
    "hancock": Character("hancock", (202, 128, 85), (246, 179, 119), (29, 29, 40), (66, 58, 76),
                         (139, 48, 87), (189, 74, 112), (71, 41, 70), (100, 57, 92),
                         (223, 167, 62), (222, 75, 133), (255, 210, 231), "very_long", "earrings", "none", "mero_mero", "slim"),
    "doflamingo": Character("doflamingo", (205, 127, 83), (246, 176, 116), (220, 184, 69), (255, 222, 104),
                            (239, 92, 153), (255, 140, 190), (150, 50, 114), (201, 78, 147),
                            (115, 39, 73), (227, 220, 230), (255, 247, 255), "spike", "red_glasses", "none", "string_bind", "large"),
    "garp": Character("garp", (192, 119, 79), (235, 166, 111), (215, 218, 207), (250, 244, 214),
                      (129, 50, 54), (178, 70, 66), (48, 61, 80), (70, 84, 105),
                      (230, 218, 184), (91, 172, 213), (231, 251, 255), "short", "marine_cap", "fist", "galaxy_impact", "large"),
    "mihawk": Character("mihawk", (189, 115, 77), (232, 159, 103), (30, 31, 36), (72, 63, 55),
                        (117, 43, 53), (163, 62, 67), (29, 35, 43), (49, 56, 64),
                        (207, 164, 61), (68, 160, 155), (211, 247, 224), "slick", "cavalier_hat", "greatsword", "black_wave", "slim"),
}


def palette(character: Character) -> dict[str, tuple[int, int, int]]:
    return {
        "outline": (18, 23, 34), "skin": character.skin, "skin_light": character.skin_light,
        "skin_shadow": tuple(max(0, value - 48) for value in character.skin),
        "hair": character.hair, "hair_light": character.hair_light,
        "top": character.top, "top_light": character.top_light,
        "bottom": character.bottom, "bottom_light": character.bottom_light,
        "accent": character.accent, "effect": character.effect, "effect_light": character.effect_light,
        "boot": (55, 43, 43), "steel": (192, 211, 213), "steel_light": (246, 248, 226),
        "wood": (116, 76, 49), "smoke": (179, 197, 199), "smoke_light": (235, 244, 238),
        "sand": (202, 158, 80), "sand_light": (250, 218, 139), "pink": (236, 99, 165),
        "white": (245, 241, 217), "black": (32, 34, 42), "red": (187, 48, 55),
    }


def new_frame(character: Character) -> SvgDraw:
    return SvgDraw(palette(character))


def spark(draw: SvgDraw, x: int, y: int, color: str = "effect_light") -> None:
    rect(draw, x - 1, y - 3, 2, 7, color)
    rect(draw, x - 3, y - 1, 7, 2, color)


def cloud(draw: SvgDraw, x: int, y: int, scale: int = 1) -> None:
    ellipse(draw, (x, y), (6 * scale, 3 * scale), "outline")
    ellipse(draw, (x - 4 * scale, y - 2 * scale), (4 * scale, 4 * scale), "outline")
    ellipse(draw, (x + 3 * scale, y - 3 * scale), (5 * scale, 4 * scale), "outline")
    ellipse(draw, (x, y), (5 * scale, 2 * scale), "smoke_light")
    ellipse(draw, (x - 4 * scale, y - 2 * scale), (3 * scale, 3 * scale), "smoke")
    ellipse(draw, (x + 3 * scale, y - 3 * scale), (4 * scale, 3 * scale), "smoke_light")


def flame(draw: SvgDraw, x: int, y: int, size: int = 5) -> None:
    line(draw, (x, y + size), (x - 2, y), "outline", size + 4)
    line(draw, (x - 2, y), (x + 1, y - size), "outline", size + 2)
    line(draw, (x, y + size), (x - 1, y), "effect", size + 1)
    line(draw, (x - 1, y), (x + 1, y - size), "effect_light", max(2, size - 1))


def heart(draw: SvgDraw, x: int, y: int, size: int = 3) -> None:
    ellipse(draw, (x - size, y - size), (size, size), "effect")
    ellipse(draw, (x + size, y - size), (size, size), "effect")
    line(draw, (x - size * 2, y - size), (x, y + size * 2), "effect", size * 2)
    line(draw, (x + size * 2, y - size), (x, y + size * 2), "effect", size * 2)
    rect(draw, x - 1, y - size, 2, 2, "effect_light")


def draw_back_silhouette(draw: SvgDraw, character: Character, x: int, head_y: int, bob: int) -> None:
    if character.hair_style in {"long", "very_long"}:
        length = 27 if character.hair_style == "very_long" else 22
        rect(draw, x - 11, head_y - 3, 8, length, "outline")
        rect(draw, x - 9, head_y - 2, 6, length - 2, "hair")
        rect(draw, x + 6, head_y - 3, 8, length, "outline")
        rect(draw, x + 7, head_y - 2, 6, length - 2, "hair_light")
    if character.slug == "doflamingo":
        for px, py in ((x - 12, 31), (x - 15, 35), (x + 13, 31), (x + 16, 36), (x - 12, 40), (x + 13, 41)):
            ellipse(draw, (px, py + bob), (6, 5), "outline")
            ellipse(draw, (px, py + bob), (5, 4), "pink")
    if character.slug in {"smoker", "garp", "crocodile", "mihawk"}:
        rect(draw, x - 12, 30 + bob, 25, 23, "outline")
        rect(draw, x - 10, 31 + bob, 21, 21, "top")


def draw_headgear(draw: SvgDraw, character: Character, x: int, y: int) -> None:
    gear = character.headgear
    if gear == "goggles":
        rect(draw, x - 8, y - 9, 17, 4, "accent")
        rect(draw, x - 6, y - 10, 5, 4, "effect_light")
        rect(draw, x + 2, y - 10, 5, 4, "effect_light")
    elif gear == "glasses":
        rect(draw, x - 7, y - 1, 6, 4, "outline")
        rect(draw, x + 3, y - 1, 6, 4, "outline")
        line(draw, (x - 1, y), (x + 3, y), "outline", 1)
        rect(draw, x - 6, y, 4, 2, "effect_light")
        rect(draw, x + 4, y, 4, 2, "effect_light")
    elif gear == "top_hat":
        rect(draw, x - 10, y - 12, 21, 5, "outline")
        rect(draw, x - 7, y - 22, 15, 12, "outline")
        rect(draw, x - 5, y - 20, 11, 9, "black")
        rect(draw, x - 6, y - 13, 13, 3, "effect")
        rect(draw, x - 4, y - 18, 4, 3, "steel_light")
        rect(draw, x + 1, y - 18, 4, 3, "steel_light")
    elif gear == "spotted_hat":
        ellipse(draw, (x, y - 7), (11, 6), "outline")
        ellipse(draw, (x, y - 8), (9, 5), "white")
        rect(draw, x - 6, y - 10, 3, 2, "hair")
        rect(draw, x + 2, y - 7, 3, 2, "hair")
        rect(draw, x + 5, y - 11, 2, 2, "hair")
    elif gear == "orange_hat":
        ellipse(draw, (x, y - 7), (11, 5), "outline")
        rect(draw, x - 8, y - 11, 17, 6, "bottom")
        rect(draw, x - 6, y - 8, 4, 2, "effect_light")
        rect(draw, x + 2, y - 8, 4, 2, "accent")
    elif gear == "marine_cap":
        rect(draw, x - 10, y - 10, 20, 7, "outline")
        rect(draw, x - 8, y - 9, 16, 5, "white")
        rect(draw, x - 7, y - 5, 19, 3, "outline")
        rect(draw, x - 5, y - 8, 10, 2, "effect")
    elif gear == "cavalier_hat":
        rect(draw, x - 15, y - 10, 30, 5, "outline")
        rect(draw, x - 12, y - 18, 24, 10, "outline")
        rect(draw, x - 10, y - 16, 20, 7, "black")
        rect(draw, x - 11, y - 10, 22, 2, "accent")
        line(draw, (x + 8, y - 16), (x + 14, y - 25), "outline", 4)
        line(draw, (x + 8, y - 16), (x + 14, y - 25), "white", 2)
    elif gear == "red_glasses":
        rect(draw, x - 7, y - 1, 6, 3, "red")
        rect(draw, x + 3, y - 1, 6, 3, "red")
        line(draw, (x - 1, y), (x + 3, y), "red", 1)
    elif gear == "earrings":
        rect(draw, x - 11, y + 5, 3, 6, "accent")
        rect(draw, x + 10, y + 5, 3, 6, "accent")
    elif gear == "cigar":
        line(draw, (x + 6, y + 5), (x + 13, y + 7), "white", 3)
        rect(draw, x + 12, y + 6, 3, 3, "effect")
    elif gear == "scar":
        line(draw, (x - 6, y + 1), (x - 2, y + 5), "skin_shadow", 2)


def draw_body(
    draw: SvgDraw,
    character: Character,
    *, bob: int = 0, lean: int = 0,
    front_arm: tuple[int, int, int, int] | None = None,
    back_arm: tuple[int, int, int, int] | None = None,
    leg_back: int = 0, leg_front: int = 0,
) -> tuple[int, int]:
    x = 28 + lean
    head_y = 20 + bob
    large = character.silhouette == "large"
    slim = character.silhouette == "slim"
    arm_width = 5 if large else 4
    torso_width = 20 if large else (15 if slim else 17)
    front_arm = front_arm or (x + 6, 32 + bob, x + 10, 40 + bob)
    back_arm = back_arm or (x - 6, 32 + bob, x - 10, 40 + bob)

    draw_back_silhouette(draw, character, x, head_y, bob)
    limb(draw, back_arm[:2], back_arm[2:], arm_width, "skin")
    ellipse(draw, back_arm[2:], (3, 3), "outline")
    ellipse(draw, back_arm[2:], (2, 2), "skin")

    limb(draw, (x - 4, 46 + bob), (x - 7 + leg_back, 57), 6, "bottom")
    limb(draw, (x + 4, 46 + bob), (x + 8 + leg_front, 57), 6, "bottom_light")
    rect(draw, x - 12 + leg_back, 55, 10, 5, "outline")
    rect(draw, x - 11 + leg_back, 55, 9, 3, "boot")
    rect(draw, x + 3 + leg_front, 55, 11, 5, "outline")
    rect(draw, x + 4 + leg_front, 55, 10, 3, "boot")

    left = x - torso_width // 2
    rect(draw, left, 28 + bob, torso_width, 20, "outline")
    rect(draw, left + 2, 29 + bob, torso_width - 4, 17, "top")
    rect(draw, left + 3, 30 + bob, torso_width - 6, 4, "top_light")
    rect(draw, left + 1, 42 + bob, torso_width - 2, 6, "bottom")
    rect(draw, x - 2, 29 + bob, 4, 18, "accent")
    rect(draw, x - 3, 24 + bob, 7, 6, "outline")
    rect(draw, x - 2, 24 + bob, 5, 5, "skin")

    ellipse(draw, (x, head_y), (9 if slim else 10, 9), "outline")
    ellipse(draw, (x + 1, head_y + 1), (7 if slim else 8, 7), "skin_light")
    # Hair variants remain chunky so faces read at board scale.
    if character.hair_style in {"spike", "messy"}:
        rect(draw, x - 9, head_y - 8, 19, 5, "hair")
        for offset, height in ((-7, 7), (-2, 10), (3, 8), (7, 6)):
            rect(draw, x + offset, head_y - 8 - height // 2, 4, height, "hair_light" if offset in (-7, 3) else "hair")
    elif character.hair_style == "curls":
        for offset in (-8, -4, 0, 4, 8):
            ellipse(draw, (x + offset, head_y - 6), (3, 3), "hair")
    elif character.hair_style == "sweep":
        rect(draw, x - 9, head_y - 9, 19, 6, "hair")
        rect(draw, x + 1, head_y - 8, 8, 12, "hair_light")
    elif character.hair_style == "bob":
        rect(draw, x - 10, head_y - 8, 20, 8, "hair")
        rect(draw, x - 10, head_y - 2, 5, 13, "hair")
        rect(draw, x + 7, head_y - 2, 4, 12, "hair_light")
    else:
        rect(draw, x - 9, head_y - 8, 19, 6, "hair")
        rect(draw, x - 7, head_y - 11, 6, 6, "hair_light")
        rect(draw, x + 2, head_y - 10, 7, 6, "hair")
    rect(draw, x - 4, head_y, 2, 2, "outline")
    rect(draw, x + 4, head_y, 2, 2, "outline")
    if character.slug == "usopp":
        line(draw, (x + 2, head_y + 3), (x + 13, head_y + 4), "outline", 4)
        line(draw, (x + 2, head_y + 3), (x + 13, head_y + 4), "skin_light", 2)
    else:
        rect(draw, x, head_y + 4, 3, 2, "skin_shadow")
    rect(draw, x - 1, head_y + 7, 5, 1, "outline")
    draw_headgear(draw, character, x, head_y)

    limb(draw, front_arm[:2], front_arm[2:], arm_width, "skin_light")
    ellipse(draw, front_arm[2:], (3, 3), "outline")
    ellipse(draw, front_arm[2:], (2, 2), "skin_light")
    return front_arm[2], front_arm[3]


def draw_prop(draw: SvgDraw, character: Character, hand: tuple[int, int], *, attack: bool = False, charged: bool = False) -> None:
    prop = character.prop
    tip = (60, 32) if attack else (47, 56)
    if prop == "sword":
        if charged:
            line(draw, hand, tip, "effect", 7)
        line(draw, hand, tip, "outline", 5)
        line(draw, hand, tip, "steel", 3)
        line(draw, (hand[0] - 3, hand[1] - 2), (hand[0] + 3, hand[1] + 2), "accent", 3)
        rect(draw, tip[0] - 1, tip[1] - 1, 2, 2, "steel_light")
    elif prop == "greatsword":
        tip = (62, 28) if attack else (48, 58)
        if charged:
            line(draw, hand, tip, "effect", 10)
        line(draw, hand, tip, "outline", 9)
        line(draw, hand, tip, "black", 6)
        line(draw, hand, tip, "steel", 2)
        line(draw, (hand[0] - 5, hand[1] - 3), (hand[0] + 5, hand[1] + 3), "accent", 4)
    elif prop == "slingshot":
        line(draw, hand, (hand[0] + 8, hand[1] - 7), "wood", 3)
        line(draw, hand, (hand[0] + 9, hand[1] + 5), "wood", 3)
        line(draw, (hand[0] + 8, hand[1] - 7), (hand[0] + 9, hand[1] + 5), "accent", 1)
    elif prop in {"jitte", "pipe"}:
        line(draw, hand, tip, "outline", 6)
        line(draw, hand, tip, "steel" if prop == "jitte" else "wood", 4)
        if prop == "jitte":
            line(draw, (hand[0] + 3, hand[1] + 1), (hand[0] + 9, hand[1] - 3), "steel", 3)
    elif prop == "hook":
        line(draw, hand, (hand[0] + 5, hand[1]), "accent", 5)
        line(draw, (hand[0] + 5, hand[1]), (hand[0] + 9, hand[1] - 5), "accent", 4)
        line(draw, (hand[0] + 9, hand[1] - 5), (hand[0] + 6, hand[1] - 9), "accent", 3)
    elif prop == "metal_arm":
        line(draw, hand, (hand[0] + (12 if attack else 5), hand[1]), "outline", 10)
        line(draw, hand, (hand[0] + (12 if attack else 5), hand[1]), "steel", 7)
        rect(draw, hand[0] + 4, hand[1] - 4, 4, 8, "accent")
    elif prop == "fist":
        ellipse(draw, (hand[0] + (7 if attack else 2), hand[1]), (6, 6), "outline")
        ellipse(draw, (hand[0] + (7 if attack else 2), hand[1]), (4, 4), "skin_light")


def ability_effect(draw: SvgDraw, character: Character, step: int, *, attack: bool = False) -> None:
    ability = character.ability
    power = step + 1
    if ability == "explosion":
        x = 45 + step * 5
        ellipse(draw, (x, 29), (2 + step, 2 + step), "effect")
        if step >= 2:
            for dx, dy in ((-7, 0), (7, 0), (0, -7), (0, 7)):
                line(draw, (x, 29), (x + dx, 29 + dy), "effect_light", 2)
    elif ability == "flash_cut":
        line(draw, (36, 12 + step), (62, 42 - step), "effect_light", 6 if step == 2 else 3)
        line(draw, (39, 12 + step), (62, 39 - step), "effect", 2)
    elif ability == "fire_kick":
        flame(draw, 45 + step * 3, 48 - step * 2, 4 + step)
        line(draw, (34, 48), (54 + step * 2, 39 - step), "outline", 8)
        line(draw, (34, 48), (54 + step * 2, 39 - step), "bottom_light", 5)
    elif ability == "clutch":
        positions = [(12, 24), (50, 20), (9, 39), (55, 39), (16, 51), (49, 53)]
        for px, py in positions[: 2 + step * 2]:
            limb(draw, (px, py + 7), (px, py), 3, "skin_light")
            ellipse(draw, (px, py - 2), (2, 3), "skin_light")
        if step >= 2:
            spark(draw, 60, 16, "effect_light")
    elif ability == "white_blow":
        cloud(draw, 43 + step * 4, 25, 1)
        if step >= 2:
            cloud(draw, 56, 37, 1)
            line(draw, (35, 30), (61, 26), "smoke_light", 5)
    elif ability == "dragon_claw":
        flame(draw, 46 + step * 3, 31 - step, 4 + step)
        for offset in (-5, 0, 5):
            line(draw, (43, 35), (56 + step * 2, 25 + offset), "effect", 2)
    elif ability == "magnetic_crush":
        for px, py in ((45, 18), (55, 27), (48, 43), (60, 48))[: power + 1]:
            rect(draw, px - 3, py - 3, 7, 7, "outline")
            rect(draw, px - 2, py - 2, 5, 5, "steel")
            line(draw, (34, 32), (px, py), "effect", 1)
        if step >= 2:
            ellipse(draw, (53, 32), (9, 9), "effect_light")
    elif ability == "desert_spada":
        for stripe in range(power + 1):
            line(draw, (35, 48 - stripe * 3), (62, 52 - stripe * 8), "sand", 4 + stripe)
            line(draw, (38, 47 - stripe * 3), (61, 51 - stripe * 8), "sand_light", 1)
    elif ability == "room":
        radius = 8 + step * 6
        line(draw, (31 - radius, 33), (31, 33 - radius), "effect", 2)
        line(draw, (31, 33 - radius), (31 + radius, 33), "effect_light", 2)
        line(draw, (31 + radius, 33), (31, 33 + radius), "effect", 2)
        line(draw, (31, 33 + radius), (31 - radius, 33), "effect_light", 2)
        if step >= 2:
            spark(draw, 53, 22)
    elif ability == "fire_fist":
        flame(draw, 45 + step * 4, 33, 5 + step * 2)
        if step >= 2:
            line(draw, (38, 34), (63, 34), "effect", 9)
            line(draw, (45, 32), (62, 32), "effect_light", 3)
    elif ability == "mero_mero":
        for index, (px, py) in enumerate(((43, 25), (54, 17), (57, 35), (47, 47))):
            if index <= step:
                heart(draw, px, py, 2 + (1 if step >= 2 else 0))
    elif ability == "string_bind":
        for offset in range(-step - 1, step + 2):
            line(draw, (38, 17 + offset * 3), (63, 12 + (step - offset) * 6), "effect_light", 1)
        if step >= 2:
            rect(draw, 57, 20, 2, 26, "effect")
    elif ability == "galaxy_impact":
        radius = 5 + step * 6
        ellipse(draw, (50, 34), (radius, radius), "outline")
        ellipse(draw, (50, 34), (max(2, radius - 2), max(2, radius - 2)), "effect")
        if step >= 2:
            spark(draw, 50, 34, "effect_light")
            line(draw, (36, 34), (63, 34), "effect_light", 3)
    elif ability == "black_wave":
        line(draw, (37, 48), (62, 13 + step * 4), "outline", 10 if step == 2 else 6)
        line(draw, (39, 47), (61, 14 + step * 4), "effect", 5 if step == 2 else 3)
        line(draw, (41, 45), (60, 15 + step * 4), "effect_light", 1)


def draw_fallen(draw: SvgDraw, character: Character, *, settled: bool) -> None:
    y = 1 if settled else 0
    limb(draw, (37, 49 + y), (55, 56 + y), 6, "bottom")
    rect(draw, 51, 54 + y, 10, 5, "outline")
    rect(draw, 52, 54 + y, 9, 3, "boot")
    rect(draw, 27, 43 + y, 22, 12, "outline")
    rect(draw, 29, 44 + y, 16, 10, "top")
    rect(draw, 43, 48 + y, 8, 6, "bottom")
    limb(draw, (34, 49 + y), (22, 57 + y), 4, "skin_light")
    ellipse(draw, (20, 57 + y), (3, 2), "skin_light")
    ellipse(draw, (21, 46 + y), (10, 8), "outline")
    ellipse(draw, (20, 46 + y), (8, 6), "skin_light")
    rect(draw, 11, 38 + y, 19, 6, "hair")
    line(draw, (16, 46 + y), (20, 50 + y), "outline", 2)
    line(draw, (20, 46 + y), (16, 50 + y), "outline", 2)
    if character.prop in {"sword", "greatsword", "jitte", "pipe"}:
        draw_prop(draw, character, (40, 55), attack=False)
    if settled:
        rect(draw, 7, 58, 5, 1, "skin_shadow")


def create_frames(character: Character) -> list[SvgDraw]:
    frames: list[SvgDraw] = []
    for index in range(17):
        draw = new_frame(character)
        if index < 4:
            bob = (0, -1, 0, 1)[index]
            hand = draw_body(draw, character, bob=bob)
            draw_prop(draw, character, hand)
            if index == 2:
                rect(draw, 46, 49, 2, 2, "effect_light")
        elif index < 8:
            step = index - 4
            if step == 0:
                hand = draw_body(draw, character, lean=-1, front_arm=(33, 31, 38, 24), leg_back=-2)
            elif step == 1:
                hand = draw_body(draw, character, lean=1, front_arm=(35, 31, 45, 32), leg_back=-3)
            elif step == 2:
                hand = draw_body(draw, character, lean=4, front_arm=(39, 31, 50, 35), leg_back=-5, leg_front=3)
            else:
                hand = draw_body(draw, character, lean=1, front_arm=(35, 32, 40, 41))
            draw_prop(draw, character, hand, attack=step in (1, 2), charged=step == 2)
            if step > 0:
                ability_effect(draw, character, step - 1, attack=True)
        elif index < 12:
            step = index - 8
            hand = draw_body(
                draw, character, bob=-1 if step < 3 else 1, lean=1 if step == 2 else 0,
                front_arm=(34, 30, 42, 24), back_arm=(22, 30, 16, 24),
                leg_back=-2 if step == 2 else 0,
            )
            draw_prop(draw, character, hand, attack=step >= 1, charged=step == 2)
            ability_effect(draw, character, step)
        elif index < 14:
            step = index - 12
            if step == 0:
                line(draw, (45, 17), (58, 12), "effect_light", 2)
                line(draw, (47, 21), (60, 24), "effect", 2)
            hand = draw_body(
                draw, character, lean=-4 if step == 0 else -1, bob=2 if step == 0 else 0,
                front_arm=(30, 33, 37, 42), back_arm=(18, 33, 12, 40), leg_back=-2,
            )
            draw_prop(draw, character, hand)
        elif index == 14:
            hand = draw_body(
                draw, character, lean=-6, bob=4,
                front_arm=(28, 35, 34, 47), back_arm=(16, 35, 10, 44), leg_back=-4,
            )
            draw_prop(draw, character, hand)
            line(draw, (9, 16), (14, 11), "effect_light", 2)
            line(draw, (13, 16), (8, 11), "effect_light", 2)
        else:
            draw_fallen(draw, character, settled=index == 16)
        frames.append(draw)
    return frames


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--character", required=True, choices=sorted(ROSTER))
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()
    write_frames(create_frames(ROSTER[args.character]), args.output_dir)


if __name__ == "__main__":
    main()
