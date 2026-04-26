import { useState } from 'react'

type AdminCatalogMediaProps = {
  src?: string | null
  alt: string
  source?: 'product' | 'placeholder' | 'brand' | null
}

export function AdminCatalogMedia({ src, alt, source }: AdminCatalogMediaProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const failed = Boolean(src && failedSrc === src)

  if (!src || failed) {
    return <div className="adminCatalogMedia adminCatalogMedia--empty">No image</div>
  }

  return (
    <img
      className={
        source === 'product'
          ? 'adminCatalogMedia__img'
          : 'adminCatalogMedia__img adminCatalogMedia__img--contained'
      }
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  )
}