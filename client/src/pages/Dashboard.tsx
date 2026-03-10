import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ThumbsUp, ThumbsDown, Music } from "lucide-react";
import { useMetadata } from "@/contexts/MetadataContext";

type Period = "day" | "week" | "month" | "year";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState<Period>("week");
  const [genreId, setGenreId] = useState<number | undefined>(undefined);
  const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(null);
  const { albumCover, songTitle, songArtist, setAlbumCover, setSongTitle, setSongArtist } = useMetadata();
  const [currentSongId, setCurrentSongId] = useState<number | null>(null);

  // Buscar metadados do player ao vivo
  const { data: metadataResponse } = trpc.songs.metadata.useQuery(
    undefined,
    {
      refetchInterval: 1000, // Atualizar a cada 1 segundo
    }
  );

  // Atualizar MetadataContext com dados do player
  useEffect(() => {
    if (metadataResponse) {
      setSongTitle(metadataResponse.title);
      setSongArtist(metadataResponse.artist);
      setAlbumCover(metadataResponse.albumCover || '');
    }
  }, [metadataResponse, setSongTitle, setSongArtist, setAlbumCover]);

  // Fetch dashboard stats
  const { data: rankingData } = trpc.songs.ranking.useQuery(
    { period: period as any, genreId },
    {
      refetchInterval: 5000, // Atualizar a cada 5 segundos para refletir novos votos
    }
  );

  // Buscar música atual pelo título e artista
  const { data: currentSong } = trpc.songs.getSongIdByMetadata.useQuery(
    { title: songTitle || '', artist: songArtist || '' },
    {
      enabled: !!(songTitle && songTitle !== 'Carregando...' && songArtist && songArtist !== 'Artista Desconhecido'),
    }
  );

  // Atualizar ID da música atual quando encontrada
  if (currentSong && !currentSongId) {
    setCurrentSongId(currentSong.id);
  }

  // Extrair dados do novo formato
  const rankingData_ = rankingData as any;
  const rankingRows = rankingData_?.songs || (Array.isArray(rankingData) ? rankingData : []);
  
  const topSongs = rankingRows.map((song: any) => ({
    ...song,
    likePercentage: song.totalVotes > 0 ? Math.round((song.likes / song.totalVotes) * 100) : 0,
  }));
  
  // Calcular totais manualmente no frontend para evitar problemas de serialização
  let totalLikesCalc = 0;
  let totalDislikesCalc = 0;
  let totalVotesCalc = 0;
  
  for (const song of topSongs) {
    totalLikesCalc += song.likes || 0;
    totalDislikesCalc += song.dislikes || 0;
    totalVotesCalc += song.totalVotes || 0;
  }
  
  const stats = {
    totalVotes: totalVotesCalc,
    totalLikes: totalLikesCalc,
    totalDislikes: totalDislikesCalc,
    totalSongs: topSongs.length,
  };
  
  // Obter música mais votada
  const mostVotedSong = topSongs.length > 0 ? topSongs[0] : null;
  
  // Mutation para adicionar voto
  const addVoteMutation = trpc.votes.addVote.useMutation({
    onSuccess: () => {
      // Invalidar dados para atualizar
      trpc.useUtils().songs.ranking.invalidate();
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center">
        <div className="text-white text-2xl">Carregando...</div>
      </div>
    );
  }

  // Preparar dados para gráficos
  const chartData = topSongs?.map((song: any) => ({
    name: (song.title || "Música").substring(0, 20),
    likes: song.likes || 0,
    dislikes: song.dislikes || 0,
  })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900">
      {/* Navigation */}
      <nav className="bg-gray-900 border-b-4 border-yellow-500 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center font-bold text-gray-900">
              P
            </div>
            <span className="text-white font-bold text-lg">Dashboard - Rádio Social Plus</span>
          </div>
          <div className="flex gap-4 items-center">
            {user && <span className="text-gray-300">{user.name}</span>}
            <Button 
              onClick={() => navigate("/")}
              className="bg-gray-700 hover:bg-gray-600 text-white"
            >
              Home
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-8">
          <Card className="bg-gray-800 border-yellow-500 p-3 md:p-6">
            <div className="text-gray-400 text-xs md:text-sm mb-2">Músicas Votadas</div>
            <div className="text-2xl md:text-3xl font-bold text-yellow-500">{topSongs.length}</div>
          </Card>
          <Card className="bg-gray-800 border-yellow-500 p-3 md:p-6">
            <div className="text-gray-400 text-xs md:text-sm mb-2">Total de Votos</div>
            <div className="text-2xl md:text-3xl font-bold text-yellow-500">{(stats as any)?.totalVotes || 0}</div>
          </Card>
          <Card className="bg-gray-800 border-green-500 p-3 md:p-6 col-span-2 md:col-span-1">
            <div className="text-gray-400 text-xs md:text-sm mb-2">Música Mais Votada</div>
            <div className="text-sm md:text-lg font-bold text-green-500 truncate">{mostVotedSong?.title || "N/A"}</div>
            <div className="text-xs text-gray-400 mt-1 truncate">{mostVotedSong?.artist || ""}</div>
          </Card>
          <Card className="bg-gray-800 border-yellow-500 p-3 md:p-6 col-span-2 md:col-span-1">
            <div className="text-gray-400 text-xs md:text-sm mb-2">Votos Totais</div>
            <div className="text-2xl md:text-3xl font-bold text-yellow-500">{mostVotedSong?.totalVotes || 0}</div>
          </Card>
        </div>

        {/* Period Filter */}
        <Card className="bg-gray-800 border-yellow-500 p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Filtrar por Período</h2>
          <div className="flex gap-2 flex-wrap">
            {(["day", "week", "month", "year"] as const).map((p) => (
              <Button
                key={p}
                onClick={() => setPeriod(p)}
                className={`font-bold transition ${
                  period === p
                    ? "bg-yellow-500 text-gray-900"
                    : "bg-gray-700 text-white hover:bg-gray-600"
                }`}
              >
                {p === "day" && "Hoje"}
                {p === "week" && "Esta Semana"}
                {p === "month" && "Este Mês"}
                {p === "year" && "Este Ano"}
              </Button>
            ))}
          </div>
        </Card>

        {/* Charts and Now Playing */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Bar Chart */}
          <Card className="bg-gray-800 border-yellow-500 p-6 lg:col-span-2">
            <h2 className="text-xl font-bold text-white mb-4">Ranking de Músicas</h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="name" stroke="#999" />
                  <YAxis stroke="#999" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #fbbf24" }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Legend />
                  <Bar dataKey="likes" fill="#10b981" />
                  <Bar dataKey="dislikes" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                Nenhum dado disponível para este período
              </div>
            )}
          </Card>

          {/* Now Playing */}
          <Card className="bg-gray-800 border-yellow-500 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Tocando Agora</h2>
            {songTitle && songTitle !== 'Carregando...' ? (
              <div className="flex flex-col items-center gap-4">
                {/* Album Cover */}
                <div className="w-full aspect-square bg-gray-700 rounded-lg overflow-hidden">
                  {albumCover ? (
                    <img 
                      src={albumCover} 
                      alt={songTitle}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music size={48} className="text-gray-500" />
                    </div>
                  )}
                </div>
                
                {/* Song Info */}
                <div className="text-center w-full">
                  <h3 className="text-lg font-bold text-white truncate">{songTitle}</h3>
                  <p className="text-sm text-gray-400 truncate">{songArtist}</p>
                </div>
                
                {/* Vote Buttons - usar música atual encontrada no banco */}
                {currentSong && (
                  <div className="flex gap-4 w-full">
                    <Button
                      onClick={() => {
                        addVoteMutation.mutate({
                          songId: currentSong.id,
                          voteType: 'like',
                        });
                        setUserVote('like');
                      }}
                      disabled={addVoteMutation.isPending}
                      className={`flex-1 flex items-center justify-center gap-2 ${
                        userVote === 'like'
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      <ThumbsUp size={20} />
                      Gostei
                    </Button>
                    <Button
                      onClick={() => {
                        addVoteMutation.mutate({
                          songId: currentSong.id,
                          voteType: 'dislike',
                        });
                        setUserVote('dislike');
                      }}
                      disabled={addVoteMutation.isPending}
                      className={`flex-1 flex items-center justify-center gap-2 ${
                        userVote === 'dislike'
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      <ThumbsDown size={20} />
                      Não Gostei
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                <p>Carregando música ao vivo...</p>
              </div>
            )}
          </Card>
        </div>

        {/* Top Songs Table */}
        <Card className="bg-gray-800 border-yellow-500 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Músicas Mais Votadas</h2>
          {topSongs && topSongs.length > 0 ? (
            <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-2 md:px-4 text-gray-300">Pos</th>
                    <th className="text-left py-3 px-2 md:px-4 text-gray-300">Música</th>
                    <th className="text-left py-3 px-2 md:px-4 text-gray-300 hidden sm:table-cell">Artista</th>
                    <th className="text-center py-3 px-2 md:px-4 text-green-500">👍</th>
                    <th className="text-center py-3 px-2 md:px-4 text-red-500">👎</th>
                    <th className="text-center py-3 px-2 md:px-4 text-yellow-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {topSongs.map((song: any, index: number) => (
                    <tr key={song.id} className="border-b border-gray-700 hover:bg-gray-700 transition">
                      <td className="py-3 px-2 md:px-4 text-white font-bold">{index + 1}</td>
                      <td className="py-3 px-2 md:px-4 text-white text-xs md:text-sm">{song.title}</td>
                      <td className="py-3 px-2 md:px-4 text-gray-300 text-xs md:text-sm hidden sm:table-cell">{song.artist}</td>
                      <td className="py-3 px-2 md:px-4 text-center">
                        <span className="inline-flex items-center gap-1 bg-green-900 text-green-200 px-2 py-1 rounded text-xs">
                          {song.likes}
                        </span>
                      </td>
                      <td className="py-3 px-2 md:px-4 text-center">
                        <span className="inline-flex items-center gap-1 bg-red-900 text-red-200 px-2 py-1 rounded text-xs">
                          {song.dislikes}
                        </span>
                      </td>
                      <td className="py-3 px-2 md:px-4 text-center text-yellow-500 font-bold text-xs md:text-sm">
                        {song.totalVotes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400">
              <Music size={48} className="mx-auto mb-4 opacity-50" />
              Nenhuma música votada neste período
            </div>
          )}
        </Card>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 border-t-4 border-yellow-500 py-8 px-4 mt-12">
        <div className="max-w-6xl mx-auto text-center text-gray-400">
          <p>&copy; 2026 Rádio Social Plus Brasil. Dashboard Administrativo.</p>
        </div>
      </footer>
    </div>
  );
}
