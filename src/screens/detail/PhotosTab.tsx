import { useRef, useState } from 'react'
import { ImagePlus, Star, Trash2, Loader2 } from 'lucide-react'
import type { Person } from '../../types'
import { usePeople } from '../../store/people'
import { usePhoto } from '../../lib/usePhoto'
import { putPhoto, deletePhoto } from '../../lib/photoStore'
import { fileToDataUrl, resizeImage, uid } from '../../lib/utils'

export function PhotosTab({
  person,
  accent,
}: {
  person: Person
  accent: string
}) {
  const { updatePerson } = usePeople()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBusy(true)
    try {
      const newIds: string[] = []
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        const dataUrl = await resizeImage(await fileToDataUrl(file))
        const id = uid()
        await putPhoto(id, dataUrl)
        newIds.push(id)
      }
      const photoIds = [...person.photoIds, ...newIds]
      // If there's no main photo yet, promote the first uploaded one.
      const patch: Partial<Person> = { photoIds }
      if (!person.avatarId && newIds[0]) patch.avatarId = newIds[0]
      updatePerson(person.id, patch)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const removePhoto = (photoId: string) => {
    void deletePhoto(photoId)
    const patch: Partial<Person> = {
      photoIds: person.photoIds.filter((p) => p !== photoId),
    }
    if (person.avatarId === photoId) {
      patch.avatarId = person.photoIds.find((p) => p !== photoId)
    }
    updatePerson(person.id, patch)
  }

  const setMain = (photoId: string) => {
    updatePerson(person.id, { avatarId: photoId })
  }

  return (
    <div className="photos">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => void onFiles(e.target.files)}
      />

      <div className="photo-grid">
        <button
          className="photo-add"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          style={{ color: accent, borderColor: accent }}
        >
          {busy ? (
            <Loader2 size={22} className="spin" />
          ) : (
            <>
              <ImagePlus size={22} />
              <span>Adicionar</span>
            </>
          )}
        </button>

        {person.photoIds.map((pid) => (
          <PhotoThumb
            key={pid}
            id={pid}
            isMain={person.avatarId === pid}
            accent={accent}
            onRemove={() => removePhoto(pid)}
            onSetMain={() => setMain(pid)}
          />
        ))}
      </div>

      {person.photoIds.length === 0 && !busy && (
        <p className="muted-block">
          Adiciona fotos e define a principal com a estrela.
        </p>
      )}
    </div>
  )
}

function PhotoThumb({
  id,
  isMain,
  accent,
  onRemove,
  onSetMain,
}: {
  id: string
  isMain: boolean
  accent: string
  onRemove: () => void
  onSetMain: () => void
}) {
  const url = usePhoto(id)
  return (
    <div className="photo-thumb">
      {url ? <img src={url} alt="" /> : <div className="photo-thumb__ph" />}
      <button
        className={'photo-thumb__star' + (isMain ? ' is-main' : '')}
        onClick={onSetMain}
        aria-label={isMain ? 'Foto principal' : 'Definir como principal'}
        style={isMain ? { background: accent } : undefined}
      >
        <Star size={14} fill={isMain ? '#fff' : 'none'} stroke={isMain ? '#fff' : '#333'} />
      </button>
      <button
        className="photo-thumb__del"
        onClick={onRemove}
        aria-label="Remover foto"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
