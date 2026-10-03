import { useState } from 'react'
import { artworkImageUrl, type Artwork } from '../lib/artworks'

interface Props {
  artwork: Artwork
  size: 200 | 400 | 843
  className?: string
  eager?: boolean
  displayWidth?: number
  displayHeight?: number
}

export default function ArtworkImage({ artwork, size, className = '', eager = false, displayWidth, displayHeight }: Props) {
  const [failed, setFailed] = useState(false)
  const src = artworkImageUrl(artwork, size)
  const width = artwork.thumbnail?.width || 4
  const height = artwork.thumbnail?.height || 5

  if (!src || failed) {
    if (displayWidth && displayHeight) return <svg
      className={`artwork-image image-placeholder-svg ${className}`}
      width={displayWidth}
      height={displayHeight}
      viewBox={`0 0 ${displayWidth} ${displayHeight}`}
      role="img"
      aria-label={`Image unavailable for ${artwork.title || 'this artwork'}`}
    ><rect width="100%" height="100%" /><text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">No image</text></svg>
    return <div className={`artwork-image image-placeholder ${className}`} role="img" aria-label={`Image unavailable for ${artwork.title || 'this artwork'}`}>
      <span>Image unavailable</span>
    </div>
  }

  return <img
    className={`artwork-image ${className}`}
    src={src}
    width={displayWidth ?? width}
    height={displayHeight ?? height}
    alt={artwork.title || 'Artwork'}
    loading={eager ? 'eager' : 'lazy'}
    decoding="async"
    referrerPolicy="no-referrer"
    onError={() => setFailed(true)}
  />
}
