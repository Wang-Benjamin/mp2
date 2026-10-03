import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const redirect = new URLSearchParams(window.location.search).get('__route')
if (redirect && /^(collections|gallery|artworks\/\d+)(\?|$)/.test(redirect)) {
  window.history.replaceState(null, '', `${import.meta.env.BASE_URL}${redirect}`)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
