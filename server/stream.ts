import { Router, Request, Response } from "express";
import https from "https";

const router = Router();

/**
 * Proxy endpoint para o stream de rádio
 * Implementação robusta com buffer local e envio contínuo
 */
router.get("/stream", (req: Request, res: Response) => {
  const streamUrl = "https://s01.brascast.com:7034/live";

  console.log("📡 Cliente conectado ao stream");

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
  res.setHeader("Keep-Alive", "timeout=30, max=100");
  // Headers importantes para streaming contínuo
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Accept-Ranges", "none");

  // Configurar socket do cliente para keep-alive
  if (res.socket) {
    res.socket.setKeepAlive(true, 30000);
    res.socket.setTimeout(0);
    res.socket.setNoDelay(true); // Desabilitar algoritmo de Nagle para menor latência
  }

  // Fazer requisição ao servidor de stream com opções de SSL
  const options = {
    rejectUnauthorized: false,
    timeout: 0,
  };

  let streamRes: any = null;
  let isConnected = true;

  const request = https.get(streamUrl, options, (response) => {
    streamRes = response;
    console.log("✅ Conectado ao stream Icecast");
    
    // Passar headers relevantes
    if (response.headers["content-type"]) {
      res.setHeader("Content-Type", response.headers["content-type"]);
    }
    if (response.headers["icy-metaint"]) {
      res.setHeader("icy-metaint", response.headers["icy-metaint"]);
    }

    // Configurar socket do stream para não desligar
    if (response.socket) {
      response.socket.setKeepAlive(true, 30000);
      response.socket.setTimeout(0);
      response.socket.setNoDelay(true);
    }

    // Variáveis para monitorar fluxo
    let bytesReceived = 0;
    let bytesSent = 0;
    let lastLogTime = Date.now();

    // Handler para dados chegando do stream
    response.on("data", (chunk: Buffer) => {
      bytesReceived += chunk.length;

      // Log a cada 10 segundos
      const now = Date.now();
      if (now - lastLogTime > 10000) {
        console.log(`📊 Stream: recebido ${(bytesReceived / 1024).toFixed(2)}KB, enviado ${(bytesSent / 1024).toFixed(2)}KB`);
        bytesReceived = 0;
        bytesSent = 0;
        lastLogTime = now;
      }

      // Enviar chunk para cliente
      if (isConnected && res.writable) {
        try {
          res.write(chunk);
          bytesSent += chunk.length;
        } catch (error) {
          console.error("❌ Erro ao enviar chunk:", error);
          isConnected = false;
          response.destroy();
        }
      }
    });

    response.on("end", () => {
      console.warn("⚠️ Stream Icecast desligou");
      isConnected = false;
      if (res.writable) {
        res.end();
      }
    });

    response.on("error", (error) => {
      console.error("❌ Erro ao receber stream:", error.message);
      isConnected = false;
      if (!res.headersSent) {
        res.status(502).json({
          error: "Erro ao conectar ao servidor de stream",
          details: error.message,
        });
      } else if (res.writable) {
        res.end();
      }
    });
  });

  // Configurar keep-alive na requisição
  request.setTimeout(0);

  request.on("error", (error) => {
    console.error("❌ Erro ao conectar ao stream:", error.message);
    isConnected = false;
    if (!res.headersSent) {
      res.status(502).json({
        error: "Erro ao conectar ao servidor de stream",
        details: error.message,
      });
    }
  });

  request.on("timeout", () => {
    console.warn("⚠️ Timeout na requisição de stream");
    isConnected = false;
    request.destroy();
  });

  // Tratar desconexão do cliente
  res.on("close", () => {
    console.log("🔌 Cliente desconectou do stream");
    isConnected = false;
    if (streamRes) {
      streamRes.destroy();
    }
    request.destroy();
  });

  res.on("error", (error) => {
    console.error("❌ Erro na resposta:", error.message);
    isConnected = false;
    if (streamRes) {
      streamRes.destroy();
    }
    request.destroy();
  });
});

// Endpoint OPTIONS para CORS preflight
router.options("/stream", (req: Request, res: Response) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(200);
});

export default router;
