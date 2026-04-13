import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseDiscoveryLink, findSpotifyTrackByYoutubeTitle } from "@/lib/discovery";
import { getSpotifyPublicToken, getTrackMetadata, getTrackById, getFirstTrackFromPlaylist } from "@/lib/spotify-public";
import { getSimilarTracks } from "@/lib/lastfm";
import { searchYouTubeTrack } from "@/lib/youtube-search";
import { google } from "googleapis";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const googleToken = (session as any)?.providerTokens?.google?.accessToken;
  const spotifyToken = (session as any)?.providerTokens?.spotify?.accessToken;

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Adaptive Auth: Require at least one connection
  if (!googleToken && !spotifyToken) {
    return NextResponse.json({ error: "Connection Required", message: "Please connect YouTube or Spotify to enable vibe-matching." }, { status: 403 });
  }

  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    const parsed = parseDiscoveryLink(url);
    if (!parsed) return NextResponse.json({ error: "Invalid YouTube or Spotify link" }, { status: 400 });

    let seedTrackName = "";
    let seedArtistName = "";

    // 1. Resolve the "Seed" metadata (Adaptive Resolution)
    if (parsed.type === "youtube" || parsed.type === "youtube_playlist") {
      if (!googleToken) return NextResponse.json({ error: "YouTube login required for this link" }, { status: 403 });
      
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: googleToken });
      const youtube = google.youtube({ version: "v3", auth });
      
      if (parsed.type === "youtube") {
        const videoRes = await youtube.videos.list({ part: ["snippet"], id: [parsed.id] });
        const title = videoRes.data.items?.[0]?.snippet?.title;
        if (!title) return NextResponse.json({ error: "YouTube video not found" }, { status: 404 });
        seedTrackName = title.split("(")[0].split("[")[0].trim();
        seedArtistName = videoRes.data.items?.[0]?.snippet?.channelTitle?.replace(" - Topic", "") || "";
      } else {
        const playlistRes = await youtube.playlistItems.list({ part: ["snippet"], playlistId: parsed.id, maxResults: 1 });
        const title = playlistRes.data.items?.[0]?.snippet?.title;
        if (!title) return NextResponse.json({ error: "Empty or invalid playlist" }, { status: 404 });
        seedTrackName = title.split("(")[0].split("[")[0].trim();
        seedArtistName = playlistRes.data.items?.[0]?.snippet?.videoOwnerChannelTitle?.replace(" - Topic", "") || "";
      }
    } else {
       // Spotify Link - Adaptive resolution
       const track = parsed.type === "spotify_playlist" 
          ? await getFirstTrackFromPlaylist(parsed.id, spotifyToken)
          : await getTrackById(parsed.id, spotifyToken);
          
       if (!track) return NextResponse.json({ error: "Spotify metadata not found" }, { status: 404 });
       seedTrackName = track.name;
       seedArtistName = track.artists[0].name;
    }

    console.log(`Discovery Engine: Finding vibes for "${seedTrackName}" by ${seedArtistName} (${googleToken ? 'YT' : ''} ${spotifyToken ? 'SP' : ''})`);

    // 2. Get Similarity from Last.fm (Constant Vibe Engine)
    const similarTracks = await getSimilarTracks(seedTrackName, seedArtistName);
    
    if (similarTracks.length === 0) {
      return NextResponse.json({ 
        error: "No vibes found", 
        message: "No similar tracks found for this specific song." 
      }, { status: 404 });
    }

    // 3. Adaptive Metadata Enrichment
    const enrichedResults = await Promise.all(
      similarTracks.map(async (t) => {
         try {
           let name = t.name;
           let artist = t.artist.name;
           let albumArt = "";
           let spotifyId = "";

           // Strategy A: Only YouTube Connected
           if (googleToken && !spotifyToken) {
              const yt = await searchYouTubeTrack(googleToken, t.name, t.artist.name);
              if (yt) {
                albumArt = yt.albumArt;
                name = yt.name;
                artist = yt.artist;
              }
           } 
           // Strategy B: Only Spotify Connected
           else if (spotifyToken && !googleToken) {
              const sp = await getTrackMetadata(t.name, t.artist.name, spotifyToken);
              if (sp) {
                name = sp.name;
                artist = sp.artists[0].name;
                albumArt = sp.album.images[0]?.url || "";
                spotifyId = sp.id;
              }
           }
           // Strategy C: Hybrid Mode (Both Connected)
           else if (googleToken && spotifyToken) {
              const sp = await getTrackMetadata(t.name, t.artist.name, spotifyToken);
              const yt = await searchYouTubeTrack(googleToken, t.name, t.artist.name);
              
              name = sp?.name || yt?.name || t.name;
              artist = sp?.artists?.[0]?.name || yt?.artist || t.artist.name;
              albumArt = sp?.album?.images?.[0]?.url || yt?.albumArt || "";
              spotifyId = sp?.id || "";
           }

           // Final safety fallback for thumbnails
           if (!albumArt) albumArt = t.image || "";

           return {
             id: spotifyId || `pending-${Math.random().toString(36).substr(2, 9)}`,
             name,
             artist,
             albumArt,
             matchScore: Math.round(t.match * 100),
             needsResolution: true,
             type: 'youtube'
           };
         } catch (e) {
           return {
             id: `pending-${Math.random().toString(36).substr(2, 9)}`,
             name: t.name,
             artist: t.artist.name,
             albumArt: t.image || "",
             matchScore: Math.round(t.match * 100),
             needsResolution: true,
             type: 'youtube'
           };
         }
      })
    );

    return NextResponse.json({ tracks: enrichedResults.filter(Boolean) });
  } catch (error: any) {
    console.error("Discovery API Error:", error);
    return NextResponse.json({ error: "Discovery Engine failed", details: error.message }, { status: 500 });
  }
}
