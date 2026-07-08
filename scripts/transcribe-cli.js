#!/usr/bin/env node
/**
 * CLI transcription: node scripts/transcribe-cli.js <audio-file>
 * Prints the transcript to stdout (progress goes to stderr),
 * so it can be piped or consumed by other tools (e.g. Claude Code).
 */
import { readFile } from 'node:fs/promises'
import { pipeline } from '@huggingface/transformers'
import decodeAudio from 'audio-decode'

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/transcribe-cli.js <audio-file.wav|mp3|flac|ogg>')
  process.exit(1)
}

// Decode (supports wav, mp3, flac, ogg, opus). Depending on format,
// audio-decode returns either an AudioBuffer or { channelData, sampleRate }.
const decoded = await decodeAudio(await readFile(file))
const sampleRate = decoded.sampleRate
const channels = decoded.channelData
  ?? Array.from({ length: decoded.numberOfChannels }, (_, i) => decoded.getChannelData(i))
const length = channels[0].length

// Downmix to mono
let mono
if (channels.length === 1) {
  mono = channels[0]
} else {
  mono = new Float32Array(length)
  for (const data of channels) {
    for (let i = 0; i < length; i++) mono[i] += data[i] / channels.length
  }
}

// Resample to 16 kHz (linear interpolation — fine for speech)
const TARGET = 16000
let audio = mono
if (sampleRate !== TARGET) {
  const outLen = Math.round(length * TARGET / sampleRate)
  audio = new Float32Array(outLen)
  for (let i = 0; i < outLen; i++) {
    const pos = i * (length - 1) / (outLen - 1)
    const lo = Math.floor(pos), hi = Math.min(lo + 1, length - 1)
    audio[i] = mono[lo] + (mono[hi] - mono[lo]) * (pos - lo)
  }
}

console.error(`Decoded ${file}: ${(length / sampleRate).toFixed(1)}s @ ${sampleRate}Hz, transcribing…`)

const transcriber = await pipeline(
  'automatic-speech-recognition',
  'onnx-community/whisper-tiny.en',
  { progress_callback: (e) => { if (e.status === 'ready') console.error('Model ready.') } },
)

const output = await transcriber(audio, { chunk_length_s: 30, stride_length_s: 5 })
console.log(output.text.trim())
