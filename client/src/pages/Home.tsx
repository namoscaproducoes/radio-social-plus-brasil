import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Volume2, Play, Pause, ThumbsUp, ThumbsDown, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";

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
  const [userVote, setUserVote] = useState<"like" | "dislike" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const lastSongRef = useRef<string>("");

  // Fetch metadados da música
  const { data: metadataData, refetch: refetchMetadata } = trpc.songs.metadata.useQuery(undefined, {
    refetchInterval: 3000, // Atualizar a cada 3 segundos
  });

  // Mutation para adicionar voto
  const addVoteMutation = trpc.votes.add.useMutation({
    onSuccess: () => {
      toast.success("Voto registrado!");
    },
    onError: (error) => {
      console.error("Erro ao registrar voto:", error);
      toast.error("Erro ao registrar voto");
    },
  });

  // Inicializar player
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Configurar eventos de áudio
    const handleCanPlay = () => {
      console.log("✓ Stream pronto para reproduzir");
      setError(null);
      setIsLoading(false);
    };

    const handlePlay = () => {
      console.log("✓ Áudio iniciado");
      setIsPlaying(true);
      retryCountRef.current = 0;
    };

    const handlePause = () => {
      console.log("⏸ Áudio pausado");
      setIsPlaying(false);
    };

    const handleEnded = () => {
      console.log("✓ Stream finalizado");
      setIsPlaying(false);
    };

    const handleError = (e: Event) => {
      const audioElement = e.target as HTMLAudioElement;
      const errorCode = audioElement.error?.code;
      const errorMessage = audioElement.error?.message;

      console.error("Erro de áudio:", { errorCode, errorMessage });

      let userMessage = "Erro ao conectar ao stream";
      switch (errorCode) {
        case 1: // MEDIA_ERR_ABORTED
          userMessage = "Reprodução cancelada";
          break;
        case 2: // MEDIA_ERR_NETWORK
          userMessage = "Erro de conexão com o stream";
          break;
        case 3: // MEDIA_ERR_DECODE
          userMessage = "Erro ao decodificar o stream";
          break;
        case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
          userMessage = "Formato de stream não suportado";
          break;
      }

      setError(userMessage);
      setIsPlaying(false);
      setIsLoading(false);

      // Retry automático
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current += 1;
        console.log(`Tentando reconectar... (${retryCountRef.current}/${maxRetries})`);
        setTimeout(() => {
          audio.load();
        }, 2000);
      }
    };

    const handleLoadStart = () => {
      console.log("⏳ Carregando stream...");
      setIsLoading(true);
    };

    // Configurar URL do proxy
    audio.src = "/api/stream";
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";

    // Adicionar event listeners
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("loadstart", handleLoadStart);

    return () => {
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("loadstart", handleLoadStart);
    };
  }, []);

  // Atualizar volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Atualizar dados da música atual
  useEffect(() => {
    if (metadataData) {
      const songKey = `${metadataData.artist}-${metadataData.title}`;
      
      // Se a música mudou, resetar o voto
      if (songKey !== lastSongRef.current) {
        lastSongRef.current = songKey;
        setUserVote(null);
      }

      setCurrentSong({
        title: metadataData.title || "Música Desconhecida",
        artist: metadataData.artist || "Artista Desconhecido",
        albumCover: metadataData.albumCover,
      });
    }
  }, [metadataData]);

  // Controlar play/pause
  const handlePlayPause = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setIsLoading(true);
        setError(null);
        
        // Aguardar um pouco antes de tentar reproduzir
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
      }
    } catch (err: any) {
      console.error("Erro ao reproduzir áudio:", err.message);
      
      // Não mostrar erro se foi interrompido intencionalmente
      if (err.name !== "AbortError") {
        setError("Erro ao reproduzir o stream. Tente novamente.");
      }
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  // Adicionar voto
  const handleVote = async (voteType: "like" | "dislike") => {
    if (!currentSong) {
      toast.error("Aguarde o carregamento da música");
      return;
    }

    try {
      // Usar um ID baseado na música atual
      const songId = 1; // Em produção, seria um ID real da música
      const userId = `user_${Math.random().toString(36).substr(2, 9)}`;

      await addVoteMutation.mutateAsync({
        songId,
        voteType,
        userId,
        userAgent: navigator.userAgent,
      });

      setUserVote(voteType);
    } catch (err) {
      console.error("Erro ao registrar voto:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900">
      {/* Audio Element */}
      <audio ref={audioRef} />

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
              disabled={isLoading}
              className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-400 text-white font-bold px-8 py-6 text-lg rounded-full flex items-center gap-2"
            >
              {isPlaying ? (
                <>
                  <Pause size={24} />
                  Pausar
                </>
              ) : (
                <>
                  <Play size={24} />
                  Ouvir Agora
                </>
              )}
            </Button>
          </div>

          {/* Player Card */}
          <Card className="bg-gray-900 border-2 border-yellow-500 p-8 shadow-2xl">
            <div className="text-center">
              <p className="text-yellow-500 font-bold text-sm mb-4">TOCANDO AGORA</p>

              {/* Error Message */}
              {error && (
                <div className="mb-6 bg-red-900 border border-red-500 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-200 text-sm text-left">{error}</p>
                </div>
              )}

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
                  {isPlaying ? (
                    <Pause size={24} />
                  ) : (
                    <Play size={24} />
                  )}
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

              {/* Status */}
              {isPlaying && (
                <p className="text-sm text-green-400 mb-4">🔴 Ao vivo</p>
              )}

              {/* Vote Buttons */}
              <div className="flex justify-center gap-4">
                <Button
                  onClick={() => handleVote("like")}
                  disabled={addVoteMutation.isPending}
                  className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition disabled:opacity-50 ${
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
                  disabled={addVoteMutation.isPending}
                  className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition disabled:opacity-50 ${
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
