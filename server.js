'use strict';
const http = require('http');
const { Server } = require('socket.io');

const PORT = Number(process.env.PORT || 3000);
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Penitente: Inferno Eterno — servidor multiplayer online ativo.\\n');
});
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
  pingInterval: 10000,
  pingTimeout: 20000
});

const rooms = new Map();
const socketRoom = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeCode() {
  let code;
  do {
    code = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  } while (rooms.has(code));
  return code;
}
function roomInfo(room) {
  return { code: room.code, players: room.players.size, host: room.host, mode: room.mode };
}
function updateRoom(room) {
  io.to(room.code).emit('room-update', roomInfo(room));
}
function leaveRoom(socket) {
  const code = socketRoom.get(socket.id);
  if (!code) return;
  const room = rooms.get(code);
  socketRoom.delete(socket.id);
  socket.leave(code);
  if (!room) return;
  room.players.delete(socket.id);
  io.to(code).emit('player-left');
  if (room.players.size === 0) {
    rooms.delete(code);
    return;
  }
  if (room.host === socket.id) room.host = room.players.keys().next().value;
  updateRoom(room);
}
function cleanName(value) {
  return String(value || 'Penitente').replace(/[<>\\u0000-\\u001f]/g, '').trim().slice(0, 16) || 'Penitente';
}

io.on('connection', socket => {
  socket.on('create-room', (data = {}, ack = () => {}) => {
    leaveRoom(socket);
    const code = makeCode();
    const room = {
      code,
      host: socket.id,
      mode: data.mode === 'pvp' ? 'pvp' : 'coop',
      players: new Map([[socket.id, { name: cleanName(data.name) }]])
    };
    rooms.set(code, room);
    socket.join(code);
    socketRoom.set(socket.id, code);
    ack({ ok: true, code, mode: room.mode });
    updateRoom(room);
  });

  socket.on('join-room', (data = {}, ack = () => {}) => {
    const code = String(data.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const room = rooms.get(code);
    if (!room) return ack({ ok: false, error: 'Sala não encontrada. Confira o código.' });
    if (room.players.size >= 2) return ack({ ok: false, error: 'A sala já está cheia.' });
    leaveRoom(socket);
    room.players.set(socket.id, { name: cleanName(data.name) });
    socket.join(code);
    socketRoom.set(socket.id, code);
    ack({ ok: true, code, mode: room.mode });
    updateRoom(room);
  });

  socket.on('start-match', (data = {}, ack = () => {}) => {
    const code = String(data.code || '');
    const room = rooms.get(code);
    if (!room || socketRoom.get(socket.id) !== code) return ack({ ok: false, error: 'Você não está nessa sala.' });
    if (room.host !== socket.id) return ack({ ok: false, error: 'Somente o criador da sala pode iniciar.' });
    if (room.players.size !== 2) return ack({ ok: false, error: 'Espere seu amigo entrar na sala.' });
    room.mode = data.mode === 'pvp' ? 'pvp' : 'coop';
    const area = Math.max(0, Math.min(5, Math.floor(Number(data.area) || 0)));
    const cpx = Math.max(0, Math.min(1000000, Number(data.cpx) || 0));
    io.to(code).emit('match-start', { code, mode: room.mode, area, cpx });
    ack({ ok: true });
  });

  socket.on('player-state', (data = {}) => {
    const code = String(data.code || '');
    if (socketRoom.get(socket.id) !== code || !rooms.has(code)) return;
    const s = data.state || {};
    const state = {
      x: Math.max(-100000, Math.min(1000000, Number(s.x) || 0)),
      y: Math.max(-1000, Math.min(2000, Number(s.y) || 0)),
      f: Number(s.f) < 0 ? -1 : 1,
      run: !!s.run,
      air: Math.max(-1, Math.min(1, Number(s.air) || 0)),
      dodge: !!s.dodge,
      hurt: !!s.hurt,
      rage: !!s.rage,
      name: cleanName(s.name)
    };
    socket.to(code).volatile.emit('player-state', { id: socket.id, state });
  });

  socket.on('disconnect', () => leaveRoom(socket));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Penitente multiplayer server listening on ${PORT}`);
});
