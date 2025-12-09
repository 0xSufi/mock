import { useState, useRef, useEffect } from 'react'
import './App.css'
import './Home.css'
import './Frame3.css'

// Sample feed data - videos from friends/followers
const feedItems = [
  { id: 1, video: '/a1.mp4', creator: 'cryptoartist', title: 'Pixel Legends Collection', likes: 234 },
  { id: 2, video: '/a2.mp4', creator: 'nftcollector', title: 'Morning vibes', likes: 189 },
  { id: 3, video: '/a3.mp4', creator: 'web3builder', title: 'New drop coming soon', likes: 512 },
  { id: 4, video: '/a4.mp4', creator: 'degenape', title: 'Just minted this', likes: 87 },
  { id: 5, video: '/a5.mp4', creator: 'pixelmaster', title: 'Animated my PFP', likes: 341 },
  { id: 6, video: '/a6.mp4', creator: 'artlover', title: 'Experimenting with Veo', likes: 156 },
]

function Home({ onNavigate }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const videoRef = useRef(null)

  const currentItem = feedItems[currentIndex]
  const nextItem = feedItems[currentIndex + 1]

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }, [currentIndex])

  const handleWheel = (e) => {
    e.preventDefault()
    if (isScrolling) return

    setIsScrolling(true)
    setTimeout(() => setIsScrolling(false), 400)

    if (e.deltaY > 0) {
      // Scroll down - go to previous
      setCurrentIndex(prev => Math.max(0, prev - 1))
    } else if (e.deltaY < 0) {
      // Scroll up - go to next
      setCurrentIndex(prev => Math.min(feedItems.length - 1, prev + 1))
    }
  }

  const handleMenuClick = (item) => {
    setShowProfileModal(false)
    if (onNavigate) {
      onNavigate(item)
    }
  }

  return (
    <div className="device-frame">
      <div className="screen">
        <header className="home-header">
          <div className="search-bar">
            <span className="search-text-full">Search stories, creators</span>
            <span className="search-text-short">Search</span>
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
                      <a href="#" className="menu-item active">Home</a>
                      <a href="#" className="menu-item" onClick={() => handleMenuClick('vault')}>Vault</a>
                      <a href="#" className="menu-item" onClick={() => handleMenuClick('following')}>Following</a>
                      <a href="#" className="menu-item" onClick={() => handleMenuClick('create')}>Create</a>
                      <a href="#" className="menu-item" onClick={() => handleMenuClick('notifications')}>Notifications</a>
                      <a href="#" className="menu-item" onClick={() => handleMenuClick('grants')}>Grants</a>
                    </nav>
                    <div className="profile-actions">
                      <a href="#" className="action-item">Edit</a>
                      <a href="#" className="action-item" onClick={() => handleMenuClick('disconnect')}>Disconnect</a>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="home-feed" onWheel={handleWheel}>
          <div className="main-videos" key={currentItem.id}>
            <div className="video-card">
              <div className="video-preview">
                <video
                  ref={videoRef}
                  src={currentItem.video}
                  muted
                  loop
                  playsInline
                  autoPlay
                />
                <span className="veo-badge">Veo</span>
              </div>
            </div>
          </div>

          {nextItem && (
            <div className="preview-strip">
              <div className="preview-box">
                <video src={nextItem.video} muted playsInline preload="metadata" />
              </div>
            </div>
          )}

          <div className="feed-indicator">
            {feedItems.map((_, i) => (
              <div
                key={i}
                className={`indicator-dot ${i === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
