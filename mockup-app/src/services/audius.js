const API_URL = 'http://localhost:3001'

export async function getTrendingTracks(options = {}) {
  const { genre, time = 'week', limit = 10 } = options
  const params = new URLSearchParams({ limit: limit.toString(), time })
  if (genre) params.append('genre', genre)

  const response = await fetch(`${API_URL}/api/audius/trending?${params}`)
  const data = await response.json()

  if (data.success) {
    return data.tracks
  }
  throw new Error(data.error || 'Failed to fetch trending tracks')
}

export async function searchTracks(query, options = {}) {
  const { genre, mood, limit = 10 } = options
  const params = new URLSearchParams({ q: query, limit: limit.toString() })
  if (genre) params.append('genre', genre)
  if (mood) params.append('mood', mood)

  const response = await fetch(`${API_URL}/api/audius/search?${params}`)
  const data = await response.json()

  if (data.success) {
    return data.tracks
  }
  throw new Error(data.error || 'Failed to search tracks')
}

export async function getTrack(trackId) {
  const response = await fetch(`${API_URL}/api/audius/track/${trackId}`)
  const data = await response.json()

  if (data.success) {
    return data.track
  }
  throw new Error(data.error || 'Failed to fetch track')
}

export function formatDuration(seconds) {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
