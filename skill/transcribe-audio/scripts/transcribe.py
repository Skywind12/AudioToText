#!/usr/bin/env python3
"""Transcribe an audio file to text using faster-whisper.

Usage: python transcribe.py <audio-file> [language]
Transcript goes to stdout; progress/diagnostics go to stderr.
Language is auto-detected unless given (e.g. "es", "en").

The Whisper model is downloaded from GitHub (not HuggingFace) because
sandboxed environments often allow github.com but block huggingface.co.
"""
import os
import sys
import urllib.request
from pathlib import Path

MODEL_BASE_URLS = [
    "https://raw.githubusercontent.com/Skywind12/AudioToText/models/fw-base",
    "https://github.com/Skywind12/AudioToText/raw/models/fw-base",
]
MODEL_FILES = ["config.json", "tokenizer.json", "vocabulary.txt"]
MODEL_BIN_PARTS = ["model.bin.part-aa", "model.bin.part-ab"]
CACHE_DIR = Path(os.environ.get("TMPDIR", "/tmp")) / "fw-base-model"


def fetch(name: str, dest: Path) -> None:
    last_err = None
    for base in MODEL_BASE_URLS:
        try:
            print(f"  downloading {name}...", file=sys.stderr)
            urllib.request.urlretrieve(f"{base}/{name}", dest)
            return
        except Exception as e:
            last_err = e
    raise RuntimeError(f"Could not download {name}: {last_err}")


def ensure_model() -> Path:
    model_bin = CACHE_DIR / "model.bin"
    if model_bin.exists():
        return CACHE_DIR
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    print("Fetching Whisper model from GitHub (~145 MB, first run only)...", file=sys.stderr)
    for name in MODEL_FILES + MODEL_BIN_PARTS:
        fetch(name, CACHE_DIR / name)
    # Reassemble the split model.bin
    with open(model_bin, "wb") as out:
        for part in MODEL_BIN_PARTS:
            part_path = CACHE_DIR / part
            out.write(part_path.read_bytes())
            part_path.unlink()
    return CACHE_DIR


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python transcribe.py <audio-file> [language]", file=sys.stderr)
        return 1

    path = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else None

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print(
            "faster-whisper not installed. Run: "
            "pip install faster-whisper --break-system-packages",
            file=sys.stderr,
        )
        return 1

    try:
        model_dir = ensure_model()
    except Exception as e:
        print(
            f"Model download failed: {e}\n"
            "Fallback: transcribe locally at https://skywind12.github.io/AudioToText/ "
            "and paste the text.",
            file=sys.stderr,
        )
        return 2

    print("Loading model...", file=sys.stderr)
    model = WhisperModel(str(model_dir), device="cpu", compute_type="int8")

    print(f"Transcribing {path}...", file=sys.stderr)
    segments, info = model.transcribe(path, language=language, vad_filter=True)
    print(f"Detected language: {info.language} (p={info.language_probability:.2f})", file=sys.stderr)

    for segment in segments:
        print(segment.text.strip())

    return 0


if __name__ == "__main__":
    sys.exit(main())
