import { useState, useEffect, useRef } from 'react'
import './App.css'
import './Frame5.css'
import { getNFTsByCollection, POPULAR_PFP_COLLECTIONS, getTopCollections } from './services/opensea'
import { getTrendingTracks, searchTracks, formatDuration } from './services/audius'

const API_URL = (() => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL
  if (import.meta.env.VITE_API_HOST) {
    const host = import.meta.env.VITE_API_HOST
    const port = import.meta.env.VITE_API_PORT
    const isLocalhost = host === 'localhost' || host === '127.0.0.1'
    const protocol = isLocalhost ? 'http' : 'https'
    if (port === '443' || port === '80' || !port) {
      return `${protocol}://${host}`
    }
    return `${protocol}://${host}:${port}`
  }
  return 'http://localhost:3001'
})()

function OpenSeaPanel({ onSelectNFT, compact = false, collection, onCollectionChange, externalNFTs = [], onClear, trendingCollections = [] }) {
  const [nfts, setNfts] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCollection, setSelectedCollection] = useState(collection || '')
  const [currentPage, setCurrentPage] = useState(0)
  const [showingExternal, setShowingExternal] = useState(false)
  const [showTrendingView, setShowTrendingView] = useState(true)
  const [trendingNFTs, setTrendingNFTs] = useState([])
  const [loadingTrending, setLoadingTrending] = useState(false)
  const itemsPerPage = compact ? 4 : 6

  // Load NFTs from trending collections (2 from each)
  useEffect(() => {
    if (showTrendingView && trendingNFTs.length === 0 && !loadingTrending) {
      const loadTrendingNFTs = async () => {
        setLoadingTrending(true)
        // Use trending collections if available, otherwise use popular collections
        const sourceCollections = trendingCollections.length > 0
          ? trendingCollections.slice(0, compact ? 2 : 3)
          : POPULAR_PFP_COLLECTIONS.slice(0, compact ? 2 : 3).map(slug => ({ collection: slug, name: slug.split('-')[0] }))

        const allNFTs = []

        for (const col of sourceCollections) {
          try {
            const slug = col.collection || col.identifier || col
            const name = col.name || slug.split('-')[0]
            const nftsFromCollection = await getNFTsByCollection(slug, 2)
            // Add collection info to each NFT
            const nftsWithCollection = nftsFromCollection.map(nft => ({
              ...nft,
              collectionSlug: slug,
              collectionName: name
            }))
            allNFTs.push(...nftsWithCollection)
          } catch (err) {
            console.error('Failed to load NFTs from', col.collection || col, err)
          }
        }

        setTrendingNFTs(allNFTs)
        setLoadingTrending(false)
      }
      loadTrendingNFTs()
    }
  }, [showTrendingView, trendingCollections, trendingNFTs.length, loadingTrending, compact])

  // Use external NFTs when provided
  useEffect(() => {
    if (externalNFTs && externalNFTs.length > 0) {
      console.log('Displaying external NFTs:', externalNFTs.length)
      setNfts(externalNFTs)
      setShowingExternal(true)
      setLoading(false)
      setCurrentPage(0)
      setShowTrendingView(false)
      // Extract collection name from the first NFT that has it
      const collectionName = externalNFTs.find(nft => nft.collection)?.collection
      if (collectionName) {
        console.log('Setting collection from external NFTs:', collectionName)
        setSelectedCollection(collectionName)
      }
    }
  }, [externalNFTs])

  // Sync with external collection prop
  useEffect(() => {
    if (collection && collection !== selectedCollection) {
      setSelectedCollection(collection)
      setCurrentPage(0)
      setShowingExternal(false)
    }
  }, [collection])

  useEffect(() => {
    if (!showingExternal && !showTrendingView && selectedCollection) {
      loadNFTs(selectedCollection)
    }
  }, [selectedCollection, showingExternal, showTrendingView])

  const loadNFTs = async (collection) => {
    setLoading(true)
    setCurrentPage(0)
    try {
      const data = await getNFTsByCollection(collection, 20)
      // Deduplicate by identifier/slug
      const seen = new Set()
      const unique = data.filter(nft => {
        const key = nft.identifier || nft.collection || nft.name
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      setNfts(unique)
    } catch (error) {
      console.error('Failed to load NFTs:', error)
    }
    setLoading(false)
  }

  // Paginated items
  const paginatedNfts = nfts.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
  const totalPages = Math.ceil(nfts.length / itemsPerPage)

  const handleSearch = (e) => {
    e.preventDefault()
    const query = searchQuery.toLowerCase().trim()
    if (!query) return

    // Reset external mode so the search triggers a load
    setShowingExternal(false)
    setShowTrendingView(false)

    // Find matching collection from popular ones
    const match = POPULAR_PFP_COLLECTIONS.find(c =>
      c.toLowerCase().includes(query)
    )

    if (match) {
      setSelectedCollection(match)
    } else {
      // Try the query as a collection slug directly
      setSelectedCollection(query)
    }
  }

  const handleCollectionChange = (newCollection) => {
    setSelectedCollection(newCollection)
    setSearchQuery('')
    setShowingExternal(false)
    setShowTrendingView(false)
    onCollectionChange?.(newCollection)
  }

  const handleClear = () => {
    setSearchQuery('')
    setShowingExternal(false)
    setSelectedCollection('')
    setCurrentPage(0)
    setShowTrendingView(true)
    setTrendingNFTs([])
    onClear?.()
  }

  // Determine which collections to show in pills
  const collectionPills = trendingCollections.length > 0
    ? trendingCollections.slice(0, 5).map(c => ({ slug: c.collection || c.identifier, name: c.name || c.collection }))
    : POPULAR_PFP_COLLECTIONS.slice(0, 4).map(c => ({ slug: c, name: c.split('-')[0] }));

  if (compact) {
    return (
      <div className="panel opensea-panel-small">
        <div className="panel-header-row">
          <h3>OpenSea</h3>
          <button className="clear-btn icon" onClick={handleClear} title="Clear search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSearch} className="search-nfts">
          <input
            type="text"
            placeholder="Search NFTs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
        <div className="collection-pills">
          {collectionPills.slice(0, 3).map(c => (
            <button
              key={c.slug}
              className={`collection-pill ${selectedCollection === c.slug ? 'active' : ''}`}
              onClick={() => handleCollectionChange(c.slug)}
              title={c.name}
            >
              {c.name.slice(0, 10)}
            </button>
          ))}
        </div>
        {showTrendingView ? (
          loadingTrending ? (
            <div className="loading-nfts">Loading...</div>
          ) : (
            <div className="nft-grid-small">
              {trendingNFTs.slice(0, 4).map((nft, index) => (
                <div
                  key={`${nft.collectionSlug}-${nft.identifier || index}`}
                  className="nft-item-small"
                  onClick={() => onSelectNFT?.(nft)}
                >
                  <div className="nft-image">
                    {nft.image_url ? (
                      <img src={nft.image_url} alt={nft.name || 'NFT'} />
                    ) : nft.display_image_url ? (
                      <img src={nft.display_image_url} alt={nft.name || 'NFT'} />
                    ) : (
                      <div className="nft-placeholder" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : loading ? (
          <div className="loading-nfts">Loading...</div>
        ) : (
          <div className="nft-grid-small">
            {nfts.slice(0, 4).map((nft, index) => (
              <div
                key={nft.identifier || index}
                className="nft-item-small"
                onClick={() => onSelectNFT?.(nft)}
              >
                <div className="nft-image">
                  {nft.image_url ? (
                    <img src={nft.image_url} alt={nft.name || 'NFT'} />
                  ) : nft.display_image_url ? (
                    <img src={nft.display_image_url} alt={nft.name || 'NFT'} />
                  ) : (
                    <div className="nft-placeholder" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="panel opensea-panel">
      <div className="panel-header-row">
        <h3>OpenSea</h3>
        <button className="clear-btn icon" onClick={handleClear} title="Clear search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>
      <form onSubmit={handleSearch} className="search-nfts">
        <input
          type="text"
          placeholder="Search NFTs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </form>
      <div className="collection-pills">
        {collectionPills.map(c => (
          <button
            key={c.slug}
            className={`collection-pill ${selectedCollection === c.slug ? 'active' : ''}`}
            onClick={() => handleCollectionChange(c.slug)}
            title={c.name}
          >
            {c.name.slice(0, 12)}
          </button>
        ))}
      </div>
      {showTrendingView ? (
        <>
          <div className="reference-header">
            <span>Trending</span>
            <span>{trendingNFTs.length} items</span>
          </div>
          {loadingTrending ? (
            <div className="loading-nfts">Loading trending...</div>
          ) : (
            <div className="nft-grid">
              {trendingNFTs.map((nft, index) => (
                <div
                  key={`${nft.collectionSlug}-${nft.identifier || index}`}
                  className="nft-item"
                  onClick={() => onSelectNFT?.(nft)}
                >
                  <div className="nft-image">
                    {nft.image_url ? (
                      <img src={nft.image_url} alt={nft.name || 'NFT'} />
                    ) : nft.display_image_url ? (
                      <img src={nft.display_image_url} alt={nft.name || 'NFT'} />
                    ) : (
                      <div className="nft-placeholder" />
                    )}
                  </div>
                  <span className="nft-collection-label" onClick={(e) => { e.stopPropagation(); handleCollectionChange(nft.collectionSlug); }}>
                    {nft.collectionName?.slice(0, 12) || 'View'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="reference-header">
            <span>Collection: <strong>{selectedCollection}</strong></span>
            <span>{nfts.length} items</span>
          </div>
          {loading ? (
            <div className="loading-nfts">Loading NFTs...</div>
          ) : (
            <>
              <div className="nft-grid">
                {paginatedNfts.map((nft, index) => (
                  <div
                    key={nft.identifier || index}
                    className="nft-item"
                    onClick={() => onSelectNFT?.(nft)}
                  >
                    <div className="nft-image">
                      {nft.image_url ? (
                        <img src={nft.image_url} alt={nft.name || 'NFT'} />
                      ) : nft.display_image_url ? (
                        <img src={nft.display_image_url} alt={nft.name || 'NFT'} />
                      ) : (
                        <div className="nft-placeholder" />
                      )}
                    </div>
                    <span>Use as Reference</span>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="page-btn"
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                  >←</button>
                  <span className="page-info">{currentPage + 1} / {totalPages}</span>
                  <button
                    className="page-btn"
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage === totalPages - 1}
                  >→</button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function Frame5({ onBack }) {
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [activeTab, setActiveTab] = useState('create')
  const [selectedReference, setSelectedReference] = useState(null)
  const [openSeaCollection, setOpenSeaCollection] = useState('')
  const [chatSidePanel, setChatSidePanel] = useState('opensea') // 'opensea' or 'veo'
  const [chatFetchedNFTs, setChatFetchedNFTs] = useState([]) // NFTs fetched via chat/MCP
  const [trendingCollections, setTrendingCollections] = useState([])

  // Load trending collections on mount
  useEffect(() => {
    const loadTrending = async () => {
      const collections = await getTopCollections()
      if (collections && collections.length > 0) {
        setTrendingCollections(collections)
      }
    }
    loadTrending()
  }, [])

  // Chat state - load from localStorage if available
  const [chatMessages, setChatMessages] = useState(() => {
    const saved = localStorage.getItem('liquid-chat-messages')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse saved messages:', e)
      }
    }
    return [{
      role: 'assistant',
      content: `Hello! I'm Liquid AI Assistant. I can help you with:
• Searching NFT collections on OpenSea
• Suggesting scenes for your video
• Rewriting prompts
• Recommending reference images
• Finding trending collections

What would you like to create today?`
    }]
  })
  const [chatInput, setChatInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  // Video generation state
  const [videoProvider, setVideoProvider] = useState('veed') // 'veo' or 'veed'
  const [veoPrompt, setVeoPrompt] = useState('Gentle subtle movement, slight head turn, natural blinking eyes')
  const [veoGenerating, setVeoGenerating] = useState(false)
  const [veoOperationId, setVeoOperationId] = useState(null)
  const [veoVideoUrl, setVeoVideoUrl] = useState(null)
  const [veoError, setVeoError] = useState(null)
  const [veoModel, setVeoModel] = useState('veo-2.0-generate-001')

  // VEED state
  const [veedGenerating, setVeedGenerating] = useState(false)
  const [veedVideoUrl, setVeedVideoUrl] = useState(null)
  const [veedError, setVeedError] = useState(null)

  // Audius state
  const [audiusTracks, setAudiusTracks] = useState([])
  const [audiusSearchQuery, setAudiusSearchQuery] = useState('')
  const [audiusLoading, setAudiusLoading] = useState(false)
  const [audiusShowSearch, setAudiusShowSearch] = useState(false)
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const [audiusPage, setAudiusPage] = useState(0)
  const audioRef = useRef(null)
  const tracksPerPage = 2

  // AbortController for cancelling chat requests
  const abortControllerRef = useRef(null)
  // History of user messages for up arrow recall - load from localStorage
  const [messageHistory, setMessageHistory] = useState(() => {
    const saved = localStorage.getItem('liquid-input-history')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse saved input history:', e)
      }
    }
    return []
  })
  const [historyIndex, setHistoryIndex] = useState(-1)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: '⏹ Generation stopped by user.'
      }])
    }
  }

  const handleInputKeyDown = (e) => {
    if (e.key === 'ArrowUp' && messageHistory.length > 0) {
      e.preventDefault()
      const newIndex = historyIndex < messageHistory.length - 1 ? historyIndex + 1 : historyIndex
      setHistoryIndex(newIndex)
      setChatInput(messageHistory[messageHistory.length - 1 - newIndex])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setChatInput(messageHistory[messageHistory.length - 1 - newIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setChatInput('')
      }
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  // Persist chat messages to localStorage
  useEffect(() => {
    localStorage.setItem('liquid-chat-messages', JSON.stringify(chatMessages))
  }, [chatMessages])

  // Persist input history to localStorage (limit to last 50)
  useEffect(() => {
    const trimmed = messageHistory.slice(-50)
    localStorage.setItem('liquid-input-history', JSON.stringify(trimmed))
  }, [messageHistory])

  // Poll for Veo video completion
  useEffect(() => {
    if (!veoOperationId || !veoGenerating) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/api/veo/status/${veoOperationId}`)
        const data = await response.json()

        if (data.status === 'completed') {
          setVeoVideoUrl(data.videoUrl)
          setVeoGenerating(false)
          setVeoOperationId(null)
        } else if (!data.success) {
          setVeoError(data.error)
          setVeoGenerating(false)
          setVeoOperationId(null)
        }
      } catch (error) {
        console.error('Veo poll error:', error)
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(pollInterval)
  }, [veoOperationId, veoGenerating])

  const generateVideo = async () => {
    if (!veoPrompt.trim() || veoGenerating) return

    setVeoGenerating(true)
    setVeoError(null)
    setVeoVideoUrl(null)

    try {
      const requestBody = {
        prompt: veoPrompt,
        model: veoModel,
      }

      // Add reference image if selected
      if (selectedReference?.image_url) {
        requestBody.referenceImage = selectedReference.image_url
      }

      const response = await fetch(`${API_URL}/api/veo/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      // Check HTTP status first
      if (!response.ok) {
        const errorMsg = data.error || `Server error: ${response.status}`
        throw new Error(errorMsg)
      }

      if (data.success) {
        setVeoOperationId(data.operationId)
      } else {
        throw new Error(data.error || 'Video generation failed')
      }
    } catch (error) {
      console.error('Veo generation error:', error)
      setVeoError(error.message || 'Failed to generate video')
      setVeoGenerating(false)
    }
  }

  const generateVeedVideo = async () => {
    if (!veoPrompt.trim() || veedGenerating) return

    if (!selectedReference?.image_url) {
      setVeedError('Please select a reference image for VEED image-to-video generation')
      return
    }

    setVeedGenerating(true)
    setVeedError(null)
    setVeedVideoUrl(null)

    try {
      const response = await fetch(`${API_URL}/api/veed/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: selectedReference.image_url,
          prompt: veoPrompt,
          aspectRatio: 'portrait',
          duration: '5',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`)
      }

      if (data.success) {
        setVeedVideoUrl(data.videoUrl)
      } else {
        throw new Error(data.error || 'Video generation failed')
      }
    } catch (error) {
      console.error('VEED generation error:', error)
      setVeedError(error.message || 'Failed to generate video')
    }

    setVeedGenerating(false)
  }

  const handleGenerateVideo = () => {
    if (videoProvider === 'veed') {
      generateVeedVideo()
    } else {
      generateVideo()
    }
  }

  const isGenerating = veoGenerating || veedGenerating
  const currentVideoUrl = videoProvider === 'veed' ? veedVideoUrl : veoVideoUrl
  const currentError = videoProvider === 'veed' ? veedError : veoError

  const handleSelectNFT = (nft) => {
    setSelectedReference(nft)
    // Add a message about the selection
    setChatMessages(prev => [...prev, {
      role: 'assistant',
      content: `Great choice! I've selected "${nft.name || `#${nft.identifier}`}" as your reference image. You can use this for style inspiration or as a visual reference for your generation.`
    }])
  }

  // Audius functions
  const loadTrendingTracks = async () => {
    setAudiusLoading(true)
    setAudiusPage(0)
    try {
      const tracks = await getTrendingTracks({ limit: 8 })
      setAudiusTracks(tracks)
    } catch (error) {
      console.error('Failed to load trending tracks:', error)
    }
    setAudiusLoading(false)
  }

  const handleAudiusSearch = async (e) => {
    e.preventDefault()
    if (!audiusSearchQuery.trim()) return
    setAudiusLoading(true)
    setAudiusPage(0)
    try {
      const tracks = await searchTracks(audiusSearchQuery, { limit: 8 })
      setAudiusTracks(tracks)
    } catch (error) {
      console.error('Failed to search tracks:', error)
    }
    setAudiusLoading(false)
  }

  const playTrack = (track) => {
    if (currentTrack?.id === track.id && isPlaying) {
      // Pause current track
      audioRef.current?.pause()
      setIsPlaying(false)
    } else {
      // Play new track or resume
      setCurrentTrack(track)
      setIsPlaying(true)
      setAudioProgress(0)
      if (audioRef.current) {
        audioRef.current.src = track.streamUrl
        audioRef.current.play().catch(err => console.error('Play error:', err))
      }
    }
  }

  const togglePlayPause = () => {
    if (!audioRef.current || !currentTrack) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(err => console.error('Play error:', err))
    }
    setIsPlaying(!isPlaying)
  }

  // Load trending tracks on mount
  useEffect(() => {
    loadTrendingTracks()
  }, [])

  // Audio progress tracking
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateProgress = () => {
      if (audio.duration) {
        setAudioProgress((audio.currentTime / audio.duration) * 100)
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setAudioProgress(0)
    }

    audio.addEventListener('timeupdate', updateProgress)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateProgress)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!chatInput.trim() || isLoading) return

    const userMessage = chatInput.trim()
    setChatInput('')
    setMessageHistory(prev => [...prev, userMessage])
    setHistoryIndex(-1)
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    // Create abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      // Format messages for Claude API
      const apiMessages = chatMessages
        .concat({ role: 'user', content: userMessage })
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }))

      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
        signal: abortControllerRef.current.signal,
      })

      const data = await response.json()
      console.log('Chat API response:', data)

      if (data.success) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: data.message,
          toolsUsed: data.toolsUsed
        }])

        // Handle actions from the response
        if (data.actions && data.actions.length > 0) {
          console.log('Processing actions:', data.actions)
          for (const action of data.actions) {
            if (action.type === 'LOAD_COLLECTION') {
              console.log('Loading collection:', action.param1)
              setOpenSeaCollection(action.param1)
            }
          }
        }

        // Handle NFTs fetched via MCP tools
        if (data.nfts && data.nfts.length > 0) {
          console.log('Received NFTs from chat:', data.nfts.length)
          setChatFetchedNFTs(data.nfts)
        }
      } else {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${data.error}. The backend API may not be running. Start it with \`npm run server\`.`
        }])
      }
    } catch (error) {
      // Don't show error message if user aborted
      if (error.name === 'AbortError') {
        console.log('Request aborted by user')
        return
      }
      console.error('Chat error:', error)
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `I couldn't connect to the backend. Make sure the API server is running on port 3001 (\`npm run server\`).`
      }])
    }

    abortControllerRef.current = null
    setIsLoading(false)
  }

  return (
    <div className="device-frame">
      <div className="screen">
        <header className="frame5-header">
          <div className="search-bar-outline">
            <span></span>
          </div>
          <div className="wallet-info">
            <span className="balance">20,000.05</span>
            <img src="/logo.png" alt="Mute" className="token-logo" />
            <div className="avatar-wrapper">
              <div className="avatar creator-avatar" onClick={() => setShowProfileModal(!showProfileModal)}>
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
                      <a href="#" className="menu-item" onClick={onBack}>Home</a>
                      <a href="#" className="menu-item">Vault</a>
                      <a href="#" className="menu-item">Following</a>
                      <a href="#" className="menu-item">Create</a>
                      <a href="#" className="menu-item">Notifications</a>
                      <a href="#" className="menu-item">Grants</a>
                    </nav>
                    <div className="profile-actions">
                      <a href="#" className="action-item">Edit</a>
                      <a href="#" className="action-item">Disconnect</a>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="creator-content">
          <div className="creator-title">
            <h1>Liquid</h1>
            <div className="creator-tabs">
              <span
                className={`tab ${activeTab === 'create' ? 'active' : ''}`}
                onClick={() => setActiveTab('create')}
              >Create</span>
              <span
                className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >Chat</span>
              <span
                className={`tab ${activeTab === 'veo' ? 'active' : ''}`}
                onClick={() => setActiveTab('veo')}
              >Veo</span>
            </div>
            {activeTab === 'chat' && (
              <button
                className="swap-btn"
                onClick={() => setChatSidePanel(p => p === 'opensea' ? 'veo' : 'opensea')}
                title={`Switch to ${chatSidePanel === 'opensea' ? 'Veo' : 'OpenSea'}`}
              >⇄</button>
            )}
          </div>

          {selectedReference && (
            <div className="selected-reference">
              <span>Reference: </span>
              <img
                src={selectedReference.image_url || selectedReference.display_image_url}
                alt="Reference"
              />
              <span>{selectedReference.name || `#${selectedReference.identifier}`}</span>
              <button onClick={() => setSelectedReference(null)}>×</button>
            </div>
          )}

          {activeTab === 'create' && (
            <div className="creator-panels">
              <div className="panel chat-panel">
                <h3>Chat</h3>
                <p className="panel-subtitle">Liquid AI Assistant</p>
                <div className="chat-messages compact">
                  {chatMessages.slice(-3).map((msg, index) => (
                    <div key={index} className={`message ${msg.role}`}>
                      {msg.role === 'assistant' && <div className="message-avatar">🤖</div>}
                      <div className="message-content">
                        <p>{msg.content.split('\n')[0].slice(0, 100)}{msg.content.length > 100 ? '...' : ''}</p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="message assistant">
                      <div className="message-avatar">🤖</div>
                      <div className="message-content">
                        <p className="typing-indicator">Thinking...</p>
                      </div>
                    </div>
                  )}
                </div>
                <form onSubmit={sendMessage} className="chat-input-area compact">
                  <input
                    type="text"
                    placeholder="Ask Liquid..."
                    className="chat-input"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    disabled={isLoading}
                  />
                  {isLoading ? (
                    <button type="button" className="stop-btn compact" onClick={stopGeneration}>⏹</button>
                  ) : (
                    <button type="submit" className="send-btn compact" disabled={!chatInput.trim()}>→</button>
                  )}
                </form>
              </div>

              <div className="panel veo-panel">
                <div className="panel-header-row">
                  <h3>Video</h3>
                  <div className="provider-toggle">
                    <button
                      className={`toggle-btn ${videoProvider === 'veed' ? 'active' : ''}`}
                      onClick={() => setVideoProvider('veed')}
                    >VEED</button>
                    <button
                      className={`toggle-btn ${videoProvider === 'veo' ? 'active' : ''}`}
                      onClick={() => setVideoProvider('veo')}
                    >Veo</button>
                  </div>
                </div>
                <textarea
                  className="veo-prompt-input"
                  value={veoPrompt}
                  onChange={(e) => setVeoPrompt(e.target.value)}
                  placeholder={videoProvider === 'veed' ? "Describe movement (e.g., gentle head turn, blinking eyes)..." : "Describe your video..."}
                  disabled={isGenerating}
                />
                <div className="veo-actions">
                  {videoProvider === 'veo' ? (
                    <select
                      className="veo-model-select"
                      value={veoModel}
                      onChange={(e) => setVeoModel(e.target.value)}
                      disabled={isGenerating}
                    >
                      <option value="veo-2.0-generate-001">Veo 2 ($2.80)</option>
                      <option value="veo-3.1-fast-generate-preview">Veo 3.1 Fast ($1.20)</option>
                    </select>
                  ) : (
                    <span className="provider-info">
                      {selectedReference ? '✓ Reference selected' : '⚠ Select an image from OpenSea'}
                    </span>
                  )}
                </div>
                <div className="veo-preview">
                  {isGenerating && (
                    <div className="veo-generating">
                      <span className="typing-indicator">
                        {videoProvider === 'veed' ? 'Generating with VEED...' : 'Generating video...'}
                      </span>
                    </div>
                  )}
                  {currentVideoUrl && (
                    <video src={currentVideoUrl} controls autoPlay loop />
                  )}
                  {currentError && (
                    <div className="veo-error">{currentError}</div>
                  )}
                </div>
                <button
                  className="generate-btn full-width"
                  onClick={handleGenerateVideo}
                  disabled={isGenerating || !veoPrompt.trim() || (videoProvider === 'veed' && !selectedReference)}
                >
                  {isGenerating ? 'Generating...' : `Generate with ${videoProvider === 'veed' ? 'VEED' : 'Veo'}`}
                </button>
              </div>

              <OpenSeaPanel
                onSelectNFT={handleSelectNFT}
                collection={openSeaCollection}
                onCollectionChange={setOpenSeaCollection}
                externalNFTs={chatFetchedNFTs}
                onClear={() => setChatFetchedNFTs([])}
                trendingCollections={trendingCollections}
              />
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="chat-layout">
              <div className="chat-interface">
                <div className="chat-messages">
                  {chatMessages.map((msg, index) => (
                    <div key={index} className={`message ${msg.role}`}>
                      {msg.role === 'assistant' && <div className="message-avatar">🤖</div>}
                      <div className="message-content">
                        {msg.content.split('\n').map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                        {msg.toolsUsed && (
                          <span className="tools-badge">Used OpenSea data</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="message assistant">
                      <div className="message-avatar">🤖</div>
                      <div className="message-content">
                        <p className="typing-indicator">Thinking...</p>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={sendMessage} className="chat-input-area">
                  <input
                    type="text"
                    placeholder={isLoading ? "Waiting for response..." : "Type your message..."}
                    className="chat-input"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    disabled={isLoading}
                  />
                  {isLoading ? (
                    <button type="button" className="stop-btn" onClick={stopGeneration}>
                      Stop
                    </button>
                  ) : (
                    <button type="submit" className="send-btn" disabled={!chatInput.trim()}>
                      Send
                    </button>
                  )}
                </form>
              </div>
              <div className="side-panels">
                {chatSidePanel === 'opensea' ? (
                  <OpenSeaPanel
                    onSelectNFT={handleSelectNFT}
                    compact={true}
                    collection={openSeaCollection}
                    onCollectionChange={setOpenSeaCollection}
                    externalNFTs={chatFetchedNFTs}
                    onClear={() => setChatFetchedNFTs([])}
                    trendingCollections={trendingCollections}
                  />
                ) : (
                  <div className="panel veo-panel">
                    <div className="panel-header-row">
                      <h3>Video</h3>
                      <div className="provider-toggle">
                        <button
                          className={`toggle-btn ${videoProvider === 'veed' ? 'active' : ''}`}
                          onClick={() => setVideoProvider('veed')}
                        >VEED</button>
                        <button
                          className={`toggle-btn ${videoProvider === 'veo' ? 'active' : ''}`}
                          onClick={() => setVideoProvider('veo')}
                        >Veo</button>
                      </div>
                    </div>
                    <textarea
                      className="veo-prompt-input"
                      value={veoPrompt}
                      onChange={(e) => setVeoPrompt(e.target.value)}
                      placeholder={videoProvider === 'veed' ? "Describe movement..." : "Describe your video..."}
                      disabled={isGenerating}
                    />
                    <div className="veo-actions">
                      {videoProvider === 'veo' ? (
                        <select
                          className="veo-model-select"
                          value={veoModel}
                          onChange={(e) => setVeoModel(e.target.value)}
                          disabled={isGenerating}
                        >
                          <option value="veo-2.0-generate-001">Veo 2</option>
                          <option value="veo-3.1-fast-generate-preview">Veo 3.1 Fast</option>
                        </select>
                      ) : (
                        <span className="provider-info">
                          {selectedReference ? '✓ Reference' : '⚠ Select image'}
                        </span>
                      )}
                    </div>
                    <div className="veo-preview">
                      {isGenerating && (
                        <div className="veo-generating">
                          <span className="typing-indicator">Generating...</span>
                        </div>
                      )}
                      {currentVideoUrl && (
                        <video src={currentVideoUrl} controls autoPlay loop />
                      )}
                      {currentError && (
                        <div className="veo-error">{currentError}</div>
                      )}
                    </div>
                    <button
                      className="generate-btn full-width"
                      onClick={handleGenerateVideo}
                      disabled={isGenerating || !veoPrompt.trim() || (videoProvider === 'veed' && !selectedReference)}
                    >
                      {isGenerating ? 'Generating...' : `Generate`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'veo' && (
            <div className="creator-panels single-panel">
              <div className="panel veo-panel-full">
                <h3>Veo Video Generation</h3>
                <div className="veo-prompt">
                  <p>A lone wanderer gazes at distant mountains beneath a cloudy sky.</p>
                </div>
                <div className="veo-actions">
                  <button className="veo-btn">+ Add Reference</button>
                  <button className="veo-btn">+ Add Scene</button>
                </div>
                <div className="veo-preview-large"></div>
                <div className="scene-tabs">
                  <span className="scene-tab active">Scene 1</span>
                  <span className="scene-tab">Scene 2</span>
                  <span className="scene-tab">Scene 3</span>
                </div>
                <button className="generate-btn full-width">Generate Video</button>
              </div>
            </div>
          )}

          <div className="audius-bar">
            <audio ref={audioRef} />
            <div className="audius-left">
              <div className="audius-logo" onClick={() => setAudiusShowSearch(!audiusShowSearch)}>
                <span>🎵</span>
                <span>audius</span>
              </div>
              {audiusShowSearch ? (
                <form onSubmit={handleAudiusSearch} className="audius-search">
                  <input
                    type="text"
                    placeholder="Search tracks..."
                    value={audiusSearchQuery}
                    onChange={(e) => setAudiusSearchQuery(e.target.value)}
                  />
                  <button type="submit">🔍</button>
                </form>
              ) : (
                <button className="audius-trending-btn" onClick={loadTrendingTracks}>
                  Trending
                </button>
              )}
            </div>

            <div className="audius-tracks">
              {audiusLoading ? (
                <span className="audius-loading">Loading...</span>
              ) : (
                <>
                  <button
                    className="audius-nav-btn"
                    onClick={() => setAudiusPage(p => Math.max(0, p - 1))}
                    disabled={audiusPage === 0}
                  >←</button>
                  {audiusTracks.slice(audiusPage * tracksPerPage, (audiusPage + 1) * tracksPerPage).map((track) => (
                    <div
                      key={track.id}
                      className={`audius-track ${currentTrack?.id === track.id ? 'active' : ''}`}
                      onClick={() => playTrack(track)}
                    >
                      <div className="track-meta">
                        <span className="track-title">{track.title?.slice(0, 20)}{track.title?.length > 20 ? '...' : ''}</span>
                        <span className="track-artist">{track.artist?.slice(0, 15)}</span>
                      </div>
                      <span className="track-play-icon">
                        {currentTrack?.id === track.id && isPlaying ? '⏸' : '▶'}
                      </span>
                    </div>
                  ))}
                  <button
                    className="audius-nav-btn"
                    onClick={() => setAudiusPage(p => Math.min(Math.ceil(audiusTracks.length / tracksPerPage) - 1, p + 1))}
                    disabled={audiusPage >= Math.ceil(audiusTracks.length / tracksPerPage) - 1}
                  >→</button>
                </>
              )}
            </div>

            {currentTrack && (
              <div className="audius-player">
                <button className="player-btn" onClick={togglePlayPause}>
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <div className="player-info">
                  <span className="player-title">{currentTrack.title}</span>
                  <div className="player-progress">
                    <div className="progress-bar" style={{ width: `${audioProgress}%` }} />
                  </div>
                </div>
                <span className="player-duration">{formatDuration(currentTrack.duration)}</span>
              </div>
            )}

            <button className="publish-btn">Publish</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Frame5
