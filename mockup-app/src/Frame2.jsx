import { useState } from 'react'
import './App.css'
import './Frame2.css'

const videos = [
  '/a1.mp4', '/a2.mp4', '/a3.mp4', '/a4.mp4',
  '/a5.mp4', '/a6.mp4', '/a7.mp4', '/a8.mp4'
]

function Frame2({ onConnect }) {
  const [page, setPage] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const videosPerPage = 2
  const totalPages = Math.ceil(videos.length / videosPerPage)

  const currentVideos = videos.slice(
    page * videosPerPage,
    (page + 1) * videosPerPage
  )

  const nextVideos = videos.slice(
    (page + 1) * videosPerPage,
    (page + 2) * videosPerPage
  )

  const handleWheel = (e) => {
    e.preventDefault()
    if (isScrolling) return

    setIsScrolling(true)
    setTimeout(() => setIsScrolling(false), 400)

    if (e.deltaY > 0) {
      const newPage = Math.max(0, page - 1)
      setPage(newPage)
    } else if (e.deltaY < 0) {
      const newPage = Math.min(totalPages - 1, page + 1)
      setPage(newPage)
    }
  }

  const goToPage = (newPage) => {
    setPage(newPage)
  }

  return (
    <div className="device-frame">
      <div className="screen">
        <header className="frame2-header">
          <div className="search-bar">
            <span>Search stories, creators</span>
          </div>
          <div className="wallet-section">
            <button className="connect-wallet-btn" onClick={onConnect}>Connect Wallet</button>
          </div>
        </header>

        <div className="frame2-content-area" onWheel={handleWheel}>
          <div className="main-videos" key={page}>
            {currentVideos.map((video) => (
              <div className="video-card" key={video}>
                <div className="video-preview">
                  <video src={video} muted playsInline preload="metadata" />
                  <span className="veo-badge">Veo</span>
                </div>
              </div>
            ))}
          </div>

          {nextVideos.length > 0 && (
            <div className="preview-strip" key={`preview-${page}`}>
              {nextVideos.map((video) => (
                <div className="preview-box" key={video}>
                  <video src={video} muted playsInline preload="metadata" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="paginator">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`page-dot ${page === i ? 'active' : ''}`}
              onClick={() => goToPage(i)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default Frame2
