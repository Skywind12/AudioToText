import { useCallback, useRef, useState } from 'react'
import { transcribe } from './transcribe.js'

const ACCEPTED = ['.wav', '.mp3', '.m4a', '.ogg', '.flac', '.webm']

export default function App() {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle') // idle | loading-model | transcribing | done | error
  const [progress, setProgress] = useState(null) // { file, pct }
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const pickFile = (f) => {
    if (!f) return
    const ext = '.' + f.name.split('.').pop().toLowerCase()
    if (!ACCEPTED.includes(ext)) {
      setError(`Unsupported file type "${ext}". Try: ${ACCEPTED.join(', ')}`)
      setStatus('error')
      return
    }
    setFile(f)
    setTranscript('')
    setError('')
    setStatus('idle')
  }

  const onProgress = useCallback((e) => {
    if (e.status === 'progress' && e.progress != null) {
      setProgress({ file: e.file, pct: Math.round(e.progress) })
    } else if (e.status === 'ready') {
      setProgress(null)
      setStatus('transcribing')
    }
  }, [])

  const run = async () => {
    if (!file) return
    setStatus('loading-model')
    setError('')
    setTranscript('')
    setCopied(false)
    try {
      const text = await transcribe(file, onProgress)
      setTranscript(text || '(No speech detected)')
      setStatus('done')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Transcription failed.')
      setStatus('error')
    } finally {
      setProgress(null)
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(transcript)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const busy = status === 'loading-model' || status === 'transcribing'

  return (
    <main className="app">
      <h1>Audio → Text</h1>
      <p className="tagline">
        Transcribe WAV / MP3 files right in your browser. Nothing is uploaded —
        the AI model runs locally on your device.
      </p>

      <div
        className={`dropzone ${dragOver ? 'drag' : ''} ${file ? 'has-file' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          pickFile(e.dataTransfer.files[0])
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          hidden
          onChange={(e) => pickFile(e.target.files[0])}
        />
        {file ? (
          <>
            <strong>{file.name}</strong>
            <span className="hint">{(file.size / 1024 / 1024).toFixed(1)} MB — click to change</span>
          </>
        ) : (
          <>
            <strong>Drop an audio file here</strong>
            <span className="hint">or click to browse ({ACCEPTED.join(' ')})</span>
          </>
        )}
      </div>

      <button className="go" onClick={run} disabled={!file || busy}>
        {status === 'loading-model' && 'Loading model…'}
        {status === 'transcribing' && 'Transcribing…'}
        {!busy && 'Transcribe'}
      </button>

      {status === 'loading-model' && (
        <p className="note">
          First run downloads the speech model (~40 MB), then it's cached.
          {progress && ` ${progress.pct}%`}
        </p>
      )}
      {progress && (
        <div className="bar"><div style={{ width: `${progress.pct}%` }} /></div>
      )}

      {error && <div className="error">{error}</div>}

      {transcript && (
        <section className="result">
          <div className="result-head">
            <h2>Transcript</h2>
            <button onClick={copy}>{copied ? 'Copied!' : 'Copy'}</button>
          </div>
          <textarea readOnly value={transcript} rows={10} />
        </section>
      )}

      <footer>
        Powered by <a href="https://github.com/huggingface/transformers.js" target="_blank" rel="noreferrer">Transformers.js</a> + Whisper ·{' '}
        <a href="https://github.com/Skywind12/AudioToText" target="_blank" rel="noreferrer">Source</a>
      </footer>
    </main>
  )
}
