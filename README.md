# Penitente: Inferno Eterno — Multiplayer V4

## Correção desta versão
Os chefes de campanha e de arena agora recebem IDs numéricos sequenciais, assim como os inimigos comuns. Isso evita que servidores antigos que convertem `enemyId` com `Number()` descartem golpes enviados pelo jogador convidado. O servidor incluído também mantém suporte aos IDs numéricos.

## Instalação
1. Extraia o ZIP.
2. Na pasta do projeto, execute `npm install`.
3. Inicie com `npm start` (Node.js 18 ou superior).
4. Hospede o HTML V4 e configure os dois jogadores para usar o mesmo endereço do servidor.
5. Crie uma sala nova depois de atualizar o HTML e o servidor. Não reutilize uma sala de uma partida anterior.

## Teste rápido
- Um jogador cria a sala e o outro entra antes de iniciar.
- Iniciem uma partida cooperativa nova.
- Ambos ataquem o mesmo chefe, alternadamente.
- Confirmem que a barra de vida diminui nos dois aparelhos após cada golpe.
- Repitam com um inimigo comum e, se possível, com um chefe de arena.

## Limitação de validação
A sintaxe JavaScript foi verificada com `node --check`. Não foi possível executar um teste real de dois dispositivos conectados a um servidor público nesta sessão. Se ainda falhar, preciso do endereço/arquivo exato do servidor que está hospedado e de saber quem criou a sala.
