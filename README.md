> **Nota sobre este repositório:** o HTML disponível atualmente é `Penitente_R9_17_Progressao_Encerramento (1).html`. O texto abaixo registra uma entrega anterior do servidor e cita um HTML e testes históricos que não estão aqui. Para a auditoria e os limites da versão atual, veja [docs/auditoria-entrega-1.md](docs/auditoria-entrega-1.md).
>
> Para executar os testes atuais, use `npm ci` e `npm test`. Os testes de navegador requerem Chromium em `/usr/bin/chromium`; use `CHROMIUM_PATH=/caminho/para/chromium npm test` se necessário. Não é preciso instalar um navegador para executar o jogo.

# Penitente — servidor V7 / cliente R9.1

Este pacote corrige o erro “A sincronização chegou sem state.net”. No servidor anterior, `cleanPlayerState` e `cleanWorld` descartavam os campos `net` enviados pelo HTML. Os campos agora são retransmitidos completos, com limites de tamanho e validação básica, sem usá-los para conceder acesso à sala ou autoridade de anfitrião.

## Atualizar o servidor no Render

1. Substitua no repositório ligado ao Render: `server.js`, `package.json` e `package-lock.json` pelos arquivos deste pacote.
2. Faça o commit e aguarde o deploy ficar **Live**. Se o deploy automático estiver desativado, use **Manual Deploy → Deploy latest commit**.
3. Configuração: Node.js 18 ou superior; Build Command `npm ci --omit=dev`; Start Command `npm start`. A variável `PORT` fornecida pelo Render continua sendo respeitada.
4. Abra a URL pública do servidor no navegador. Ela precisa mostrar exatamente: **“Penitente: Inferno Eterno — servidor V7 / R9.1 ativo.”** Se aparecer apenas “servidor multiplayer ativo”, a versão antiga ainda está em execução.
5. Os dois jogadores devem usar o HTML `Penitente_R9_1_Rede.html` incluído. Ele é o mesmo R9.1 entregue anteriormente; quem já o instalou não precisa trocar de novo. Caso use APK, o HTML incorporado deve ser essa versão.
6. Voltem à capa e criem uma sala nova depois do deploy. As salas antigas ficam na memória do processo anterior e não atravessam a atualização.

Este trabalho não publicou o servidor no Render. Os arquivos precisam ser enviados ao repositório/serviço que você utiliza.

## O que mudou

- `state.net` e `world.net` mantêm versão, identificação da partida, nonce, época, sequências, confirmações, ações, sondas de ping, diálogos, cutscenes, mecanismos e progresso dos desvios.
- Snapshots incrementais mantêm campos omitidos; o último delta não é reenviado como se fosse um estado completo.
- O Socket.IO pode recuperar a sessão de uma queda de transporte por até 120 segundos, enquanto o mesmo processo continua ativo. A sala reserva o jogador nesse intervalo. A volta exige o mesmo ID recuperado, confirmação no cadastro da sala e sincronização completa solicitada ao anfitrião.
- Um jogador novo não pode ocupar a vaga de uma partida já iniciada. Somente o anfitrião cadastrado pode enviar o mundo.
- Não existe migração de anfitrião. Sua saída voluntária ou expiração da reserva encerra a sala. A saída definitiva do convidado encerra a partida e deixa o anfitrião no lobby.
- O PvP mantém placar melhor de três e revanche. Recuperação de round depois de uma queda não foi acrescentada; nesse caso a partida encerra, como no cliente atual.
- O endpoint HTTP identifica a versão implantada.

## Limites

A recuperação não persiste através de reinício do servidor, novo deploy, limpeza do aplicativo ou reconexão com uma sessão/ID novos. Um APK fechado pelo Android pode perder a sessão e exigir sala nova. O cliente não é liberado só porque o socket conectou.

As salas e sessões continuam em memória, em uma única instância. Múltiplas instâncias exigiriam adaptador e recuperação compartilhados; isso não está implementado neste pacote. Não há promessa de recuperar uma sala após o Render reiniciar/suspender o processo.

## Testes

Para executar localmente:

```sh
npm ci
npm test
```

O cliente Socket.IO é uma dependência de desenvolvimento, usada somente nos testes. O HTML e `game-runtime-test.cjs` são necessários para o teste de handshake do jogo; não precisam ser publicados como página web pelo servidor.

Foram executados testes com um servidor Socket.IO local real e clientes via WebSocket: criação/entrada/início; metadados completos nas duas direções; snapshot completo e incremental; resync; queda e recuperação real do convidado e do anfitrião com os mesmos IDs; confirmação de sala; snapshot novo após retorno; rejeição de terceiro jogador e de mundo enviado por não anfitrião; encerramento sem migração; placar e revanche PvP.

Também foram carregadas duas instâncias do JavaScript do HTML R9.1 com DOM simulado, ligadas ao servidor real. Ambas saíram do bloqueio de sincronização após o handshake e o estado completo. Isso verifica a lógica e o transporte, não a renderização ou os controles de um navegador real.

Não houve deploy no Render, teste em dois celulares/APKs, interrupção longa até expirar os 120 segundos ou teste de reinício do processo. O arquivo `testes-resultados.txt` contém o resultado da execução final.
