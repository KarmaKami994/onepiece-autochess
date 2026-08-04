"""Tiny dependency-free SVG primitives for deterministic pixel sprites."""

from __future__ import annotations

from pathlib import Path


class SvgDraw:
    def __init__(self, palette: dict[str, tuple[int, int, int]]) -> None:
        self.palette = palette
        self.elements: list[str] = []

    def color(self, name: str) -> str:
        red, green, blue = self.palette[name]
        return f"#{red:02x}{green:02x}{blue:02x}"

    def rectangle(self, bounds: tuple[int, int, int, int], color: str) -> None:
        x1, y1, x2, y2 = bounds
        self.elements.append(
            f'<rect x="{x1}" y="{y1}" width="{x2 - x1 + 1}" height="{y2 - y1 + 1}" fill="{self.color(color)}"/>'
        )

    def line(self, start: tuple[int, int], end: tuple[int, int], color: str, width: int = 1) -> None:
        self.elements.append(
            f'<line x1="{start[0]}" y1="{start[1]}" x2="{end[0]}" y2="{end[1]}" stroke="{self.color(color)}" stroke-width="{width}" stroke-linecap="square"/>'
        )

    def ellipse(self, center: tuple[int, int], radii: tuple[int, int], color: str) -> None:
        x, y = center
        rx, ry = radii
        self.elements.append(
            f'<ellipse cx="{x}" cy="{y}" rx="{rx + 0.5}" ry="{ry + 0.5}" fill="{self.color(color)}"/>'
        )

    def to_svg(self) -> str:
        body = "".join(self.elements)
        return f'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" shape-rendering="crispEdges">{body}</svg>'


def rect(draw: SvgDraw, x: int, y: int, width: int, height: int, color: str) -> None:
    draw.rectangle((x, y, x + width - 1, y + height - 1), color)


def line(draw: SvgDraw, start: tuple[int, int], end: tuple[int, int], color: str, width: int = 1) -> None:
    draw.line(start, end, color, width)


def ellipse(draw: SvgDraw, center: tuple[int, int], radii: tuple[int, int], color: str) -> None:
    draw.ellipse(center, radii, color)


def limb(draw: SvgDraw, start: tuple[int, int], end: tuple[int, int], width: int,
         inner: str, outline: str = "outline") -> None:
    line(draw, start, end, outline, width + 2)
    line(draw, start, end, inner, width)


def write_frames(frames: list[SvgDraw], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for index, frame in enumerate(frames):
        (output_dir / f"frame-{index:02d}.svg").write_text(
            frame.to_svg(), encoding="utf-8"
        )
