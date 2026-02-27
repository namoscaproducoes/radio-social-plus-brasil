import { createContext, useContext, useState, ReactNode } from 'react';

interface MetadataContextType {
  albumCover: string;
  setAlbumCover: (cover: string) => void;
  songTitle: string;
  setSongTitle: (title: string) => void;
  songArtist: string;
  setSongArtist: (artist: string) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
}

const MetadataContext = createContext<MetadataContextType | undefined>(undefined);

export function MetadataProvider({ children }: { children: ReactNode }) {
  const [albumCover, setAlbumCover] = useState('');
  const [songTitle, setSongTitle] = useState('Carregando...');
  const [songArtist, setSongArtist] = useState('Artista Desconhecido');
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <MetadataContext.Provider
      value={{
        albumCover,
        setAlbumCover,
        songTitle,
        setSongTitle,
        songArtist,
        setSongArtist,
        isPlaying,
        setIsPlaying,
      }}
    >
      {children}
    </MetadataContext.Provider>
  );
}

export function useMetadata() {
  const context = useContext(MetadataContext);
  if (!context) {
    throw new Error('useMetadata deve ser usado dentro de MetadataProvider');
  }
  return context;
}
