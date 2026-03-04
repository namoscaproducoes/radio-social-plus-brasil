import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ThumbsUp, ThumbsDown, Music } from "lucide-react";

type Period = "day" | "week" | "month" | "year";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState<Period>("week");

  // Fetch dashboard stats
  const { data: rankingData } = trpc.songs.ranking.useQuery(
    { period: period as any },
    {
      refetchInterval: 5000, // Atualizar a cada 5 segundos para refletir novos votos
    }
  );

  const rankingRows = Array.isArray(rankingData) ? rankingData : [];
  const topSongs = rankingRows.map((song: any) => ({
    ...song,
    likePercentage: song.totalVotes > 0 ? Math.round((song.likes / song.totalVotes) * 100) : 0,
  }));
  
  const stats = {
    totalVotes: topSongs.reduce((sum: number, song: any) => sum + (song.totalVotes || 0), 0),
    totalLikes: topSongs.reduce((sum: number, song: any) => sum + (song.likes || 0), 0),
    totalDislikes: topSongs.reduce((sum: number, song: any) => sum + (song.dislikes || 0), 0),
    totalSongs: topSongs.length,
  };

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

  const pieData = [
    { name: "Likes", value: (stats as any)?.totalLikes || 0 },
    { name: "Dislikes", value: (stats as any)?.totalDislikes || 0 },
  ];

  const COLORS = ["#10b981", "#ef4444"];

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
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-800 border-yellow-500 p-6">
            <div className="text-gray-400 text-sm mb-2">Músicas Votadas</div>
            <div className="text-3xl font-bold text-yellow-500">{topSongs.length}</div>
          </Card>
          <Card className="bg-gray-800 border-yellow-500 p-6">
            <div className="text-gray-400 text-sm mb-2">Total de Votos</div>
            <div className="text-3xl font-bold text-yellow-500">{(stats as any)?.totalVotes || 0}</div>
          </Card>
          <Card className="bg-gray-800 border-green-500 p-6">
            <div className="text-gray-400 text-sm mb-2">Total de Likes</div>
            <div className="text-3xl font-bold text-green-500">{(stats as any)?.totalLikes || 0}</div>
          </Card>
          <Card className="bg-gray-800 border-red-500 p-6">
            <div className="text-gray-400 text-sm mb-2">Total de Dislikes</div>
            <div className="text-3xl font-bold text-red-500">{(stats as any)?.totalDislikes || 0}</div>
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

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
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

          {/* Pie Chart */}
          <Card className="bg-gray-800 border-yellow-500 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Proporção de Votos</h2>
            {stats && ((stats as any).totalLikes || (stats as any).totalDislikes) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={COLORS[pieData.indexOf(entry) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #fbbf24" }}
                    labelStyle={{ color: "#fff" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                Nenhum voto registrado
              </div>
            )}
          </Card>
        </div>

        {/* Top Songs Table */}
        <Card className="bg-gray-800 border-yellow-500 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Músicas Mais Votadas</h2>
          {topSongs && topSongs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-300">Posição</th>
                    <th className="text-left py-3 px-4 text-gray-300">Música</th>
                    <th className="text-left py-3 px-4 text-gray-300">Artista</th>
                    <th className="text-center py-3 px-4 text-green-500">Likes</th>
                    <th className="text-center py-3 px-4 text-red-500">Dislikes</th>
                    <th className="text-center py-3 px-4 text-yellow-500">Total</th>
                    <th className="text-center py-3 px-4 text-gray-300">% Likes</th>
                  </tr>
                </thead>
                <tbody>
                  {topSongs.map((song: any, index: number) => (
                    <tr key={song.id} className="border-b border-gray-700 hover:bg-gray-700 transition">
                      <td className="py-3 px-4 text-white font-bold">{index + 1}</td>
                      <td className="py-3 px-4 text-white">{song.title}</td>
                      <td className="py-3 px-4 text-gray-300">{song.artist}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 bg-green-900 text-green-200 px-3 py-1 rounded-full">
                          <ThumbsUp size={14} />
                          {song.likes}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 bg-red-900 text-red-200 px-3 py-1 rounded-full">
                          <ThumbsDown size={14} />
                          {song.dislikes}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-yellow-500 font-bold">
                        {song.totalVotes}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-300">
                        {song.likePercentage}%
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
