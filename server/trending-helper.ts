// Helper para calcular trending
export function calculateTrending(currentRank: number, previousRank: number | null): number {
  if (previousRank === null || previousRank === undefined) {
    return 0; // Primeira vez que aparece
  }
  
  if (currentRank < previousRank) {
    return 1; // Subindo (rank menor = melhor posição)
  } else if (currentRank > previousRank) {
    return -1; // Descendo
  }
  
  return 0; // Estável
}

export function getTrendingIcon(trending: number): string {
  if (trending > 0) return "↑"; // Subindo
  if (trending < 0) return "↓"; // Descendo
  return "→"; // Estável
}
