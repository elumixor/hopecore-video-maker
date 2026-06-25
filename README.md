# 🎬 Short Video Maker

AI-powered tool for creating vertical short videos (Reels / TikTok / Shorts) with kinetic subtitles, B-roll montage, and stylized color grading — built for use with **Claude Code**.

---

## Styles

| Style | Look |
|-------|------|
| `hopecore` | Warm golden, dreamy bloom |
| `cinematic` | Dark, high contrast |
| `minimal` | Clean, no grade |
| `retro` | Sepia, warm tones |
| `dark` | Very dark, cyan accent |

---

## Quick Start with Claude Code

1. Clone this repo
2. Open the folder in [Claude Code](https://claude.ai/code)
3. Say: **"Set up the project and make a video from my_video.mp4 in hopecore style"**

Claude will read `CLAUDE.md` and handle everything automatically.

---

## Manual setup

```bash
# System tools
brew install ffmpeg yt-dlp        # macOS
# sudo apt install ffmpeg         # Linux

# Node + Remotion
npm install

# Python + Whisper
pip install -r requirements.txt

# Pexels API key (free at pexels.com/api)
cp .env.example .env
# Edit .env → add your PEXELS_API_KEY
```

---

## Workflow (Claude does all of this automatically)

```bash
# 1. Transcribe
python3 tools/transcribe.py public/speaker.mp4 --output-dir ./transcript

# 2. Download music
yt-dlp "https://youtube.com/..." -x --audio-format mp3 -o "public/music.mp3"

# 3. Download B-roll
python3 tools/download_broll.py "waterfall nature" --slug waterfall
python3 tools/download_broll.py "golden sunset" --slug golden_nature

# 4. Build render props
python3 tools/build_project.py \
  --transcript transcript/speaker.json \
  --scenes scenes.json \
  --style hopecore \
  --music-start 6 \
  --output props.json

# 5. Render
npx remotion render --config remotion.config.ts MontageVideo output/result.mp4 \
  --props props.json --frames 0-1630
```

---

## Compositions

| ID | Description |
|----|-------------|
| `MontageVideo` | Full montage: speaker + B-roll + music + subtitles |
| `TwoLineSubtitles` | Subtitles only on a single video |
| `PillSubtitles` | Pill-highlight subtitle style |

---

## Requirements

- Node.js 18+
- Python 3.9+
- ffmpeg
- yt-dlp
- Pexels API key (free)
- Claude Code (optional but recommended)
