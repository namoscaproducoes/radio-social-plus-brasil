import { useEffect, useState, useCallback } from 'react';

export interface BrascastMetadata {
  title: string;
  artist: string;
  cover: string;
}

/**
 * Hook para extrair metadados do player Brascast via DOM inspection
 * Já que postMessage não funciona, vamos inspecionar o DOM do iframe
 */
export function useBrascastMetadata(iframeRef: React.RefObject<HTMLIFrameElement | null>) {
  const [metadata, setMetadata] = useState<BrascastMetadata>({
    title: '',
    artist: '',
    cover: '',
  });
  const [lastMetadata, setLastMetadata] = useState<string>('');

  const extractMetadata = useCallback(() => {
    try {
      if (!iframeRef.current?.contentDocument) return;

      const doc = iframeRef.current.contentDocument;

      // Tentar extrair do DOM do iframe
      // Procurar por elementos que contenham as informações
      const titleElement = doc.querySelector('[data-testid="now-playing-title"]') ||
                          doc.querySelector('.now-playing-title') ||
                          doc.querySelector('h2') ||
                          doc.querySelector('[class*="title"]');

      const artistElement = doc.querySelector('[data-testid="now-playing-artist"]') ||
                           doc.querySelector('.now-playing-artist') ||
                           doc.querySelector('p') ||
                           doc.querySelector('[class*="artist"]');

      const coverElement = doc.querySelector('img[alt="Album"]') ||
                          doc.querySelector('img[class*="cover"]') ||
                          doc.querySelector('img[class*="album"]') ||
                          doc.querySelector('img');

      const title = titleElement?.textContent?.trim() || '';
      const artist = artistElement?.textContent?.trim() || '';
      const cover = (coverElement as HTMLImageElement)?.src || '';

      const metadataKey = `${title}-${artist}`;

      // Só atualizar se mudou
      if (metadataKey !== lastMetadata && title) {
        console.log('Metadados extraídos do iframe:', { title, artist, cover });
        setMetadata({ title, artist, cover });
        setLastMetadata(metadataKey);
      }
    } catch (error) {
      console.warn('Erro ao extrair metadados do iframe:', error);
    }
  }, [iframeRef, lastMetadata]);

  useEffect(() => {
    // Extrair imediatamente
    extractMetadata();

    // Extrair a cada 500ms para detectar mudanças
    const interval = setInterval(extractMetadata, 500);

    return () => clearInterval(interval);
  }, [extractMetadata]);

  return metadata;
}
