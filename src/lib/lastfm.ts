/**
 * Last.fm Discovery Utility
 * Used for vibe-matched recommendations without requiring Spotify Premium.
 */

const API_KEY = process.env.LASTFM_API_KEY;
const BASE_URL = "http://ws.audioscrobbler.com/2.0/";

export interface LastFmTrack {
  name: string;
  artist: {
    name: string;
    mbid?: string;
  };
  image?: string;
  match: number;
}

function getLargestImage(images: any[]): string {
  if (!images || images.length === 0) return "";
  // Last.fm images are usually sorted by size. We'll try from largest to smallest.
  const sizes = ["mega", "extralarge", "large", "medium", "small"];
  for (const size of sizes) {
    const found = images.find((i: any) => i.size === size);
    if (found && found["#text"]) return found["#text"];
  }
  // Fallback to the last available if none of our preferred sizes match
  return images[images.length - 1]?.["#text"] || "";
}

export async function getSimilarTracks(track: string, artist: string, limit: number = 10): Promise<LastFmTrack[]> {
  if (!API_KEY || API_KEY === "YOUR_LASTFM_API_KEY_HERE") {
    console.warn("Last.fm API key is missing or placeholder. Discovery will be limited.");
    return [];
  }

  const params = new URLSearchParams({
    method: "track.getSimilar",
    artist,
    track,
    api_key: API_KEY,
    format: "json",
    limit: limit.toString(),
    autocorrect: "1",
  });

  try {
    const response = await fetch(`${BASE_URL}?${params.toString()}`, {
       headers: { "User-Agent": "TrebleMakerDiscoveryApp/1.0" }
    });
    const data = await response.json();

    // If track.getSimilar fails, fallback to artist.getSimilar
    if (data.error || !data.similartracks?.track || data.similartracks.track.length === 0) {
      console.log(`Last.fm: No similar tracks for "${track}". Falling back to similar artists.`);
      return getSimilarFromArtist(artist, limit);
    }

    return data.similartracks.track.map((t: any) => ({
      name: t.name,
      artist: { name: t.artist.name },
      image: getLargestImage(t.image),
      match: parseFloat(t.match)
    }));
  } catch (error) {
    console.error("Last.fm API Error:", error);
    return [];
  }
}

async function getTopTrackForArtist(artist: string): Promise<{ name: string; image: string }> {
  const params = new URLSearchParams({
    method: "artist.getTopTracks",
    artist,
    api_key: API_KEY!,
    format: "json",
    limit: "1",
  });

  try {
    const response = await fetch(`${BASE_URL}?${params.toString()}`, {
       headers: { "User-Agent": "TrebleMakerDiscoveryApp/1.0" }
    });
    const data = await response.json();
    const track = data.toptracks?.track?.[0];
    
    if (!track) return { name: "", image: "" };
    
    return {
      name: track.name,
      image: getLargestImage(track.image)
    };
  } catch {
    return { name: "", image: "" };
  }
}

async function getSimilarFromArtist(artist: string, limit: number): Promise<LastFmTrack[]> {
  const params = new URLSearchParams({
    method: "artist.getSimilar",
    artist,
    api_key: API_KEY!,
    format: "json",
    limit: limit.toString(),
  });

  try {
    const response = await fetch(`${BASE_URL}?${params.toString()}`, {
       headers: { "User-Agent": "TrebleMakerDiscoveryApp/1.0" }
    });
    const data = await response.json();

    if (data.error || !data.similarartists?.artist) return [];

    // For each artist, we fetch their #1 top track in parallel to ensure high-quality results
    const artists = data.similarartists.artist;
    const enrichedArtists = await Promise.all(
      artists.map(async (a: any) => {
        const topTrack = await getTopTrackForArtist(a.name);
        return {
          name: topTrack.name || `${a.name} Top Track`,
          artist: { name: a.name },
          image: topTrack.image || getLargestImage(a.image),
          match: parseFloat(a.match)
        };
      })
    );

    return enrichedArtists;
  } catch {
    return [];
  }
}
