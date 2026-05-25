'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Camera, Repeat, X, CheckCircle, Loader2, Search } from 'lucide-react'
import { usePaintings, useUploadPaintingImage } from '@/hooks/use-paintings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PaintingStatus } from '@perceptron/shared'
import type { PaintingListItem } from '@perceptron/shared'

type Mode = 'select' | 'camera' | 'preview'

export function PhotographyClient() {
  const [mode, setMode] = useState<Mode>('select')
  const [search, setSearch] = useState('')
  const [selectedPainting, setSelectedPainting] = useState<PaintingListItem | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { data: paintings } = usePaintings({ search: search || undefined, limit: 20, status: PaintingStatus.AVAILABLE })
  const uploadMutation = useUploadPaintingImage(selectedPainting?.id ?? '')

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 4096 }, height: { ideal: 4096 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch {
      toast.error('Camera access denied')
      setMode('select')
    }
  }, [facingMode])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    if (mode === 'camera') startCamera()
    return () => { if (mode === 'camera') stopCamera() }
  }, [mode, startCamera, stopCamera])

  function capture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)

    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
      setCapturedFile(file)
      setCapturedImage(canvas.toDataURL('image/jpeg', 0.92))
      stopCamera()
      setMode('preview')
    }, 'image/jpeg', 0.92)
  }

  async function flipCamera() {
    stopCamera()
    setFacingMode((f) => f === 'environment' ? 'user' : 'environment')
    await startCamera()
  }

  async function confirmUpload() {
    if (!capturedFile || !selectedPainting) return
    try {
      await uploadMutation.mutateAsync(capturedFile)
      toast.success(`Photo uploaded for "${selectedPainting.title}"`)
      setCapturedImage(null)
      setCapturedFile(null)
      setMode('select')
    } catch {
      toast.error('Upload failed')
    }
  }

  function retake() {
    setCapturedImage(null)
    setCapturedFile(null)
    setMode('camera')
  }

  if (mode === 'select') {
    return (
      <div className="flex h-full">
        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          <div>
            <h2 className="font-serif text-lg font-semibold">Select Painting to Photograph</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Choose a painting, then capture a high-quality photo using your device camera.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search paintings…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {paintings?.data.map((painting) => (
              <button
                key={painting.id}
                onClick={() => {
                  setSelectedPainting(painting)
                  setMode('camera')
                }}
                className="flex items-start gap-3 rounded-lg border p-3 text-left hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded">
                  {painting.primaryImageUrl ? (
                    <Image src={painting.primaryImageUrl} alt={painting.title} fill className="object-cover" />
                  ) : (
                    <div className="h-full w-full bg-muted" style={{ background: painting.dominantColor ?? '#e5e7eb' }} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm leading-tight line-clamp-2">{painting.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{painting.artist.name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'camera') {
    return (
      <div className="relative h-full bg-black flex flex-col">
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { stopCamera(); setMode('select') }}
            className="bg-black/50 text-white hover:bg-black/70 border-0"
          >
            <X className="mr-1 h-4 w-4" /> Cancel
          </Button>
          <div className="rounded-full bg-black/50 px-3 py-1 text-sm text-white font-medium">
            {selectedPainting?.title}
          </div>
          <Button
            variant="secondary"
            size="icon"
            onClick={flipCamera}
            className="bg-black/50 text-white hover:bg-black/70 border-0"
          >
            <Repeat className="h-4 w-4" />
          </Button>
        </div>

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="flex-1 w-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          <button
            onClick={capture}
            className="h-20 w-20 rounded-full border-4 border-white bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
          >
            <Camera className="h-8 w-8 text-white" />
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'preview') {
    return (
      <div className="relative h-full bg-black flex flex-col">
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            onClick={retake}
            className="bg-black/50 text-white hover:bg-black/70 border-0"
          >
            <Repeat className="mr-1 h-4 w-4" /> Retake
          </Button>
          <div className="rounded-full bg-black/50 px-3 py-1 text-sm text-white font-medium">
            Review Photo
          </div>
          <div className="w-20" />
        </div>

        {capturedImage && (
          <Image
            src={capturedImage}
            alt="Captured photo"
            fill
            className="object-contain"
          />
        )}

        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4">
          <Button
            onClick={confirmUpload}
            disabled={uploadMutation.isPending}
            size="lg"
            className="gap-2 shadow-lg"
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle className="h-5 w-5" />
            )}
            Upload Photo
          </Button>
        </div>
      </div>
    )
  }

  return null
}
