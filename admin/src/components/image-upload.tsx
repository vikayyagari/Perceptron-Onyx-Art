'use client'

import { useCallback, useState } from 'react'
import Image from 'next/image'
import { Upload, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  currentUrl?: string | null
  onUpload: (file: File) => Promise<void>
  label?: string
  aspectRatio?: string
  className?: string
}

export function ImageUpload({
  currentUrl,
  onUpload,
  label = 'Upload image',
  aspectRatio = 'aspect-square',
  className,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) return
      const objectUrl = URL.createObjectURL(file)
      setPreview(objectUrl)
      setIsUploading(true)
      try {
        await onUpload(file)
      } finally {
        setIsUploading(false)
        URL.revokeObjectURL(objectUrl)
      }
    },
    [onUpload],
  )

  const displayUrl = preview ?? currentUrl

  return (
    <div
      className={cn('relative', aspectRatio, className)}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
      }}
    >
      <label
        className={cn(
          'flex h-full w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/20',
          displayUrl && 'border-solid border-muted',
        )}
      >
        {displayUrl ? (
          <div className="relative h-full w-full overflow-hidden rounded-lg">
            <Image src={displayUrl} alt="Upload preview" fill className="object-cover" />
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">Drag & drop or click to select</p>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </label>
    </div>
  )
}
