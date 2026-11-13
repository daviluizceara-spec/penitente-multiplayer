# Auditoria inicial — Penitente: Inferno Eterno

Base examinada: `Penitente_R9_17_Progressao_Encerramento (1).html`, commit `37c05e0`. O arquivo R9.5 citado na solicitação não está presente neste repositório. O HTML mantém CSS, dados e lógica em um único arquivo, e usa Socket.IO 4.8.1 da CDN para multiplayer. O servidor Node.js é separado. A cópia original permanece no histórico Git; as alterações desta entrega não migram o formato do save.

## Estrutura e dependências principais

- Entrada e interface: `Input`, `Pad`, teclado/mouse, layout touch, capa, pausa e abas do Arsenal. Teclas e mouse convergem em `Input.set`; o controle tem sua própria fonte. Os comandos são lidos no passo de simulação de 1/60 s.
- Campanha e mundo: `STAGES`, `SECRET_DEFS` e `SECRETS` definem as seis áreas principais e três desvios iniciais; `C2_CAMPAIGN` liga quatro trechos posteriores. Há rotas e setores adicionais em dados e código mais adiante no HTML. `stageOf`, `startArea` e `continueJourney` dependem de dados de progresso e marcos da narrativa.
- Personagens e história: `SPK`, `DLG`, `LORE`, retratos, companheiros, diálogos, eventos e cutscenes compartilham flags em `SAVE.prog`. A Ressonância possui tutorial e estados ligados à campanha posterior (`resDone`, `c2ResTick` e `resHelpHTML`).
- Combate, física e IA: `updPlayer`, `physics`, `updEnemy`, dados `ET`, ações de armas e habilidades, hitboxes e rotinas específicas de chefes convivem com lógica de encontros mais recente (`FOE_ROLES`). Movimento já tem coyote time, buffer, pulo variável e pulo duplo condicionado a `sp2`. Colisão horizontal usa posição final, portanto velocidades muito altas merecem revisão com testes antes de mudar a física.
- Progressão e interfaces: `UPG`, `GEAR`, `SK_DEF`, `calcStats`, Arsenal, loja, árvore, bestiário, Jornada, memórias e skins dependem de `SAVE` e de seus IDs. Os IDs existentes devem continuar estáveis.
- Salvamento: `loadSave` combina defaults com dados salvos, preservando a chave `penitente-inferno-eterno-v1`; existem também seis slots em `penitente-inferno-eterno-slots-v1`. Campos narrativos têm migrações específicas. Não se deve zerar nem substituir um save ao alterar sistemas.
- Multiplayer: `server.js` conserva os metadados de protocolo em `state.net` e `world.net`, com anfitrião como autoridade do mundo. O cliente tem código adicional de reconexão e sincronização; mudanças na simulação precisam ser verificadas nos dois lados.
- Renderização e áudio: Canvas usa coordenadas lógicas 480×270 com camadas de cenários, parallax, efeitos e desenhos procedurais; Web Audio gera sons e música. O frame usa `requestAnimationFrame`, acumulador fixo e limite de passos. Muitos elementos são implementados ou estendidos ao longo do mesmo script; ordem de inicialização importa.

`inventario-dados.json` registra as entradas observáveis das tabelas carregadas, incluindo áreas, personagens conhecidos, tipos de inimigos, equipamentos, habilidades, diálogos, memórias e skins. É um ponto de partida, não uma prova de cobertura de todos os eventos dinâmicos, diálogos construídos em tempo de execução ou ramificações narrativas.

## Problemas confirmados e correções

- Duas teclas, ou teclado e mouse, compartilhavam a mesma origem de entrada. Soltar uma podia cancelar outra ainda pressionada. Cada tecla física e botão de mouse agora tem origem independente; fontes touch e controle foram preservadas.
- As descrições da Couraça de Cinzas e da Armadura Obsidiana anunciavam +30/+60 de vida, mas o cálculo concedia +18/+36. Os textos foram alinhados aos efeitos reais, sem mexer no balanceamento.
- Save principal ilegível agora é copiado para uma chave de recuperação antes de qualquer substituição. Se a cópia falhar, o salvamento automático fica bloqueado e há aviso na capa. A cópia continua nos dados locais e pode ser baixada em Configurações → Jogo e Dados; ainda não há restauração pela interface.
- Slots manuais ilegíveis agora exibem aviso e bloqueiam alterações nos dados originais.
- O comando `npm test` apontava para `test-server.js`, arquivo ausente. A suíte atual executa testes do navegador e uma sessão real do servidor com Socket.IO.

## Riscos e trabalho pendente

- A análise detalhada e os testes de todas as áreas, chefes, NPCs, diálogos, cutscenes, finais, controles físicos e dispositivos ainda não foram concluídos. O catálogo é parcial quanto ao conteúdo dinâmico. A reconstrução metroidvania, revisão de movimento, combate, arte e interfaces pertencem às próximas entregas.
- O download preserva os dados brutos do save, slots e cópias, mas não repara dados corrompidos nem oferece restauração pela interface. Slots com JSON ilegível ficam protegidos contra escrita, mas também não há recuperação pela interface. Alterações de formato não foram introduzidas aqui.
- O README antigo descrevia outro nome de HTML e testes ausentes. Seus resultados históricos não comprovam a execução dos testes desta versão.
- Há diferenças entre o arquivo R9.17 e a identificação de rede `R9.1-rede`; não se deve presumir compatibilidade de todos os cenários multiplayer sem rodar o cliente real em dois dispositivos.

## Verificação executada

`npm test` cobre carregamento da capa e início, combinação de teclas e mouse, um save anterior representativo, pulo/ataque/esquiva, controle simulado após toque, descrições de armaduras, proteção e download do save ilegível, abertura do mapa e navegação pelas abas do Arsenal, além da criação/entrada/início de sala com dois clientes, além da preservação dos metadados de rede. Algumas ações do navegador usam preparação direta de estado para alcançar o trecho testado. O gamepad é simulado; não é um teste físico.

Não foram testados integralmente morte/renascimento, chefes, todos os diálogos, cutscenes, regiões e segredos, troca de área, uso completo do mapa, NPCs, compras, desbloqueios da árvore, registros do bestiário, Ressonância, touch real, celulares/APKs, restauração de sessão cooperativa ou desempenho. É necessário percorrer a campanha e testar hardware e rede reais antes de afirmar compatibilidade geral.
