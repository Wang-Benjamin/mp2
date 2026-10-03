import { useEffect } from 'react'
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import CollectionsPage from './pages/CollectionsPage'
import GalleryPage from './pages/GalleryPage'
import ArtworkPage from './pages/ArtworkPage'
import './App.css'

function Layout() {
  const location = useLocation()
  const isDetail = location.pathname.startsWith('/artworks/')
  useEffect(() => {
    document.title = location.pathname === '/gallery' ? 'Art Gallery — Chicago'
      : isDetail ? 'Artwork Information — Chicago' : 'Art Collections — Chicago'
  }, [location.pathname, isDetail])

  return <div className="site-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="site-header">
      <Link to="/collections" className="brand" aria-label="Art collection home">
        <span className="brand-mark" aria-hidden="true">A<span>—</span>C</span>
        <span className="brand-copy">THE ART COLLECTION<span>CHICAGO</span></span>
      </Link>
      <nav aria-label="Main navigation" className="main-nav">
        <NavLink to="/collections" className={({ isActive }) => isActive || (isDetail && location.search.includes('from=collections')) ? 'active' : ''}>Collections</NavLink>
        <NavLink to="/gallery" className={({ isActive }) => isActive || (isDetail && location.search.includes('from=gallery')) ? 'active' : ''}>Gallery</NavLink>
      </nav>
      <span className="header-note">AN OPEN WINDOW INTO ART</span>
    </header>
    <main id="main-content">
      <Routes>
        <Route path="/" element={<Navigate to="/collections" replace />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/artworks/:id" element={<ArtworkPage />} />
        <Route path="*" element={<Navigate to="/collections" replace />} />
      </Routes>
    </main>
    <footer className="site-footer">
      <span>Explore the collection</span>
      <a href="https://api.artic.edu/docs/" target="_blank" rel="noreferrer">Powered by the Art Institute of Chicago API ↗</a>
    </footer>
  </div>
}

export default function App() {
  return <BrowserRouter basename={import.meta.env.BASE_URL}>
    <Layout />
  </BrowserRouter>
}
