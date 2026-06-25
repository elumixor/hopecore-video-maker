#!/usr/bin/env python3
"""
Download B-roll clips from Pexels by search query.
Saves to public/broll/ and tracks what was downloaded.

Usage:
  python3 tools/download_broll.py "golden sunset nature" --slug golden_nature
  python3 tools/download_broll.py "waterfall rushing" --slug waterfall
"""

import argparse
import json
import os
import subprocess
import urllib.parse
import urllib.request

PEXELS_API_URL = "https://api.pexels.com/videos/search"
OUTPUT_DIR = "public/broll"


def search_pexels(query: str, api_key: str, count: int = 5) -> list[str]:
    encoded = urllib.parse.quote(query)
    url = f"{PEXELS_API_URL}?query={encoded}&per_page={count}&orientation=portrait"
    req = urllib.request.Request(url, headers={"Authorization": api_key})
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read())

    links = []
    for video in data.get("videos", []):
        for f in video.get("video_files", []):
            if f.get("height", 0) >= 640 and f.get("height", 0) > f.get("width", 0):
                links.append(f["link"])
                break
    return links


def download(url: str, output_path: str):
    subprocess.run(["curl", "-sL", url, "-o", output_path], check=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("query", help="Search query, e.g. 'waterfall nature'")
    parser.add_argument("--slug", required=True, help="Output filename (without .mp4)")
    parser.add_argument("--api-key", default=os.getenv("PEXELS_API_KEY"), help="Pexels API key")
    parser.add_argument("--index", type=int, default=0, help="Which result to use (0=first)")
    args = parser.parse_args()

    if not args.api_key:
        print("ERROR: Set PEXELS_API_KEY env variable or pass --api-key")
        raise SystemExit(1)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_path = os.path.join(OUTPUT_DIR, f"{args.slug}.mp4")

    print(f"Searching Pexels for: {args.query}")
    links = search_pexels(args.query, args.api_key, count=args.index + 3)
    if not links:
        print("No results found")
        raise SystemExit(1)

    url = links[min(args.index, len(links) - 1)]
    print(f"Downloading → {out_path}")
    download(url, out_path)

    size = os.path.getsize(out_path) / 1024 / 1024
    print(f"Done: {out_path} ({size:.1f} MB)")


if __name__ == "__main__":
    main()
