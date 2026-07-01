import { useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'

interface ImageUploadFieldProps {
  onFileSelect: (file: File) => void
  onClear:      () => void
  file:         File | null
}

// ImageUploadField handles:
//   1. Rendering the file input (hidden — we use a styled div to trigger it)
//   2. Showing a preview of the selected image using URL.createObjectURL()
//   3. Letting the user clear the selection
//
// WHY URL.createObjectURL()?
// It creates a temporary URL that points to the file in memory.
// The browser can render it in an <img> tag without uploading it.
// This gives instant preview before the upload happens.
// The URL is valid only for the lifetime of the current page —
// we must call URL.revokeObjectURL() when done to release memory.
export default function ImageUploadField({ onFileSelect, onClear, file }: ImageUploadFieldProps) {
  const inputRef             = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return

    // Revoke the previous object URL to avoid memory leaks
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
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Photo <span className="text-red-400">*</span>
      </label>

      {/* Hidden native file input — triggered by the styled div below */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="hidden"
        onChange={handleFileChange}
      />

      {preview ? (
        /* Preview state */
        <div className="relative rounded-lg overflow-hidden">
          <img
            src={preview}
            alt="Hazard preview"
            className="w-full h-40 object-cover rounded-lg"
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
            aria-label="Remove photo"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        /* Upload prompt state */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-32 border-2 border-dashed border-gray-600 rounded-lg
                     flex flex-col items-center justify-center gap-2
                     text-gray-400 hover:border-road-accent hover:text-road-accent
                     transition-colors cursor-pointer"
        >
          <Camera size={24} />
          <span className="text-sm">Tap to add photo</span>
          <span className="text-xs text-gray-500">JPEG, PNG, WebP · max 5MB</span>
        </button>
      )}
    </div>
  )
}
