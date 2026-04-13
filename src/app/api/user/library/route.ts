import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getYouTubeLibrary } from "@/lib/youtube";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  const googleToken = (session as any)?.providerTokens?.google?.accessToken;

  console.log("Fetching library for session:", session?.user?.email);

  if (!googleToken) {
    console.error("No Google access token found in session");
    return NextResponse.json({ error: "YouTube Connection Required" }, { status: 401 });
  }

  console.log("Google Token available. Starting YouTube library fetch...");
  const library = await getYouTubeLibrary(googleToken);
  console.log(`Fetch complete. Found ${library.playlists.length} playlists and ${library.likedMusic.length} liked tracks.`);
  return NextResponse.json(library);
}
