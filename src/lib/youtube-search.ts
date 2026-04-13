import { google } from "googleapis";

/**
 * YouTube Search Utility for Discovery Enrichment
 * Used to find thumbnails and video links for vibe-matched tracks.
 */

export interface YouTubeEnrichment {
  id: string;
  name: string;
  artist: string;
  albumArt: string;
  url: string;
}

export async function searchYouTubeTrack(accessToken: string, trackName: string, artistName: string): Promise<YouTubeEnrichment | null> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const youtube = google.youtube({ version: "v3", auth });

  const query = `${trackName} ${artistName} audio`;

  try {
    const response = await youtube.search.list({
      part: ["snippet"],
      q: query,
      type: ["video"],
      maxResults: 5,
      videoCategoryId: "10", // Music category
    });

    const items = response.data.items || [];
    if (items.length === 0) return null;

    // AUDIO-ONLY METHOD:
    // Prioritize purely audio videos (YouTube 'Topic' channels or 'Audio'/'Lyric' videos)
    // to drastically reduce VEVO Error 150 embedding restrictions.
    let bestItem = items[0];
    
    for (const item of items) {
      const title = item.snippet?.title?.toLowerCase() || "";
      const channel = item.snippet?.channelTitle?.toLowerCase() || "";
      
      // Top Priority: YouTube Auto-Generated Audio (Topic Channels) are guaranteed embeddable
      if (channel.endsWith(" - topic")) {
        bestItem = item;
        break; 
      }
      
      // Second Priority: Lyric or explicitly audio videos that avoid the "official video" flag
      if ((title.includes("audio") || title.includes("lyric")) && 
          !title.includes("music video") && !title.includes("official video")) {
        bestItem = item;
        // We don't break here just in case a "Topic" channel is further down the list
      }
    }

    if (!bestItem || !bestItem.id?.videoId) return null;

    return {
      id: bestItem.id.videoId,
      name: trackName,
      artist: artistName,
      albumArt: bestItem.snippet?.thumbnails?.maxres?.url || 
                bestItem.snippet?.thumbnails?.standard?.url || 
                bestItem.snippet?.thumbnails?.high?.url || 
                bestItem.snippet?.thumbnails?.medium?.url || 
                bestItem.snippet?.thumbnails?.default?.url || "",
      url: `https://www.youtube.com/watch?v=${bestItem.id.videoId}`
    };
  } catch (error) {
    console.error(`YouTube Search Error for "${query}":`, error);
    return null;
  }
}
