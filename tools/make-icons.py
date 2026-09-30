#!/usr/bin/env python3
"""Generate the extension icons.

Committed as a generator, not just as PNGs, so the mark can be adjusted
without a design tool. Writes PNGs by hand (zlib + struct) because Pillow is
not a dependency of this repo.

    python3 tools/make-icons.py

Mark: three ascending bars on a solid field - a stats motif that still reads
at 16px, where anything more detailed turns to mush.
"""

import struct
import zlib
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent.parent / "images"
SIZES = (16, 48, 128)

BG = (37, 99, 235, 255)  # matches --accent in popup.html
BAR = (255, 255, 255, 255)

# Bars as fractions of the canvas: (left, width, height-from-baseline).
BARS = (
    (0.18, 0.18, 0.34),
    (0.41, 0.18, 0.58),
    (0.64, 0.18, 0.80),
)

BASELINE = 0.82  # bars sit on this line; leaves a margin below


def render(size):
    """Return `size` rows of RGBA bytes."""
    rows = [[BG] * size for _ in range(size)]

    baseline_px = round(BASELINE * size)

    for left_f, width_f, height_f in BARS:
        x0 = round(left_f * size)
        x1 = max(x0 + 1, round((left_f + width_f) * size))  # never vanish
        y0 = round((BASELINE - height_f) * size)

        for y in range(max(0, y0), min(size, baseline_px)):
            for x in range(max(0, x0), min(size, x1)):
                rows[y][x] = BAR

    return rows


def png_bytes(rows):
    size = len(rows)

    # Each scanline is prefixed with filter type 0 (None).
    raw = b"".join(
        b"\x00" + b"".join(struct.pack("4B", *px) for px in row) for row in rows
    )

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    return b"".join(
        (
            b"\x89PNG\r\n\x1a\n",
            # width, height, bit depth 8, colour type 6 (RGBA), no interlace
            chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)),
            chunk(b"IDAT", zlib.compress(raw, 9)),
            chunk(b"IEND", b""),
        )
    )


def main():
    OUT_DIR.mkdir(exist_ok=True)
    for size in SIZES:
        path = OUT_DIR / f"icon-{size}.png"
        path.write_bytes(png_bytes(render(size)))
        print(f"wrote {path.relative_to(OUT_DIR.parent)} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
