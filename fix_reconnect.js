const fs = require('fs');
const path = require('path');

const filePath = './client/src/components/RadioPlayerV2.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Substituir a função reconnectToStream
const oldFunction = `  const reconnectToStream = useCallback((reason: string) => {
    if (userPausedRef.current) {
      console.log('⏸️ Usuário pausou manualmente, não reconectando');
      return;
    }

    if (reconnectAttemptsRef.current >= maxReconnectAttemptsRef.current) {
      console.error('❌ Máximo de tentativas de reconexão atingido');
      setIsPlaying(false);
      setContextIsPlaying(false);
      toast.error('Falha ao conectar ao stream. Tente novamente.');
      return;
    }

    reconnectAttemptsRef.current++;
    console.log(\`🔄 Reconectando ao stream (\${reconnectAttemptsRef.current}/\${maxReconnectAttemptsRef.current}) - Motivo: \${reason}\`);

    const delayMs = Math.min(500 * reconnectAttemptsRef.current, 5000);

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        if (!audioRef.current || userPausedRef.current) return;

        console.log('🔄 Iniciando reconexão...');
        
        // Apenas pausar se não está pausado
        if (!audioRef.current.paused) {
          audioRef.current.pause();
        }
        
        const newSrc = '/api/stream?' + Date.now();
        audioRef.current.src = newSrc;
        console.log('📡 Novo src definido:', newSrc);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Apenas tentar reproduzir se o usuário não pausou
        if (!userPausedRef.current) {
          const playPromise = audioRef.current.play();
          if (playPromise) {
            await playPromise;
            console.log('✅ Reconectado ao stream com sucesso');
            reconnectAttemptsRef.current = 0;
            lastPlayTimeRef.current = Date.now();
          }
        }
      } catch (error) {
        console.error('❌ Erro ao reconectar:', error);
        // Não reconectar se o usuário pausou
        if (!userPausedRef.current) {
          reconnectToStream('retry after error');
        }
      }
    }, delayMs);
  }, [setContextIsPlaying]);`;

const newFunction = `  const reconnectToStream = useCallback((reason: string) => {
    if (userPausedRef.current) {
      console.log('⏸️ Usuário pausou manualmente, não reconectando');
      return;
    }

    if (reconnectAttemptsRef.current >= maxReconnectAttemptsRef.current) {
      console.warn('⚠️ Máximo de tentativas de reconexão atingido. Aguardando próxima ação do usuário.');
      setIsPlaying(false);
      setContextIsPlaying(false);
      return;
    }

    reconnectAttemptsRef.current++;
    console.log(\`🔄 Reconectando ao stream (\${reconnectAttemptsRef.current}/\${maxReconnectAttemptsRef.current}) - Motivo: \${reason}\`);

    const delayMs = Math.min(500 * reconnectAttemptsRef.current, 5000);

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        if (!audioRef.current || userPausedRef.current) return;

        console.log('🔄 Preparando reconexão...');
        
        // Apenas pausar se não está pausado
        if (!audioRef.current.paused) {
          audioRef.current.pause();
        }
        
        const newSrc = '/api/stream?' + Date.now();
        audioRef.current.src = newSrc;
        console.log('📡 Novo src definido:', newSrc);
        
        // NÃO tentar reproduzir automaticamente - navegador bloqueia autoplay sem interação
        console.log('✅ Stream pronto para reproduzir (aguardando clique do usuário)');
        reconnectAttemptsRef.current = 0;
      } catch (error) {
        console.error('❌ Erro ao preparar reconexão:', error);
        // Não reconectar se o usuário pausou
        if (!userPausedRef.current && reconnectAttemptsRef.current < maxReconnectAttemptsRef.current) {
          reconnectToStream('retry after error');
        }
      }
    }, delayMs);
  }, [setContextIsPlaying]);`;

content = content.replace(oldFunction, newFunction);
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Arquivo atualizado com sucesso');
