# Penitente: Inferno Eterno — Multiplayer V3

## O que foi corrigido

- Chefes recebem um identificador de rede estável baseado na área/encontro e tipo.
- O snapshot do anfitrião agora inclui a entidade completa do chefe e o estado do encontro: fase global (`cine`/`play`/`bossdie`), temporizador de morte, cinemática, trava da arena e estado da arena.
- O convidado deixa de executar a IA do chefe durante a cinemática e a morte. A posição, vida, fase, telegráficos, estados e projéteis vêm dos snapshots do anfitrião.
- O dano do convidado continua sendo uma solicitação ao anfitrião; o servidor valida sala, papel, modo, frequência, identificador e limites básicos da solicitação. O anfitrião só aplica o dano se encontrar a entidade de rede no mundo atual.
- A conclusão da luta abre a saída nos dois clientes. O convidado registra o desbloqueio local da área sem executar novamente as recompensas do anfitrião.
- O servidor recusa entrada tardia em uma partida já iniciada, evitando que um cliente entre com o mundo local ainda não sincronizado.

## Instalação

Requer Node.js 18 ou superior.

```bash
npm install
npm start
```

O servidor continua usando Socket.IO 4.8.1. Publique `server.js` e `package.json` no serviço de hospedagem (por exemplo, Render).

Os dois jogadores devem abrir o arquivo `Penitente_Inferno_Eterno_Multiplayer_V3.html` e conectar ao mesmo endereço de servidor. Para iniciar, o anfitrião cria a sala e inicia a partida com o convidado já conectado.

## Testes realizados nesta entrega

- Verificação sintática de `server.js` com `node --check`.
- Verificação sintática do JavaScript embutido no HTML com `node --check`.
- Inspeção estática dos caminhos de criação de chefes, dano, snapshots, aplicação de snapshots e transições de estado.
- Verificação de que o convidado não executa a IA do chefe durante `cine` e `bossdie`.

## Testes que ainda precisam ser feitos

Não foram executados testes reais com dois dispositivos nem uma sessão Socket.IO hospedada. Antes de usar em campanha longa, testar:

1. Ambos entram na mesma área e arena.
2. O chefe aparece com o mesmo identificador e HP nos dois clientes.
3. Ataque do host e do convidado atualiza a mesma barra de vida.
4. Fases, direção, telegráficos, ataques especiais e projéteis acompanham o host.
5. A morte e a abertura da saída aparecem nos dois clientes.
6. A progressão local do convidado é salva sem duplicar recompensas.
7. Morte/respawn de um jogador durante a luta.
8. Inimigos comuns e coleta continuam funcionando.
9. PvP permanece funcional.
10. Tentativa de entrar em sala com partida em andamento é recusada.

## Limitações conhecidas

- A autoridade permanece no anfitrião. Se ele desconectar, a sessão não migra para o convidado.
- Reconexão automática com recuperação completa do estado da batalha não foi implementada.
- O convidado não pode entrar no meio de uma partida; deve entrar antes do anfitrião iniciar.
- Não foi possível validar visualmente a experiência em dois aparelhos nesta execução.
- O servidor aplica validação e limites básicos, mas a arquitetura ainda é parcialmente autoritativa: não é uma solução anti-cheat completa.
