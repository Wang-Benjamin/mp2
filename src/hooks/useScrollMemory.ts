import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const returnPathKey = 'art-scroll:return-path'

export function rememberScroll(path: string) {
  sessionStorage.setItem(`art-scroll:${path}`, String(window.scrollY))
  sessionStorage.setItem(returnPathKey, path)
}

export function useScrollMemory(ready: boolean) {
  const location = useLocation()
  const path = `${location.pathname}${location.search}`
  const entry = useRef({ path, restore: sessionStorage.getItem(returnPathKey) === path })

  useEffect(() => {
    sessionStorage.removeItem(returnPathKey)
    if (!entry.current.restore) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  useEffect(() => {
    if (!ready || !entry.current.restore || path !== entry.current.path) return
    const saved = sessionStorage.getItem(`art-scroll:${path}`)
    if (!saved) return
    const frame = requestAnimationFrame(() => window.scrollTo({ top: Number(saved), behavior: 'instant' }))
    return () => cancelAnimationFrame(frame)
  }, [path, ready])
}
