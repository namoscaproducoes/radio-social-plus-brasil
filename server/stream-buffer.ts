import { Router, Request, Response } from "express";
import https from "https";

const router = Router();

// Cache de stream com gerenciamento de buffer
interface StreamCache {
  buffer: Buffer[];
  totalSize: number;
  lastUpdate: number;
  isConnected: boolean;
  connectionId: string;
}

let streamCache: StreamCache = {
  buffer: [],
  totalSize: 0,
  lastUpdate: Date.now(),
  isConnected: false,
  connectionId: "",
};

const MAX_BUFFER_SIZE = 1024 * 1024; // 1MB de buffer máximo
const MIN_BUFFER_SIZE = 256 * 1024; // 256KB mínimo (5 segundos a 320kbps)

/**
 * Manter conexão com o stream e gerenciar buffer
 */
function maintainStreamConnection() {
  if (streamCache.isConnected) return;

  const streamUrl = "https://s01.brascast.com:7034/live";
  const options = {
    rejectUnauthorized: false,
    timeout: 30000,
  };

  streamCache.connectionId = Date.now().toString();
  streamCache.isConnected = true;

  console.log("🔗 Conectando ao stream de rádio...");

  https
    .get(streamUrl, options, (streamRes) => {
      console.log("✅ Conectado ao stream com sucesso");

      streamRes.on("data", (chunk: Buffer) => {
        // Adicionar chunk ao buffer
        streamCache.buffer.push(chunk);
        streamCache.totalSize += chunk.length;
        streamCache.lastUpdate = Date.now();

        // Limitar tamanho do buffer
        while (streamCache.totalSize > MAX_BUFFER_SIZE && streamCache.buffer.length > 0) {
          const removed = streamCache.buffer.shift();
          if (removed) {
            streamCache.totalSize -= removed.length;
          }
        }

        console.log(
          `📊 Buffer: ${Math.round(streamCache.totalSize / 1024)}KB (${streamCache.buffer.length} chunks)`
        );
      });

      streamRes.on("error", (error) => {
        console.error("❌ Erro no stream:", error.message);
        streamCache.isConnected = false;
        streamCache.buffer = [];
        streamCache.totalSize = 0;
        setTimeout(maintainStreamConnection, 5000); // Reconectar após 5 segundos
      });

      streamRes.on("end", () => {
        console.log("⏹️  Stream encerrado");
        streamCache.isConnected = false;
        setTimeout(maintainStreamConnection, 5000);
      });
    })
    .on("error", (error) => {
      console.error("❌ Erro ao conectar ao stream:", error.message);
      streamCache.isConnected = false;
      setTimeout(maintainStreamConnection, 5000);
    });
}

// Iniciar conexão ao carregar o módulo
maintainStreamConnection();

/**
 * Endpoint de stream com buffer gerenciado
 * Garante fluxo contínuo e pré-carregamento de 5 segundos
 */
router.get("/stream", (req: Request, res: Response) => {
  // Configurar headers CORS e streaming
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Connection", "keep-alive");

  // Aguardar buffer mínimo (5 segundos)
  const waitForMinBuffer = () => {
    if (streamCache.totalSize >= MIN_BUFFER_SIZE && streamCache.isConnected) {
      console.log("✅ Buffer mínimo atingido, iniciando stream ao cliente");
      sendBufferedStream(res);
    } else {
      console.log(
        `⏳ Aguardando buffer... (${Math.round(streamCache.totalSize / 1024)}KB / ${Math.round(MIN_BUFFER_SIZE / 1024)}KB)`
      );
      setTimeout(waitForMinBuffer, 100);
    }
  };

  waitForMinBuffer();

  // Reconectar se desconectar
  res.on("close", () => {
    console.log("🔌 Cliente desconectado");
    if (!streamCache.isConnected) {
      maintainStreamConnection();
    }
  });
});

/**
 * Enviar buffer armazenado para o cliente
 */
function sendBufferedStream(res: Response) {
  let bufferIndex = 0;
  const sendNextChunk = () => {
    if (bufferIndex < streamCache.buffer.length) {
      const chunk = streamCache.buffer[bufferIndex];
      if (!res.write(chunk)) {
        // Backpressure: aguardar antes de enviar próximo chunk
        res.once("drain", sendNextChunk);
      } else {
        bufferIndex++;
        setImmediate(sendNextChunk);
      }
    } else if (streamCache.isConnected) {
      // Aguardar novos chunks
      setTimeout(sendNextChunk, 100);
    } else {
      res.end();
    }
  };

  sendNextChunk();
}

/**
 * Endpoint para resetar buffer (chamado quando música muda)
 */
router.post("/stream/reset", (req: Request, res: Response) => {
  console.log("🔄 Resetando buffer de stream");
  streamCache.buffer = [];
  streamCache.totalSize = 0;
  streamCache.lastUpdate = Date.now();

  // Reconectar para garantir novo stream
  streamCache.isConnected = false;
  maintainStreamConnection();

  res.json({ success: true, message: "Buffer resetado" });
});

/**
 * Endpoint para obter status do buffer
 */
router.get("/stream/status", (req: Request, res: Response) => {
  res.json({
    isConnected: streamCache.isConnected,
    bufferSize: streamCache.totalSize,
    bufferChunks: streamCache.buffer.length,
    minBufferSize: MIN_BUFFER_SIZE,
    maxBufferSize: MAX_BUFFER_SIZE,
    lastUpdate: streamCache.lastUpdate,
    connectionId: streamCache.connectionId,
  });
});

// Endpoint OPTIONS para CORS preflight
router.options("/stream", (req: Request, res: Response) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(200);
});

export default router;
