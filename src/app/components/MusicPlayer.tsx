"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { Play, Pause, SkipBack, SkipForward, Volume2, Music, ExternalLink } from "lucide-react";

/**
 * The TreblePlayer Bottom Bar
 * Handles YouTube IFrame API integration for seamless playback.
 */

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export default function MusicPlayer() {
  const { 
    currentTrack, 
    isPlaying, 
    togglePlay, 
    setNotification, 
    nextTrack,
    previousTrack,
    playTrack,
    clearNotification
  } = usePlayer();
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);

  // 1. Initialize YouTube API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        setIsReady(true);
      };
    } else {
      setIsReady(true);
    }
  }, []);

  // 2. Handle Track Changes
  useEffect(() => {
    if (isReady && currentTrack && !playerRef.current) {
      setPlayerReady(false);
      console.log("MusicPlayer: Initializing new YouTube Player...");
      playerRef.current = new window.YT.Player("youtube-worker", {
        height: "0",
        width: "0",
        videoId: currentTrack.id,
        playerVars: {
          autoplay: 1,
          controls: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            console.log("MusicPlayer: Player Ready!");
            setPlayerReady(true);
          },
          onError: (e: any) => {
            if (e.data === 101 || e.data === 150) {
              // The user has a native redirect link in the UI, so we just skip the broken track automatically
              setNotification("Playback Restricted. Skipping to next track...", "warning");
              setTimeout(() => {
                clearNotification();
                nextTrack();
              }, 1000);
            } else {
              console.error("MusicPlayer Error:", e.data);
            }
          },
          onStateChange: (e: any) => {
             const state = e.data;
             // States: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
             console.log(`YouTube StateChange: ${state}`);
             
             if (state === 1) {
               setIsRecovering(false);
               console.log("MusicPlayer: Song Started Playing");
             } else if (state === 3 || state === -1) {
               setIsRecovering(true); // "Tuning" state like Last.fm
             } else if (state === 0) {
               nextTrack();
             }
          }
        },
      });
    } else if (playerRef.current && currentTrack && playerReady) {
      if (currentTrack.id.startsWith("pending-")) {
        console.log("MusicPlayer: JIT Resolving pending track:", currentTrack.title);
        setIsRecovering(true);
        fetch(`/api/discovery/resolve?track=${encodeURIComponent(currentTrack.title)}&artist=${encodeURIComponent(currentTrack.artist)}`)
          .then(res => res.json())
          .then(data => {
            if (data.id && playerRef.current?.loadVideoById) {
               currentTrack.id = data.id; // Mutate gracefully for player context
               playerRef.current.loadVideoById(data.id);
            } else {
               // Resolution failed, skip automatically
               setNotification("Failed to resolve track audio. Skipping...", "error");
               setTimeout(() => { clearNotification(); nextTrack(); }, 1000);
            }
          })
          .catch(() => {
             setNotification("Failed to resolve track audio. Skipping...", "error");
             setTimeout(() => { clearNotification(); nextTrack(); }, 1000);
          });
      } else {
        console.log("MusicPlayer: Loading new track:", currentTrack.id);
        setIsRecovering(true);
        if (playerRef.current.loadVideoById) {
          playerRef.current.loadVideoById(currentTrack.id);
        }
      }
    }
  }, [isReady, currentTrack, playerReady]);

  // 3. Handle Progress Polling
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (playerReady && isPlaying) {
      interval = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          setCurrentTime(playerRef.current.getCurrentTime());
          setDuration(playerRef.current.getDuration());
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [playerReady, isPlaying, currentTrack]);

  // 4. Handle Play/Pause Toggle
  useEffect(() => {
    if (playerRef.current && playerReady) {
      try {
        if (isPlaying) {
          if (typeof playerRef.current.playVideo === 'function') playerRef.current.playVideo();
        } else {
          if (typeof playerRef.current.pauseVideo === 'function') playerRef.current.pauseVideo();
        }
      } catch (err) {
        console.warn("MusicPlayer: Toggle failed (likely ad-transition state)", err);
      }
    }
  }, [isPlaying, playerReady]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(time, true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setVolume(val);
    if (playerRef.current && playerRef.current.setVolume) {
      playerRef.current.setVolume(val);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercent = volume;

  if (!currentTrack) return null;

  return (
    <div className="player-bar glass-effect">
      {/* Hidden Player Worker */}
      <div id="youtube-worker" style={{ position: "absolute", visibility: "hidden" }}></div>

      <div className="player-content">
        {/* Track Info */}
        <div className="track-info">
          <div className="player-thumb">
            {currentTrack.albumArt ? (
              <img src={currentTrack.albumArt} alt={currentTrack.title} />
            ) : (
              <div className="placeholder-thumb"><Music /></div>
            )}
          </div>
          <div className="track-details">
            <div className="title-row">
              <h4>{isRecovering ? "Tuning your vibe..." : currentTrack.title}</h4>
              <a 
                href={`https://www.youtube.com/watch?v=${currentTrack.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="yt-player-link"
                title="Watch on YouTube"
              >
                <ExternalLink size={14} />
              </a>
            </div>
            <p>{isRecovering ? "Optimizing playback context..." : currentTrack.artist}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="player-controls">
          <div className="buttons-row">
            <button className="ctrl-btn secondary" onClick={previousTrack}><SkipBack fill="white" size={20} /></button>
            <button className="play-btn" onClick={togglePlay}>
              {isPlaying ? <Pause fill="black" size={24} /> : <Play fill="black" size={24} />}
            </button>
            <button className="ctrl-btn secondary" onClick={nextTrack}><SkipForward fill="white" size={20} /></button>
          </div>
          <div className="progress-container">
            <span className="time-label">{formatTime(currentTime)}</span>
            <input 
              type="range" 
              className="seek-slider" 
              min={0} 
              max={duration || 0} 
              value={currentTime} 
              onChange={handleSeek} 
              style={{
                background: `linear-gradient(to right, var(--spotify-green) 0%, var(--spotify-green) ${progressPercent}%, rgba(255,255,255,0.1) ${progressPercent}%, rgba(255,255,255,0.1) 100%)`
              }}
            />
            <span className="time-label">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume / Extra */}
        <div className="player-extra">
          <Volume2 size={20} />
          <input 
            type="range" 
            className="volume-slider" 
            min={0} 
            max={100} 
            value={volume} 
            onChange={handleVolumeChange} 
            style={{
              background: `linear-gradient(to right, #fff 0%, #fff ${volumePercent}%, rgba(255,255,255,0.1) ${volumePercent}%, rgba(255,255,255,0.1) 100%)`
            }}
          />
        </div>
      </div>

      <style jsx>{`
        .player-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 90px;
          z-index: 1000;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(10, 10, 10, 0.95);
          backdrop-filter: blur(20px);
          padding: 0 2rem;
          display: flex;
          align-items: center;
          animation: slideUp 0.5s ease-out;
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .player-content {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 2fr 1fr;
          align-items: center;
        }
        
        .track-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .player-thumb {
          width: 56px;
          height: 56px;
          border-radius: 8px;
          overflow: hidden;
          background: #111;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }
        .player-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .track-details .title-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .yt-player-link {
          color: var(--youtube-red);
          opacity: 0.5;
          transition: all 0.2s;
          margin-top: 2px;
        }
        .yt-player-link:hover {
          opacity: 1;
          transform: scale(1.1);
        }
        .track-details h4 { font-size: 0.9rem; font-weight: 700; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
        .track-details p { font-size: 0.75rem; color: #888; }
 
        .player-controls {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .buttons-row {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .play-btn {
          width: 40px;
          height: 40px;
          background: white;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .play-btn:hover { transform: scale(1.1); }
        .ctrl-btn { background: none; border: none; color: #aaa; cursor: pointer; transition: color 0.2s; }
        .ctrl-btn:hover { color: white; }
 
        .progress-container {
          width: 100%;
          max-width: 500px;
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .time-label {
          font-family: var(--font-geist-mono), monospace;
          font-size: 0.7rem;
          color: #666;
          font-variant-numeric: tabular-nums;
          min-width: 35px;
        }

        /* Custom Sliders */
        input[type="range"] {
          -webkit-appearance: none;
          background: transparent;
          cursor: pointer;
          transition: background 0.1s ease;
          border-radius: 2px;
        }
        input[type="range"]:focus { outline: none; }
        
        /* Progress Slider Track */
        .seek-slider { flex: 1; height: 4px; }
        .seek-slider::-webkit-slider-runnable-track {
          width: 100%;
          height: 4px;
          background: transparent;
          border-radius: 2px;
        }
        .seek-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: var(--spotify-green);
          margin-top: -4px;
          opacity: 0;
          transition: opacity 0.2s;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
        }
        .seek-slider:hover::-webkit-slider-thumb { opacity: 1; }

        .player-extra {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 1rem;
          color: #aaa;
        }
        .volume-slider { width: 100px; height: 4px; }
        .volume-slider::-webkit-slider-runnable-track {
          width: 100%;
          height: 4px;
          background: transparent;
          border-radius: 2px;
        }
        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 10px;
          background: #fff;
          margin-top: -3px;
          width: 10px;
          border-radius: 50%;
          box-shadow: 0 0 5px rgba(0,0,0,0.5);
        }

        /* Support Match Score Font */
        .match-score {
          font-family: var(--font-geist-mono), monospace;
        }
      `}</style>
    </div>
  );
}
