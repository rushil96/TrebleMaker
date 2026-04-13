import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

interface ProviderToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    provider?: string;
    providerTokens?: {
      google?: ProviderToken;
      spotify?: ProviderToken;
    };
    user: {
      id?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    provider?: string;
    providerTokens?: {
      google?: ProviderToken;
      spotify?: ProviderToken;
    };
    expiresAt?: number;
  }
}
