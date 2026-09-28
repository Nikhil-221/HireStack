import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchCandidateProfile } from '@/api/candidate'
import {
  endInterview,
  fetchInterview,
  submitInterviewAnswer,
  uploadInterviewRecording,
  type InterviewQuestion,
  type InterviewSession,
} from '@/api/interviews'
import './InterviewRoomPage.css'

type RoomStage = 'intro' | 'loading' | 'active' | 'evaluating' | 'upload-error' | 'submitted' | 'unavailable'
type ConversationMode = 'speaking' | 'answering' | 'stopped'

interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: { transcript: string }
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

export function InterviewRoomPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const [stage, setStage] = useState<RoomStage>('intro')
  const [session, setSession] = useState<InterviewSession | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [candidateName, setCandidateName] = useState('Candidate')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingBlobRef = useRef<Blob | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const recognitionStopResolverRef = useRef<(() => void) | null>(null)
  const finalTranscriptRef = useRef('')
  const transcriptRef = useRef('')
  const resumeTranscriptRef = useRef('')
  const conversationModeRef = useRef<ConversationMode>('stopped')
  const speechGenerationRef = useRef(0)
  const completingRef = useRef(false)

  const questions = session?.questions ?? []
  const currentQuestion = questions[questionIndex] ?? null
  const speechRecognitionAvailable = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)

  useEffect(() => {
    void fetchCandidateProfile()
      .then((profile) => setCandidateName(profile.name || 'Candidate'))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) return
    video.srcObject = stream
    void video.play().catch(() => {
      setErrorMessage('Your camera is connected, but the live preview could not start. Check browser playback and camera permissions.')
    })
  }, [stream, stage])

  useEffect(() => () => {
    speechGenerationRef.current += 1
    window.speechSynthesis?.cancel()
    recognitionRef.current?.abort()
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  const stopLocalMedia = () => {
    conversationModeRef.current = 'stopped'
    speechGenerationRef.current += 1
    window.speechSynthesis?.cancel()
    recognitionRef.current?.abort()
    recognitionRef.current = null
    setIsListening(false)
    setIsSpeaking(false)
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    recorderRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setStream(null)
    setIsRecording(false)
  }

  const exitInterview = () => {
    if (!window.confirm('Leave the interview? Your progress will be lost')) return
    stopLocalMedia()
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
    navigate('/candidate/notifications')
  }

  const startRecognition = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition || recognitionRef.current || conversationModeRef.current !== 'answering') return

    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = navigator.language || 'en-US'
    recognition.onresult = (event) => {
      let finalized = ''
      let interim = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        if (result.isFinal) finalized += `${result[0].transcript} `
        else interim += result[0].transcript
      }
      finalTranscriptRef.current += finalized
      transcriptRef.current = `${finalTranscriptRef.current}${interim}`.trim()
      setLiveTranscript(transcriptRef.current)
    }
    recognition.onerror = (event) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setErrorMessage('Speech recognition stopped. Check microphone access, then replay the question to try again.')
      }
    }
    recognition.onend = () => {
      recognitionRef.current = null
      setIsListening(false)
      const resolveStopped = recognitionStopResolverRef.current
      if (resolveStopped) {
        recognitionStopResolverRef.current = null
        resolveStopped()
      } else if (conversationModeRef.current === 'answering') {
        window.setTimeout(startRecognition, 250)
      }
    }
    recognitionRef.current = recognition
    try {
      recognition.start()
      setIsListening(true)
    } catch {
      recognitionRef.current = null
      setIsListening(false)
      setErrorMessage('Could not start speech recognition. Please check microphone permissions.')
    }
  }

  const stopRecognition = () => new Promise<string>((resolve) => {
    conversationModeRef.current = 'stopped'
    const recognition = recognitionRef.current
    if (!recognition) {
      resolve(transcriptRef.current)
      return
    }

    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      window.clearTimeout(timeout)
      resolve(transcriptRef.current)
    }
    recognitionStopResolverRef.current = finish
    const timeout = window.setTimeout(() => {
      recognitionStopResolverRef.current = null
      recognitionRef.current = null
      finish()
    }, 1500)
    try {
      recognition.stop()
    } catch {
      recognitionRef.current = null
      recognitionStopResolverRef.current = null
      finish()
    }
  })

  const speakQuestion = (question: InterviewQuestion) => {
    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      setErrorMessage('This browser does not support spoken interview questions.')
      return
    }
    speechGenerationRef.current += 1
    const generation = speechGenerationRef.current
    window.speechSynthesis.cancel()
    conversationModeRef.current = 'speaking'
    setIsSpeaking(true)
    setLiveTranscript(question.question_text)
    const utterance = new SpeechSynthesisUtterance(question.question_text)
    utterance.onend = () => {
      if (generation !== speechGenerationRef.current) return
      setIsSpeaking(false)
      transcriptRef.current = resumeTranscriptRef.current
      setLiveTranscript(resumeTranscriptRef.current)
      conversationModeRef.current = 'answering'
      startRecognition()
    }
    utterance.onerror = () => {
      if (generation !== speechGenerationRef.current) return
      setIsSpeaking(false)
      setErrorMessage('The question could not be spoken. Use Replay question to try again.')
    }
    window.speechSynthesis.speak(utterance)
  }

  const replayQuestion = async () => {
    if (!currentQuestion || stage !== 'active') return
    await stopRecognition()
    setErrorMessage(null)
    resumeTranscriptRef.current = transcriptRef.current
    speakQuestion(currentQuestion)
  }

  const stopRecordingAndGetBlob = async () => {
    if (recordingBlobRef.current) return recordingBlobRef.current
    const recorder = recorderRef.current
    if (!recorder) return new Blob(recordingChunksRef.current, { type: 'video/webm' })

    const blob = recorder.state === 'inactive'
      ? new Blob(recordingChunksRef.current, { type: recorder.mimeType || 'video/webm' })
      : await new Promise<Blob>((resolve) => {
          recorder.addEventListener('stop', () => {
            resolve(new Blob(recordingChunksRef.current, { type: recorder.mimeType || 'video/webm' }))
          }, { once: true })
          recorder.stop()
        })
    recordingBlobRef.current = blob
    recorderRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setStream(null)
    setIsRecording(false)
    return blob
  }

  const uploadStoppedRecording = async () => {
    const blob = await stopRecordingAndGetBlob()
    await uploadInterviewRecording(token, blob)
  }

  const completeInterview = async () => {
    if (completingRef.current) return
    completingRef.current = true
    setStage('evaluating')
    setErrorMessage(null)
    try {
      await endInterview(token)
      await uploadStoppedRecording()
      stopLocalMedia()
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined)
      setStage('submitted')
    } catch {
      try {
        if (recorderRef.current) await stopRecordingAndGetBlob()
      } catch {
        // Preserve the finalization error shown below.
      }
      setStage('upload-error')
      setErrorMessage('The interview ended, but the recording could not be uploaded. Retry the upload before leaving.')
    } finally {
      completingRef.current = false
    }
  }

  const finishAnswer = async () => {
    if (!currentQuestion || stage !== 'active') return
    setStage('evaluating')
    setErrorMessage(null)
    const transcript = await stopRecognition()
    try {
      await submitInterviewAnswer(token, { question_id: currentQuestion.id, transcript })
    } catch (error: unknown) {
      if (!axios.isAxiosError(error) || error.response?.status !== 409) {
        setStage('active')
        setErrorMessage(getActionError(error))
        conversationModeRef.current = 'answering'
        startRecognition()
        return
      }
      setNotice('This answer was already received. Continuing to the next question.')
    }

    const nextQuestionIndex = questionIndex + 1
    if (nextQuestionIndex < questions.length) {
      setSession((current) => current ? {
        ...current,
        questions: current.questions.map((question) => question.id === currentQuestion.id
          ? { ...question, answer_transcript: transcript }
          : question),
      } : current)
      setQuestionIndex(nextQuestionIndex)
      finalTranscriptRef.current = ''
      transcriptRef.current = ''
      resumeTranscriptRef.current = ''
      setLiveTranscript('')
      setNotice(null)
      setStage('active')
      speakQuestion(questions[nextQuestionIndex])
    } else {
      await completeInterview()
    }
  }

  const beginInterview = async () => {
    if (!token) {
      setStage('unavailable')
      setErrorMessage('This interview link is missing its token.')
      return
    }
    if (!speechRecognitionAvailable) {
      setErrorMessage('Speech recognition is not supported in this browser. Open the interview in a browser with speech recognition support.')
      return
    }
    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      setErrorMessage('Spoken questions are not supported in this browser.')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setErrorMessage('Camera and microphone recording are not supported in this browser.')
      return
    }

    setStage('loading')
    setErrorMessage(null)
    setNotice(null)
    finalTranscriptRef.current = ''
    transcriptRef.current = ''
    resumeTranscriptRef.current = ''
    setLiveTranscript('')
    try {
      const fullscreenRequest = document.fullscreenElement
        ? Promise.resolve(true)
        : document.documentElement.requestFullscreen
          ? document.documentElement.requestFullscreen().then(() => true).catch(() => false)
          : Promise.resolve(false)
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = mediaStream
      setStream(mediaStream)
      if (!await fullscreenRequest) setNotice('Fullscreen was unavailable. The interview can continue in this window.')

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm'
      const recorder = new MediaRecorder(mediaStream, { mimeType })
      recorderRef.current = recorder
      recordingChunksRef.current = []
      recordingBlobRef.current = null
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data)
      }
      recorder.start(1000)
      setIsRecording(true)

      const interview = await fetchInterview(token)
      if (interview.status === 'completed') {
        throw Object.assign(new Error('This interview has already been completed.'), { response: { status: 409 } })
      }
      if (interview.questions.length !== 2) throw new Error('This interview does not have two questions.')
      setSession(interview)
      const firstUnanswered = interview.questions.findIndex((question) => question.answer_transcript === null)
      if (firstUnanswered < 0) {
        await completeInterview()
        return
      }
      setQuestionIndex(firstUnanswered)
      setStage('active')
      speakQuestion(interview.questions[firstUnanswered])
    } catch (error: unknown) {
      stopLocalMedia()
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
      setStage('unavailable')
      setErrorMessage(getInterviewError(error))
    }
  }

  const retryRecordingUpload = async () => {
    setStage('evaluating')
    setErrorMessage(null)
    try {
      await uploadInterviewRecording(token, recordingBlobRef.current ?? new Blob(recordingChunksRef.current, { type: 'video/webm' }))
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined)
      setStage('submitted')
    } catch {
      setStage('upload-error')
      setErrorMessage('The recording upload failed again. Check your connection and retry.')
    }
  }

  const currentTranscript = isSpeaking && currentQuestion ? currentQuestion.question_text : liveTranscript

  return (
    <div className="interview-room">
      <header className="interview-topbar">
        <div className="interview-brand" aria-label="HireStack">
          <span className="interview-brand-mark">H</span>
          <span>HireStack</span>
        </div>
        <div className="interview-progress" aria-live="polite">
          {stage === 'active' || stage === 'evaluating'
            ? `Question ${Math.min(questionIndex + 1, 2)} of 2`
            : stage === 'submitted' ? 'Interview complete' : 'AI interview'}
        </div>
        <button className="interview-exit" type="button" onClick={exitInterview}>Exit</button>
      </header>

      {stage === 'intro' || stage === 'loading' ? (
        <main className="interview-intro">
          <div className="intro-mark" aria-hidden="true"><span>AI</span></div>
          <p className="room-eyebrow">HIRESTACK · LIVE INTERVIEW</p>
          <h1>{stage === 'loading' ? 'Preparing your room' : 'Your interview is ready'}</h1>
          <p className="intro-copy">Allow camera and microphone access to begin. Your answers will be transcribed as you speak.</p>
          {errorMessage && <p className="room-alert" role="alert">{errorMessage}</p>}
          {notice && <p className="room-notice" role="status">{notice}</p>}
          <button className="room-button room-button-primary intro-button" type="button" onClick={() => void beginInterview()} disabled={stage === 'loading'}>
            {stage === 'loading' ? <><span className="button-spinner" /> Connecting…</> : 'Begin interview'}
          </button>
        </main>
      ) : stage === 'unavailable' ? (
        <main className="interview-state">
          <span className="state-symbol" aria-hidden="true">!</span>
          <p className="room-eyebrow">INTERVIEW UNAVAILABLE</p>
          <h1>We can’t open this interview</h1>
          <p>{errorMessage ?? 'This interview link is invalid, expired, or already completed.'}</p>
          <button className="room-button room-button-secondary" type="button" onClick={() => navigate('/candidate/notifications')}>Back to notifications</button>
        </main>
      ) : stage === 'submitted' ? (
        <main className="interview-state">
          <span className="state-symbol state-success" aria-hidden="true">✓</span>
          <p className="room-eyebrow">SUBMISSION RECEIVED</p>
          <h1>Interview submitted</h1>
          <p>Your responses and recording have been submitted successfully.</p>
          <button className="room-button room-button-secondary" type="button" onClick={() => navigate('/candidate/notifications')}>Return to notifications</button>
        </main>
      ) : stage === 'upload-error' ? (
        <main className="interview-state">
          <span className="state-symbol state-warning" aria-hidden="true">!</span>
          <p className="room-eyebrow">UPLOAD INTERRUPTED</p>
          <h1>Interview ended</h1>
          <p role="alert">{errorMessage}</p>
          <button className="room-button room-button-primary" type="button" onClick={() => void retryRecordingUpload()}>Retry recording upload</button>
        </main>
      ) : (
        <main className="interview-workspace">
          {notice && <p className="room-notice workspace-notice" role="status">{notice}</p>}
          <section className="interview-tiles" aria-label="Interview participants">
            <article className={`interview-tile interviewer-tile ${isSpeaking ? 'is-speaking' : ''}`}>
              <div className="interviewer-orbit"><div className="interviewer-avatar">AI</div></div>
              <div className="tile-name"><span className="name-status-dot" />AI Interviewer</div>
              <span className="audio-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>
            </article>
            <article className={`interview-tile candidate-tile ${stream ? 'camera-ready' : ''}`}>
              <video ref={videoRef} autoPlay muted playsInline aria-label="Your live camera" />
              <div className="camera-placeholder" aria-hidden="true"><span>{candidateName.slice(0, 1).toUpperCase()}</span></div>
              {isRecording && <div className="recording-pill"><span />Rec</div>}
              <div className="tile-name"><span className="name-status-dot candidate-dot" />{candidateName}</div>
            </article>
          </section>

          <section className="transcription-panel" aria-live="polite">
            <div className="transcription-heading"><span className="transcription-icon" aria-hidden="true">≋</span><span>Transcription</span></div>
            <p className={currentTranscript ? 'transcription-text' : 'transcription-placeholder'}>
              {stage === 'evaluating' ? 'Evaluating your answer…' : currentTranscript || (isListening ? 'Listening…' : 'Your transcript will appear here.')}
            </p>
            {errorMessage && <p className="room-alert inline-alert" role="alert">{errorMessage}</p>}
            {stage === 'evaluating' && <span className="evaluating-indicator"><span />Evaluating…</span>}
          </section>

          <div className="room-controls">
            <button className="room-button room-button-secondary" type="button" onClick={() => void replayQuestion()} disabled={stage !== 'active' || !currentQuestion}>
              <span className="control-icon" aria-hidden="true">↻</span>Replay question
            </button>
            <button className="room-button room-button-primary" type="button" onClick={() => void finishAnswer()} disabled={stage !== 'active' || !currentQuestion}>
              Finish answer<span className="control-icon control-arrow" aria-hidden="true">→</span>
            </button>
          </div>
        </main>
      )}
    </div>
  )
}

function getInterviewError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 404) return 'This interview link is invalid or does not belong to your account.'
    if (error.response?.status === 410) return 'This interview link has expired.'
    if (error.response?.status === 409) return 'This interview has already been completed.'
  }
  if (error instanceof Error && ['NotAllowedError', 'PermissionDeniedError'].includes(error.name)) {
    return 'Camera and microphone permission is required. Allow access in your browser and try again.'
  }
  if (error instanceof Error && error.name === 'NotFoundError') {
    return 'No camera or microphone was found. Connect a device and try again.'
  }
  if (error instanceof Error && /permission/i.test(error.message)) {
    return 'Camera and microphone permission is required. Allow access in your browser and try again.'
  }
  if (error instanceof Error && error.message.includes('two questions')) return error.message
  return 'We could not start the interview. Check your camera and microphone permissions, then try again.'
}

function getActionError(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 410) return 'This interview link has expired.'
  if (axios.isAxiosError(error) && error.response?.status === 404) return 'This interview is no longer available.'
  return 'We could not submit this answer. Please try again.'
}