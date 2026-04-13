import { NextAuthOptions } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import GoogleProvider from "next-auth/providers/google";
import { cookies } from "next/headers";

/**
 * Silent Token Rotation Helper
 * Renews expired access tokens in the background to prevent 401 errors.
 */
async function refreshAccessToken(provider: string, refreshToken: string) {
  try {
    let url = "";
    let body: any = {};

    if (provider === "google") {
      url = "https://oauth2.googleapis.com/token";
      body = {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      };
    } else if (provider === "spotify") {
      url = "https://accounts.spotify.com/api/token";
      body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      });
      // Spotify requires basic auth header
      const authHeader = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${authHeader}`,
        },
        body,
      });
      const data = await res.json();
      return {
        accessToken: data.access_token,
        expiresAt: Math.floor(Date.now() / 1000 + data.expires_in),
        refreshToken: data.refresh_token ?? refreshToken,
      };
    }

    if (!url) return null;

    const response = await fetch(url, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
      method: "POST",
    });

    const refreshedTokens = await response.json();

    if (!response.ok) throw refreshedTokens;

    return {
      accessToken: refreshedTokens.access_token,
      expiresAt: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
      refreshToken: refreshedTokens.refresh_token ?? refreshToken, // Fallback to old refresh token
    };
  } catch (error) {
    console.error(`Error refreshing ${provider} token:`, error);
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "user-read-email playlist-read-private user-top-read",
        },
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/youtube.readonly",
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }: any) {
      // 1. Initial Sign-in
      if (account && user) {
        token.providerTokens = token.providerTokens || {};
        token.providerTokens[account.provider] = {
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at, // Timestamp in seconds
        };
        // Compatibility fields
        token.accessToken = account.access_token;
        token.provider = account.provider;
        return token;
      }

      // 2. Check for "Bridge Cookie" (Multi-provider linking)
      const cookieStore = await cookies();
      const bridgeCookie = cookieStore.get("tr-sync-bridge");
      if (bridgeCookie) {
        try {
          const parkedTokens = JSON.parse(Buffer.from(bridgeCookie.value, "base64").toString());
          token.providerTokens = {
            ...(token.providerTokens || {}),
            ...parkedTokens
          };
          cookieStore.delete("tr-sync-bridge");
        } catch (e) {
          console.error("Auth-Bridge error:", e);
        }
      }

      // 3. Silent Token Rotation Check
      // We check all active provider tokens
      const providers = Object.keys(token.providerTokens || {});
      for (const provider of providers) {
        const pToken = token.providerTokens[provider];
        // If token expires in less than 5 minutes, refresh it
        if (pToken.expiresAt && Date.now() / 1000 > pToken.expiresAt - 300) {
          console.log(`Auth: Proactively refreshing ${provider} token...`);
          const refreshed = await refreshAccessToken(provider, pToken.refreshToken);
          if (refreshed) {
            token.providerTokens[provider] = {
              ...pToken,
              ...refreshed,
            };
            // Sync compatibility field if this was the active provider
            if (token.provider === provider) {
              token.accessToken = refreshed.accessToken;
            }
          }
        }
      }

      return token;
    },
    async session({ session, token }: any) {
      session.providerTokens = token.providerTokens;
      session.provider = token.provider;
      session.accessToken = token.accessToken;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
