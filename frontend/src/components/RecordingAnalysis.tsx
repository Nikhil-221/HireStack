import { useEffect, useRef, useState } from 'react'

const SAMPLE_INTERVAL_SECONDS = 2
const TENSORFLOW_URL = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js'
const COCO_SSD_URL = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js'

type Detection = { class: string }
type CocoModel = { detect: (source: HTMLCanvasElement) => Promise<Detection[]> }
type BrowserModelGlobals = Window & {
  tf?: { ready: () => Promise<void> }
  cocoSsd?: { load: (options: { base: string }) => Promise<CocoModel> }
}
type Finding = { timestamp: number; label: string }

let modelPromise: Promise<CocoModel> | null = null

function loadScript(source: string, marker: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-recording-model="${marker}"]`)
    if (existing?.dataset.loaded === 'true') {
      resolve()
      return
    }

    const script = existing ?? document.createElement('script')
    const cleanup = () => {
      script.removeEventListener('load', onLoad)
      script.removeEventListener('error', onError)
    }
    const onLoad = () => {
      script.dataset.loaded = 'true'
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      script.remove()
      reject(new Error('Could not load the recording analysis model. Check your connection and try again.'))
    }

    script.addEventListener('load', onLoad, { once: true })
    script.addEventListener('error', onError, { once: true })
    if (!existing) {
      script.src = source
      script.async = true
      script.dataset.recordingModel = marker
      document.head.append(script)
    }
  })
}

function loadModel(): Promise<CocoModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      await loadScript(TENSORFLOW_URL, 'tensorflow')
      const globals = window as BrowserModelGlobals
      if (!globals.tf) throw new Error('TensorFlow.js did not initialize.')
      await globals.tf.ready()
      await loadScript(COCO_SSD_URL, 'coco-ssd')
      if (!globals.cocoSsd) throw new Error('COCO-SSD did not initialize.')
      return globals.cocoSsd.load({ base: 'lite_mobilenet_v2' })
    })().catch((error: unknown) => {
      modelPromise = null
      throw error
    })
  }
  return modelPromise
}

function waitForEvent(video: HTMLVideoElement, eventName: 'loadedmetadata' | 'loadeddata' | 'seeked'): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => finish(new Error('Timed out while reading the recording.')), 30000)
    const finish = (error?: Error) => {
      window.clearTimeout(timeout)
      video.removeEventListener(eventName, onReady)
      video.removeEventListener('error', onError)
      if (error) reject(error)
      else resolve()
    }
    const onReady = () => finish()
    const onError = () => finish(new Error('Could not read this recording in the browser.'))
    video.addEventListener(eventName, onReady, { once: true })
    video.addEventListener('error', onError, { once: true })
  })
}

function forceDuration(video: HTMLVideoElement): Promise<number> {
  return new Promise((resolve) => {
    if (Number.isFinite(video.duration) && video.duration > 0) {
      resolve(video.duration)
      return
    }

    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      video.currentTime = 0
      resolve(video.duration)
    }

    video.addEventListener('seeked', onSeeked)
    video.currentTime = Number.MAX_SAFE_INTEGER
  })
}

function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainingSeconds}`
}

export function RecordingAnalysis({
  src,
  videoClassName,
  refreshSrc,
}: {
  src: string
  videoClassName: string
  refreshSrc: () => Promise<string>
}) {
  const playerRef = useRef<HTMLVideoElement>(null)
  const processingVideoRef = useRef<HTMLVideoElement>(null)
  const [playerSrc, setPlayerSrc] = useState(src)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, timestamp: 0 })
  const [findings, setFindings] = useState<Finding[]>([])
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPlayerSrc(src)
    setFindings([])
    setAnalysisComplete(false)
    setError(null)
  }, [src])

  const analyzeRecording = async () => {
    const video = processingVideoRef.current
    if (!video || isAnalyzing) return

    setIsAnalyzing(true)
    setAnalysisComplete(false)
    setFindings([])
    setError(null)
    setProgress({ current: 0, total: 0, timestamp: 0 })

    try {
      const freshSrc = await refreshSrc()
      setPlayerSrc(freshSrc)
      const model = await loadModel()
      video.crossOrigin = 'anonymous'
      video.muted = true
      video.preload = 'auto'
      video.src = freshSrc
      video.load()
      await waitForEvent(video, 'loadedmetadata')
      const duration = await forceDuration(video)
      if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error('The recording has no readable duration.')
      }

      const total = Math.ceil(duration / SAMPLE_INTERVAL_SECONDS)
      setProgress({ current: 0, total, timestamp: 0 })
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) throw new Error('Could not prepare the frame analyzer.')
      const detectedFindings: Finding[] = []

      for (let index = 0; index < total; index += 1) {
        const timestamp = Math.min(index * SAMPLE_INTERVAL_SECONDS, Math.max(duration - 0.05, 0))
        if (Math.abs(video.currentTime - timestamp) > 0.01) {
          const seeked = waitForEvent(video, 'seeked')
          video.currentTime = timestamp
          await seeked
        } else if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          await waitForEvent(video, 'loadeddata')
        }

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        if (!canvas.width || !canvas.height) throw new Error('The recording has no readable video frames.')
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const detections = await model.detect(canvas)
        const peopleCount = detections.filter((detection) => detection.class === 'person').length
        const phoneDetected = detections.some((detection) => detection.class === 'cell phone')
        if (peopleCount > 1) detectedFindings.push({ timestamp, label: 'Multiple people detected' })
        if (phoneDetected) detectedFindings.push({ timestamp, label: 'Phone detected' })
        setProgress({ current: index + 1, total, timestamp })
      }

      setFindings(detectedFindings)
      setAnalysisComplete(true)
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : 'Recording analysis failed.')
    } finally {
      video.pause()
      video.removeAttribute('src')
      video.load()
      setIsAnalyzing(false)
    }
  }

  const seekPlayer = (timestamp: number) => {
    if (!playerRef.current) return
    playerRef.current.currentTime = timestamp
    void playerRef.current.play().catch(() => undefined)
  }

  return (
    <div>
      <video ref={playerRef} controls playsInline src={playerSrc} className={videoClassName} />
      <video ref={processingVideoRef} aria-hidden="true" tabIndex={-1} className="fixed left-[-10000px] top-0 h-px w-px opacity-0" />
      <div className="mt-3">
        <button
          type="button"
          onClick={() => void analyzeRecording()}
          disabled={isAnalyzing}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
        >
          {isAnalyzing ? 'Analyzing recording…' : 'Analyze recording'}
        </button>
      </div>
      {isAnalyzing && (
        <div className="mt-3" role="status" aria-live="polite">
          <div className="flex justify-between gap-3 text-xs text-slate-600">
            <span>Analyzing frame {progress.current} of {progress.total || '…'}</span>
            <span>{formatTimestamp(progress.timestamp)}</span>
          </div>
          <progress className="mt-1 h-2 w-full accent-brand-600" max={progress.total || 1} value={progress.current} />
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
      {analysisComplete && (
        <div className="mt-4" aria-live="polite">
          <h4 className="text-sm font-semibold text-slate-900">Analysis findings</h4>
          {findings.length ? (
            <ul className="mt-2 divide-y divide-slate-200 border-y border-slate-200">
              {findings.map((finding, index) => (
                <li key={`${finding.timestamp}-${finding.label}-${index}`}>
                  <button
                    type="button"
                    onClick={() => seekPlayer(finding.timestamp)}
                    className="flex w-full gap-3 py-2 text-left text-sm text-slate-700 hover:text-brand-700"
                  >
                    <span className="font-mono tabular-nums">{formatTimestamp(finding.timestamp)}</span>
                    <span>{finding.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-600">No people-count or phone flags found in the sampled frames.</p>
          )}
        </div>
      )}
    </div>
  )
}