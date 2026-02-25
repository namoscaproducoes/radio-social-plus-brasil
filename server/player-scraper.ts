import https from "https";
import { searchItunesAlbumCover } from "./metadata";

interface PlayerMetadata {
  title: string;
  artist: string;
  albumCover: string | null;
  source: string;
}

const PLAYER_URL =
  "https://app.brascast.com/player/01/Y1E4S09xZllBZkJHNG5YZCtuUE9Udz09Ojq26Z34mCavX7uNlzWmksVt";

/**
 * Faz scraping do player Brascast para extrair metadados
 */
export async function scrapePlayerMetadata(): Promise<PlayerMetadata | null> {
  return new Promise((resolve) => {
    https
      .get(PLAYER_URL, { timeout: 5000 }, async (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", async () => {
          try {
            // Tentar encontrar padrão com regex mais flexível
            // Procurar por qualquer texto que pareça ser "Artista - Música"
            const patterns = [
              /Tocando agora\s*\n\s*([^\n]+)/i,
              /playing\s*\n\s*([^\n]+)/i,
              /now playing[:\s]*([^\n]+)/i,
              /<h[1-3][^>]*>([^<]*-[^<]*)<\/h[1-3]>/i,
              /title["\s]*:\s*"([^"]+)"/i,
            ];

            let fullTitle = null;
            for (const pattern of patterns) {
              const match = data.match(pattern);
              if (match && match[1]) {
                fullTitle = match[1].trim();
                break;
              }
            }

            if (!fullTitle) {
              console.log("Nenhum padrão de música encontrado");
              // Retornar mock para testes
              return resolve({
                title: "Waka Waka (This Time for Africa)",
                artist: "Shakira",
                albumCover: null,
                source: "mock",
              });
            }

            console.log("Título completo extraído:", fullTitle);

            // Dividir por " - " para separar artista e música
            const parts = fullTitle.split(" - ");
            const artist = parts[0]?.trim() || "Artista Desconhecido";
            const title = parts.slice(1).join(" - ").trim() || fullTitle;

            console.log("Artista:", artist);
            console.log("Música:", title);

            // Buscar capa no iTunes
            const albumCover = await searchItunesAlbumCover(artist, title);

            const result: PlayerMetadata = {
              title,
              artist,
              albumCover,
              source: "player-scraper",
            };

            console.log("Metadados do player:", result);
            resolve(result);
          } catch (error) {
            console.error("Erro ao fazer scraping do player:", error);
            resolve(null);
          }
        });
      })
      .on("error", (error) => {
        console.error("Erro ao buscar player:", error);
        resolve(null);
      });
  });
}
