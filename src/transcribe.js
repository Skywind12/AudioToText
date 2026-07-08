import { pipeline } from '@huggingface/transformers'

let transcriberPromise = null

/**
 * Lazily create (and cache) the Whisper pipeline.
 * onProgress receives { status, file, progress } events during model download.
 */
function getTranscriber(onProgress) {
  if (!transcriberPromise) {
    transcriberPromise = pipeline(
      'automatic-speech-recognition',
      'onnx-community/whisper-tiny.en',
      { progress_callback: onProgress },
    ).catch((err) => {
      transcriberPromise = null // allow retry on failure
      throw err
    })
  }
  return transcriberPromise
}

/**
 * Decode an uploaded audio File (wav/mp3/anything the browser can decode)
 * into 16 kHz mono Float32 samples, as Whisper expects.
 */
async function decodeToMono16k(file) {
  const arrayBuffer = await file.arrayBuffer()
  const ctx = new AudioContext({ sampleRate: 16000 })
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    // Downmix to mono
    if (audioBuffer.numberOfChannels === 1) {
      return audioBuffer.getChannelData(0)
    }
    const length = audioBuffer.length
    const mono = new Float32Array(length)
    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      const data = audioBuffer.getChannelData(ch)
      for (let i = 0; i < length; i++) mono[i] += data[i]
    }
    for (let i = 0; i < length; i++) mono[i] /= audioBuffer.numberOfChannels
    return mono
  } finally {
    ctx.close()
  }
}

/**
 * Transcribe an audio File. Returns the transcript text.
 * onProgress is forwarded to the model-download progress callback.
 */
export async function transcribe(file, onProgress) {
  const [transcriber, audio] = await Promise.all([
    getTranscriber(onProgress),
    decodeToMono16k(file),
  ])
  if (audio.length === 0) throw new Error('Audio file appears to be empty.')
  const output = await transcriber(audio, {
    // Enable chunking so long files work
    chunk_length_s: 30,
    stride_length_s: 5,
  })
  return output.text.trim()
}
