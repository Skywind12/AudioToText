# AudioToText

Transcribe WAV / MP3 audio files to text — entirely in your browser. No server, no uploads: the Whisper speech-recognition model runs locally on your device via [Transformers.js](https://github.com/huggingface/transformers.js).

**Live site:** https://skywind12.github.io/AudioToText/

## Features

- Drag-and-drop or browse for audio files (`.wav`, `.mp3`, `.m4a`, `.ogg`, `.flac`, `.webm`)
- Fully client-side — audio never leaves your machine
- Model (~40 MB) downloads once, then is cached by the browser
- Copy transcript with one click

## Development

```bash
npm install
npm run dev
```

## Deployment

Pushing to `main` triggers the GitHub Actions workflow (`.github/workflows/deploy.yml`), which builds the site and deploys it to GitHub Pages.

## Stack

- React + Vite
- `@huggingface/transformers` running `onnx-community/whisper-tiny.en`
