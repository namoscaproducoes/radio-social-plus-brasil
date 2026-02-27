import { Router, Request, Response } from "express";
import https from "https";

const router = Router();

/**
 * Proxy endpoint para o stream de rádio
 * Contorna bloqueios CORS e problemas de conexão direta
 */
router.get("/stream", (req: Request, res: Response) => {
  const streamUrl = "https://s01.brascast.com:7034/live";

  // Configurar headers CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Connection", "keep-alive");

  // Fazer requisição ao servidor de stream com opções de SSL
  const options = {
    rejectUnauthorized: false, // Aceitar certificados auto-assinados
    timeout: 0, // Sem timeout para conexão contínua
  };

  const request = https.get(streamUrl, options, (streamRes) => {
    // Passar headers relevantes
    if (streamRes.headers["content-type"]) {
      res.setHeader("Content-Type", streamRes.headers["content-type"]);
    }
    if (streamRes.headers["icy-metaint"]) {
      res.setHeader("icy-metaint", streamRes.headers["icy-metaint"]);
    }

    // Configurar socket para não desligar
    if (streamRes.socket) {
      streamRes.socket.setKeepAlive(true, 30000);
    }
    if (res.socket) {
      res.socket.setKeepAlive(true, 30000);
    }

    // Pipar o stream para o cliente
    streamRes.pipe(res);

    // Tratar desconexão do cliente
    res.on("close", () => {
      console.log("Cliente desconectou do stream");
      streamRes.destroy();
    });
  });

  // Configurar keep-alive na requisição
  request.setTimeout(0); // Sem timeout

  request.on("error", (error) => {
    console.error("Erro ao conectar ao stream:", error);
    if (!res.headersSent) {
      res.status(502).json({
        error: "Erro ao conectar ao servidor de stream",
        details: error.message,
      });
    }
  });

  // Tratar timeout da requisição
  request.on("timeout", () => {
    console.warn("Timeout na requisição de stream, reconectando...");
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
