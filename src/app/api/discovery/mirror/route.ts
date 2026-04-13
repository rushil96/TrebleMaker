import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";

/**
 * Mirror API Endpoint
 * Finds embed-friendly alternative versions of restricted tracks.
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
  const badId = searchParams.get("exclude");

  if (!trackName || !artistName) {
    return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
  }

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: googleToken });
    const youtube = google.youtube({ version: "v3", auth });

    // Query specifically for "audio" or "lyrics" to find embed-friendly mirrors
    const query = `${trackName} ${artistName} audio lyrics`;

    const response = await youtube.search.list({
      part: ["snippet"],
      q: query,
      type: ["video"],
      maxResults: 5,
      videoEmbeddable: "true",
      videoCategoryId: "10",
    });

    // Find the first ID that isn't the "bad" one
    const items = response.data.items || [];
    const validMirror = items.find(item => item.id?.videoId !== badId);

    if (!validMirror || !validMirror.id?.videoId) {
      return NextResponse.json({ error: "No mirrors found" }, { status: 404 });
    }

    return NextResponse.json({
      id: validMirror.id.videoId,
      title: validMirror.snippet?.title || trackName,
      artist: validMirror.snippet?.channelTitle || artistName,
      albumArt: validMirror.snippet?.thumbnails?.high?.url || ""
    });

  } catch (error: any) {
    console.error("Mirror Search Error:", error);
    return NextResponse.json({ error: "Mirror search failed" }, { status: 500 });
  }
}
