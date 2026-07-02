import { useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'

interface ImageUploadFieldProps {
  onFileSelect: (file: File) => void
  onClear:      () => void
}

export default function ImageUploadField({ onFileSelect, onClear }: ImageUploadFieldProps) {
  const inputRef              = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return
    if (preview) URL.revokeObjectURL(preview)
    const url = URL.createObjectURL(selected)
    setPreview(url)
    onFileSelect(selected)
  }

  function handleClear() {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    if (inputRef.current) inputRef.current.value = ''
    onClear()
  }

  return (
    <div>
      <label className="block text-xs font-medium text-road-muted mb-2">
        Photo <span className="text-road-danger">*</span>
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="hidden"
        onChange={handleFileChange}
      />

      {preview ? (
        <div className="relative rounded-lg overflow-hidden">
          <img
            src={preview}
            alt="Hazard preview"
            className="w-full h-24 object-cover rounded-lg"
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1
                       hover:bg-black/80 transition-colors"
            aria-label="Remove photo"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-20 border-2 border-dashed border-road-border rounded-lg
                     flex items-center justify-center gap-3
                     text-road-muted hover:border-road-accent hover:text-road-accent
                     transition-colors cursor-pointer"
        >
          <Camera size={18} />
          <div className="text-left">
            <div className="text-xs font-medium">Tap to add photo</div>
            <div className="text-[10px] text-road-muted">JPEG, PNG, WebP · max 5MB</div>
          </div>
        </button>
      )}
    </div>
  )
}
