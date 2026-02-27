import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { RadioPlayerV2 } from "@/components/RadioPlayerV2";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { VoteButtons } from "@/components/VoteButtons";
import { SongHistory } from "@/components/SongHistory";
import { TopVotedSongs } from "@/components/TopVotedSongs";
import { useMetadata } from "@/contexts/MetadataContext";
import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const [, navigate] = useLocation();
  const { albumCover, songTitle, songArtist } = useMetadata();
  const lastSongRef = useRef<string>("");
  const addToHistoryMutation = trpc.songs.addToHistory.useMutation();

  useEffect(() => {
    if (songTitle && songArtist && songTitle !== "Carregando...") {
      const currentSong = `${songTitle}|${songArtist}`;
      if (currentSong !== lastSongRef.current) {
        console.log("Adicionando ao historico:", songTitle, "-", songArtist);
        addToHistoryMutation.mutate({
          title: songTitle,
          artist: songArtist,
          albumCover: albumCover || undefined,
        });
        lastSongRef.current = currentSong;
      }
    }
  }, [songTitle, songArtist, albumCover, addToHistoryMutation]);

  return (
    <div 
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundImage: albumCover ? `url(${albumCover})` : 'linear-gradient(to bottom right, rgb(147, 51, 234), rgb(88, 28, 135), rgb(75, 0, 130))',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Blur Overlay */}
      <div 
        className="absolute inset-0 backdrop-blur-sm"
        style={{
          background: 'rgba(75, 0, 130, 0.4)',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Hero Section */}
        <section className="py-20 px-4 flex-1">
          <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-yellow-500 font-bold text-xs sm:text-sm mb-4">OUÇA AO VIVO</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-4">
              <img 
                src="/logo-radio.png" 
                alt="Rádio Social Plus Brasil" 
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl shadow-lg border-4 border-yellow-500"
              />
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white text-center sm:text-left">
                É só apertar o Play.<br />É grátis!
              </h1>
            </div>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-200 px-2">
              Sinta, ouça e compartilhe. Sua rádio online onde e quando você quiser.
            </p>
          </div>

          {/* Player and Video Container */}
          <Card className="bg-gray-900 border-4 border-yellow-500 p-4 sm:p-6 md:p-8 shadow-2xl max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
              {/* Left: Radio Player */}
              <div className="flex justify-center">
                <div className="w-full max-w-sm">
                  <RadioPlayerV2 />
                </div>
              </div>

              {/* Right: YouTube Video */}
              <div className="flex flex-col gap-4">
                <YouTubePlayer songTitle={songTitle} artistName={songArtist} />
                <VoteButtons />
              </div>
            </div>
          </Card>
          </div>
        </section>

        {/* Song History and Top Voted Section */}
        <section className="py-12 sm:py-16 md:py-20 px-4 bg-gray-800 mt-0">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div className="overflow-hidden">
                <SongHistory />
              </div>
              <div className="overflow-hidden">
                <TopVotedSongs />
              </div>
            </div>
          </div>
        </section>



        {/* Footer */}
        <footer className="bg-gray-950 border-t-4 border-yellow-500 py-8 sm:py-10 md:py-12 px-4 mt-auto">
          <div className="max-w-6xl mx-auto">
          <div className="flex justify-center mb-6 sm:mb-8">
            <img 
              src="/logo-radio.png" 
              alt="Rádio Social Plus Brasil" 
              className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg"
            />
          </div>
          <div className="text-center text-gray-400 mb-4 sm:mb-6">
            <p className="text-xs sm:text-sm md:text-base mb-2">© 2026 Rádio Social Plus Brasil. Todos os direitos reservados.</p>
            <p className="text-xs sm:text-sm">Transmitindo música e emoção 24/7</p>
          </div>
          <div className="flex justify-center gap-6">
            <Button 
              variant="outline" 
              className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-gray-900"
              onClick={() => navigate('/dashboard')}
            >
              Dashboard de Votos
            </Button>
            <Button 
              variant="outline" 
              className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-gray-900"
              onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
            >
              WhatsApp
            </Button>
            <Button 
              variant="outline"
              className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-gray-900"
              onClick={() => window.open('https://instagram.com', '_blank')}
            >
              Instagram
            </Button>
          </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
