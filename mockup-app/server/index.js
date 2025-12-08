import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { GoogleGenAI } from '@google/genai';
import { getVeedService, initVeedService } from './veed-service.js';

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from public directory (for downloaded videos)
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/videos', express.static(path.join(__dirname, '../public/videos')));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENSEA_BEARER_TOKEN = process.env.OPENSEA_BEARER_TOKEN;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Initialize Google GenAI client for Veo
const googleAI = GOOGLE_API_KEY ? new GoogleGenAI({ apiKey: GOOGLE_API_KEY }) : null;

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

// Create OpenSea MCP client
async function createOpenSeaMCPClient() {
  const transport = new SSEClientTransport(
    new URL('https://mcp.opensea.io/sse'),
    {
      requestInit: {
        headers: {
          'Authorization': `Bearer ${OPENSEA_BEARER_TOKEN}`,
        },
      },
    }
  );

  const client = new Client({
    name: 'mute-app',
    version: '1.0.0',
  });

  await client.connect(transport);
  return client;
}

// Convert MCP tools to Claude tool format
function mcpToolsToClaudeTools(mcpTools) {
  return mcpTools.map(tool => ({
    name: tool.name,
    description: tool.description || '',
    input_schema: tool.inputSchema || { type: 'object', properties: {} },
  }));
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, useOpenSeaMCP = true } = req.body;

    let mcpClient = null;
    let tools = [];
    let mcpTools = [];

    // Connect to OpenSea MCP if enabled
    if (useOpenSeaMCP && OPENSEA_BEARER_TOKEN) {
      try {
        mcpClient = await createOpenSeaMCPClient();
        const toolsResult = await mcpClient.listTools();
        mcpTools = toolsResult.tools || [];
        tools = mcpToolsToClaudeTools(mcpTools);
        console.log(`Loaded ${tools.length} OpenSea MCP tools`);
      } catch (mcpError) {
        console.error('Failed to connect to OpenSea MCP:', mcpError);
        // Continue without MCP tools
      }
    }

    // System prompt for Liquid AI Assistant
    const systemPrompt = `You are Liquid, an AI assistant specialized in NFTs, crypto tokens, and creative content generation for the MUTE platform.

Your capabilities include:
- Searching and recommending NFT collections from OpenSea
- Analyzing NFT trends and pricing data
- Suggesting creative scenes for video generation
- Helping users find reference images for their projects
- Providing information about crypto tokens and wallets

IMPORTANT - TOOL USAGE:
- To load/display individual NFTs from a collection, use the "search_items" tool with the collection slug. This returns actual NFT images.
- Use "get_collections" only for collection metadata (floor price, stats, etc.), not for displaying NFT images.
- Use "search_items" with collection parameter to get individual NFT items with images.

When users ask about NFTs or want to see items from a collection, use search_items to get real NFT images that can be displayed.

Be helpful, concise, and focus on actionable suggestions for creative projects.`;

    // Initial Claude request
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      tools: tools.length > 0 ? tools : undefined,
      messages: messages,
    });

    // Handle tool use in a loop
    let conversationMessages = [...messages];
    let currentResponse = response;
    let fetchedNFTs = []; // Store NFTs fetched via MCP tools

    while (currentResponse.stop_reason === 'tool_use') {
      const toolUseBlocks = currentResponse.content.filter(block => block.type === 'tool_use');

      // Add assistant's response with tool calls to conversation
      conversationMessages.push({
        role: 'assistant',
        content: currentResponse.content,
      });

      // Execute each tool call via MCP
      const toolResults = [];
      for (const toolUse of toolUseBlocks) {
        try {
          console.log(`Calling MCP tool: ${toolUse.name}`, toolUse.input);
          const result = await mcpClient.callTool({
            name: toolUse.name,
            arguments: toolUse.input,
          });

          // Extract NFT/collection data from tool results
          if (result.content && Array.isArray(result.content)) {
            for (const item of result.content) {
              if (item.type === 'text' && item.text) {
                try {
                  const parsed = JSON.parse(item.text);
                  console.log('Parsing MCP result, keys:', Object.keys(parsed));

                  // Handle search_items response (array of items)
                  if (parsed.results && Array.isArray(parsed.results)) {
                    console.log('Found results array with', parsed.results.length, 'items');
                    for (const nft of parsed.results) {
                      fetchedNFTs.push({
                        identifier: nft.id || nft.identifier || nft.tokenId,
                        name: nft.name || nft.metadata?.name || `#${nft.id}`,
                        image_url: nft.imageUrl || nft.image_url || nft.metadata?.imageUrl,
                        collection: nft.collection?.slug || nft.collectionSlug || nft.collection,
                      });
                    }
                  }

                  // Handle items/NFTs response (direct items array)
                  if (parsed.items || parsed.nfts) {
                    const items = parsed.items || parsed.nfts || [];
                    console.log('Found items/nfts array with', items.length, 'items');
                    for (const nft of items) {
                      fetchedNFTs.push({
                        identifier: nft.id || nft.identifier || nft.tokenId,
                        name: nft.name || nft.metadata?.name || `#${nft.id}`,
                        image_url: nft.imageUrl || nft.image_url || nft.metadata?.imageUrl,
                        collection: nft.collection?.slug || nft.collectionSlug || nft.collection,
                      });
                    }
                  }

                  // Handle collections response (for collection metadata)
                  if (parsed.collections && !parsed.results) {
                    for (const col of parsed.collections) {
                      // Only add if we don't have items already
                      if (fetchedNFTs.length === 0) {
                        fetchedNFTs.push({
                          identifier: col.slug,
                          name: col.name || col.slug,
                          image_url: col.imageUrl,
                          collection: col.slug,
                          floor_price: col.floorPrice?.pricePerItem?.native?.unit,
                          description: col.description?.slice(0, 100),
                        });
                      }
                    }
                  }

                  // Handle trendingCollections response from get_trending_collections
                  if (parsed.trendingCollections && Array.isArray(parsed.trendingCollections)) {
                    console.log('Found trendingCollections with', parsed.trendingCollections.length, 'items');
                    for (const col of parsed.trendingCollections) {
                      fetchedNFTs.push({
                        identifier: col.slug || col.collectionSlug,
                        name: col.name || col.slug,
                        image_url: col.imageUrl || col.image_url,
                        collection: col.slug || col.collectionSlug,
                        floor_price: col.floorPrice?.native?.unit,
                      });
                    }
                  }

                  // Handle itemsByQuery response from search_items
                  if (parsed.itemsByQuery && Array.isArray(parsed.itemsByQuery)) {
                    console.log('Found itemsByQuery with', parsed.itemsByQuery.length, 'items');
                    for (const nft of parsed.itemsByQuery) {
                      fetchedNFTs.push({
                        identifier: nft.id || nft.identifier || nft.tokenId,
                        name: nft.name || nft.metadata?.name || `#${nft.id || nft.identifier}`,
                        image_url: nft.imageUrl || nft.image_url || nft.metadata?.imageUrl,
                        collection: nft.collection?.slug || nft.collectionSlug || nft.collection,
                      });
                    }
                  }
                } catch (e) {
                  console.log('Parse error:', e.message);
                }
              }
            }
          }

          // Truncate large results to avoid overwhelming the model
          let resultContent = JSON.stringify(result.content);
          if (resultContent.length > 10000) {
            resultContent = resultContent.slice(0, 10000) + '... [truncated]';
          }
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: resultContent,
          });
        } catch (toolError) {
          console.error(`Tool ${toolUse.name} failed:`, toolError);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify({ error: toolError.message }),
            is_error: true,
          });
        }
      }

      // Add tool results as user message
      conversationMessages.push({
        role: 'user',
        content: toolResults,
      });

      // Continue conversation with tool results
      currentResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        tools: tools,
        messages: conversationMessages,
      });
    }

    console.log(`Fetched ${fetchedNFTs.length} NFTs via MCP tools`);

    // Close MCP client
    if (mcpClient) {
      await mcpClient.close();
    }

    // Extract text response
    let textContent = currentResponse.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    // Check if tools were used (conversation grew beyond original messages)
    const toolsWereUsed = conversationMessages.length > messages.length;

    // Parse actions from the response
    const actions = [];
    const actionRegex = /\[ACTION:(\w+):([^\]:]+):?(\d+)?\]/g;
    let match;
    while ((match = actionRegex.exec(textContent)) !== null) {
      actions.push({
        type: match[1],
        param1: match[2],
        param2: match[3] ? parseInt(match[3]) : null,
      });
    }

    // Remove action blocks from displayed message
    textContent = textContent.replace(/\[ACTION:[^\]]+\]/g, '').trim();

    console.log('Chat response - actions:', actions, 'fetchedNFTs:', fetchedNFTs.length);

    res.json({
      success: true,
      message: textContent,
      toolsUsed: toolsWereUsed,
      actions: actions,
      nfts: fetchedNFTs, // NFTs fetched via MCP tools
      fullResponse: currentResponse,
    });

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasAnthropicKey: !!ANTHROPIC_API_KEY,
    hasOpenSeaToken: !!OPENSEA_BEARER_TOKEN,
  });
});

// Popular PFP collections
const POPULAR_COLLECTIONS = ['pudgypenguins', 'boredapeyachtclub', 'azuki', 'doodles-official', 'cryptopunks', 'milady', 'degods'];

// Proxy endpoint for OpenSea NFTs - uses MCP tools
app.get('/api/opensea/collection/:slug/nfts', async (req, res) => {
  let mcpClient = null;
  try {
    const { slug } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    // Connect to OpenSea MCP
    mcpClient = await createOpenSeaMCPClient();

    // Use get_collections with popular slugs to get their images
    const slugsToFetch = slug === 'trending' ? POPULAR_COLLECTIONS.slice(0, limit) : [slug, ...POPULAR_COLLECTIONS.slice(0, limit - 1)];

    const result = await mcpClient.callTool({
      name: 'get_collections',
      arguments: {
        slugs: slugsToFetch,
        includes: ['basic_stats'],
      },
    });

    console.log('MCP get_collections result:', JSON.stringify(result, null, 2).slice(0, 3000));

    await mcpClient.close();

    // Parse the result
    const content = result.content;
    let nfts = [];

    if (Array.isArray(content)) {
      for (const item of content) {
        if (item.type === 'text' && item.text) {
          try {
            const parsed = JSON.parse(item.text);
            console.log('Parsed response keys:', Object.keys(parsed));

            // Handle collections array
            const collections = parsed.collections || [];
            console.log(`Found ${collections.length} collections`);

            for (const col of collections.slice(0, limit)) {
              nfts.push({
                identifier: col.slug,
                name: col.name || col.slug,
                image_url: col.imageUrl,
                display_image_url: col.imageUrl,
                collection: col.slug,
                floor_price: col.stats?.floorPrice?.native?.unit,
              });
            }
          } catch (e) {
            console.log('Parse error:', e.message);
          }
        }
      }
    }

    console.log(`Returning ${nfts.length} NFTs`);
    res.json({ nfts });
  } catch (error) {
    console.error('OpenSea MCP proxy error:', error);
    if (mcpClient) {
      try { await mcpClient.close(); } catch (e) {}
    }
    res.status(500).json({ error: error.message });
  }
});

// Get available OpenSea MCP tools
app.get('/api/tools', async (req, res) => {
  try {
    if (!OPENSEA_BEARER_TOKEN) {
      return res.json({ tools: [], message: 'OpenSea token not configured' });
    }

    const mcpClient = await createOpenSeaMCPClient();
    const toolsResult = await mcpClient.listTools();
    await mcpClient.close();

    res.json({
      tools: toolsResult.tools || [],
      count: toolsResult.tools?.length || 0,
    });
  } catch (error) {
    console.error('Failed to get tools:', error);
    res.status(500).json({ error: error.message });
  }
});

// Store pending Veo operations
const veoOperations = new Map();

// Veo video generation endpoint
app.post('/api/veo/generate', async (req, res) => {
  try {
    if (!googleAI) {
      return res.status(400).json({
        success: false,
        error: 'Google API key not configured. Add GOOGLE_API_KEY to .env'
      });
    }

    const { prompt, referenceImage, model = 'veo-2.0-generate-001' } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    console.log(`Starting Veo generation with model: ${model}`);
    console.log(`Prompt: ${prompt}`);

    // Start video generation
    const generateConfig = {
      model: model,
      prompt: prompt,
    };

    // Add reference image if provided (image-to-video)
    if (referenceImage) {
      generateConfig.image = {
        imageUri: referenceImage,
      };
    }

    const operation = await googleAI.models.generateVideos(generateConfig);

    // Store operation for polling
    const operationId = operation.name || `op_${Date.now()}`;
    veoOperations.set(operationId, {
      operation,
      status: 'processing',
      createdAt: Date.now(),
    });

    console.log(`Veo operation started: ${operationId}`);

    res.json({
      success: true,
      operationId: operationId,
      status: 'processing',
      message: 'Video generation started. Poll /api/veo/status/:operationId for results.',
    });

  } catch (error) {
    console.error('Veo generation error:', error);

    // Extract error message from various error formats (Google API can nest errors)
    let errorMessage = 'Video generation failed';
    if (error.message) {
      errorMessage = error.message;
    }
    if (error.error?.message) {
      errorMessage = error.error.message;
    }
    if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    }

    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

// Check Veo operation status
app.get('/api/veo/status/:operationId', async (req, res) => {
  try {
    if (!googleAI) {
      return res.status(400).json({
        success: false,
        error: 'Google API key not configured'
      });
    }

    const { operationId } = req.params;
    const stored = veoOperations.get(operationId);

    if (!stored) {
      return res.status(404).json({
        success: false,
        error: 'Operation not found'
      });
    }

    // Poll the operation
    const operation = await googleAI.operations.getVideosOperation(stored.operation);

    if (operation.done) {
      // Video is ready
      const videos = operation.response?.generatedVideos || [];
      const videoUrl = videos[0]?.video?.uri || null;

      // Clean up stored operation
      veoOperations.delete(operationId);

      console.log(`Veo operation ${operationId} completed. Video URL: ${videoUrl}`);

      res.json({
        success: true,
        status: 'completed',
        videoUrl: videoUrl,
        videos: videos,
      });
    } else {
      res.json({
        success: true,
        status: 'processing',
        message: 'Video is still being generated...',
      });
    }

  } catch (error) {
    console.error('Veo status check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Veo health check
app.get('/api/veo/health', (req, res) => {
  res.json({
    available: !!googleAI,
    hasApiKey: !!GOOGLE_API_KEY,
    pendingOperations: veoOperations.size,
  });
});

// ============= VEED.io API Endpoints =============

// Store Veed service state
let veedServiceReady = false;
let veedInitializing = false;

// Initialize Veed service on startup (async, non-blocking)
async function initializeVeedService() {
  if (veedInitializing) return;
  veedInitializing = true;

  try {
    console.log('Initializing Veed.io service...');
    veedServiceReady = await initVeedService();
    console.log('Veed.io service ready:', veedServiceReady);
  } catch (error) {
    console.error('Failed to initialize Veed.io service:', error.message);
    veedServiceReady = false;
  }
  veedInitializing = false;
}

// Veed health check
app.get('/api/veed/health', async (req, res) => {
  try {
    const service = await getVeedService();
    const status = await service.getAuthStatus();

    res.json({
      available: veedServiceReady,
      authenticated: status.authenticated,
      browserConnected: status.browserConnected,
      initializing: veedInitializing,
    });
  } catch (error) {
    res.json({
      available: false,
      authenticated: false,
      browserConnected: false,
      initializing: veedInitializing,
      error: error.message,
    });
  }
});

// Initialize Veed service manually
app.post('/api/veed/init', async (req, res) => {
  try {
    if (veedServiceReady) {
      return res.json({ success: true, message: 'Veed service already initialized' });
    }

    await initializeVeedService();

    res.json({
      success: veedServiceReady,
      message: veedServiceReady ? 'Veed service initialized' : 'Failed to initialize',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Generate video from image using Veed.io
app.post('/api/veed/generate', async (req, res) => {
  try {
    const { imageUrl, prompt, aspectRatio, duration } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ success: false, error: 'imageUrl is required' });
    }

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'prompt is required' });
    }

    // Initialize service if needed
    if (!veedServiceReady) {
      console.log('Veed service not ready, initializing...');
      await initializeVeedService();

      if (!veedServiceReady) {
        return res.status(503).json({
          success: false,
          error: 'Veed service not available. Check authentication.',
        });
      }
    }

    const service = await getVeedService();
    const result = await service.generateVideo(imageUrl, prompt, { aspectRatio, duration });

    // Return local URL for serving the video
    const localVideoUrl = result.localPath
      ? `http://localhost:${PORT}${result.localPath}`
      : result.videoUrl;

    res.json({
      success: true,
      videoUrl: localVideoUrl,
      cdnUrl: result.videoUrl,
    });

  } catch (error) {
    console.error('Veed generate error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============= Audius API Endpoints =============

const AUDIUS_API_KEY = process.env.AUDIUS_API_KEY;
const AUDIUS_BASE_URL = 'https://api.audius.co/v1';

// Get trending tracks
app.get('/api/audius/trending', async (req, res) => {
  try {
    const { genre, time = 'week', limit = 10 } = req.query;
    const params = new URLSearchParams({
      app_name: 'MUTE',
      limit: limit.toString(),
      time,
    });
    if (genre) params.append('genre', genre);
    if (AUDIUS_API_KEY) params.append('api_key', AUDIUS_API_KEY);

    const response = await fetch(`${AUDIUS_BASE_URL}/tracks/trending?${params}`);
    const data = await response.json();

    if (data.data) {
      const tracks = data.data.map(track => {
        // Handle artwork - can be object with sizes or direct URL
        let artworkUrl = null;
        if (track.artwork) {
          if (typeof track.artwork === 'string') {
            artworkUrl = track.artwork;
          } else {
            artworkUrl = track.artwork['480x480'] || track.artwork['150x150'] || track.artwork['1000x1000'];
          }
        }
        // Fallback to cover_art if artwork is not available
        if (!artworkUrl && track.cover_art_sizes) {
          artworkUrl = track.cover_art_sizes['480x480'] || track.cover_art_sizes['150x150'];
        }

        return {
          id: track.id,
          title: track.title,
          artist: track.user?.name || 'Unknown Artist',
          artistHandle: track.user?.handle,
          duration: track.duration,
          artwork: artworkUrl,
          genre: track.genre,
          mood: track.mood,
          playCount: track.play_count,
          streamUrl: `${AUDIUS_BASE_URL}/tracks/${track.id}/stream?app_name=MUTE`,
        };
      });
      console.log('Audius trending - first track artwork:', tracks[0]?.artwork);
      res.json({ success: true, tracks });
    } else {
      res.json({ success: false, error: 'No data returned' });
    }
  } catch (error) {
    console.error('Audius trending error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search tracks
app.get('/api/audius/search', async (req, res) => {
  try {
    const { q, genre, mood, limit = 10 } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
    }

    const params = new URLSearchParams({
      app_name: 'MUTE',
      query: q,
      limit: limit.toString(),
    });
    if (genre) params.append('genre', genre);
    if (mood) params.append('mood', mood);
    if (AUDIUS_API_KEY) params.append('api_key', AUDIUS_API_KEY);

    const response = await fetch(`${AUDIUS_BASE_URL}/tracks/search?${params}`);
    const data = await response.json();

    if (data.data) {
      const tracks = data.data.map(track => {
        // Handle artwork - can be object with sizes or direct URL
        let artworkUrl = null;
        if (track.artwork) {
          if (typeof track.artwork === 'string') {
            artworkUrl = track.artwork;
          } else {
            artworkUrl = track.artwork['480x480'] || track.artwork['150x150'] || track.artwork['1000x1000'];
          }
        }
        // Fallback to cover_art if artwork is not available
        if (!artworkUrl && track.cover_art_sizes) {
          artworkUrl = track.cover_art_sizes['480x480'] || track.cover_art_sizes['150x150'];
        }

        return {
          id: track.id,
          title: track.title,
          artist: track.user?.name || 'Unknown Artist',
          artistHandle: track.user?.handle,
          duration: track.duration,
          artwork: artworkUrl,
          genre: track.genre,
          mood: track.mood,
          playCount: track.play_count,
          streamUrl: `${AUDIUS_BASE_URL}/tracks/${track.id}/stream?app_name=MUTE`,
        };
      });
      res.json({ success: true, tracks });
    } else {
      res.json({ success: false, error: 'No data returned' });
    }
  } catch (error) {
    console.error('Audius search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get track by ID
app.get('/api/audius/track/:trackId', async (req, res) => {
  try {
    const { trackId } = req.params;
    const params = new URLSearchParams({ app_name: 'MUTE' });
    if (AUDIUS_API_KEY) params.append('api_key', AUDIUS_API_KEY);

    const response = await fetch(`${AUDIUS_BASE_URL}/tracks/${trackId}?${params}`);
    const data = await response.json();

    if (data.data) {
      const track = data.data;

      // Handle artwork - can be object with sizes or direct URL
      let artworkUrl = null;
      if (track.artwork) {
        if (typeof track.artwork === 'string') {
          artworkUrl = track.artwork;
        } else {
          artworkUrl = track.artwork['480x480'] || track.artwork['150x150'] || track.artwork['1000x1000'];
        }
      }
      if (!artworkUrl && track.cover_art_sizes) {
        artworkUrl = track.cover_art_sizes['480x480'] || track.cover_art_sizes['150x150'];
      }

      res.json({
        success: true,
        track: {
          id: track.id,
          title: track.title,
          artist: track.user?.name || 'Unknown Artist',
          artistHandle: track.user?.handle,
          duration: track.duration,
          artwork: artworkUrl,
          genre: track.genre,
          mood: track.mood,
          playCount: track.play_count,
          streamUrl: `${AUDIUS_BASE_URL}/tracks/${track.id}/stream?app_name=MUTE`,
        },
      });
    } else {
      res.status(404).json({ success: false, error: 'Track not found' });
    }
  } catch (error) {
    console.error('Audius track error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Audius health check
app.get('/api/audius/health', (req, res) => {
  res.json({
    available: true,
    hasApiKey: !!AUDIUS_API_KEY,
    baseUrl: AUDIUS_BASE_URL,
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log(`Anthropic API: ${ANTHROPIC_API_KEY ? 'configured' : 'NOT SET'}`);
  console.log(`OpenSea MCP: ${OPENSEA_BEARER_TOKEN ? 'configured' : 'NOT SET'}`);
  console.log(`Google Veo API: ${GOOGLE_API_KEY ? 'configured' : 'NOT SET'}`);
  console.log(`Veed.io: available (POST /api/veed/init to initialize)`);
});
