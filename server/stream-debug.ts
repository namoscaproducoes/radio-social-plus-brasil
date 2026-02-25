import https from "https";

/**
 * Debug endpoint para entender a estrutura do stream
 */
export async function debugStreamMetadata(): Promise<any> {
  return new Promise((resolve, reject) => {
    const metadataUrl = "https://s01.brascast.com:7034/";

    const request = https.get(metadataUrl, { timeout: 10000 }, (res) => {
      console.log("=== DEBUG STREAM ===");
      console.log("Status:", res.statusCode);
      console.log("Headers:", JSON.stringify(res.headers, null, 2));

      let buffer = Buffer.alloc(0);
      let chunkCount = 0;
      const maxChunks = 10; // Limitar para não consumir muito stream

      res.on("data", (chunk: Buffer) => {
        chunkCount++;
        console.log(`Chunk ${chunkCount}: ${chunk.length} bytes`);

        if (chunkCount === 1) {
          // Mostrar primeiro chunk em detalhes
          console.log("Primeiros 500 bytes (hex):", chunk.slice(0, 500).toString("hex"));
          console.log("Primeiros 500 bytes (utf-8):", chunk.slice(0, 500).toString("utf-8"));
        }

        buffer = Buffer.concat([buffer, chunk]);

        // Procurar por padrões comuns de metadados
        const bufferStr = buffer.toString("utf-8", 0, Math.min(buffer.length, 5000));

        // Procurar por StreamTitle
        if (bufferStr.includes("StreamTitle")) {
          console.log("ENCONTRADO: StreamTitle");
          const match = bufferStr.match(/StreamTitle='([^']+)'/);
          if (match) {
            console.log("Valor:", match[1]);
          }
        }

        // Procurar por ID3
        if (bufferStr.includes("ID3")) {
          console.log("ENCONTRADO: ID3 tag");
        }

        // Procurar por outros padrões
        if (bufferStr.includes("Title")) {
          console.log("ENCONTRADO: Title");
        }

        if (chunkCount >= maxChunks) {
          request.abort();
        }
      });

      res.on("end", () => {
        console.log("=== FIM DEBUG ===");
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          bufferSize: buffer.length,
          bufferSample: buffer.slice(0, 1000).toString("utf-8"),
        });
      });
    });

    request.on("error", (error) => {
      console.error("Erro ao debugar stream:", error);
      reject(error);
    });

    request.on("timeout", () => {
      request.abort();
      reject(new Error("Timeout ao debugar stream"));
    });
  });
}

/**
 * Extrai metadados usando múltiplas estratégias
 */
export async function extractMetadataMultiStrategy(): Promise<{
  title?: string;
  artist?: string;
  source: string;
}> {
  try {
    // Estratégia 1: Tentar ler headers ICEcast
    const result = await new Promise<{
      title?: string;
      artist?: string;
      source: string;
    }>((resolve, reject) => {
      const metadataUrl = "https://s01.brascast.com:7034/";

      const request = https.get(metadataUrl, { timeout: 5000 }, (res) => {
        const icyMetaint = res.headers["icy-metaint"] as string | undefined;
        const icyName = res.headers["icy-name"] as string | undefined;
        const icyDescription = res.headers["icy-description"] as string | undefined;

        // Se tem headers ICEcast, usar
        if (icyName || icyDescription) {
          resolve({
            artist: typeof icyName === "string" ? icyName : undefined,
            title: typeof icyDescription === "string" ? icyDescription : undefined,
            source: "icy-headers",
          });
          request.abort();
          return;
        }

        // Estratégia 2: Ler stream e procurar por metadados
        let buffer = Buffer.alloc(0);
        let foundMetadata = false;

        res.on("data", (chunk: Buffer) => {
          if (foundMetadata) return;

          buffer = Buffer.concat([buffer, chunk]);

          // Procurar por StreamTitle em diferentes formatos
          const bufferStr = buffer.toString("utf-8");

          // Formato 1: StreamTitle='Artist - Song'
          let match = bufferStr.match(/StreamTitle='([^']+)'/);
          if (match) {
            const fullTitle = match[1];
            const parts = fullTitle.split(" - ");
            foundMetadata = true;
            resolve({
              artist: parts[0]?.trim(),
              title: parts.slice(1).join(" - ").trim(),
              source: "stream-title",
            });
            request.abort();
            return;
          }

          // Formato 2: Procurar por ID3 tags
          if (bufferStr.includes("TIT2") || bufferStr.includes("TPE1")) {
            console.log("ID3 tags encontradas");
            // ID3 é mais complexo, por enquanto retornar vazio
            foundMetadata = true;
            resolve({
              source: "id3-found",
            });
            request.abort();
            return;
          }

          // Limitar tamanho do buffer
          if (buffer.length > 100000) {
            resolve({
              source: "buffer-limit-reached",
            });
            request.abort();
          }
        });

        res.on("end", () => {
          if (!foundMetadata) {
            resolve({
              source: "no-metadata-found",
            });
          }
        });
      });

      request.on("error", (error) => {
        console.error("Erro ao extrair metadados:", error);
        resolve({
          source: "error",
        });
      });

      request.on("timeout", () => {
        request.abort();
        resolve({
          source: "timeout",
        });
      });
    });

    return result;
  } catch (error) {
    console.error("Erro em extractMetadataMultiStrategy:", error);
    return {
      source: "exception",
    };
  }
}
