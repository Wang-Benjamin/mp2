import { useEffect, useState } from 'react'
import { getFeaturedArtworks, type Artwork } from '../lib/artworks'

export function useFeatured() {
  const [items, setItems] = useState<Artwork[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    getFeaturedArtworks().then(
      (artworks) => {
        if (!active) return
        setItems(artworks)
        setStatus('ready')
      },
      () => {
        if (active) setStatus('error')
      },
    )
    return () => { active = false }
  }, [attempt])

  return { items, status, retry: () => { setStatus('loading'); setAttempt((value) => value + 1) } }
}
