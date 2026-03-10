import { useLocation } from "wouter";
import { RadioPlayerV2 } from "@/components/RadioPlayerV2";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { VoteButtons } from "@/components/VoteButtons";
import { SongHistory } from "@/components/SongHistory";
import { TopVotedSongsImproved } from "@/components/TopVotedSongsImproved";
import { UserProfile } from "@/components/UserProfile";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useMetadata } from "@/contexts/MetadataContext";
import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Maximize2, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Home() {
  const [, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { albumCover, songTitle, songArtist } = useMetadata();
  const lastSongRef = useRef<string>("");
  const addToHistoryMutation = trpc.songs.addToHistory.useMutation();
  const { isAuthenticated } = useAuth();

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
            <div className="flex items-center gap-2 sm:gap-4">
              <img 
                src="/logo-radio.png" 
                alt="Rádio Social Plus Brasil" 
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg"
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
                  onClick={() => window.open('/dashboard', '_blank')}
                  className="text-white hover:text-yellow-500 transition font-medium"
                >
                  Dashboard mais votadas
                </button>
              </div>
            </div>
            
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white hover:text-yellow-500 transition"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Desktop Buttons */}
            <div className="hidden md:flex gap-2 items-center">
              {isAuthenticated ? (
                <>
                  <NotificationCenter />
                  <UserProfile />
                </>
              ) : (
                <>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full px-4 py-1 text-xs"
                    onClick={() => navigate('/auth/register')}
                  >
                    REGISTRAR
                  </Button>
                  <Button 
                    className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-full px-4 py-1 text-xs"
                    onClick={() => navigate('/auth/login')}
                  >
                    ENTRAR
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-2 pb-2 border-t border-gray-700 pt-2 space-y-2">
              <div className="px-2 py-2 border-b border-gray-700">
                <UserProfile />
              </div>
              <a 
                href="https://radiosocialplusbrasil.com.br/quem-somos/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block text-white hover:text-yellow-500 transition font-medium text-xs py-1"
              >
                Sobre a rádio
              </a>
              <button 
                onClick={() => {
                  window.open('/dashboard', '_blank');
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left text-white hover:text-yellow-500 transition font-medium text-xs py-1"
              >
                Dashboard mais votadas
              </button>
              {!isAuthenticated && (
                <>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full py-1 text-xs mb-2"
                    onClick={() => {
                      navigate('/auth/register');
                      setMobileMenuOpen(false);
                    }}
                  >
                    REGISTRAR
                  </Button>
                  <Button 
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold rounded-full py-1 text-xs"
                    onClick={() => {
                      navigate('/auth/login');
                      setMobileMenuOpen(false);
                    }}
                  >
                    ENTRAR
                  </Button>
                </>
              )}
            </div>
          )}
        </nav>

        {/* Main Content */}
        <div className="flex-1 px-2 sm:px-3 py-2 overflow-y-auto md:overflow-hidden">
          <div className="h-full max-w-7xl mx-auto">
            {/* Desktop Layout */}
            <div className="hidden md:grid grid-cols-12 gap-2 lg:gap-3 h-full">
              {/* Left: Player */}
              <div className="col-span-3 flex-shrink-0 flex flex-col">
                <div className="rounded-xl shadow-2xl border h-full flex flex-col" style={{backgroundColor: '#ffac37', borderColor: '#ff9500', borderWidth: '2px'}}>
                  <div className="text-center pt-2 pb-2 flex-shrink-0 flex items-center justify-center gap-2">
                    {/* Bolinha pulsante */}
                    <div className="relative w-3 h-3">
                      <div className="absolute inset-0 bg-red-600 rounded-full animate-pulse"></div>
                      <div className="absolute inset-0 bg-red-600 rounded-full opacity-75 animate-ping"></div>
                    </div>
                    {/* Botão AO VIVO */}
                    <button className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition-colors duration-200">
                      AO VIVO
                    </button>
                  </div>
                  <div className="flex-1 flex items-center justify-center px-1 pb-1">
                    <RadioPlayerV2 />
                  </div>
                </div>
              </div>

              {/* Center: Video and TOP 5 */}
              <div className="col-span-5 flex flex-col overflow-hidden">
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
                    <div className="text-xs">
                      <TopVotedSongsImproved />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Recent Songs */}
              <div className="col-span-4 flex-shrink-0">
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

            {/* Mobile Layout - Stacked */}
            <div className="md:hidden flex flex-col gap-2 h-full overflow-y-auto pb-2">
              {/* Player */}
              <div className="flex-shrink-0">
                <div className="rounded-xl shadow-2xl border flex flex-col" style={{backgroundColor: '#ffac37', borderColor: '#ff9500', borderWidth: '2px', minHeight: '280px'}}>
                  <div className="text-center pt-2 pb-2 flex-shrink-0 flex items-center justify-center gap-2">
                    {/* Bolinha pulsante */}
                    <div className="relative w-3 h-3">
                      <div className="absolute inset-0 bg-red-600 rounded-full animate-pulse"></div>
                      <div className="absolute inset-0 bg-red-600 rounded-full opacity-75 animate-ping"></div>
                    </div>
                    {/* Botão AO VIVO */}
                    <button className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition-colors duration-200">
                      AO VIVO
                    </button>
                  </div>
                  <div className="flex-1 flex items-center justify-center px-1 pb-1 min-h-0">
                    <RadioPlayerV2 />
                  </div>
                </div>
              </div>

              {/* Video Clip and TOP 5 */}
              <div className="flex-shrink-0">
                <div className="bg-gray-900 rounded-lg border border-gray-700 flex flex-col" style={{minHeight: '300px'}}>
                  <h3 className="text-white text-xs font-bold mb-1 p-2 pb-0">video clip</h3>
                  <div className="p-2 pt-1 flex-1 flex items-center justify-center relative group">
                    <button className="absolute top-3 right-3 text-white hover:text-yellow-500 transition z-20 opacity-0 group-hover:opacity-100">
                      <Maximize2 size={14} />
                    </button>
                    <div className="w-full h-full">
                      <YouTubePlayer songTitle={songTitle} artistName={songArtist} />
                    </div>
                  </div>
                  <div className="border-t border-gray-700 p-2 flex-shrink-0">
                    <div className="text-xs">
                      <TopVotedSongsImproved />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Songs */}
              <div className="flex-shrink-0">
                <div className="bg-gray-900 rounded-lg p-2 border-2 border-gray-700 flex flex-col" style={{minHeight: '250px'}}>
                  <h3 className="text-white text-xs font-bold mb-2 flex-shrink-0">As últimas tocadas</h3>
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
