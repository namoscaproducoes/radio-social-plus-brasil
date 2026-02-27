# Rádio Social Plus Brasil - TODO

## Fase 1: Pesquisa e Planejamento
- [x] Analisar site atual da rádio (radiosocialplusbrasil.com.br)
- [x] Identificar URL do stream de rádio (https://hts09.kshost.com.br:9608)
- [x] Entender estrutura de metadados do player (nome música, artista, capa)
- [x] Planejar arquitetura técnica (React + Express + tRPC + MySQL)
- [x] Coletar informações de branding da rádio

## Fase 2: Design e Prototipagem
- [x] Definir paleta de cores (roxo, amarelo, cinza)
- [x] Criar layout da landing page
- [x] Criar layout do dashboard administrativo
- [x] Definir componentes reutilizáveis

## Fase 3: Banco de Dados
- [x] Criar schema de tabelas (songs, votes, users, currentSong)
- [x] Gerar migrations SQL
- [x] Executar migrations no banco

## Fase 4: Backend (APIs tRPC)
- [x] Criar procedure para registrar voto (like/dislike)
- [x] Criar procedure para obter votos com filtros (dia, semana, mês, ano)
- [x] Criar procedure para obter ranking de músicas
- [x] Criar procedure para obter metadados da música atual
- [x] Implementar autenticação para dashboard

## Fase 5: Landing Page
- [x] Implementar layout responsivo
- [x] Integrar player de áudio
- [x] Conectar ao stream de rádio
- [x] Implementar exibição de metadados (nome, artista, capa)
- [x] Implementar botões de like/dislike
- [x] Conectar votação ao backend
- [x] Adicionar informações da rádio (sobre, contato, etc)

## Fase 6: Dashboard Administrativo
- [x] Implementar layout do dashboard
- [x] Criar gráficos de ranking de músicas
- [x] Implementar filtros de período (dia, semana, mês, ano)
- [x] Criar tabela com detalhes de votos
- [x] Implementar autenticação (acesso restrito)
- [x] Adicionar estatísticas gerais

## Fase 7: Integracao de Metadados
- [x] Corrigir URL do stream para https://s01.brascast.com:7034/live
- [x] Implementar suporte para streams HLS (M3U8) com HLS.js
- [x] Adicionar tratamento de erros melhorado no player
- [x] Separar URLs: live para reproduzir, sem live para metadados
- [x] Implementar captura automatica de metadados do stream ICEcast
- [x] Integrar iTunes API para buscar capa do album
- [x] Corrigir sistema de votos (like/dislike nao estao funcionando)
- [x] Remover mensagem Conectando ao streaming quando musica esta tocando
- [x] Resetar botoes de voto quando musica muda
- [x] Atualizar metadados em tempo real
- [x] Testar com stream ao vivo (9 testes passando)

## Fase 8: Testes e Otimizações
- [x] Testes unitários (vitest) - 9 testes passando
- [ ] Testes de responsividade (mobile, tablet, desktop)
- [ ] Testes de performance
- [ ] Testes de votação em tempo real
- [ ] Otimizações de carregamento
- [ ] Preparação para deploy no Hostinger

## Fase 9: Incorporar Player Brascast
- [x] Incorporar iframe do player Brascast
- [x] Redesenhar layout com capa grande, nome/artista e play
- [x] Extrair metadados do iframe via DOM inspection
- [x] Adicionar botões de like/dislike com metadados extraídos
- [x] Validar que votos são salvos no dashboard

## Fase 10: Novo Player Customizado
- [x] Criar componente RadioPlayer customizado
- [x] Integrar stream de rádio com proxy
- [x] Implementar atualização de metadados a cada 1 segundo
- [x] Adicionar controles de play/pause e volume
- [x] Integrar botões de like/dislike com metadados
- [x] Resetar votos quando música muda

## Fase 11: RadioPlayerV2 com Brascast Integration
- [x] Criar novo componente RadioPlayerV2 com layout impactante
- [x] Integrar player Brascast via iframe
- [x] Extrair metadados do iframe em tempo real
- [x] Implementar busca de capa no iTunes API
- [x] Adicionar botões like/dislike com feedback visual
- [x] Implementar polling automático de metadados
- [x] Testar com stream ao vivo
- [x] Integrar com Home.tsx


## Fase 12: Integração com Last.fm API
- [x] Criar conta Last.fm e obter API key
- [x] Analisar stream sem "live" para extrair metadados (Icecast)
- [x] Implementar extração de metadados do Icecast em tempo real
- [x] Integrar Last.fm API para buscar capa do álbum
- [x] Implementar fallback para iTunes API
- [x] Atualizar RadioPlayerV2 para usar tRPC em vez de fetch
- [x] Implementar polling automático de metadados (1 segundo)
- [x] Todos os testes passando (9 testes)

## Bugs Encontrados e Resolvidos
- [x] Metadados fixos em Waka Waka (player não atualiza) - Corrigido com Icecast
- [x] Capa do álbum não aparece - Agora busca via Last.fm com fallback iTunes
- [x] Votos não são salvos no dashboard - Corrigido com upsert automático
- [x] Incorporar player Brascast via iframe com estilo customizado
- [x] TypeScript warnings em RadioPlayerV2 - Corrigido com tipos corretos
- [x] useRef sem valor inicial - Corrigido com undefined como valor padrão
- [x] Metadados não carregavam - Corrigido com Icecast API + Last.fm
- [x] Erro de protocolo HTTP em Last.fm - Corrigido com módulo http dinâmico

## Fase 13: Correções e Melhorias de UX
- [x] Remover menu do topo (navbar)
- [x] Integrar rodapé com links (Sobre, Contato, Dashboard)
- [x] Corrigir cálculo de likePercentage na dashboard
- [x] Melhorar agregação de dados de votos
- [x] Todos os testes passando (9 testes)


## Fase 14: Melhoria de Resolução de Capas
- [x] Melhorar busca de capas no Last.fm (priorizar extralarge)
- [x] Melhorar busca de capas no iTunes (usar artworkUrl600)
- [x] Adicionar autocorrect na busca Last.fm
- [x] Aumentar timeout de requisições para 10 segundos
- [x] Todos os testes passando (9 testes)

## Fase 15: Correção de Bugs do Player
- [x] Player desligando ao trocar de música - Corrigido: não pausar, apenas atualizar metadados
- [x] Adicionar lógica de reconexão ao stream
- [x] Garantir que player continua tocando quando música muda
- [x] Melhorar tratamento de erros de stream
- [x] Todos os testes passando (9 testes)

## Fase 16: Correção de Buffer de Música
- [x] Corrigir bug de buffer da música anterior que repete
- [x] Zerar buffer quando música muda
- [x] Implementar pré-carregamento de 10 segundos
- [x] Testar com stream ao vivo

## Fase 17: Sistema Robusto de Streaming com Buffer Gerenciado
- [x] Implementar gerenciador de buffer no backend
- [x] Reescrever RadioPlayerV2 com estratégia de buffer melhorada
- [x] Implementar pré-carregamento de 5 segundos
- [x] Garantir fluxo contínuo sem interrupções
- [x] Testar resiliência contra queda de internet

## Bugs Pendentes
- [x] Dashboard não contabiliza votos corretamente - Corrigido: db.execute retorna [rows, fields], agora extraindo apenas rows
- [x] Capas do Last.fm em baixa resolução - Corrigido: priorizar extralarge e large, usar artworkUrl600 no iTunes
- [x] Player desligando ao trocar de música - Corrigido: manter reprodução contínua
- [x] Buffer da música anterior repete após troca - Corrigido com sistema robusto de buffer gerenciado

## Fase 18: Sincronização de Players (YouTube + Rádio)
- [x] Criar PlaybackContext para compartilhar estado entre players
- [x] Modificar RadioPlayerV2 para notificar quando play é acionado
- [x] Modificar YouTubePlayer para sincronizar com estado de reprodução
- [x] Testar sincronização entre players
- [x] Vídeo YouTube inicia apenas quando usuário clica play no player de rádio

## Bugs Atuais
- [x] Erro HTTP 500 ao buscar vídeo do YouTube - Resolvido: Implementado novo sistema com ytdl-core e cache


## Fase 19: Player de Vídeo Customizado com Extração de URL do YouTube
- [x] Pesquisar bibliotecas de extração de URL (yt-dlp, ytdl-core)
- [x] Implementar scraping de URL do YouTube com ytdl-core
- [x] Criar player de vídeo customizado (HLS.js + Video.js)
- [x] Integrar cache de vídeos no banco de dados (tabela videoCache)
- [x] Testar reprodução de vídeos (4 testes passando)


## Fase 20: Correção do Player de Vídeo
- [x] Implementar busca de vídeos no YouTube com geração de URLs
- [x] Armazenar vídeo encontrado no banco de dados (cache)
- [x] Reproduzir vídeo com áudio desativado (muted)
- [x] Sincronizar play/pause com player de rádio
- [x] Testar fluxo completo: busca → cache → reprodução (4 testes passando)


## Fase 22: Revert para YouTube API (Implementado)
- [x] Reverter para YouTube API com 10k requisições diárias
- [x] Implementar busca de vídeos com YouTube API v3
- [x] Usar embed do YouTube com videoId extraído
- [x] Sincronizar player com rádio e desativar áudio
- [x] Criar testes com tratamento de cota excedida
- [x] Testes passando (3/3)
- [x] Aguardando cota se renovar para testar com vídeos reais
