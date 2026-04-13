import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchYouTubeTrack } from "@/lib/youtube-search";
import { google } from "googleapis";

/**
 * On-Demand Video Resolver
 * Finds a YouTube ID for a specific metadata pair only when requested.
 */

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const googleToken = session?.providerTokens?.google?.accessToken;

  if (!session || !googleToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const trackName = searchParams.get("track");
  const artistName = searchParams.get("artist");
  const directId = searchParams.get("id");

  if (!directId && (!trackName || !artistName)) {
    return NextResponse.json({ error: "Missing metadata or ID" }, { status: 400 });
  }

  try {
    let videoId = directId;
    let videoUrl = directId ? `https://www.youtube.com/watch?v=${directId}` : "";

    if (!videoId) {
      console.log(`Resolver: Finding YouTube ID for "${trackName}" by ${artistName}`);
      const youtubeData = await searchYouTubeTrack(googleToken, trackName!, artistName!);
      
      if (!youtubeData) {
        return NextResponse.json({ error: "YouTube ID not found" }, { status: 404 });
      }
      videoId = youtubeData.id;
      videoUrl = youtubeData.url;
    }

    // Audit the playability (Cheap 1-unit call)
    try {
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: googleToken });
      const youtube = google.youtube({ version: "v3", auth });
      
      const videoAudit = await youtube.videos.list({
        part: ["status"],
        id: [videoId]
      });
      
      const item = videoAudit.data.items?.[0];
      const isEmbeddable = item?.status?.embeddable ?? true;

      return NextResponse.json({
        id: videoId,
        url: videoUrl,
        isEmbeddable
      });
    } catch (auditError) {
      console.warn("Resolver: Audit failed, defaulting to embeddable=true", auditError);
      return NextResponse.json({
        id: videoId,
        url: videoUrl,
        isEmbeddable: true
      });
    }
  } catch (error: any) {
    console.error("Resolver API Critical Error:", error);
    return NextResponse.json({ 
      error: "Resolution failed", 
      details: error.message 
    }, { status: 500 });
  }
}
