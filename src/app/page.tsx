"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Loader2, Search, Sparkles } from "lucide-react";
import LibraryDashboard from "./components/LibraryDashboard";
import DiscoveryGrid from "./components/DiscoveryGrid";

export default function Home() {
  const { data: session, status } = useSession();
  const [library, setLibrary] = useState<{ playlists: any[]; likedMusic: any[] } | null>(null);
  const [discoveries, setDiscoveries] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryUrl, setDiscoveryUrl] = useState("");

  useEffect(() => {
    if (session && (session as any).provider === "google") {
      setLoading(true);
      fetch("/api/user/library")
        .then((res) => res.json())
        .then((data) => {
          setLibrary(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [session]);

  const handleDiscovery = async (url?: string, trackId?: string) => {
    if (!url && !discoveryUrl && !trackId) return;
    
    setDiscoveries(null);
    setDiscoveryLoading(true);
    try {
      const response = await fetch("/api/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url || discoveryUrl, trackId })
      });
      
      const data = await response.json();
      if (data.tracks) {
        setDiscoveries(data.tracks);
        // Scroll to discoveries
        setTimeout(() => {
          document.getElementById('discoveries')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else if (data.error) {
        alert(data.message || data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDiscoveryLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <main className="main-container">
        <Loader2 className="animate-spin" size={48} color="#444" />
      </main>
    );
  }

  const isSpotifyConnected = (session as any)?.providerTokens?.spotify?.accessToken;
  const isYouTubeConnected = (session as any)?.providerTokens?.google?.accessToken;

  const handleConnect = async (provider: string) => {
    // 1. Snapshot current session tokens and "park" them in the bridge cookie
    try {
      await fetch("/api/auth/sync", { method: "POST" });
    } catch (e) {
      console.error("Failed to bridge session tokens", e);
    }
    
    // 2. Proceed with sign in
    signIn(provider);
  };

  return (
    <main className="main-container">
      <nav className="navbar">
        <div className="logo">TREBLEMAKER</div>
        <div className="user-profile">
          {session ? (
            <>
              {session.user?.image && (
                <img src={session.user.image} alt="Profile" className="profile-img" />
              )}
              <div className="user-info">
                <span className="user-name">{session.user?.name}</span>
                <div className="badge-row">
                   {isSpotifyConnected && <span className="badge spotify">S</span>}
                   {isYouTubeConnected && <span className="badge youtube">Y</span>}
                </div>
              </div>
              <button 
                onClick={() => signOut()} 
                className="logout-btn"
              >
               Sign Out
              </button>
            </>
          ) : (
            <span style={{ color: '#444' }}>Not connected</span>
          )}
        </div>
      </nav>

      <div className="dashboard-content">
        {session && (isSpotifyConnected || isYouTubeConnected) ? (
          <div className="dashboard-wrapper">
            <div className="hero compact">
              <h1>Welcome back, {session.user?.name?.split(" ")[0]}.</h1>
              <p>Your universe is synced and ready for discovery.</p>
            </div>

            <div className="discovery-search-wrapper">
              <div className={`search-bar-container ${discoveryLoading ? 'analyzing' : ''}`}>
                <Search className="search-icon" size={20} />
                <div className="search-box">
                  <input 
                    type="text" 
                    placeholder={
                      isSpotifyConnected && isYouTubeConnected ? "Paste a YouTube or Spotify link for Hybrid Vibe Match..." :
                      isYouTubeConnected ? "Paste a YouTube link for YouTube-First Discovery..." :
                      isSpotifyConnected ? "Paste a Spotify link for Spotify-First Discovery..." :
                      "Connect an account to start discovery..."
                    }
                    value={discoveryUrl}
                    onChange={(e) => setDiscoveryUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDiscovery()}
                  />
                  <button 
                    onClick={() => handleDiscovery()}
                    disabled={discoveryLoading || (!isSpotifyConnected && !isYouTubeConnected)}
                    className="search-btn"
                  >
                    {discoveryLoading ? (
                      <div className="spinner"></div>
                    ) : (
                      <>Analyze Vibe <Sparkles size={18} /></>
                    )}
                  </button>
                </div>
              </div>
              <p className={`hint-text ${isYouTubeConnected && !isSpotifyConnected ? 'yt' : isSpotifyConnected && !isYouTubeConnected ? 'sp' : 'hybrid'}`}>
                {isSpotifyConnected && isYouTubeConnected ? "✨ Hybrid Engine Active: Merging YouTube & Spotify power." :
                 isYouTubeConnected ? "🛡️ YouTube-First Mode: Safe, direct discovery." :
                 isSpotifyConnected ? "🟢 Spotify-First Mode: Using premium metadata for vibes." :
                 "Connect an account to enable vibe-matching analysis."}
              </p>
            </div>

            <div id="discoveries">
              {discoveries && discoveries.length > 0 ? (
                <DiscoveryGrid tracks={discoveries} onAction={handleDiscovery} />
              ) : (
                !discoveryLoading && discoveries === null && (
                  <div className="empty-discoveries">
                    <p>No matching vibes found for this specific track.</p>
                  </div>
                )
              )}
            </div>
            
            {loading ? (
              <div className="loader-container">
                <Loader2 className="animate-spin" size={32} />
                <p>Syncing your YouTube library...</p>
              </div>
            ) : (
              isYouTubeConnected && library && (
                <LibraryDashboard 
                  playlists={library.playlists} 
                  likedMusic={library.likedMusic} 
                  onAction={(url) => handleDiscovery(url)}
                />
              )
            )}

            {/* Connection Shelf - Deprioritized Spotify for YouTube-First users */}
            {!isSpotifyConnected && !isYouTubeConnected && (
              <div className="connection-shelf">
                <h3>Expand your universe</h3>
                <div className="mini-auth-grid">
                  <div className="glass-card mini" onClick={() => handleConnect("google")}>
                     <h2>YouTube</h2>
                     <button className="connect-btn youtube-btn">Connect YouTube</button>
                  </div>
                  <div className="glass-card mini" onClick={() => handleConnect("spotify")}>
                     <h2>Spotify (Metadata Only)</h2>
                     <button className="connect-btn spotify-btn" style={{ background: '#333', color: '#888' }}>Connect Spotify</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="hero">
              <h1>Music discovery, <br/> reimagined.</h1>
              <p>
                Connect your accounts and find your next favorite song. 
                TrebleMaker analyzes your taste across Spotify and YouTube to provide 
                uniquely tailored recommendations.
              </p>
            </div>

            <div className="auth-grid">
              {/* Spotify Card */}
              <div className="glass-card" onClick={() => !isSpotifyConnected && handleConnect("spotify")}>
                <div className="icon-wrapper spotify-wrapper">
                   <span style={{ color: 'black', fontWeight: 'bold' }}>S</span>
                </div>
                <h2 className="card-title">Spotify</h2>
                <p className="card-desc">Sync your playlists, top artists, and listening history for deep analysis.</p>
                <button 
                  className="connect-btn spotify-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConnect("spotify");
                  }}
                >
                  {isSpotifyConnected ? 'Connected' : 'Connect Spotify'}
                </button>
              </div>

              {/* YouTube Card */}
              <div className="glass-card" onClick={() => !isYouTubeConnected && handleConnect("google")}>
                <div className="icon-wrapper youtube-wrapper">
                  <span style={{ color: 'white', fontWeight: 'bold' }}>Y</span>
                </div>
                <h2 className="card-title">YouTube</h2>
                <p className="card-desc">Import your YouTube Music playlists and liked videos to broaden your taste.</p>
                <button 
                  className="connect-btn youtube-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConnect("google");
                  }}
                >
                  {isYouTubeConnected ? 'Connected' : 'Connect YouTube'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <footer style={{ marginTop: '4rem', color: '#333', fontSize: '0.8rem' }}>
        &copy; 2026 TrebleMaker. All rights reserved.
      </footer>

      <style jsx>{`
        .dashboard-content {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .user-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          margin-right: 1.5rem;
        }
        .user-name {
          font-weight: 700;
          font-size: 0.9rem;
        }
        .badge-row {
          display: flex;
          gap: 0.4rem;
          margin-top: 0.2rem;
        }
        .badge {
          font-size: 0.6rem;
          font-weight: 900;
          padding: 1px 4px;
          border-radius: 4px;
          color: black;
        }
        .badge.spotify { background: var(--spotify-green); }
        .badge.youtube { background: var(--youtube-red); color: white; }

        .logout-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.8rem;
          transition: all 0.2s;
        }
        .logout-btn:hover { background: white; color: black; }

        .dashboard-wrapper {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .hero.compact {
          margin-bottom: 3rem;
        }
        .hero.compact h1 {
          font-size: 3.5rem;
        }
        .discovery-search-wrapper {
          width: 100%;
          max-width: 800px;
          margin-bottom: 4rem;
        }
        #discoveries {
          width: 100%;
          max-width: 1200px;
          margin-bottom: 4rem;
        }
        .search-bar-container {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 100px;
          padding: 0.5rem 0.5rem 0.5rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all 0.3s ease;
        }
        .search-bar-container:focus-within {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.3);
          box-shadow: 0 0 30px rgba(29, 185, 84, 0.1);
        }
        .search-icon { color: #555; }
        input {
          flex: 1;
          background: none;
          border: none;
          color: white;
          font-size: 1.1rem;
          outline: none;
        }
        input::placeholder { color: #444; }
        
        .search-box {
          display: flex;
          flex: 1;
          align-items: center;
          gap: 1rem;
        }
        
        .search-btn {
          background: var(--spotify-green);
          color: black;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 100px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .search-btn:hover { transform: scale(1.05); }
        .search-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .hint-text {
          font-size: 0.85rem;
          margin-top: 1rem;
          text-align: center;
          opacity: 0.9;
          font-weight: 500;
        }
        .hint-text.yt { color: var(--youtube-red); }
        .hint-text.sp { color: var(--spotify-green); }
        .hint-text.hybrid { color: #fff; text-shadow: 0 0 10px rgba(255,255,255,0.3); }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(0,0,0,0.1);
          border-top: 2px solid black;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .loader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          margin-top: 4rem;
          color: #666;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        .analyzing {
          animation: borderGlow 2s infinite;
        }
        @keyframes borderGlow {
          0% { border-color: rgba(255, 255, 255, 0.1); }
          50% { border-color: var(--spotify-green); }
          100% { border-color: rgba(255, 255, 255, 0.1); }
        }

        .connection-shelf {
          margin-top: 6rem;
          width: 100%;
          max-width: 800px;
          text-align: center;
          padding: 3rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        .connection-shelf h3 { font-size: 1.5rem; margin-bottom: 2rem; color: #555; }
        .mini-auth-grid {
          display: flex;
          gap: 2rem;
          justify-content: center;
        }
        .glass-card.mini {
          flex: 1;
          max-width: 300px;
          padding: 2rem;
          text-align: center;
        }
        .glass-card.mini h2 { font-size: 1.2rem; margin-bottom: 1.5rem; }
      `}</style>
    </main>
  );
}
