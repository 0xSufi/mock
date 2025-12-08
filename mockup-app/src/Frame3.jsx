import { useState, useRef, useEffect } from 'react'
import './App.css'
import './Frame3.css'

const videos = [
  '/a1.mp4', '/a2.mp4', '/a3.mp4', '/a4.mp4',
  '/a5.mp4', '/a6.mp4', '/a7.mp4', '/a8.mp4'
]

function VideoCard({ video }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play()
        } else {
          videoRef.current?.pause()
        }
      },
      { threshold: 0.5 }
    )

    if (videoRef.current) {
      observer.observe(videoRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div className="video-card">
      <div className="video-preview">
        <video ref={videoRef} src={video} muted loop playsInline preload="metadata" />
        <span className="veo-badge">Veo</span>
      </div>
    </div>
  )
}

function Frame3() {
  const [page, setPage] = useState(0)
  const scrollRef = useRef(null)
  const videosPerPage = 2
  const totalPages = Math.ceil(videos.length / videosPerPage)

  const videoRows = []
  for (let i = 0; i < videos.length; i += videosPerPage) {
    videoRows.push(videos.slice(i, i + videosPerPage))
  }

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const scrollableHeight = scrollHeight - clientHeight
    if (scrollableHeight > 0) {
      const newPage = Math.round((scrollTop / scrollableHeight) * (totalPages - 1))
      if (newPage !== page) {
        setPage(newPage)
      }
    }
  }

  const goToPage = (newPage) => {
    setPage(newPage)
    if (scrollRef.current) {
      const { scrollHeight, clientHeight } = scrollRef.current
      const scrollableHeight = scrollHeight - clientHeight
      scrollRef.current.scrollTo({
        top: (newPage / (totalPages - 1)) * scrollableHeight,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div className="device-frame">
      <div className="screen">
        <header className="frame3-header">
          <div className="search-bar">
            <span>Search stories, creators</span>
          </div>
          <div className="wallet-info">
            <span className="balance">20000.056</span>
            <img src="/logo.png" alt="Mute" className="token-logo" />
            <div className="avatar">
              <img src="/pfp.jpeg" alt="Profile" />
            </div>
          </div>
        </header>

        <div className="frame3-scroll-area" ref={scrollRef} onScroll={handleScroll}>
          {videoRows.map((row, rowIndex) => (
            <div className="video-row" key={rowIndex}>
              {row.map((video) => (
                <VideoCard key={video} video={video} />
              ))}
            </div>
          ))}
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
