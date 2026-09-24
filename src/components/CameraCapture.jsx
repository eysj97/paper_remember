import { useEffect, useRef, useState } from 'react'
import './CameraCapture.css'

const ERROR_MESSAGES = {
  NotAllowedError: '카메라 권한이 필요해요. 브라우저 설정에서 카메라를 허용해 주세요.',
  NotFoundError: '사용할 수 있는 카메라를 찾지 못했어요.',
  NotReadableError: '다른 앱이 카메라를 사용 중이에요.',
}

export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) video.srcObject = stream
      })
      .catch((err) => {
        if (!cancelled) setError(ERROR_MESSAGES[err.name] ?? '카메라를 켜지 못했어요.')
      })

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const handleShoot = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture?.(blob)
        onClose()
      },
      'image/jpeg',
      0.92,
    )
  }

  return (
    <div className="camera" role="dialog" aria-modal="true" aria-label="단어 촬영">
      <video
        ref={videoRef}
        className="camera__video"
        autoPlay
        playsInline
        muted
        onLoadedMetadata={() => setReady(true)}
      />
      {error && <p className="camera__error">{error}</p>}

      <button type="button" className="camera__close" onClick={onClose}>
        닫기
      </button>
      <button
        type="button"
        className="camera__shutter"
        aria-label="촬영"
        disabled={!ready}
        onClick={handleShoot}
      />
    </div>
  )
}
