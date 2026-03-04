import React, { createContext, useContext, useRef, useState, useCallback } from 'react';

interface PlaybackContextType {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  duration: number;
  setDuration: (duration: number) => void;
  volume: number;
  setVolume: (volume: number) => void;
}

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Função para reconectar ao stream
  const reconnectStream = useCallback(() => {
    if (audioRef.current && isPlaying) {
      console.log('🔄 Tentando reconectar ao stream...');
      const streamUrl = '/api/stream?' + Date.now();
      audioRef.current.src = streamUrl;
      audioRef.current.load();
      audioRef.current.play().catch((err) => {
        console.error('❌ Erro ao reconectar:', err);
      });
    }
  }, [isPlaying]);

  // Handler para erro de stream
  const handleStreamError = useCallback(() => {
    console.log('⚠️ Erro no stream, tentando reconectar em 2 segundos...');
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectStream();
    }, 2000);
  }, [reconnectStream]);

  const value: PlaybackContextType = {
    audioRef,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    volume,
    setVolume,
  };

  return (
    <PlaybackContext.Provider value={value}>
      {children}
      {/* Hidden audio element that persists across navigation */}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          // Não desligar automaticamente se estava tocando
          // Deixar o usuário controlar via botão STOP
        }}
        onError={handleStreamError}
        onEnded={handleStreamError}
      />
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error('usePlayback must be used within PlaybackProvider');
  }
  return context;
}

// Cleanup de timeouts
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    // Cleanup será feito automaticamente pelo React
  });
}
