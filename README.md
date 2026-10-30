# Penitente: Inferno Eterno — Multiplayer online (protótipo)

Esta entrega adiciona uma primeira camada de multiplayer online ao HTML enviado:
- menu Multiplayer Online;
- conexão com um servidor Socket.IO;
- criação de sala com código de 6 caracteres;
- entrada do segundo jogador;
- início da partida pelo anfitrião;
- sincronização da posição, direção e pose básica do outro personagem no cenário;
- modos selecionáveis: cooperativo e PvP.

## O que ainda NÃO está implementado
Esta é a fundação de rede e presença dos jogadores, não o multiplayer de combate completo.
Ainda faltam: autoridade do servidor sobre o mundo, sincronização de inimigos/chefes/itens,
dano entre jogadores, reviver aliado, condições de vitória/derrota do PvP, reconexão à sala
e testes de latência. O jogo original continua disponível como modo solo.

## Arquivos
- `Penitente_Inferno_Eterno_Multiplayer.html` — jogo com o menu e cliente multiplayer.
- `server.js` — servidor de salas Socket.IO.
- `package.json` — dependência e comando de inicialização.

## Teste local (PC)
1. Instale Node.js 18 ou superior.
2. Extraia a pasta do projeto.
3. Abra um terminal dentro dela e execute `npm install`.
4. Execute `npm start`.
5. O servidor ficará disponível na porta 3000.
6. Para teste local, abra o HTML em dois navegadores/dispositivos e informe `http://IP-DO-PC:3000`.
   Ambos precisam estar na mesma rede Wi-Fi. O navegador deve conseguir carregar o cliente Socket.IO
   pela internet (CDN).
7. Em um celular conectado à mesma Wi-Fi, use o IP local do computador, não `localhost`.

## Para jogar de lugares diferentes
O servidor precisa ser publicado em um serviço que aceite aplicações Node.js e WebSockets.
Depois de publicar, copie a URL HTTPS pública do serviço e informe essa URL no campo
"Endereço do servidor" dentro do menu Multiplayer Online. Os dois jogadores usam a mesma URL.

Não basta enviar o HTML ao amigo: o servidor também precisa estar ligado e acessível pela internet.
A hospedagem pode ter custos, limites de uso ou suspensão por inatividade; verifique as condições
do provedor escolhido.

## Como entrar na partida
1. Ambos abrem o mesmo HTML.
2. O anfitrião conecta ao servidor e escolhe Cooperativo ou PvP.
3. O anfitrião toca em "Criar sala" e compartilha o código.
4. O amigo conecta ao mesmo servidor, digita o código e toca em "Entrar na sala".
5. O anfitrião toca em "Iniciar partida".

## Observação técnica
O servidor atual retransmite estados dos jogadores e controla a lotação das salas. A simulação
principal de combate ainda acontece localmente em cada navegador. Portanto, nesta versão, não
há garantia de que inimigos, chefes, dano ou progresso sejam idênticos nos dois aparelhos.
