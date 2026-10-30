# Penitente: Inferno Eterno — Multiplayer V5

Esta versão atualiza o HTML do jogo e o servidor Socket.IO. **Os dois precisam ser atualizados juntos.**

## Correções da V5

- Repasse da ação e da fase do golpe do jogador remoto para a animação do personagem.
- Suavização da posição do parceiro para reduzir os saltos visuais.
- Envio do estado dos jogadores em intervalo menor e sem descarte de pacotes de movimento.
- Reanimação cooperativa: o jogador vivo deve ficar próximo do parceiro caído e manter um botão de ataque pressionado por aproximadamente 0,9 segundo. Funcionam golpe rápido, golpe pesado e arpão; no celular, mantenha pressionado um desses botões.
- Redução da frequência dos snapshots do mundo compartilhado para diminuir o tráfego do servidor.

## Arquivos

- `Penitente_Inferno_Eterno_Multiplayer.html` — jogo atualizado.
- `server.js` — servidor atualizado.
- `package.json` — dependência e comando de inicialização.

## Atualização no GitHub / Render

1. Na raiz do repositório, substitua o HTML principal pelo HTML deste pacote.
2. Substitua o `server.js` pelo `server.js` deste pacote.
3. Mantenha o `package.json` atual (a dependência não mudou); se preferir, pode substituir pelo incluído.
4. Faça commit e aguarde o deploy do Render ficar **Live**.
5. Os dois jogadores devem abrir o HTML V5, não misturar V4 com V5.

O comando de inicialização continua `npm start`.

## Observação de teste

A sintaxe do JavaScript do HTML e do servidor foi verificada. A partida real entre dois dispositivos ainda precisa ser testada com os dois jogadores conectados ao servidor atualizado.
