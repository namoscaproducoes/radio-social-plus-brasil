import https from "https";
import http from "http";

interface IcecastMetadata {
  title?: string;
  artist?: string;
}

/**
 * Extrai metadados do stream ICEcast
 * O stream ICEcast envia metadados em headers especiais
 */
export async function fetchIcecastMetadata(): Promise<IcecastMetadata> {
  return new Promise((resolve, reject) => {
    const metadataUrl = "https://s01.brascast.com:7034/";

    const request = https.get(metadataUrl, { timeout: 5000 }, (res) => {
      // Verificar se o servidor suporta metadados ICEcast
      const icyMetaint = res.headers["icy-metaint"] as string | undefined;
      const icyName = res.headers["icy-name"] as string | undefined;
      const icyDescription = res.headers["icy-description"] as string | undefined;

      console.log("ICEcast headers:", {
        icyMetaint,
        icyName,
        icyDescription,
        allHeaders: res.headers,
      });

      if (icyMetaint) {
        // Se há suporte a metadados, ler o stream
        let buffer = Buffer.alloc(0);
        const metaintValue = parseInt(icyMetaint);

        res.on("data", (chunk: Buffer) => {
          buffer = Buffer.concat([buffer, chunk]);

          // Procurar pelo bloco de metadados
          if (buffer.length > metaintValue) {
            const metadataLength = buffer[metaintValue] * 16;

            if (buffer.length >= metaintValue + 1 + metadataLength) {
              const metadataBlock = buffer.slice(
                metaintValue + 1,
                metaintValue + 1 + metadataLength
              );

              const metadataStr = metadataBlock.toString("utf-8").trim();
              console.log("Metadados brutos:", metadataStr);

              // Parsear metadados (formato: StreamTitle='Artist - Song';)
              const titleMatch = metadataStr.match(/StreamTitle='([^']+)'/);
              if (titleMatch) {
                const fullTitle = titleMatch[1];
                const parts = fullTitle.split(" - ");
                const artist = parts[0] || "Artista Desconhecido";
                const titleParts = parts.slice(1);

                console.log("Metadados extraídos:", {
                  artist: artist.trim(),
                  title: titleParts.join(" - ").trim(),
                });

                resolve({
                  artist: artist.trim(),
                  title: titleParts.join(" - ").trim() || "Música Desconhecida",
                });
              } else {
                console.log("Nenhum StreamTitle encontrado");
                resolve({
                  artist: "Artista Desconhecido",
                  title: "Música Desconhecida",
                });
              }

              request.abort();
            }
          }
        });

        res.on("end", () => {
          console.log("Stream finalizado sem metadados");
          resolve({
            artist: "Artista Desconhecido",
            title: "Música Desconhecida",
          });
        });
      } else {
        // Sem suporte a metadados, retornar valores padrão
        console.log("Sem suporte a icy-metaint");
        resolve({
          artist: typeof icyName === "string" ? icyName : "Artista Desconhecido",
          title: typeof icyDescription === "string" ? icyDescription : "Música Desconhecida",
        });
      }
    });

    request.on("error", (error) => {
      console.error("Erro ao buscar metadados:", error);
      reject(error);
    });

    request.on("timeout", () => {
      request.abort();
      reject(new Error("Timeout ao buscar metadados"));
    });
  });
}

/**
 * Busca capa do álbum no Last.fm
 */
export async function searchLastfmAlbumCover(
  artist: string,
  song: string
): Promise<string | null> {
  try {
    const apiKey = process.env.LASTFM_API_KEY;
    if (!apiKey) {
      console.log("Last.fm API key não configurada");
      return null;
    }

    // Validar inputs
    if (!artist || artist === "Unknown" || artist === "Artista Desconhecido") {
      console.log("Artista inválido para busca Last.fm");
      return null;
    }

    if (!song || song === "Unknown" || song === "Música Desconhecida") {
      console.log("Música inválida para busca Last.fm");
      return null;
    }

    // Last.fm API para buscar informações do álbum
    // Usar method=track.getInfo para obter informações detalhadas com imagens em alta resolução
    const trackUrl = `http://ws.audioscrobbler.com/2.0/?method=track.getInfo&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(song)}&api_key=${apiKey}&format=json&autocorrect=1`;

    console.log("Buscando no Last.fm:", { artist, song, trackUrl });

    return new Promise((resolve) => {
      const httpModule = trackUrl.startsWith('http://') ? http : https;
      httpModule
        .get(trackUrl, { timeout: 10000 }, (res: any) => {
          let data = "";

          res.on("data", (chunk: any) => {
            data += chunk;
          });

          res.on("end", () => {
            try {
              const result = JSON.parse(data);
              console.log("Resposta Last.fm track.getInfo:", result);

              if (result.track && result.track.album && result.track.album.image) {
                // Procurar pela imagem maior disponível
                const images = result.track.album.image;
                let imageUrl = null;

                // Procurar por "extralarge" (maior resolução disponível)
                for (const img of images) {
                  if (img.size === "extralarge") {
                    imageUrl = img["#text"];
                    break;
                  }
                }

                // Se não encontrou extralarge, procurar por large
                if (!imageUrl) {
                  for (const img of images) {
                    if (img.size === "large") {
                      imageUrl = img["#text"];
                      break;
                    }
                  }
                }

                // Se ainda não encontrou, usar a última disponível (geralmente a maior)
                if (!imageUrl && images.length > 0) {
                  imageUrl = images[images.length - 1]["#text"];
                }

                if (imageUrl && imageUrl.trim() !== "") {
                  // Garantir que a URL do Last.fm está em alta resolução
                  // Last.fm retorna URLs com /300x300/ ou similares, vamos manter como está
                  console.log("Capa encontrada no Last.fm (alta resolução):", imageUrl);
                  resolve(imageUrl);
                  return;
                }
              }

              console.log("Nenhuma capa encontrada no Last.fm");
              resolve(null);
            } catch (error) {
              console.error("Erro ao parsear Last.fm response:", error);
              resolve(null);
            }
          });
        })
        .on("error", (error: any) => {
          console.error("Erro ao buscar Last.fm:", error);
          resolve(null);
        });
    });
  } catch (error) {
    console.error("Erro em searchLastfmAlbumCover:", error);
    return null;
  }
}

/**
 * Busca capa do álbum no iTunes
 */
export async function searchItunesAlbumCover(
  artist: string,
  song: string
): Promise<string | null> {
  try {
    // Tentar Last.fm primeiro, depois iTunes como fallback
    const lastfmCover = await searchLastfmAlbumCover(artist, song);
    if (lastfmCover) {
      return lastfmCover;
    }

    // Validar inputs
    if (!artist || artist === "Unknown" || artist === "Artista Desconhecido") {
      console.log("Artista inválido para busca iTunes");
      return null;
    }

    if (!song || song === "Unknown" || song === "Música Desconhecida") {
      console.log("Música inválida para busca iTunes");
      return null;
    }

    const searchTerm = `${artist} ${song}`;
    // Adicionar entity=song para melhorar resultados
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&media=music&entity=song&limit=1`;

    console.log("Buscando no iTunes:", { artist, song, searchTerm, url });

    return new Promise((resolve) => {
      https
        .get(url, { timeout: 10000 }, (res) => {
          let data = "";

          res.on("data", (chunk) => {
            data += chunk;
          });

          res.on("end", () => {
            try {
              const result = JSON.parse(data);
              console.log("Resposta iTunes:", result);

              if (result.results && result.results.length > 0) {
                // Preferir artworkUrl600 (600x600) em vez de artworkUrl100
                let imageUrl = result.results[0].artworkUrl600 || result.results[0].artworkUrl100;
                
                // Se conseguiu uma URL, converter para alta resolução
                if (imageUrl) {
                  // Substituir /100x100bb.jpg por /600x600bb.jpg para alta resolução
                  imageUrl = imageUrl.replace(/\/(\d+)x(\d+)bb\.jpg/, '/600x600bb.jpg');
                  console.log("Capa encontrada no iTunes (alta resolução):", imageUrl);
                  resolve(imageUrl);
                } else {
                  console.log("Nenhuma URL de capa disponível no iTunes");
                  resolve(null);
                }
              } else {
                console.log("Nenhum resultado no iTunes");
                resolve(null);
              }
            } catch (error) {
              console.error("Erro ao parsear iTunes response:", error);
              resolve(null);
            }
          });
        })
        .on("error", (error) => {
          console.error("Erro ao buscar iTunes:", error);
          resolve(null);
        });
    });
  } catch (error) {
    console.error("Erro em searchItunesAlbumCover:", error);
    return null;
  }
}
