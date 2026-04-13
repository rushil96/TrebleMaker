import { google } from "googleapis";

export async function getYouTubeLibrary(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const youtube = google.youtube({
    version: "v3",
    auth: auth,
  });

  try {
    // 1. Fetch Playlists
    const playlistsResponse = await youtube.playlists.list({
      part: ["snippet", "contentDetails"],
      mine: true,
      maxResults: 50,
    });

    // 2. Fetch Liked Videos
    const likedVideosResponse = await youtube.videos.list({
      part: ["snippet", "contentDetails"],
      myRating: "like",
      maxResults: 50,
    });

    // 3. Filter for Music category (ID: 10)
    const playlists = playlistsResponse.data.items || [];
    const allLikedItems = likedVideosResponse.data.items || [];
    
    console.log(`[YouTube API] Raw: Found ${playlists.length} total playlists.`);
    console.log(`[YouTube API] Raw: Found ${allLikedItems.length} liked videos.`);
    
    if (allLikedItems.length > 0) {
      console.log(`[YouTube API] Sample Category IDs:`, allLikedItems.slice(0, 3).map(v => v.snippet?.categoryId));
    }

    const likedMusic = allLikedItems.filter(
      (video) => {
        const catId = video.snippet?.categoryId;
        return catId === "10";
      }
    );

    console.log(`[YouTube API] Filtered: ${likedMusic.length} specifically tagged as Music.`);

    return {
      playlists,
      likedMusic,
    };
  } catch (error) {
    console.error("Error fetching YouTube library:", error);
    return { playlists: [], likedMusic: [] };
  }
}
