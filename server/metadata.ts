import https from "https";

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
      });

      if (icyMetaint) {
        // Se há suporte a metadados, ler o stream
        let buffer = Buffer.alloc(0);
        const metaintValue = parseInt(icyMetaint as string);

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

                resolve({
                  artist: artist.trim(),
                  title: titleParts.join(" - ").trim() || "Música Desconhecida",
                });
              } else {
                resolve({
                  artist: "Artista Desconhecido",
                  title: "Música Desconhecida",
                });
              }

              request.abort();
            }
          }
        });
      } else {
        // Sem suporte a metadados, retornar valores padrão
        resolve({
          artist: (typeof icyName === "string" ? icyName : "Artista Desconhecido"),
          title: (typeof icyDescription === "string" ? icyDescription : "Música Desconhecida"),
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
 * Busca capa do álbum no iTunes
 */
export async function searchItunesAlbumCover(
  artist: string,
  song: string
): Promise<string | null> {
  try {
    const searchTerm = `${artist} ${song}`;
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&media=music&limit=1`;

    return new Promise((resolve) => {
      https
        .get(url, { timeout: 5000 }, (res) => {
          let data = "";

          res.on("data", (chunk) => {
            data += chunk;
          });

          res.on("end", () => {
            try {
              const result = JSON.parse(data);
              if (result.results && result.results.length > 0) {
                const imageUrl = result.results[0].artworkUrl600 || result.results[0].artworkUrl100;
                resolve(imageUrl || null);
              } else {
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
