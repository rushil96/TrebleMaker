import React, { useState } from "react";
import { Music, PlayCircle, Radio, Sparkles, Play, Info, ExternalLink } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

interface LibraryDashboardProps {
  playlists: any[];
  likedMusic: any[];
  onAction?: (url?: string) => void;
}

export default function LibraryDashboard({ playlists, likedMusic, onAction }: LibraryDashboardProps) {
  const { playTrack } = usePlayer();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const handlePlaySong = async (item: any) => {
    setResolvingId(item.id);
    try {
      // Audit the ID (Skip search since we have the ID)
      const res = await fetch(`/api/discovery/resolve?id=${item.id}`);
      const data = await res.json();

      if (data.isEmbeddable) {
        const likedQueue = likedMusic.map(m => ({
          id: m.id,
          title: m.snippet.title,
          artist: m.snippet.channelTitle,
          albumArt: m.snippet.thumbnails?.maxres?.url || 
                    m.snippet.thumbnails?.standard?.url ||
                    m.snippet.thumbnails?.high?.url || 
                    m.snippet.thumbnails?.medium?.url || 
                    m.snippet.thumbnails?.default?.url || "",
          source: "youtube" as const
        }));

        playTrack({
          id: item.id,
          title: item.snippet.title,
          artist: item.snippet.channelTitle,
          albumArt: item.snippet.thumbnails?.maxres?.url || 
                    item.snippet.thumbnails?.standard?.url ||
                    item.snippet.thumbnails?.high?.url || 
                    item.snippet.thumbnails?.medium?.url || 
                    item.snippet.thumbnails?.default?.url || "",
          source: "youtube"
        }, likedQueue);
      } else {
        // Just show why it won't play in player
        alert("This track is embedding-restricted. Please use the YouTube link to the right of the title.");
      }
    } catch (err) {
      console.error("Library Play Audit Failed:", err);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="dashboard-container">
      <section className="dashboard-section">
        <div className="section-header">
          <PlayCircle className="header-icon" />
          <h2>My Playlists</h2>
        </div>
        <div className="library-grid">
          {playlists.length > 0 ? (
            playlists.map((item) => (
              <div 
                key={item.id} 
                className="glass-card library-item selectable"
                onClick={() => onAction?.(`https://www.youtube.com/playlist?list=${item.id}`)}
              >
                <div className="item-thumbnail">
                   {item.snippet.thumbnails ? (
                     <img 
                       src={item.snippet.thumbnails.maxres?.url || 
                            item.snippet.thumbnails.standard?.url ||
                            item.snippet.thumbnails.high?.url || 
                            item.snippet.thumbnails.medium?.url || 
                            item.snippet.thumbnails.default?.url} 
                       alt={item.snippet.title} 
                     />
                   ) : (
                     <div className="placeholder-thumb"><Music /></div>
                   )}
                   <div className="action-hint">
                     <Sparkles size={24} />
                     <span>Analyze Playlist</span>
                   </div>
                </div>
                <div className="item-info">
                  <div className="title-row">
                    <h3>{item.snippet.title}</h3>
                    <a 
                      href={`https://www.youtube.com/playlist?list=${item.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="yt-direct-link"
                      onClick={(e) => e.stopPropagation()}
                      title="Watch on YouTube"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                  <p>{item.contentDetails.itemCount} items</p>
                </div>
              </div>
            ))
          ) : (
            <p className="empty-msg">No playlists found.</p>
          )}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-header">
          <Radio className="header-icon" />
          <h2>Liked Music</h2>
        </div>
        <div className="library-grid">
          {likedMusic.length > 0 ? (
            likedMusic.map((item) => (
              <div 
                key={item.id} 
                className="glass-card library-item selectable"
                onClick={() => onAction?.(`https://www.youtube.com/watch?v=${item.id}`)}
              >
                <div className="item-thumbnail">
                   {item.snippet.thumbnails ? (
                     <img 
                       src={item.snippet.thumbnails.maxres?.url || 
                            item.snippet.thumbnails.standard?.url ||
                            item.snippet.thumbnails.high?.url || 
                            item.snippet.thumbnails.medium?.url || 
                            item.snippet.thumbnails.default?.url} 
                       alt={item.snippet.title} 
                     />
                   ) : (
                     <div className="placeholder-thumb"><Music /></div>
                   )}
                   <div className="action-hint">
                     <Sparkles size={24} />
                     <span>Analyze Vibe</span>
                   </div>
                   {/* Play Button Overlay (Secondary Action) */}
                   <button 
                     className={`play-overlay-btn ${resolvingId === item.id ? 'resolving' : ''}`}
                     disabled={resolvingId === item.id}
                     onClick={(e) => {
                       e.stopPropagation();
                       handlePlaySong(item);
                     }}
                   >
                     {resolvingId === item.id ? (
                       <div className="spinner"></div>
                     ) : (
                       <Play fill="white" size={20} />
                     )}
                   </button>
                </div>
                <div className="item-info">
                  <div className="title-row">
                    <h3>{item.snippet.title}</h3>
                    <a 
                      href={`https://www.youtube.com/watch?v=${item.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="yt-direct-link"
                      onClick={(e) => e.stopPropagation()}
                      title="Watch on YouTube"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                  <p>{item.snippet.channelTitle}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="empty-msg">No liked music found in your library.</p>
          )}
        </div>
      </section>

      <style jsx>{`
        .dashboard-container {
          width: 100%;
          max-width: 1200px;
          margin-top: 2rem;
        }
        .dashboard-section {
          margin-bottom: 4rem;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .header-icon {
          color: var(--youtube-red);
        }
        .section-header h2 {
          font-size: 2rem;
          font-weight: 700;
        }
        .library-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1.5rem;
        }
        .library-item {
          padding: 1rem;
          align-items: flex-start;
          transition: all 0.3s ease;
          border: 1px solid transparent;
        }
        .library-item.selectable {
          cursor: pointer;
        }
        .library-item.selectable:hover {
          transform: translateY(-5px);
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--spotify-green);
        }
        .library-item.restricted {
          border-color: rgba(255, 0, 0, 0.2);
        }
        .title-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.5rem;
          width: 100%;
        }
        .yt-direct-link {
          color: var(--youtube-red);
          opacity: 0.6;
          transition: all 0.2s ease;
          padding: 2px;
          border-radius: 4px;
        }
        .yt-direct-link:hover {
          opacity: 1;
          background: rgba(255, 0, 0, 0.1);
          transform: scale(1.1);
        }
        .item-thumbnail {
          position: relative;
          width: 100%;
          aspect-ratio: 16/9;
          border-radius: 12px;
          overflow: hidden;
          background: #111;
          margin-bottom: 1rem;
        }
        .item-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .action-hint {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          opacity: 0;
          transition: opacity 0.3s ease;
          color: var(--spotify-green);
          font-weight: 700;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .library-item:hover .action-hint {
          opacity: 1;
        }
        .play-overlay-btn {
          position: absolute;
          bottom: 12px;
          right: 12px;
          width: 44px;
          height: 44px;
          background: var(--spotify-green);
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transform: translateY(10px);
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          z-index: 10;
        }
        .library-item:hover .play-overlay-btn {
          opacity: 1;
          transform: translateY(0);
        }
        .play-overlay-btn:hover {
          transform: scale(1.1) !important;
          background: #1ed760;
        }
        .play-overlay-btn.resolving {
          background: #333;
          cursor: wait;
        }
        .play-overlay-btn.restricted {
          background: var(--youtube-red);
        }
        .redirection-btn {
          position: absolute;
          top: 10px;
          left: 10px;
          width: 36px;
          height: 36px;
          background: var(--youtube-red);
          border: none;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 100;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .redirection-btn:hover {
          transform: scale(1.1);
          filter: brightness(1.2);
        }
        .restriction-info {
          position: absolute;
          top: 10px;
          right: 10px;
          color: white;
          background: rgba(0,0,0,0.5);
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: help;
          z-index: 100;
        }
        .tooltip {
          position: absolute;
          bottom: 120%;
          right: 0;
          width: 200px;
          padding: 0.75rem;
          font-size: 0.7rem;
          line-height: 1.4;
          color: white;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
          border: 1px solid rgba(255,255,255,0.1);
          z-index: 101;
          pointer-events: none;
        }
        .restriction-info:hover .tooltip {
          opacity: 1;
          visibility: visible;
          transform: translateY(-5px);
        }
        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .placeholder-thumb {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #333;
        }
        .item-info h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .item-info p {
          font-size: 0.8rem;
          color: #666;
        }
        .empty-msg {
          color: #444;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
