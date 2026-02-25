import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThumbsUp, ThumbsDown, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Home() {
  const [, navigate] = useLocation();
  const [userVote, setUserVote] = useState<"like" | "dislike" | null>(null);
  const [currentSongTitle, setCurrentSongTitle] = useState<string>("");
  const [currentSongArtist, setCurrentSongArtist] = useState<string>("");

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

  // Extrair informações do player Brascast via postMessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validar origem (segurança)
      if (!event.origin.includes("brascast.com")) return;

      if (event.data?.type === "now_playing") {
        const { title, artist } = event.data;
        setCurrentSongTitle(title || "Música Desconhecida");
        setCurrentSongArtist(artist || "Artista Desconhecido");
        
        // Resetar voto quando música muda
        setUserVote(null);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

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
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="text-white">
            <p className="text-yellow-500 font-bold text-sm mb-4">OUÇA AO VIVO</p>
            <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
              É só apertar o Play.<br />É grátis!
            </h1>
            <p className="text-xl text-gray-200 mb-8">
              Sinta, ouça e compartilhe. Sua rádio online onde e quando você quiser.
            </p>
          </div>

          {/* Player Card com iframe Brascast */}
          <Card className="bg-gray-900 border-2 border-yellow-500 p-0 shadow-2xl overflow-hidden">
            <div className="relative">
              {/* Iframe do Player Brascast */}
              <iframe
                src="https://app.brascast.com/player/01/Y1E4S09xZllBZkJHNG5YZCtuUE9Udz09Ojq26Z34mCavX7uNlzWmksVt"
                style={{
                  width: "100%",
                  height: "500px",
                  border: "none",
                  borderRadius: "8px",
                }}
                allow="autoplay"
                title="Rádio Social Plus Brasil"
              />

              {/* Overlay com botões de voto */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 to-transparent p-6 flex flex-col gap-4">
                {/* Song Info */}
                <div className="text-center">
                  <h3 className="text-lg font-bold text-white truncate">
                    {currentSongTitle || "Carregando..."}
                  </h3>
                  <p className="text-sm text-gray-300 truncate">
                    {currentSongArtist}
                  </p>
                </div>

                {/* Vote Buttons */}
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={() => handleVote("like")}
                    disabled={addVoteMutation.isPending}
                    className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition ${
                      userVote === "like"
                        ? "bg-green-500 hover:bg-green-600 text-white"
                        : "bg-gray-600 hover:bg-gray-700 text-white"
                    }`}
                  >
                    <ThumbsUp size={18} />
                    Gostei
                  </Button>
                  <Button
                    onClick={() => handleVote("dislike")}
                    disabled={addVoteMutation.isPending}
                    className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition ${
                      userVote === "dislike"
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : "bg-gray-600 hover:bg-gray-700 text-white"
                    }`}
                  >
                    <ThumbsDown size={18} />
                    Não Gostei
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 px-4 bg-gray-900">
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
