#!/usr/bin/env python3
"""Bundle the game into one self-contained HTML file.

Reads index.html, src/atlas.js, src/game.js and assets/atlas.webp, inlines
everything (the atlas becomes a base64 data URI) and writes dist/acorn-run.html.

That single file is what you publish: no server, no build step on the host,
and it works offline once loaded. Drop it on any static host, or rename it
index.html and it is the whole site.

    python3 tools/build.py

Options:
    -o PATH   write somewhere else (default dist/acorn-run.html)
"""

import argparse
import base64
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


def read(rel: str) -> str:
    path = ROOT / rel
    if not path.exists():
        sys.exit(f"build: missing {rel} (expected at {path})")
    return path.read_text(encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("-o", "--out", default="dist/acorn-run.html")
    args = ap.parse_args()

    html = read("index.html")
    atlas_js = read("src/atlas.js")
    game_js = read("src/game.js")

    image = ROOT / "assets" / "atlas.webp"
    if not image.exists():
        sys.exit("build: missing assets/atlas.webp")
    data_uri = "data:image/webp;base64," + base64.b64encode(image.read_bytes()).decode()

    # Point the atlas at the inlined image instead of the file on disk.
    atlas_js, n = re.subn(
        r"const ATLAS_SRC = '[^']*';",
        lambda _: "const ATLAS_SRC = '" + data_uri + "';",
        atlas_js,
        count=1,
    )
    if n != 1:
        sys.exit("build: could not find the ATLAS_SRC line in src/atlas.js")

    # Replace the two <script src> tags with the code itself.
    tags = re.search(
        r'[ \t]*<script src="src/atlas\.js"></script>\n'
        r'[ \t]*<script src="src/game\.js"></script>\n',
        html,
    )
    if not tags:
        sys.exit("build: could not find the script tags in index.html")
    bundle = "<script>\n" + atlas_js.rstrip() + "\n\n" + game_js.rstrip() + "\n</script>\n"
    html = html[: tags.start()] + bundle + html[tags.end():]

    out = ROOT / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)}  ({len(html.encode()) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
