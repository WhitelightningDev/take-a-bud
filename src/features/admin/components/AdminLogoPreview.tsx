import { useState } from 'react'

type AdminLogoPreviewProps = {
  src?: string | null
  fallback: string
}

export function AdminLogoPreview({ src, fallback }: AdminLogoPreviewProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const failed = Boolean(src && failedSrc === src)

  if (!src || failed) {
    const letters = fallback
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join('')

    return <div className="adminBrandLogo__fallback">{letters || '—'}</div>
  }

  return (
    <img
      className="adminBrandLogo__img"
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  )
}