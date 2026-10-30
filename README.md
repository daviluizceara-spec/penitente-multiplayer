# Penitente: Inferno Eterno — Multiplayer Online v2

Esta versão atualiza **o HTML do jogo e o servidor Socket.IO**. Os dois precisam ser atualizados para que os novos eventos funcionem.

## O que entrou nesta versão

### Cooperativo (2 jogadores)
- O anfitrião passa a enviar snapshots do mundo compartilhado.
- Inimigos, estados de chefes, projéteis, perigos de cenário, itens no chão e alguns estados de checkpoint são sincronizados.
- O convidado envia os golpes contra inimigos ao anfitrião, que aplica o dano no inimigo compartilhado.
- A IA dos inimigos pode escolher o jogador mais próximo como alvo.
- Dano corpo a corpo recebido pelo convidado é encaminhado pelo anfitrião.
- Itens coletados pelo convidado são removidos do mundo do anfitrião e a recompensa também é aplicada a ele.
- Reanimação: se um jogador cair, o parceiro deve ficar perto e manter um botão de ataque pressionado (golpe rápido, pesado ou arpão) até a reanimação completar.
- HUD com nome e barra de vida do parceiro.

### PvP
- Eventos de ataques básicos entre jogadores.
- Dano, direção, alcance e estado de invulnerabilidade são considerados na troca de golpes.
- HUD do adversário com barra de vida.

## Como atualizar o servidor que já está no Render

1. Abra o repositório GitHub que você já conectou ao Render.
2. Envie os arquivos deste ZIP para a raiz do repositório:
   - `server.js`
   - `package.json`
   - `Penitente_Inferno_Eterno_Multiplayer.html`
   - `README.md`
3. Quando o GitHub perguntar, confirme a substituição dos arquivos existentes.
4. Faça o commit das alterações.
5. No Render, aguarde o deploy terminar e o serviço ficar **Live**.

O comando de inicialização continua sendo `npm start`. O Render deve detectar a alteração e fazer novo deploy automaticamente.

## Como atualizar os celulares

1. Envie o novo HTML para os dois jogadores (Drive, WhatsApp ou outro meio).
2. Os dois devem abrir **essa mesma versão atualizada** no navegador.
3. Entrem no menu Multiplayer Online.
4. Coloquem o mesmo endereço do servidor Render.
5. Conectem, criem/entrem na sala e iniciem a partida.

Não basta atualizar apenas o servidor ou apenas o HTML: **os dois precisam estar na versão v2**.

## Limitações que ainda precisam de uma etapa de acabamento

Esta é uma atualização substancial, mas não é correto chamar o multiplayer de versão final:
- A sala continua limitada a 2 jogadores.
- A autoridade do mundo cooperativo fica no anfitrião; se ele fechar o jogo, a sessão termina.
- Progresso narrativo, diálogos, escolhas, equipamentos e saves individuais ainda não são compartilhados como um único save cooperativo.
- A coleta de itens do cenário é sincronizada, mas baús, NPCs, interações e todas as recompensas de missão ainda precisam de sincronização própria.
- O PvP usa detecção simplificada de golpes por alcance/direção; ainda não reproduz todas as hitboxes, defesas, habilidades e regras de duelo do combate solo.
- A reconexão automática ao meio de uma partida e a recuperação de sessão após queda de internet ainda não estão implementadas.
- O servidor não persiste salas ou partidas após reiniciar.

## Teste recomendado

Antes de jogar uma campanha longa:
1. Teste com dois celulares em Wi-Fi.
2. Crie uma sala cooperativa e confira se ambos veem o mesmo inimigo perder vida.
3. Faça o convidado atacar e confirme que o inimigo morre para os dois.
4. Deixe um jogador receber dano de um inimigo e confira a barra de vida.
5. Teste coleta de moedas/itens e reanimação.
6. Depois teste o PvP em uma área segura.

Se algum dos dois aparelhos estiver usando um HTML antigo, o comportamento pode parecer dessincronizado.
