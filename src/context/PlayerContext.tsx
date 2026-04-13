"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

/**
 * Global Player Context for TrebleMaker
 * Manages the current track and playback status.
 */

export interface TrackMetadata {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  source: "youtube" | "spotify";
}

interface PlayerContextType {
  currentTrack: TrackMetadata | null;
  isPlaying: boolean;
  notification: { message: string; type: "info" | "error" | "warning" } | null;
  queue: TrackMetadata[];
  currentIndex: number;
  playTrack: (track: TrackMetadata, newQueue?: TrackMetadata[]) => void;
  togglePlay: () => void;
  pause: () => void;
  setNotification: (msg: string, type?: "info" | "error" | "warning") => void;
  clearNotification: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<TrackMetadata | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [notification, setNotificationState] = useState<{ message: string; type: "info" | "error" | "warning" } | null>(null);
  const [queue, setQueue] = useState<TrackMetadata[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  const playTrack = (track: TrackMetadata, newQueue?: TrackMetadata[]) => {
    if (newQueue) {
      setQueue(newQueue);
      const idx = newQueue.findIndex(t => t.id === track.id);
      setCurrentIndex(idx !== -1 ? idx : 0);
    } else if (queue.length > 0) {
      const idx = queue.findIndex(t => t.id === track.id);
      if (idx !== -1) setCurrentIndex(idx);
    }
    
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const nextTrack = () => {
    if (queue.length > 0 && currentIndex < queue.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setCurrentTrack(queue[nextIdx]);
      setIsPlaying(true);
    }
  };

  const previousTrack = () => {
    if (queue.length > 0 && currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      setCurrentTrack(queue[prevIdx]);
      setIsPlaying(true);
    }
  };

  const togglePlay = () => setIsPlaying(!isPlaying);
  const pause = () => setIsPlaying(false);

  const setNotification = (message: string, type: "info" | "error" | "warning" = "info") => {
    setNotificationState({ message, type });
    // Auto-clear after 5 seconds
    setTimeout(() => {
      setNotificationState(null);
    }, 5000);
  };

  const clearNotification = () => setNotificationState(null);

  return (
    <PlayerContext.Provider value={{ 
      currentTrack, 
      isPlaying, 
      notification, 
      queue,
      currentIndex,
      playTrack, 
      togglePlay, 
      pause, 
      setNotification, 
      clearNotification,
      nextTrack,
      previousTrack
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}
