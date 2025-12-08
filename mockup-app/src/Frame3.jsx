import { useState, useRef, useEffect } from 'react'
import './App.css'
import './Frame3.css'

const videos = [
  '/a1.mp4', '/a2.mp4', '/a3.mp4', '/a4.mp4',
  '/a5.mp4', '/a6.mp4', '/a7.mp4', '/a8.mp4'
]

function VideoCard({ video, shouldPlay }) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (shouldPlay) {
      videoRef.current?.play()
    } else {
      videoRef.current?.pause()
    }
  }, [shouldPlay])

  return (
    <div className="video-card">
      <div className="video-preview">
        <video ref={videoRef} src={video} muted loop playsInline preload="metadata" />
        <span className="veo-badge">Veo</span>
      </div>
    </div>
  )
}

function Frame3({ onDisconnect, onCreate, onHome }) {
  const [page, setPage] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
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
      // Scrolling down (inverted: go to previous)
      const newPage = Math.max(0, page - 1)
      setPage(newPage)
    } else if (e.deltaY < 0) {
      // Scrolling up (inverted: go to next)
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
        <header className="frame3-header">
          <div className="search-bar">
            <span>Search stories, creators</span>
          </div>
          <div className="wallet-info">
            <span className="balance">20,000.05</span>
            <img src="/logo.png" alt="Mute" className="token-logo" />
            <div className="avatar-wrapper">
              <div className="avatar" onClick={() => setShowProfileModal(!showProfileModal)}>
                <img src="/pfp.jpeg" alt="Profile" />
              </div>
              {showProfileModal && (
                <>
                  <div className="modal-overlay" onClick={() => setShowProfileModal(false)} />
                  <div className="profile-modal">
                    <div className="modal-pfp">
                      <img src="/pfp.jpeg" alt="Profile" />
                    </div>
                    <nav className="profile-menu">
                      <a href="#" className="menu-item" onClick={onHome}>Home</a>
                      <a href="#" className="menu-item">Vault</a>
                      <a href="#" className="menu-item">Following</a>
                      <a href="#" className="menu-item" onClick={onCreate}>Create</a>
                      <a href="#" className="menu-item">Notifications</a>
                      <a href="#" className="menu-item">Grants</a>
                    </nav>
                    <div className="profile-actions">
                      <a href="#" className="action-item">Edit</a>
                      <a href="#" className="action-item" onClick={onDisconnect}>Disconnect</a>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="frame3-content-area" onWheel={handleWheel}>
          <div className="main-videos" key={page}>
            {currentVideos.map((video) => (
              <VideoCard key={video} video={video} shouldPlay={true} />
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

export default Frame3
