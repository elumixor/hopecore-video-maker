# Short Video Maker — Claude Code Instructions

## What this tool does

Creates vertical short videos (1080×1920, for Reels/TikTok/Shorts) with:
- Kinetic two-line subtitles synced word-by-word to speech
- B-roll cutaways from Pexels at key moments
- Background music mixed under the voice
- Visual styles: hopecore, cinematic, minimal, retro, dark

## When a user opens this project in Claude Code

Greet them and ask:
1. What video do they want to process? (ask for file path)
2. What style? (hopecore / cinematic / minimal / retro / dark)
3. Do they have a YouTube music link?
4. Do they want B-roll cutaways or subtitles-only?

Then execute the full workflow below automatically.

---

## Setup (run once on first use)

```bash
# 1. Install system tools
brew install ffmpeg yt-dlp        # macOS
# or: sudo apt install ffmpeg     # Linux + install yt-dlp separately

# 2. Install Node dependencies (Remotion)
npm install

# 3. Install Python dependencies (Whisper)
pip install -r requirements.txt

# 4. Set Pexels API key (get free at https://www.pexels.com/api/)
cp .env.example .env
# Then edit .env and add your PEXELS_API_KEY
```

Check everything works:
```bash
ffmpeg -version && yt-dlp --version && python3 -c "import whisper; print('Whisper OK')" && npx remotion --version
```

---

## Full workflow

### Step 1 — Copy video to project

```bash
cp /path/to/video.mp4 public/speaker.mp4
```

### Step 2 — Transcribe (word-level timestamps)

```bash
python3 tools/transcribe.py public/speaker.mp4 --output-dir ./transcript
# Creates: transcript/speaker.json
```

**Always review the transcript after this step.** Whisper makes mistakes with:
- Names and proper nouns
- Similar-sounding words
- Domain-specific terms

Fix errors directly in `transcript/speaker.json` under `segments[N].words[M].word`.

### Step 3 — Download music (optional)

```bash
yt-dlp "YOUTUBE_URL" -x --audio-format mp3 -o "public/music.mp3"
```

To find good music: search YouTube for "hopecore music no copyright", "ambient background music", etc.

### Step 4 — Download B-roll from Pexels (optional)

```bash
export PEXELS_API_KEY=$(grep PEXELS_API_KEY .env | cut -d= -f2)

python3 tools/download_broll.py "waterfall nature" --slug waterfall
python3 tools/download_broll.py "golden sunset" --slug golden_nature
python3 tools/download_broll.py "wind through trees" --slug wind_trees
# Clips saved to public/broll/
```

**Good B-roll queries for different topics:**
- Motivation/inspiration: "golden sunrise nature", "mountain peak", "ocean waves"
- Community/connection: "people walking together", "crowd city"
- Calm/reflection: "rain window", "candle flame", "calm lake"
- Energy/action: "waterfall rushing", "wind trees", "lightning storm"

### Step 5 — Create cut schedule (scenes.json)

Create `scenes.json` defining when to show the speaker vs B-roll:

```json
[
  {"type": "speaker", "clip": "speaker.mp4", "start": 0,    "end": 5.0},
  {"type": "broll",   "clip": "broll/wind_trees.mp4", "start": 5.0, "end": 8.5},
  {"type": "speaker", "clip": "speaker.mp4", "start": 8.5,  "end": 14.0},
  {"type": "broll",   "clip": "broll/golden_nature.mp4", "start": 14.0, "end": 17.5},
  {"type": "speaker", "clip": "speaker.mp4", "start": 17.5, "end": 54.0}
]
```

**Rules:**
- All scenes together must cover the full video duration with no gaps
- `start` and `end` are seconds in the final video timeline
- For B-roll: clip plays from its beginning
- For speaker: `start/end` must match the actual timestamps in the source video
- Good cut points: natural speech pauses, key phrases, emotional peaks

**Skip this step** for subtitles-only (no scenes.json = speaker video only).

### Step 6 — Build render props

```bash
python3 tools/build_project.py \
  --transcript transcript/speaker.json \
  --scenes scenes.json \
  --style hopecore \
  --music-start 6.0 \
  --output props.json
```

Available styles: `hopecore`, `cinematic`, `minimal`, `retro`, `dark`

`--music-start` skips the first N seconds of the music file (most tracks have a silent/slow intro).

### Step 7 — Render

```bash
mkdir -p output
# The render command is printed by build_project.py — copy and run it:
npx remotion render --config remotion.config.ts MontageVideo output/result.mp4 \
  --props props.json --frames 0-<TOTAL_FRAMES>
```

Rendering takes 2–5 minutes for a 60-second video on a modern laptop.

---

## Subtitle-only mode (no B-roll, no music)

```bash
python3 tools/build_project.py \
  --transcript transcript/speaker.json \
  --style minimal \
  --output props.json

npx remotion render --config remotion.config.ts TwoLineSubtitles output/subs.mp4 \
  --props props.json --frames 0-<FRAMES>
```

## Pill-highlight style

```bash
npx remotion render --config remotion.config.ts PillSubtitles output/pills.mp4 \
  --props props.json --frames 0-<FRAMES>
```

---

## Visual styles

| Style | Look | Best for |
|-------|------|----------|
| `hopecore` | Warm golden, dreamy bloom | Inspirational, emotional |
| `cinematic` | Dark, high contrast, cool tones | Dramatic, serious |
| `minimal` | Clean, almost no grade | Talking head, educational |
| `retro` | Sepia, warm orange accent | Nostalgic, personal stories |
| `dark` | Very dark, cyan accent | Night vibes, music content |

---

## Project structure

```
public/
  speaker.mp4       ← your video goes here
  music.mp3         ← downloaded music
  broll/            ← B-roll clips from Pexels
    clip_name.mp4

transcript/
  speaker.json      ← Whisper output (review for errors!)

output/
  result.mp4        ← final rendered video

scenes.json         ← cut schedule (optional)
props.json          ← generated render config
```

---

## Troubleshooting

**Whisper not found:** `pip install openai-whisper`

**ffmpeg not found:** `brew install ffmpeg` (Mac) or `sudo apt install ffmpeg` (Linux)

**yt-dlp not found:** `brew install yt-dlp` or `pip install yt-dlp`

**Remotion render crashes:** check that all files in `public/` exist before rendering

**Text goes off screen:** open `props.json`, find long `bottomWords` groups (>3 words), split them manually

**Music too loud/quiet:** change `musicVolume` in `props.json` (0.0–1.0)

**Wrong subtitle timing:** re-transcribe with a larger Whisper model: `--model large`
