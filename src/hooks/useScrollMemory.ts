import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function rememberScroll(path: string) {
  sessionStorage.setItem(`art-scroll:${path}`, String(window.scrollY))
}

export function useScrollMemory(ready: boolean) {
  const location = useLocation()
  const path = `${location.pathname}${location.search}`

  useEffect(() => {
    if (!ready) return
    const saved = sessionStorage.getItem(`art-scroll:${path}`)
    if (!saved) return
    const frame = requestAnimationFrame(() => window.scrollTo({ top: Number(saved), behavior: 'instant' }))
    return () => cancelAnimationFrame(frame)
  }, [path, ready])
}
