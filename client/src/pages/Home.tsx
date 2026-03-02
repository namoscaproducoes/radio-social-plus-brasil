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
      className="h-screen flex flex-col relative bg-gray-950 overflow-hidden"
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
      <div className="relative z-10 flex flex-col h-screen">
        {/* Top Navigation */}
        <nav className="bg-gray-950 border-b border-gray-800 px-3 sm:px-4 py-2 flex-shrink-0">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4 sm:gap-6">
              <img 
                src="/logo-radio.png" 
                alt="Rádio Social Plus Brasil" 
                className="w-8 h-8 rounded-lg"
              />
              <div className="hidden md:flex gap-4 text-xs">
                <a 
                  href="https://radiosocialplusbrasil.com.br/quem-somos/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-white hover:text-yellow-500 transition font-medium"
                >
                  Sobre a rádio
                </a>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="text-white hover:text-yellow-500 transition font-medium"
                >
                  Dashboard mais votadas
                </button>
              </div>
            </div>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-full px-4 py-1 text-xs"
              onClick={() => navigate('/dashboard')}
            >
              ENTRAR
            </Button>
          </div>
        </nav>

        {/* Main Content Grid */}
        <div className="flex-1 px-2 sm:px-3 py-2 overflow-hidden">
          <div className="h-full max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 h-full">
              {/* Left: Player */}
              <div className="lg:col-span-3 flex-shrink-0 flex flex-col">
                <div className="rounded-xl shadow-2xl border h-full flex flex-col" style={{backgroundColor: '#ffac37', borderColor: '#ff9500', borderWidth: '2px'}}>
                  <div className="text-center pt-1 pb-1 flex-shrink-0">
                    <p className="text-white text-xs font-bold opacity-90 tracking-wider">TOCANDO AGORA</p>
                  </div>
                  <div className="flex-1 flex items-center justify-center px-1 pb-1">
                    <RadioPlayerV2 />
                  </div>
                </div>
              </div>

              {/* Center: Video and TOP 5 */}
              <div className="lg:col-span-5 flex flex-col overflow-hidden">
                <div className="bg-gray-900 rounded-lg border border-gray-700 flex flex-col h-full overflow-hidden">
                  <h3 className="text-white text-xs sm:text-sm font-bold mb-1 p-2 pb-0">video clip</h3>
                  <div className="p-2 pt-1 flex-1 flex items-center justify-center relative group">
                    <button className="absolute top-3 right-3 text-white hover:text-yellow-500 transition z-20 opacity-0 group-hover:opacity-100">
                      <Maximize2 size={14} />
                    </button>
                    <div className="w-full h-full">
                      <YouTubePlayer songTitle={songTitle} artistName={songArtist} />
                    </div>
                  </div>
                  <div className="border-t border-gray-700 p-2 flex-shrink-0">
                    <h4 className="text-white text-xs font-bold mb-1">TOP 5</h4>
                    <div className="text-xs">
                      <TopVotedSongs />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Recent Songs */}
              <div className="lg:col-span-4 flex-shrink-0">
                <div className="bg-gray-900 rounded-lg p-2 sm:p-3 border-2 border-gray-700 h-full flex flex-col">
                  <h3 className="text-white text-xs sm:text-sm font-bold mb-2 flex-shrink-0">As últimas tocadas</h3>
                  <div className="space-y-1 overflow-y-auto pr-1 flex-1 text-xs">
                    <SongHistory />
                  </div>
                  {/* Google Ads Banner */}
                  <div className="mt-2 pt-2 border-t border-gray-700 flex-shrink-0">
                    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2249929574270161" crossOrigin="anonymous"></script>
                    <ins className="adsbygoogle" style={{display: 'block'}} data-ad-client="ca-pub-2249929574270161" data-ad-slot="2671039837" data-ad-format="auto" data-full-width-responsive="true"></ins>
                    <script>{`(adsbygoogle = window.adsbygoogle || []).push({});`}</script>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}
