"use client";

import React, { useState } from "react";
import { ExternalLink, Sparkles, Play, Info, Music } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

interface DiscoveryGridProps {
  tracks: any[];
  onAction?: (url: string) => void;
}

export default function DiscoveryGrid({ tracks, onAction }: DiscoveryGridProps) {
  const { playTrack } = usePlayer();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [localTracks, setLocalTracks] = React.useState(tracks);

  // Keep local state in sync with props
  React.useEffect(() => {
    setLocalTracks(tracks);
  }, [tracks]);

  if (tracks.length === 0) return null;

  const handlePlay = async (track: any) => {
    // If it's a lazy discovery result, resolve ID first
    if (track.needsResolution) {
      setResolvingId(track.id);
      try {
        const res = await fetch(`/api/discovery/resolve?track=${encodeURIComponent(track.name)}&artist=${encodeURIComponent(track.artist)}`);
        const data = await res.json();
        
        if (data.id) {
          const resolvedTrack = { ...track, id: data.id, needsResolution: false };
          
          // Update local state to trigger re-render
          setLocalTracks(prev => prev.map(t => t.id === track.id ? resolvedTrack : t));

          const currentQueue = localTracks.map(t => ({
            id: t.id === track.id ? data.id : t.id,
            title: t.name,
            artist: t.artist,
            albumArt: t.albumArt,
            source: t.source || "youtube"
          }));

          playTrack({
            id: data.id,
            title: track.name,
            artist: track.artist,
            albumArt: track.albumArt,
            source: "youtube"
          }, currentQueue);
        }
      } catch (err) {
        console.error("Resolution failed:", err);
      } finally {
        setResolvingId(null);
      }
      return;
    }

    const currentQueue = localTracks.map(t => ({
      id: t.id,
      title: t.name,
      artist: t.artist,
      albumArt: t.albumArt,
      source: t.source || "youtube"
    }));

    playTrack({
      id: track.id,
      title: track.name,
      artist: track.artist,
      albumArt: track.albumArt,
      source: "youtube"
    }, currentQueue);
  };

  return (
    <div className="discovery-container">
      <div className="section-header">
        <Sparkles className="header-icon" />
        <h2>New Discoveries</h2>
      </div>

      <div className="library-grid">
        {localTracks.map((track) => {
          return (
            <div 
              key={track.id} 
              className="glass-card library-item selectable"
              onClick={() => onAction?.(track.url)}
            >
              <div className="item-thumbnail">
                {track.albumArt ? (
                  <img src={track.albumArt} alt={track.name} />
                ) : (
                  <div className="placeholder-thumb"><Music /></div>
                )}
                <div className="action-hint">
                  <Sparkles size={24} />
                  <span>Analyze Vibe</span>
                </div>
                {/* Play Button Overlay */}
                <button 
                  className={`play-overlay-btn ${resolvingId === track.id ? 'resolving' : ''}`}
                  disabled={resolvingId === track.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlay(track);
                  }}
                >
                  {resolvingId === track.id ? (
                    <div className="spinner"></div>
                  ) : (
                    <Play fill="white" size={20} />
                  )}
                </button>
              </div>
            <div className="item-info">
              <div className="title-row">
                <h3>{track.name || "Unknown Track"}</h3>
                <a 
                  href={track.needsResolution 
                    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(`${track.artist || ""} ${track.name || ""}`.trim())}`
                    : `https://www.youtube.com/watch?v=${track.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="yt-direct-link"
                  onClick={(e) => e.stopPropagation()}
                  title="Watch on YouTube"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
              <div className="meta-row">
                <p>{track.artist || "Unknown Artist"}</p>
                {track.matchScore && (
                  <span className="match-score">{track.matchScore}% Match</span>
                )}
              </div>
              {/* Removed the invisible action-overlay-link to prevent click interference */}
            </div>
          </div>
        );
      })}
      </div>

      <style jsx>{`
        .discovery-container {
          width: 100%;
          max-width: 1200px;
          margin-top: 4rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .header-icon {
          color: var(--spotify-green);
        }
        .section-header h2 {
          font-size: 2rem;
          font-weight: 700;
        }
        .library-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          width: 100%;
        }
        .library-item {
          padding: 1rem;
          position: relative;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .library-item:hover {
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
          margin-bottom: 0.25rem;
        }
        .yt-direct-link {
          color: var(--youtube-red);
          opacity: 0.8;
          transition: all 0.2s ease;
          padding: 2px;
          border-radius: 4px;
          flex-shrink: 0;
          margin-top: 1px;
          filter: drop-shadow(0 0 5px rgba(255, 0, 0, 0.2));
        }
        .yt-direct-link:hover {
          opacity: 1;
          background: rgba(255, 0, 0, 0.1);
          transform: scale(1.1);
          filter: drop-shadow(0 0 8px rgba(255, 0, 0, 0.4));
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
          font-size: 0.7rem;
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
        .item-info {
          position: relative;
        }
        .item-info h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
        }
        .meta-row p {
          font-size: 0.8rem;
          color: #666;
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .match-score {
          font-family: var(--font-geist-mono), monospace;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--spotify-green);
          background: rgba(29, 185, 84, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
        }
        .action-overlay-link {
          position: absolute;
          inset: 0;
          opacity: 0;
          z-index: 2;
        }
      `}</style>
    </div>
  );
}
