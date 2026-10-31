# Penitente: Inferno Eterno — Multiplayer V6

**HTML e servidor precisam ser atualizados juntos** (os dois jogadores com o HTML V6).

## Correções da V6

- **Nome do amigo**: o servidor tinha uma regex quebrada que apagava maiúsculas, números e as letras "u"/"f" ("Pedro" virava "edro"). Corrigida; o nome agora vem do cadastro da sala (não muda mais por pacote) e é relido ao criar/entrar.
- **PvP não vai mais para a história**: duelo em arena própria, melhor de 3 rounds, placar controlado pelo servidor, revanche. Cooperativo continua sendo a campanha.
- **Chefes sincronizados**: chefe dispara com qualquer jogador na arena; adds/invocações ganham ID (antes se confundiam); zonas, falas, escuridão e mini-chefes replicados; snapshots só com diferenças (~12/s) e suavização no convidado; mundo continua se o anfitrião morre; prender/puxar do chefe chega ao convidado; sem dano duplicado em projéteis do anfitrião; convidado recebe recompensa do chefe.
- **Animações do parceiro**: cada golpe toca inteiro (mesmo em combos), com skin/arma do amigo, passada, esquiva, dano, morte, correntes, teia e projéteis.
- **Servidor padrão** `https://penitente-multiplayer.onrender.com` já preenchido; o lobby conecta sozinho (campo em "Servidor (avançado)"). Nome salvo no aparelho.

## Atualização no GitHub / Render
Substitua o HTML, `server.js` e `package.json`, faça commit e espere o Render ficar **Live**.

## Teste
Sintaxe do HTML e do servidor verificada e o diff de snapshots testado isoladamente. **Partida real entre dois aparelhos ainda precisa ser testada.**
