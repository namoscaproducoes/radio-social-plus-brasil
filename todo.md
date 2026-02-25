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


## Bugs Encontrados e Resolvidos
- [x] Metadados fixos em Waka Waka (player não atualiza) - Corrigido com iframe Brascast
- [x] Capa do álbum não aparece - Agora mostra via iframe
- [x] Votos não são salvos no dashboard - Corrigido com upsert automático
- [x] Incorporar player Brascast via iframe com estilo customizado
- [x] TypeScript warnings em RadioPlayerV2 - Corrigido com tipos corretos
- [x] useRef sem valor inicial - Corrigido com undefined como valor padrão
