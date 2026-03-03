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
  contentType: string;
  activeClients: number;
}

let streamCache: StreamCache = {
  buffer: [],
  totalSize: 0,
  lastUpdate: Date.now(),
  isConnected: false,
  connectionId: "",
  contentType: "audio/mpeg",
  activeClients: 0,
};

const MAX_BUFFER_SIZE = 512 * 1024; // 512KB de buffer máximo (reduzido para sincronização)
const MIN_BUFFER_SIZE = 256 * 1024; // 256KB mínimo (2-3 segundos a 320kbps)
const CHUNK_SEND_INTERVAL = 50; // ms entre envios de chunks
const RECONNECT_DELAY = 3000; // ms para reconectar

/**
 * Manter conexão com o stream e gerenciar buffer
 */
function maintainStreamConnection() {
  if (streamCache.isConnected) {
    console.log("🔗 Já conectado ao stream, pulando reconexão");
    return;
  }

  const streamUrl = "https://s01.brascast.com:7034/live";
  const options = {
    rejectUnauthorized: false,
    timeout: 60000, // Timeout maior para conexão de longa duração
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64)",
      "Connection": "keep-alive",
    },
  };

  streamCache.connectionId = Date.now().toString();
  streamCache.isConnected = true;

  console.log(`🔗 Conectando ao stream de rádio... (ID: ${streamCache.connectionId})`);

  const request = https.get(streamUrl, options, (streamRes) => {
    console.log(`✅ Conectado ao stream com sucesso (Status: ${streamRes.statusCode})`);
    
    // Detectar Content-Type real do stream
    const contentType = streamRes.headers["content-type"] || "audio/mpeg";
    streamCache.contentType = contentType;
    console.log(`🎵 Content-Type detectado: ${contentType}`);

    // Configurar keep-alive no stream
    if (streamRes.socket) {
      streamRes.socket.setKeepAlive(true, 30000);
      streamRes.socket.setTimeout(0); // Sem timeout
    }

    streamRes.on("data", (chunk: Buffer) => {
      // Adicionar chunk ao buffer
      streamCache.buffer.push(chunk);
      streamCache.totalSize += chunk.length;
      streamCache.lastUpdate = Date.now();

      // Limitar tamanho do buffer (FIFO)
      while (streamCache.totalSize > MAX_BUFFER_SIZE && streamCache.buffer.length > 0) {
        const removed = streamCache.buffer.shift();
        if (removed) {
          streamCache.totalSize -= removed.length;
        }
      }

      // Log periódico (a cada 5 segundos)
      if (Date.now() % 5000 < 100) {
        console.log(
          `📊 Buffer: ${Math.round(streamCache.totalSize / 1024)}KB (${streamCache.buffer.length} chunks, ${streamCache.activeClients} clientes)`
        );
      }
    });

    streamRes.on("error", (error) => {
      console.error("❌ Erro no stream:", error.message);
      streamCache.isConnected = false;
      // Não limpar buffer para permitir que clientes continuem recebendo dados em cache
      setTimeout(maintainStreamConnection, RECONNECT_DELAY);
    });

    streamRes.on("end", () => {
      console.log("⏹️  Stream encerrado pelo servidor");
      streamCache.isConnected = false;
      setTimeout(maintainStreamConnection, RECONNECT_DELAY);
    });

    streamRes.on("close", () => {
      console.log("🔌 Conexão com stream fechada");
      streamCache.isConnected = false;
      setTimeout(maintainStreamConnection, RECONNECT_DELAY);
    });
  });

  request.on("error", (error) => {
    console.error("❌ Erro ao conectar ao stream:", error.message);
    streamCache.isConnected = false;
    setTimeout(maintainStreamConnection, RECONNECT_DELAY);
  });

  request.on("timeout", () => {
    console.warn("⏱️  Timeout na conexão com stream, reconectando...");
    request.destroy();
    streamCache.isConnected = false;
    setTimeout(maintainStreamConnection, RECONNECT_DELAY);
  });
}

// Iniciar conexão ao carregar o módulo
maintainStreamConnection();

/**
 * Endpoint de stream com buffer gerenciado
 * Garante fluxo contínuo e pré-carregamento de 8-10 segundos
 */
router.get("/stream", (req: Request, res: Response) => {
  streamCache.activeClients++;
  console.log(`👤 Cliente conectado (Total: ${streamCache.activeClients})`);

  // Configurar headers para streaming contínuo
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");
  res.setHeader("Content-Type", streamCache.contentType);
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Keep-Alive", "timeout=30, max=100");
  res.setHeader("X-Accel-Buffering", "no"); // Desabilitar buffering de proxy

  // Aguardar buffer mínimo (8-10 segundos)
  let waitAttempts = 0;
  const maxWaitAttempts = 100; // 10 segundos máximo de espera

  const waitForMinBuffer = () => {
    if (streamCache.totalSize >= MIN_BUFFER_SIZE && streamCache.isConnected) {
      console.log(`✅ Buffer mínimo atingido (${Math.round(streamCache.totalSize / 1024)}KB), iniciando stream ao cliente`);
      sendBufferedStream(res);
    } else if (waitAttempts < maxWaitAttempts) {
      waitAttempts++;
      const bufferPercent = Math.round((streamCache.totalSize / MIN_BUFFER_SIZE) * 100);
      if (waitAttempts % 10 === 0) {
        console.log(
          `⏳ Aguardando buffer... (${Math.round(streamCache.totalSize / 1024)}KB / ${Math.round(MIN_BUFFER_SIZE / 1024)}KB - ${bufferPercent}%)`
        );
      }
      setTimeout(waitForMinBuffer, 100);
    } else {
      console.warn("⚠️  Timeout aguardando buffer mínimo, iniciando com buffer parcial");
      sendBufferedStream(res);
    }
  };

  waitForMinBuffer();

  // Reconectar se desconectar
  res.on("close", () => {
    streamCache.activeClients--;
    console.log(`🔌 Cliente desconectado (Total: ${streamCache.activeClients})`);
    if (!streamCache.isConnected && streamCache.activeClients === 0) {
      console.log("🔄 Sem clientes, aguardando próxima conexão para reconectar");
    }
  });

  res.on("error", (error) => {
    streamCache.activeClients--;
    console.error("❌ Erro ao enviar stream ao cliente:", error.message);
  });
});

/**
 * Enviar buffer armazenado para o cliente
 */
function sendBufferedStream(res: Response) {
  let bufferIndex = 0;
  let isClientConnected = true;

  const sendNextChunk = () => {
    if (!isClientConnected || res.destroyed) {
      return;
    }

    if (bufferIndex < streamCache.buffer.length) {
      const chunk = streamCache.buffer[bufferIndex];
      if (!res.write(chunk)) {
        // Backpressure: aguardar antes de enviar próximo chunk
        res.once("drain", sendNextChunk);
      } else {
        bufferIndex++;
        // Usar setImmediate para não bloquear event loop
        setImmediate(sendNextChunk);
      }
    } else if (streamCache.isConnected) {
      // Aguardar novos chunks com delay pequeno
      setTimeout(sendNextChunk, CHUNK_SEND_INTERVAL);
    } else {
      // Stream desconectado e buffer esgotado
      console.log("📡 Buffer esgotado e stream desconectado, fechando cliente");
      if (!res.destroyed) {
        res.end();
      }
    }
  };

  // Monitorar desconexão do cliente
  res.on("close", () => {
    isClientConnected = false;
  });

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
  setTimeout(maintainStreamConnection, 500);

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
    bufferPercent: Math.round((streamCache.totalSize / MAX_BUFFER_SIZE) * 100),
    minBufferSize: MIN_BUFFER_SIZE,
    maxBufferSize: MAX_BUFFER_SIZE,
    lastUpdate: streamCache.lastUpdate,
    connectionId: streamCache.connectionId,
    contentType: streamCache.contentType,
    activeClients: streamCache.activeClients,
    timeSinceLastUpdate: Date.now() - streamCache.lastUpdate,
  });
});

// Endpoint OPTIONS para CORS preflight
router.options("/stream", (req: Request, res: Response) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");
  res.sendStatus(200);
});

export default router;
