import { Router, Request, Response } from "express";
import https from "https";

const router = Router();

/**
 * Proxy endpoint para o stream de rádio
 * Proxy direto com keep-alive e tratamento robusto de reconexão
 */
router.get("/stream", (req: Request, res: Response) => {
  const streamUrl = "https://s01.brascast.com:7034/live";

  console.log("📡 Cliente conectado ao stream");

  // Configurar headers CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Keep-Alive", "timeout=30, max=100");

  // Configurar socket do cliente para keep-alive
  if (res.socket) {
    res.socket.setKeepAlive(true, 30000);
    res.socket.setTimeout(0);
  }

  // Fazer requisição ao servidor de stream com opções de SSL
  const options = {
    rejectUnauthorized: false, // Aceitar certificados auto-assinados
    timeout: 0, // Sem timeout para conexão contínua
  };

  const request = https.get(streamUrl, options, (streamRes) => {
    console.log("✅ Conectado ao stream Icecast");
    
    // Passar headers relevantes
    if (streamRes.headers["content-type"]) {
      res.setHeader("Content-Type", streamRes.headers["content-type"]);
    }
    if (streamRes.headers["icy-metaint"]) {
      res.setHeader("icy-metaint", streamRes.headers["icy-metaint"]);
    }

    // Configurar socket do stream para não desligar
    if (streamRes.socket) {
      streamRes.socket.setKeepAlive(true, 30000);
      streamRes.socket.setTimeout(0);
    }

    // Pipar o stream para o cliente com tratamento de erro
    streamRes.pipe(res, { end: true });

    // Tratar desconexão do cliente
    res.on("close", () => {
      console.log("🔌 Cliente desconectou do stream");
      streamRes.destroy();
    });

    res.on("error", (error) => {
      console.error("❌ Erro ao enviar stream para cliente:", error.message);
      streamRes.destroy();
    });

    streamRes.on("error", (error) => {
      console.error("❌ Erro ao receber stream:", error.message);
      if (!res.headersSent) {
        res.status(502).json({
          error: "Erro ao conectar ao servidor de stream",
          details: error.message,
        });
      }
    });
  });

  // Configurar keep-alive na requisição
  request.setTimeout(0); // Sem timeout

  request.on("error", (error) => {
    console.error("❌ Erro ao conectar ao stream:", error.message);
    if (!res.headersSent) {
      res.status(502).json({
        error: "Erro ao conectar ao servidor de stream",
        details: error.message,
      });
    }
  });

  // Tratar timeout da requisição
  request.on("timeout", () => {
    console.warn("⚠️ Timeout na requisição de stream");
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
