# TrebleMaker

**TrebleMaker** is a modern, hybrid music streaming and discovery application built to bridge the gap between Spotify metadata and YouTube audio. It gives you the power of premium music recommendations without requiring a paid streaming subscription.

## 🎵 Features

### 1. Hybrid Vibe Discovery
Paste any YouTube video or Spotify track, and TrebleMaker's **Discovery Engine** will instantly analyze its "vibe". Using Last.fm's recommendation algorithms and Spotify's rich metadata, it generates an intelligent, infinite queue of highly accurate, similar tracks.

### 2. Smart "Audio-Only" Player Engine
Tired of "Embedding Restricted" errors? TrebleMaker utilizes a native YouTube background worker designed to intelligently hunt down official "Topic" channels and high-bitrate lyric videos. This aggressively filters out VEVO restrictions, letting you listen back-to-back without abrupt stops. 

### 3. Unified Library Dashboard
Connect your Google/YouTube account to cleanly import your saved playlists and "Liked Videos". TrebleMaker automatically filters your YouTube history to find explicit "Music" category videos, compiling them into a beautiful, ad-free listening dashboard.

### 4. Glassmorphic UI & Seamless Queueing
Inspired by modern design trends, TrebleMaker features a dark-mode glassmorphic player bar sitting at the bottom of the screen. With Just-In-Time (JIT) audio resolution, the app loads tracks in the background dynamically to drastically save your API quotas.

## 🚀 Tech Stack
- **Framework**: Next.js (React)
- **Styling**: Vanilla CSS (CSS Modules & Global Styles)
- **Authentication**: NextAuth (Google & Spotify Providers)
- **External APIs**: YouTube Data API v3, Spotify Web API, Last.fm API
- **Player**: YouTube IFrame API (Custom Headless Implementation)

## 🛠️ Setup Instructions

To run TrebleMaker locally, you need to set up OAuth keys for Google and Spotify, alongside an API key for Last.fm.

1. Clone the repository
2. Run `npm install`
3. Duplicate `.env.example` as `.env.local` and fill thoroughly matching your API gateway portals.
4. Run `npm run dev` and open `http://localhost:3000`