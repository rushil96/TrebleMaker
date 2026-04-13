import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.providerTokens) {
    return NextResponse.json({ message: "No session to sync" });
  }

  const cookieStore = await cookies();
  
  // Save current provider tokens to a bridge cookie
  // We stringify and base64 it for basic safety
  const tokenData = Buffer.from(JSON.stringify(session.providerTokens)).toString("base64");
  
  cookieStore.set("tr-sync-bridge", tokenData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600, // 10 minutes is plenty for an OAuth flow
    sameSite: "lax",
  });

  console.log("Cookie-Bridge: Tokens 'parked' for sync.");
  
  return NextResponse.json({ success: true });
}
