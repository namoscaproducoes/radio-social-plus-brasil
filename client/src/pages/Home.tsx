import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useBrascastMetadata } from "@/hooks/useBrascastMetadata";

export default function Home() {
  const [, navigate] = useLocation();
  const [userVote, setUserVote] = useState<"like" | "dislike" | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const metadata = useBrascastMetadata(iframeRef);

  const currentSongTitle = metadata.title;
  const currentSongArtist = metadata.artist;
  const albumCover = metadata.cover;

  // Mutation para adicionar voto
  const addVoteMutation = trpc.songs.vote.useMutation({
    onSuccess: () => {
      toast.success("Voto registrado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao registrar voto:", error);
      toast.error("Erro ao registrar voto");
    },
  });

  // Resetar voto quando música muda
  useEffect(() => {
    setUserVote(null);
  }, [currentSongTitle]);

  // Adicionar voto
  const handleVote = async (voteType: "like" | "dislike") => {
    if (!currentSongTitle) {
      toast.error("Aguarde o carregamento da música");
      return;
    }

    try {
      await addVoteMutation.mutateAsync({
        songTitle: currentSongTitle,
        songArtist: currentSongArtist,
        voteType,
      });

      setUserVote(voteType);
    } catch (err) {
      console.error("Erro ao registrar voto:", err);
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
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-yellow-500 font-bold text-sm mb-4">OUÇA AO VIVO</p>
            <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight text-white">
              É só apertar o Play.<br />É grátis!
            </h1>
            <p className="text-xl text-gray-200">
              Sinta, ouça e compartilhe. Sua rádio online onde e quando você quiser.
            </p>
          </div>

          {/* Player Card - Novo Design */}
          <Card className="bg-gray-900 border-4 border-yellow-500 p-12 shadow-2xl max-w-2xl mx-auto">
            <div className="flex flex-col items-center gap-8">
              
              {/* Album Cover - Grande e em Destaque */}
              <div className="relative">
                {albumCover && albumCover.trim() ? (
                  <img
                    src={albumCover}
                    alt="Album Cover"
                    className="w-64 h-64 rounded-xl shadow-2xl object-cover border-4 border-yellow-500"
                    onError={(e) => {
                      console.warn("Erro ao carregar imagem:", albumCover);
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-64 h-64 bg-gradient-to-br from-purple-600 to-purple-900 rounded-xl shadow-2xl flex items-center justify-center border-4 border-yellow-500">
                    <div className="text-6xl">🎵</div>
                  </div>
                )}
                {/* Live Indicator */}
                <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  AO VIVO
                </div>
              </div>

              {/* Song Info */}
              <div className="text-center w-full">
                <h2 className="text-3xl font-bold text-white mb-2 line-clamp-2">
                  {currentSongTitle || "Carregando..."}
                </h2>
                <p className="text-xl text-gray-300 line-clamp-1">
                  {currentSongArtist}
                </p>
              </div>

              {/* Iframe Hidden - Para capturar dados */}
              <iframe
                ref={iframeRef}
                src="https://app.brascast.com/player/01/Y1E4S09xZllBZkJHNG5YZCtuUE9Udz09Ojq26Z34mCavX7uNlzWmksVt"
                style={{
                  width: "100%",
                  height: "80px",
                  border: "none",
                  borderRadius: "8px",
                }}
                allow="autoplay"
                title="Rádio Social Plus Brasil"
              />

              {/* Vote Buttons */}
              <div className="flex gap-6 w-full justify-center">
                <Button
                  onClick={() => handleVote("like")}
                  disabled={addVoteMutation.isPending}
                  className={`flex items-center gap-3 px-8 py-3 rounded-full font-bold text-lg transition transform hover:scale-105 ${
                    userVote === "like"
                      ? "bg-green-500 hover:bg-green-600 text-white shadow-lg"
                      : "bg-gray-600 hover:bg-gray-700 text-white"
                  }`}
                >
                  <ThumbsUp size={24} />
                  Gostei
                </Button>
                <Button
                  onClick={() => handleVote("dislike")}
                  disabled={addVoteMutation.isPending}
                  className={`flex items-center gap-3 px-8 py-3 rounded-full font-bold text-lg transition transform hover:scale-105 ${
                    userVote === "dislike"
                      ? "bg-red-500 hover:bg-red-600 text-white shadow-lg"
                      : "bg-gray-600 hover:bg-gray-700 text-white"
                  }`}
                >
                  <ThumbsDown size={24} />
                  Não Gostei
                </Button>
              </div>
            </div>
          </Card>
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
      <footer className="bg-gray-950 border-t-4 border-yellow-500 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center text-gray-400">
          <p className="mb-2">© 2026 Rádio Social Plus Brasil. Todos os direitos reservados.</p>
          <p className="text-sm">Desenvolvido com ❤️ para os fãs de música</p>
        </div>
      </footer>
    </div>
  );
}
