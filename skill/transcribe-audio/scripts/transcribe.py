#!/usr/bin/env python3
"""Transcribe an audio file to text using faster-whisper.

Usage: python transcribe.py <audio-file>
Transcript goes to stdout; progress/diagnostics go to stderr.
"""
import sys


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python transcribe.py <audio-file>", file=sys.stderr)
        return 1

    path = sys.argv[1]

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("faster-whisper not installed. Run: pip install faster-whisper", file=sys.stderr)
        return 1

    print(f"Loading model (first run downloads ~75 MB)...", file=sys.stderr)
    try:
        model = WhisperModel("base", device="cpu", compute_type="int8")
    except Exception as e:  # model download blocked or failed
        print(
            "Could not load the Whisper model (network may be restricted): "
            f"{e}\nFallback: transcribe locally at "
            "https://skywind12.github.io/AudioToText/ and paste the text.",
            file=sys.stderr,
        )
        return 2

    print(f"Transcribing {path}...", file=sys.stderr)
    segments, info = model.transcribe(path, vad_filter=True)
    print(f"Detected language: {info.language} (p={info.language_probability:.2f})", file=sys.stderr)

    for segment in segments:
        print(segment.text.strip())

    return 0


if __name__ == "__main__":
    sys.exit(main())
