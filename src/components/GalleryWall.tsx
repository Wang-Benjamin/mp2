import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { rememberScroll } from '../hooks/useScrollMemory'
import type { Artwork } from '../lib/artworks'
import ArtworkImage from './ArtworkImage'

interface Props {
  items: Artwork[]
  sourcePath: string
  detailPath: (id: number) => string
}

interface Tile {
  artwork: Artwork
  index: number
  width: number
  height: number
}

function imageRatio(artwork: Artwork) {
  const width = artwork.thumbnail?.width
  const height = artwork.thumbnail?.height
  return width && height && width > 0 && height > 0 ? width / height : 1
}

function buildRows(items: Artwork[], containerWidth: number): Tile[][] {
  const gap = containerWidth < 500 ? 12 : 18
  const targetHeight = containerWidth < 500 ? 165 : containerWidth < 760 ? 190 : 245
  const rows: Tile[][] = []
  let pending: { artwork: Artwork; index: number; ratio: number }[] = []
  let ratioSum = 0

  function finishRow(last: boolean) {
    if (!pending.length) return
    const fillHeight = (containerWidth - gap * (pending.length - 1)) / ratioSum
    const height = Math.round(last && fillHeight > targetHeight * 1.25 ? targetHeight : fillHeight)
    rows.push(pending.map(({ artwork, index, ratio }) => ({
      artwork,
      index,
      width: Math.max(1, Math.round(ratio * height)),
      height,
    })))
    pending = []
    ratioSum = 0
  }

  items.forEach((artwork, index) => {
    const ratio = imageRatio(artwork)
    pending.push({ artwork, index, ratio })
    ratioSum += ratio
    if (ratioSum * targetHeight + gap * (pending.length - 1) >= containerWidth) finishRow(false)
  })
  finishRow(true)
  return rows
}

export default function GalleryWall({ items, sourcePath, detailPath }: Props) {
  const wallRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const wall = wallRef.current
    if (!wall) return
    const measure = () => setWidth(wall.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(wall)
    return () => observer.disconnect()
  }, [])

  const rows = useMemo(() => width > 0 ? buildRows(items, width) : [], [items, width])

  return <div className="gallery-wall" ref={wallRef}>
    {rows.map((row) => <div className="gallery-row" key={row[0].artwork.id}>
      {row.map(({ artwork, index, width: imageWidth, height: imageHeight }) => <Link
        className="gallery-card"
        key={artwork.id}
        to={detailPath(artwork.id)}
        onClick={() => rememberScroll(sourcePath)}
      >
        <span className="gallery-image-wrap"><ArtworkImage
          artwork={artwork}
          size={imageWidth > 400 ? 843 : 400}
          displayWidth={imageWidth}
          displayHeight={imageHeight}
          eager={index < 8}
        /></span>
        <span className="gallery-caption"><strong>{artwork.title || 'Untitled'}</strong><span>{artwork.artist_title || 'Artist unknown'} <span aria-hidden="true">·</span> {artwork.date_display || 'Date unknown'}</span></span>
      </Link>)}
    </div>)}
  </div>
}
