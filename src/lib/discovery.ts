import SpotifyWebApi from "spotify-web-api-node";

interface DiscoverySeed {
  type: "track" | "artist" | "genre";
  id: string;
}

export async function getRecommendations(accessToken: string, seed: DiscoverySeed) {
  const spotifyApi = new SpotifyWebApi();
  spotifyApi.setAccessToken(accessToken);

  try {
    // 1. Fetch recommendations based on the seed
    const recommendations = await spotifyApi.getRecommendations({
      limit: 10,
      seed_tracks: seed.type === "track" ? [seed.id] : undefined,
      seed_artists: seed.type === "artist" ? [seed.id] : undefined,
      seed_genres: seed.type === "genre" ? [seed.id] : undefined,
    });

    return recommendations.body.tracks;
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return [];
  }
}

export function parseDiscoveryLink(url: string) {
  // Spotify Track Regex
  const spotifyTrackMatch = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
  if (spotifyTrackMatch) return { type: "spotify", id: spotifyTrackMatch[1] };

  // Spotify Playlist Regex
  const spotifyPlaylistMatch = url.match(/spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
  if (spotifyPlaylistMatch) return { type: "spotify_playlist", id: spotifyPlaylistMatch[1] };

  // YouTube Video Regex
  const youtubeVideoMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
  if (youtubeVideoMatch) return { type: "youtube", id: youtubeVideoMatch[1] };

  // YouTube Playlist Regex
  const youtubePlaylistMatch = url.match(/(?:youtube\.com\/playlist\?list=)([a-zA-Z0-9_-]+)/);
  if (youtubePlaylistMatch) return { type: "youtube_playlist", id: youtubePlaylistMatch[1] };

  return null;
}

export async function findSpotifyTrackByYoutubeTitle(accessToken: string, title: string) {
  const spotifyApi = new SpotifyWebApi();
  spotifyApi.setAccessToken(accessToken);

  try {
    // Clean up title (remove "Official Video", "Lyrics", etc.)
    const cleanTitle = title.replace(/\(.*\)|\[.*\]|Official|Video|Audio/gi, "").trim();
    const searchResult = await spotifyApi.searchTracks(cleanTitle, { limit: 1 });
    return searchResult.body.tracks?.items[0] || null;
  } catch (error) {
    console.error("Error searching Spotify by YouTube title:", error);
    return null;
  }
}
