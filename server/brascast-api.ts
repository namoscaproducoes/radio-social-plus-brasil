import https from "https";

interface BrascastResponse {
  status: "success" | "error";
  plan?: {
    radio_name: string;
    listeners: number;
    bitrate: number;
  };
  listeners?: {
    current: string;
    peak: string;
  };
  onair_data?: {
    current_music: string;
    next_music: string;
    stream_data: {
      codec: string;
      bitrate: string;
    };
  };
}

interface ParsedMetadata {
  title: string;
  artist: string;
  radioName: string;
  currentListeners: number;
  peakListeners: number;
  bitrate: string;
}

const BRASCAST_API_URL =
  "https://app.brascast.com/api/radio/data/54/anZ2NTcxaklOYjdKU1lDR01hbVNEYVJMMWZXT3BPSi9nWmtYQWViaHA3cmpXYlg0VnhycWhoT2MzVENLb29mNzo6p7P+YOLxTrFKC96VrxxBhA==";

const BRASCAST_AUTH_TOKEN = process.env.BRASCAST_AUTH_TOKEN || "";

/**
 * Busca dados da rádio na API Brascast
 */
export async function fetchBrascastData(): Promise<ParsedMetadata | null> {
  return new Promise((resolve) => {
    const options = {
      timeout: 5000,
      headers: {
        "Authorization": `Bearer ${BRASCAST_AUTH_TOKEN}`,
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; RadioPlayer/1.0)",
      },
    };

    https
      .get(BRASCAST_API_URL, options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const response: BrascastResponse = JSON.parse(data);

            if (response.status !== "success") {
              console.error("Brascast API error:", response.status);
              resolve(null);
              return;
            }

            const currentMusic = response.onair_data?.current_music || "Música Desconhecida";
            const [artist, ...titleParts] = currentMusic.split(" - ");

            const parsed: ParsedMetadata = {
              title: titleParts.join(" - ").trim() || currentMusic,
              artist: artist?.trim() || "Artista Desconhecido",
              radioName: response.plan?.radio_name || "Rádio Social Plus Brasil",
              currentListeners: parseInt(response.listeners?.current || "0"),
              peakListeners: parseInt(response.listeners?.peak || "0"),
              bitrate: response.onair_data?.stream_data?.bitrate || "128",
            };

            console.log("Brascast metadata:", parsed);
            resolve(parsed);
          } catch (error) {
            console.error("Erro ao parsear Brascast response:", error);
            resolve(null);
          }
        });
      })
      .on("error", (error) => {
        console.error("Erro ao buscar Brascast API:", error);
        resolve(null);
      });
  });
}
