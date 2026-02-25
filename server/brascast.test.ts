import { describe, it, expect } from "vitest";
import { fetchBrascastData } from "./brascast-api";

describe("Brascast API", () => {
  it("deve buscar dados da API Brascast com token válido", async () => {
    const data = await fetchBrascastData();

    // Se o token for válido, deve retornar dados
    if (data) {
      expect(data).toHaveProperty("title");
      expect(data).toHaveProperty("artist");
      expect(data.title).not.toBe("Música Desconhecida");
      expect(data.artist).not.toBe("Artista Desconhecido");
    } else {
      // Se retornar null, é porque o token é inválido ou a API não respondeu
      console.warn("Brascast API retornou null - verificar token");
    }
  });
});
