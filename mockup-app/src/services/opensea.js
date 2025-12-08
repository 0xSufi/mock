// Use backend proxy for OpenSea API calls
const BACKEND_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.VITE_API_HOST && import.meta.env.VITE_API_PORT 
    ? `http://${import.meta.env.VITE_API_HOST}:${import.meta.env.VITE_API_PORT}` 
    : 'http://localhost:3001');

// Mock NFT data for fallback when API fails - using placeholder images
const MOCK_NFTS = {
  'pudgypenguins': [
    { identifier: '1', name: 'Pudgy Penguin #1', image_url: 'https://via.placeholder.com/200/1a1a2e/00d9a0?text=Pudgy+1' },
    { identifier: '2', name: 'Pudgy Penguin #2', image_url: 'https://via.placeholder.com/200/1a1a2e/00d9a0?text=Pudgy+2' },
    { identifier: '3', name: 'Pudgy Penguin #3', image_url: 'https://via.placeholder.com/200/1a1a2e/00d9a0?text=Pudgy+3' },
    { identifier: '4', name: 'Pudgy Penguin #4', image_url: 'https://via.placeholder.com/200/1a1a2e/00d9a0?text=Pudgy+4' },
    { identifier: '5', name: 'Pudgy Penguin #5', image_url: 'https://via.placeholder.com/200/1a1a2e/00d9a0?text=Pudgy+5' },
    { identifier: '6', name: 'Pudgy Penguin #6', image_url: 'https://via.placeholder.com/200/1a1a2e/00d9a0?text=Pudgy+6' },
    { identifier: '7', name: 'Pudgy Penguin #7', image_url: 'https://via.placeholder.com/200/1a1a2e/00d9a0?text=Pudgy+7' },
    { identifier: '8', name: 'Pudgy Penguin #8', image_url: 'https://via.placeholder.com/200/1a1a2e/00d9a0?text=Pudgy+8' },
  ],
  'boredapeyachtclub': [
    { identifier: '1', name: 'BAYC #1', image_url: 'https://via.placeholder.com/200/2a2a3e/ffcc00?text=BAYC+1' },
    { identifier: '2', name: 'BAYC #2', image_url: 'https://via.placeholder.com/200/2a2a3e/ffcc00?text=BAYC+2' },
    { identifier: '3', name: 'BAYC #3', image_url: 'https://via.placeholder.com/200/2a2a3e/ffcc00?text=BAYC+3' },
    { identifier: '4', name: 'BAYC #4', image_url: 'https://via.placeholder.com/200/2a2a3e/ffcc00?text=BAYC+4' },
    { identifier: '5', name: 'BAYC #5', image_url: 'https://via.placeholder.com/200/2a2a3e/ffcc00?text=BAYC+5' },
    { identifier: '6', name: 'BAYC #6', image_url: 'https://via.placeholder.com/200/2a2a3e/ffcc00?text=BAYC+6' },
    { identifier: '7', name: 'BAYC #7', image_url: 'https://via.placeholder.com/200/2a2a3e/ffcc00?text=BAYC+7' },
    { identifier: '8', name: 'BAYC #8', image_url: 'https://via.placeholder.com/200/2a2a3e/ffcc00?text=BAYC+8' },
  ],
  'azuki': [
    { identifier: '1', name: 'Azuki #1', image_url: 'https://via.placeholder.com/200/3a1a2e/ff6b6b?text=Azuki+1' },
    { identifier: '2', name: 'Azuki #2', image_url: 'https://via.placeholder.com/200/3a1a2e/ff6b6b?text=Azuki+2' },
    { identifier: '3', name: 'Azuki #3', image_url: 'https://via.placeholder.com/200/3a1a2e/ff6b6b?text=Azuki+3' },
    { identifier: '4', name: 'Azuki #4', image_url: 'https://via.placeholder.com/200/3a1a2e/ff6b6b?text=Azuki+4' },
    { identifier: '5', name: 'Azuki #5', image_url: 'https://via.placeholder.com/200/3a1a2e/ff6b6b?text=Azuki+5' },
    { identifier: '6', name: 'Azuki #6', image_url: 'https://via.placeholder.com/200/3a1a2e/ff6b6b?text=Azuki+6' },
    { identifier: '7', name: 'Azuki #7', image_url: 'https://via.placeholder.com/200/3a1a2e/ff6b6b?text=Azuki+7' },
    { identifier: '8', name: 'Azuki #8', image_url: 'https://via.placeholder.com/200/3a1a2e/ff6b6b?text=Azuki+8' },
  ],
  'doodles-official': [
    { identifier: '1', name: 'Doodle #1', image_url: 'https://via.placeholder.com/200/1a3a2e/66ff99?text=Doodle+1' },
    { identifier: '2', name: 'Doodle #2', image_url: 'https://via.placeholder.com/200/1a3a2e/66ff99?text=Doodle+2' },
    { identifier: '3', name: 'Doodle #3', image_url: 'https://via.placeholder.com/200/1a3a2e/66ff99?text=Doodle+3' },
    { identifier: '4', name: 'Doodle #4', image_url: 'https://via.placeholder.com/200/1a3a2e/66ff99?text=Doodle+4' },
    { identifier: '5', name: 'Doodle #5', image_url: 'https://via.placeholder.com/200/1a3a2e/66ff99?text=Doodle+5' },
    { identifier: '6', name: 'Doodle #6', image_url: 'https://via.placeholder.com/200/1a3a2e/66ff99?text=Doodle+6' },
    { identifier: '7', name: 'Doodle #7', image_url: 'https://via.placeholder.com/200/1a3a2e/66ff99?text=Doodle+7' },
    { identifier: '8', name: 'Doodle #8', image_url: 'https://via.placeholder.com/200/1a3a2e/66ff99?text=Doodle+8' },
  ],
};

// Get mock NFTs for a collection (fallback)
function getMockNFTs(collectionSlug, limit) {
  const mockData = MOCK_NFTS[collectionSlug] || MOCK_NFTS['pudgypenguins'];
  return mockData.slice(0, limit);
}

// Get NFTs from a specific collection via backend proxy
export async function getNFTsByCollection(collectionSlug, limit = 20) {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/opensea/collection/${collectionSlug}/nfts?limit=${limit}`
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch NFTs');
    }
    const data = await response.json();
    return data.nfts || [];
  } catch (error) {
    console.error('OpenSea API Error (using mock data):', error);
    // Return mock data as fallback
    return getMockNFTs(collectionSlug, limit);
  }
}

export async function getTopCollections() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topCollections: true })
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch top collections');
    }
    
    const data = await response.json();
    if (data.success && data.collections) {
      return data.collections;
    }
    return [];
  } catch (error) {
    console.error('Error fetching top collections:', error);
    return [];
  }
}

// Search collections by name
export async function searchCollections(query, limit = 10) {
  try {
    // OpenSea doesn't have a direct search endpoint, so we fetch collections
    // and filter client-side, or use the collections endpoint
    const response = await fetch(
      `${BASE_URL}/collections?limit=50`,
      { headers }
    );
    if (!response.ok) throw new Error('Failed to search collections');
    const data = await response.json();

    // Filter by query
    const filtered = (data.collections || []).filter(c =>
      c.name?.toLowerCase().includes(query.toLowerCase()) ||
      c.collection?.toLowerCase().includes(query.toLowerCase())
    );

    return filtered.slice(0, limit);
  } catch (error) {
    console.error('OpenSea API Error:', error);
    return [];
  }
}

// Get NFTs by contract address
export async function getNFTsByContract(chain, contractAddress, limit = 20) {
  try {
    const response = await fetch(
      `${BASE_URL}/chain/${chain}/contract/${contractAddress}/nfts?limit=${limit}`,
      { headers }
    );
    if (!response.ok) throw new Error('Failed to fetch NFTs by contract');
    const data = await response.json();
    return data.nfts || [];
  } catch (error) {
    console.error('OpenSea API Error:', error);
    return [];
  }
}

// Get a single NFT
export async function getNFT(chain, contractAddress, identifier) {
  try {
    const response = await fetch(
      `${BASE_URL}/chain/${chain}/contract/${contractAddress}/nfts/${identifier}`,
      { headers }
    );
    if (!response.ok) throw new Error('Failed to fetch NFT');
    return await response.json();
  } catch (error) {
    console.error('OpenSea API Error:', error);
    return null;
  }
}

// Get popular PFP collections (hardcoded popular ones for demo)
export const POPULAR_PFP_COLLECTIONS = [
  'boredapeyachtclub',
  'mutant-ape-yacht-club',
  'azuki',
  'doodles-official',
  'clonex',
  'moonbirds',
  'pudgypenguins',
  'cool-cats-nft'
];

export async function getPopularPFPs(limit = 8) {
  try {
    // Fetch from a popular PFP collection
    const nfts = await getNFTsByCollection('pudgypenguins', limit);
    return nfts;
  } catch (error) {
    console.error('Error fetching popular PFPs:', error);
    return [];
  }
}
