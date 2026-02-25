import https from "https";

interface IcecastMetadata {
  title: string;
  artist: string;
  source: string;
}

/**
 * Busca metadados do stream Icecast (Brascast)
 * URL: https://s01.brascast.com:7034/status-json.xsl
 * Retorna o título completo em format "Artist - Title"
 */
export async function getIcecastMetadata(): Promise<IcecastMetadata | null> {
  return new Promise((resolve) => {
    const options = {
      hostname: "s01.brascast.com",
      port: 7034,
      path: "/status-json.xsl",
      method: "GET",
      timeout: 5000,
      rejectUnauthorized: false, // Aceitar certificados auto-assinados
    };

    https
      .request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            
            // Extrair o primeiro source (normalmente /autodj)
            const source = json.icestats?.source?.[0];
            if (!source) {
              console.log("Nenhum source encontrado no Icecast");
              return resolve(null);
            }

            // Obter o título completo em formato "Artist - Title"
            const fullTitle = source.yp_currently_playing || source.title;
            
            if (!fullTitle) {
              console.log("Nenhum título encontrado no Icecast");
              return resolve(null);
            }

            console.log("Título completo do Icecast:", fullTitle);

            // Dividir por " - " para separar artista e música
            const parts = fullTitle.split(" - ");
            const artist = parts[0]?.trim() || "Artista Desconhecido";
            const title = parts.slice(1).join(" - ").trim() || fullTitle;

            console.log("Artista:", artist);
            console.log("Música:", title);

            const result: IcecastMetadata = {
              title,
              artist,
              source: "icecast",
            };

            resolve(result);
          } catch (error) {
            console.error("Erro ao fazer parsing do JSON do Icecast:", error);
            resolve(null);
          }
        });
      })
      .on("error", (error) => {
        console.error("Erro ao buscar metadados do Icecast:", error);
        resolve(null);
      })
      .end();
  });
}
