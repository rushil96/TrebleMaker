/**
 * Spotify Public API Utility
 * Uses "Client Credentials Flow" for public data (Search, Artist/Track Metadata)
 * Expanded to support User Access Tokens for context-aware discovery.
 */

interface SpotifyPublicToken {
  access_token: string;
  expires_in: number;
}

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export async function getSpotifyPublicToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  const authOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
    },
    body: "grant_type=client_credentials",
  };

  const response = await fetch("https://accounts.spotify.com/api/token", authOptions);
  const data: SpotifyPublicToken = await response.json();

  if (!data.access_token) {
    throw new Error("Failed to obtain Spotify public token");
  }

  cachedToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000 - 60000;

  return cachedToken;
}

export async function getTrackById(id: string, userToken?: string) {
  const token = userToken || await getSpotifyPublicToken();
  if (!token) return null;

  const res = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) return null;
  return await res.json();
}

export async function getTrackMetadata(name: string, artist: string, userToken?: string) {
  const token = userToken || await getSpotifyPublicToken();
  if (!token) return null;

  // Use track/artist filters for higher accuracy
  const query = `track:${name} artist:${artist}`;
  const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!res.ok) return null;
  const data = await res.json();
  return data.tracks?.items?.[0] || null;
}

export async function getFirstTrackFromPlaylist(playlistId: string, userToken?: string) {
  const token = userToken || await getSpotifyPublicToken();
  if (!token) return null;

  const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=1`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  
  if (!res.ok) return null;
  const data = await res.json();
  return data.items?.[0]?.track || null;
}
