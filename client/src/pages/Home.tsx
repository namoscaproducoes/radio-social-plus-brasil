import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { RadioPlayerV2 } from "@/components/RadioPlayerV2";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { VoteButtons } from "@/components/VoteButtons";
import { SongHistory } from "@/components/SongHistory";
import { TopVotedSongs } from "@/components/TopVotedSongs";
import { useMetadata } from "@/contexts/MetadataContext";
import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Maximize2 } from "lucide-react";

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
      className="min-h-screen flex flex-col relative bg-gray-950"
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
          background: 'rgba(0, 0, 0, 0.6)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top Navigation */}
        <nav className="bg-gray-950 border-b border-gray-800 px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-8">
              <img 
                src="/logo-radio.png" 
                alt="Rádio Social Plus Brasil" 
                className="w-10 h-10 rounded-lg"
              />
              <div className="hidden md:flex gap-6">
                <a 
                  href="https://radiosocialplusbrasil.com.br/quem-somos/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-white hover:text-yellow-500 transition text-sm font-medium"
                >
                  Sobre a rádio
                </a>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="text-white hover:text-yellow-500 transition text-sm font-medium"
                >
                  Dashboard mais votadas
                </button>
              </div>
            </div>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-full px-6"
              onClick={() => navigate('/dashboard')}
            >
              ENTRAR
            </Button>
          </div>
        </nav>

        {/* Main Content Grid */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
              {/* Left: Player */}
              <div className="lg:col-span-3">
                <div className="rounded-2xl p-4 sm:p-6 shadow-2xl border-2" style={{backgroundColor: '#ffac37', borderColor: '#ff9500'}}>
                  <div className="text-center mb-4">
                    <p className="text-white text-xs sm:text-sm font-bold opacity-90 tracking-wider">TOCANDO AGORA</p>
                  </div>
                  <div className="scale-90 sm:scale-100 origin-top">
                    <RadioPlayerV2 />
                  </div>
                </div>
              </div>

              {/* Center: Video and TOP 5 */}
              <div className="lg:col-span-5">
                <div className="space-y-3">
                  <div>
                    <h3 className="text-white text-base sm:text-lg font-bold mb-3">video clip</h3>
                    <div className="bg-gray-900 rounded-xl p-3 sm:p-4 border border-gray-700 relative group">
                      <button className="absolute top-3 right-3 text-white hover:text-yellow-500 transition z-20 opacity-0 group-hover:opacity-100">
                        <Maximize2 size={18} />
                      </button>
                      <div className="h-48 sm:h-64">
                        <YouTubePlayer songTitle={songTitle} artistName={songArtist} />
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-900 rounded-xl p-3 sm:p-4 border border-gray-700">
                    <h4 className="text-white text-sm font-bold mb-3">TOP 5</h4>
                    <TopVotedSongs />
                  </div>
                </div>
              </div>

              {/* Right: Recent Songs */}
              <div className="lg:col-span-4">
                <div className="bg-gray-900 rounded-2xl p-4 sm:p-6 border-2 border-gray-700 h-full">
                  <h3 className="text-white text-base sm:text-lg font-bold mb-4">As últimas tocadas</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    <SongHistory />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Google Adsense Banner Area */}
        <section className="bg-gray-950 border-t border-gray-800 px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-gray-400 text-sm">Área para banner Google Adsense</p>
          </div>
        </section>


      </div>
    </div>
  );
}
