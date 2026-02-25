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

  // Fazer requisição ao servidor de stream
  https
    .get(streamUrl, (streamRes) => {
      // Passar headers relevantes
      if (streamRes.headers["content-type"]) {
        res.setHeader("Content-Type", streamRes.headers["content-type"]);
      }
      if (streamRes.headers["icy-metaint"]) {
        res.setHeader("icy-metaint", streamRes.headers["icy-metaint"]);
      }

      // Pipar o stream para o cliente
      streamRes.pipe(res);
    })
    .on("error", (error) => {
      console.error("Erro ao conectar ao stream:", error);
      res.status(502).json({
        error: "Erro ao conectar ao servidor de stream",
        details: error.message,
      });
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
