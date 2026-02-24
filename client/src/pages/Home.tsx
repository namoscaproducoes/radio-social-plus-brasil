import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Volume2, Play, Pause, ThumbsUp, ThumbsDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

interface CurrentSongData {
  title: string;
  artist: string;
  albumCover?: string | null;
}

export default function Home() {
  const [, navigate] = useLocation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [currentSong, setCurrentSong] = useState<CurrentSongData | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [userVote, setUserVote] = useState<"like" | "dislike" | null>(null);

  // Fetch current song
  const { data: songData } = trpc.songs.current.useQuery(undefined, {
    refetchInterval: 5000, // Atualizar a cada 5 segundos
  });

  // Mutation para adicionar voto
  const addVoteMutation = trpc.votes.add.useMutation();

  // Inicializar áudio ao montar
  useEffect(() => {
    const audioElement = new Audio();
    audioElement.src = "https://hts09.kshost.com.br:9608";
    audioElement.crossOrigin = "anonymous";
    audioElement.volume = volume / 100;
    setAudio(audioElement);

    return () => {
      audioElement.pause();
      audioElement.src = "";
    };
  }, []);

  // Atualizar volume
  useEffect(() => {
    if (audio) {
      audio.volume = volume / 100;
    }
  }, [volume, audio]);

  // Atualizar dados da música atual
  useEffect(() => {
    if (songData) {
      setCurrentSong({
        title: songData.title || "Música Desconhecida",
        artist: songData.artist || "Artista Desconhecido",
        albumCover: songData.albumCover,
      });
      setUserVote(null); // Reset vote quando muda a música
    }
  }, [songData]);

  // Controlar play/pause
  const handlePlayPause = async () => {
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Erro ao reproduzir áudio:", error);
    }
  };

  // Adicionar voto
  const handleVote = async (voteType: "like" | "dislike") => {
    if (!currentSong) return;

    try {
      // Criar ou encontrar a música no banco
      const songId = 1; // Será atualizado com ID real da música

      await addVoteMutation.mutateAsync({
        songId,
        voteType,
        userId: `user_${Math.random().toString(36).substr(2, 9)}`,
        userAgent: navigator.userAgent,
      });

      setUserVote(voteType);
    } catch (error) {
      console.error("Erro ao registrar voto:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900">
      {/* Navigation */}
      <nav className="bg-gray-900 border-b-4 border-yellow-500 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center font-bold text-gray-900">
              P
            </div>
            <span className="text-white font-bold text-lg">Rádio Social Plus</span>
          </div>
          <div className="hidden md:flex gap-6 text-white text-sm">
            <a href="#" className="hover:text-yellow-500 transition">AO VIVO</a>
            <a href="#" className="hover:text-yellow-500 transition">SOBRE</a>
            <a href="#" className="hover:text-yellow-500 transition">CONTATO</a>
            <Button 
              onClick={() => navigate("/dashboard")}
              className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold"
            >
              Dashboard
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="text-white">
            <p className="text-yellow-500 font-bold text-sm mb-4">OUÇA AO VIVO</p>
            <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
              É só apertar o Play.<br />É grátis!
            </h1>
            <p className="text-xl text-gray-200 mb-8">
              Sinta, ouça e compartilhe. Sua rádio online onde e quando você quiser.
            </p>
            <Button 
              onClick={handlePlayPause}
              className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold px-8 py-6 text-lg rounded-full flex items-center gap-2"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              {isPlaying ? "Pausar" : "Ouvir Agora"}
            </Button>
          </div>

          {/* Player Card */}
          <Card className="bg-gray-900 border-2 border-yellow-500 p-8 shadow-2xl">
            <div className="text-center">
              <p className="text-yellow-500 font-bold text-sm mb-4">TOCANDO AGORA</p>

              {/* Album Cover */}
              <div className="mb-6 flex justify-center">
                {currentSong?.albumCover ? (
            <img
                    src={currentSong?.albumCover || ""}
                    alt="Album Cover"
                    className="w-48 h-48 rounded-lg shadow-lg object-cover"
                  />
                ) : (
                  <div className="w-48 h-48 bg-gradient-to-br from-purple-600 to-purple-900 rounded-lg shadow-lg flex items-center justify-center">
                    <Heart size={64} className="text-yellow-500" />
                  </div>
                )}
              </div>

              {/* Song Info */}
              <h2 className="text-2xl font-bold text-white mb-2">
                {currentSong?.title || "Carregando..."}
              </h2>
              <p className="text-gray-400 mb-6">
                {currentSong?.artist || "Artista Desconhecido"}
              </p>

              {/* Player Controls */}
              <div className="flex justify-center gap-4 mb-6">
                <Button
                  onClick={handlePlayPause}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-full p-3"
                >
                  {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                </Button>
                <div className="flex items-center gap-2 bg-gray-800 rounded-full px-4">
                  <Volume2 size={20} className="text-gray-400" />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-24"
                  />
                </div>
              </div>

              {/* Vote Buttons */}
              <div className="flex justify-center gap-4">
                <Button
                  onClick={() => handleVote("like")}
                  className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition ${
                    userVote === "like"
                      ? "bg-green-500 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  <ThumbsUp size={20} />
                  Gostei
                </Button>
                <Button
                  onClick={() => handleVote("dislike")}
                  className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition ${
                    userVote === "dislike"
                      ? "bg-red-500 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  <ThumbsDown size={20} />
                  Não Gostei
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 px-4 bg-gray-900 bg-opacity-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Sobre a Rádio Social Plus Brasil
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-gray-800 border-yellow-500 p-6">
              <h3 className="text-xl font-bold text-yellow-500 mb-3">Ao Vivo</h3>
              <p className="text-gray-300">
                Transmissão ao vivo 24 horas por dia, 7 dias por semana. Sempre com as melhores músicas e conteúdo de qualidade.
              </p>
            </Card>
            <Card className="bg-gray-800 border-yellow-500 p-6">
              <h3 className="text-xl font-bold text-yellow-500 mb-3">Comunidade</h3>
              <p className="text-gray-300">
                Faça parte de uma comunidade vibrante de ouvintes. Vote nas suas músicas favoritas e veja o ranking em tempo real.
              </p>
            </Card>
            <Card className="bg-gray-800 border-yellow-500 p-6">
              <h3 className="text-xl font-bold text-yellow-500 mb-3">Gratuito</h3>
              <p className="text-gray-300">
                Acesso 100% gratuito a todo o conteúdo. Ouça quando quiser, onde quiser, sem limitações.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t-4 border-yellow-500 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center text-gray-400">
          <p>&copy; 2026 Rádio Social Plus Brasil. Todos os direitos reservados.</p>
          <p className="mt-2">Sinta, ouça e compartilhe!</p>
        </div>
      </footer>
    </div>
  );
}
