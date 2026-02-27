import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { RadioPlayerV2 } from "@/components/RadioPlayerV2";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { SongHistory } from "@/components/SongHistory";
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
            <p className="text-yellow-500 font-bold text-sm mb-4">OUÇA AO VIVO</p>
            <div className="flex items-center justify-center gap-6 mb-4">
              <img 
                src="/logo-radio.png" 
                alt="Rádio Social Plus Brasil" 
                className="w-32 h-32 rounded-2xl shadow-lg border-4 border-yellow-500"
              />
              <h1 className="text-5xl md:text-6xl font-bold leading-tight text-white">
                É só apertar o Play.<br />É grátis!
              </h1>
            </div>
            <p className="text-xl text-gray-200">
              Sinta, ouça e compartilhe. Sua rádio online onde e quando você quiser.
            </p>
          </div>

          {/* Player and Video Container */}
          <Card className="bg-gray-900 border-4 border-yellow-500 p-8 shadow-2xl max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 h-full">
              {/* Left: Album Cover and Radio Player */}
              <div className="flex flex-col gap-6">
                {/* Album Cover */}
                <div className="w-full aspect-square rounded-lg overflow-hidden border-2 border-yellow-500 shadow-lg">
                  {albumCover ? (
                    <img
                      src={albumCover}
                      alt="Album Cover"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-900 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-6xl mb-4">🎵</div>
                        <p className="text-gray-400">Sem capa</p>
                      </div>
                    </div>
                  )}
                </div>
                {/* Radio Player */}
                <div>
                  <RadioPlayerV2 />
                </div>
              </div>

              {/* Right: YouTube Video */}
              <div className="flex flex-col">
                <YouTubePlayer songTitle={songTitle} artistName={songArtist} />
              </div>
            </div>
          </Card>
          </div>
        </section>

        {/* Song History Section */}
        <section className="py-20 px-4 bg-gray-800 mt-0">
          <div className="max-w-6xl mx-auto">
            <SongHistory />
          </div>
        </section>

        {/* About Section */}
        <section className="py-20 px-4 bg-gray-900 mt-20">
          <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-8 text-center">
            Sobre a Rádio Social Plus Brasil
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-purple-800 border-2 border-yellow-500 p-6">
              <h3 className="text-xl font-bold text-yellow-500 mb-3">🎵 Música Diversa</h3>
              <p className="text-gray-200">
                Ouça o melhor da música brasileira e internacional, selecionada especialmente para você.
              </p>
            </Card>
            <Card className="bg-purple-800 border-2 border-yellow-500 p-6">
              <h3 className="text-xl font-bold text-yellow-500 mb-3">📱 Sempre Conectado</h3>
              <p className="text-gray-200">
                Ouça em qualquer lugar, a qualquer hora. No celular, tablet ou computador.
              </p>
            </Card>
            <Card className="bg-purple-800 border-2 border-yellow-500 p-6">
              <h3 className="text-xl font-bold text-yellow-500 mb-3">❤️ Sua Opinião Importa</h3>
              <p className="text-gray-200">
                Vote nas suas músicas favoritas e ajude a moldar a programação da rádio.
              </p>
            </Card>
          </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-950 border-t-4 border-yellow-500 py-12 px-4 mt-auto">
          <div className="max-w-6xl mx-auto">
          <div className="flex justify-center mb-8">
            <img 
              src="/logo-radio.png" 
              alt="Rádio Social Plus Brasil" 
              className="w-16 h-16 rounded-lg"
            />
          </div>
          <div className="text-center text-gray-400 mb-6">
            <p className="mb-2">© 2026 Rádio Social Plus Brasil. Todos os direitos reservados.</p>
            <p className="text-sm">Transmitindo música e emoção 24/7</p>
          </div>
          <div className="flex justify-center gap-6">
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
