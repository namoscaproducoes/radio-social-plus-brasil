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

          {/* Player and Video Grid */}
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Player Card */}
            <Card className="bg-gray-900 border-4 border-yellow-500 p-8 shadow-2xl">
              <RadioPlayerV2 />
            </Card>

            {/* YouTube Video Card */}
            <Card className="bg-gray-900 border-4 border-yellow-500 p-8 shadow-2xl">
              <YouTubePlayer songTitle={songTitle} artistName={songArtist} />
            </Card>
          </div>
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
              className="w-16 h-16 rounded-lg shadow-lg border-2 border-yellow-500"
            />
          </div>
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* About Link */}
            <div className="text-center">
              <button 
                onClick={() => {
                  document.querySelector('#about-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-white font-bold text-lg hover:text-yellow-500 transition"
              >
                📖 Sobre a Rádio
              </button>
              <p className="text-gray-400 text-sm mt-2">Conheça nossa história e missão</p>
            </div>

            {/* Contact Link */}
            <div className="text-center">
              <a 
                href="https://wa.me/5585999999999?text=Olá%20Rádio%20Social%20Plus%20Brasil"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white font-bold text-lg hover:text-yellow-500 transition inline-block"
              >
                💬 Contato
              </a>
              <p className="text-gray-400 text-sm mt-2">Entre em contato conosco</p>
            </div>

            {/* Dashboard Link */}
            <div className="text-center">
              <button 
                onClick={() => navigate("/dashboard")}
                className="text-white font-bold text-lg hover:text-yellow-500 transition"
              >
                📊 Dashboard
              </button>
              <p className="text-gray-400 text-sm mt-2">Veja o ranking de músicas</p>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-gray-700 pt-8 text-center">
            <p className="text-gray-400 mb-2">© 2026 Rádio Social Plus Brasil. Todos os direitos reservados.</p>
            <p className="text-gray-500 text-sm">Desenvolvido com ❤️ para os fãs de música</p>
          </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
