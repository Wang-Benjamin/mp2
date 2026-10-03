import { useState } from 'react'
import { artworkImageUrl, type Artwork } from '../lib/artworks'

interface Props {
  artwork: Artwork
  size: 200 | 400 | 843
  className?: string
  eager?: boolean
}

export default function ArtworkImage({ artwork, size, className = '', eager = false }: Props) {
  const [failed, setFailed] = useState(false)
  const src = artworkImageUrl(artwork, size)
  const width = artwork.thumbnail?.width || 4
  const height = artwork.thumbnail?.height || 5

  if (!src || failed) {
    return <div className={`artwork-image image-placeholder ${className}`} role="img" aria-label={`Image unavailable for ${artwork.title || 'this artwork'}`}>
      <span>Image unavailable</span>
    </div>
  }

  return <img
    className={`artwork-image ${className}`}
    src={src}
    width={width}
    height={height}
    alt={artwork.title || 'Artwork'}
    loading={eager ? 'eager' : 'lazy'}
    decoding="async"
    referrerPolicy="no-referrer"
    onError={() => setFailed(true)}
  />
}
