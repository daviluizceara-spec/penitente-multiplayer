'use strict';
const http = require('http');
const { Server } = require('socket.io');

const PORT = Number(process.env.PORT || 3000);
const server = http.createServer((req, res) => {
  res.writeHead(200, {'content-type':'text/plain; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'});
  res.end('Penitente: Inferno Eterno — servidor V7 / R9.1 ativo.\n');
});
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST'] },
  connectionStateRecovery: {maxDisconnectionDuration:120000,skipMiddlewares:false},
  transports: ['websocket','polling'],
  pingInterval: 10000,
  pingTimeout: 25000,
  maxHttpBufferSize: 2e6
});

const rooms = new Map();
const pendingDisconnect = new Map();
const RECOVERY_MS = 120000;
const socketRoom = new Map();
const lastWorld = new Map();
const lastHit = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DUEL_WINS = 2;            // melhor de 3 rounds
const DUEL_PREP_MS = 3200;      // contagem antes do primeiro round
const DUEL_BETWEEN_MS = 3600;   // pausa depois de um round
const DUEL_PREP2_MS = 2200;     // contagem antes dos rounds seguintes

function makeCode(){
  let code;
  do { code=Array.from({length:6},()=>CODE_CHARS[Math.floor(Math.random()*CODE_CHARS.length)]).join(''); }
  while(rooms.has(code));
  return code;
}
// Remove só caracteres de controle e < > (o regex antigo apagava maiúsculas, números e as letras "u" e "f").
function cleanName(v){
  return String(v||'Penitente').replace(/[<>\u0000-\u001f\u007f]/g,'').replace(/\s+/g,' ').trim().slice(0,16)||'Penitente';
}
function namesOf(r){
  const out={};
  for(const [id,p] of r.players) out[id]=p.name;
  return out;
}
function roomInfo(r){return {code:r.code,players:[...r.players.values()].filter(p=>p.connected!==false).length,host:r.host,mode:r.mode,started:!!r.started,names:namesOf(r)};}
function updateRoom(r){io.to(r.code).emit('room-update',roomInfo(r));}
function clearTimers(r){
  if(!r||!r.timers)return;
  for(const t of r.timers)clearTimeout(t);
  r.timers=[];
}
function later(r,ms,fn){
  r.timers=r.timers||[];
  const t=setTimeout(()=>{r.timers=r.timers.filter(x=>x!==t);fn()},ms);
  r.timers.push(t);
}
function cancelDeparture(id){const timer=pendingDisconnect.get(id);if(timer)clearTimeout(timer);pendingDisconnect.delete(id)}
function leaveRoom(socket){
  cancelDeparture(socket.id);
  const code=socketRoom.get(socket.id);if(!code)return;
  const r=rooms.get(code);socketRoom.delete(socket.id);socket.leave(code);
  lastWorld.delete(socket.id);lastHit.delete(socket.id);
  if(!r)return;
  r.players.delete(socket.id);io.to(code).emit('player-left');
  clearTimers(r);
  if(!r.players.size){rooms.delete(code);return;}
  // Saída definitiva não transfere a autoridade da campanha.
  r.started=false;r.duel=null;r.worldState=null;
  if(r.host===socket.id){
    io.to(code).emit('room-update',{code,players:0,host:null,mode:r.mode,started:false,names:{}});
    for(const id of r.players.keys()){
      cancelDeparture(id);socketRoom.delete(id);lastWorld.delete(id);lastHit.delete(id);
      io.sockets.sockets.get(id)?.leave(code);
    }
    rooms.delete(code);return;
  }
  updateRoom(r);
}
function suspendConnection(socket,reason){
  const code=socketRoom.get(socket.id),r=rooms.get(code);
  // O HTML não retoma placar/round de PvP. Lobby e saídas voluntárias encerram.
  const recoverable=['transport close','transport error','ping timeout'].includes(reason);
  if(!r||!r.started||r.mode!=='coop'||!recoverable){leaveRoom(socket);return}
  const p=r.players.get(socket.id);if(!p)return;
  p.connected=false;cancelDeparture(socket.id);
  io.to(code).emit('player-left');updateRoom(r);
  const timer=setTimeout(()=>leaveRoom(socket),RECOVERY_MS);timer.unref?.();pendingDisconnect.set(socket.id,timer);
}

function num(v,min,max,fallback=0){v=Number(v);return Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;}
const ID_RE=/^[a-zA-Z0-9_-]{1,24}$/;
function cleanGear(g){
  const out={};
  if(!g||typeof g!=='object')return out;
  for(const k of ['sword','helm','armor','chain','skin']){
    const v=g[k];
    if(typeof v==='string'&&ID_RE.test(v))out[k]=v;
  }
  return out;
}
function cleanProj(list){
  if(!Array.isArray(list))return [];
  const out=[];
  for(const q of list.slice(0,6)){
    if(!q||typeof q!=='object')continue;
    if(q.k!=='pwave'&&q.k!=='webshot')continue;
    out.push({
      k:q.k,gid:num(q.gid,0,1e9),x:num(q.x,-100000,1000000),y:num(q.y,-1000,2000),
      vx:num(q.vx,-3000,3000),vy:num(q.vy,-3000,3000),r:num(q.r,0,60),life:num(q.life,0,10)
    });
  }
  return out;
}
function cleanNet(n){
  if(n===undefined)return undefined; // V6 continua identificável como legado no cliente.
  if(!n||typeof n!=='object'||Array.isArray(n))return null;
  try{
    if(n.v!==7||!Number.isSafeInteger(n.epoch)||n.epoch<0)return null;
    if(typeof n.match!=='string'||n.match.length>160)return null;
    const raw=JSON.stringify(n);if(raw.length>1000000)return null;
    return JSON.parse(raw); // preserva ações, confirmações, nonce, diálogos e progresso.
  }catch(_){return null}
}
function cleanPlayerState(s={},name){
  const net=cleanNet(s.net);if(net===null)return null;
  return {net,
    x:num(s.x,-100000,1000000),y:num(s.y,-1000,2000),vx:num(s.vx,-3000,3000),f:Number(s.f)<0?-1:1,
    run:!!s.run,air:num(s.air,-1,1),dodge:!!s.dodge,hurt:num(s.hurt,0,1),rage:!!s.rage,
    name:name||cleanName(s.name),hp:num(s.hp,0,100000),maxHp:num(s.maxHp,1,100000,1),
    dead:!!s.dead,dd:num(s.dd,0,1),inv:num(s.inv,0,10),dinv:num(s.dinv,0,10),flash:!!s.flash,
    atkSeq:num(s.atkSeq,0,1e9),act:String(s.act||'').slice(0,24),
    atkP:num(s.atkP,0,1,0),atkN:Math.floor(num(s.atkN,1,3,1)),atkDur:num(s.atkDur,0,5),
    atkDamage:num(s.atkDamage,0,1),rng:num(s.rng,0,600,70),
    ax:num(s.ax,-100000,1000000),ay:num(s.ay,-1000,2000),tip:num(s.tip,0,600),
    revive:!!s.revive,gear:cleanGear(s.gear),proj:cleanProj(s.proj)
  };
}
function cleanWorld(w){
  if(!w||typeof w!=='object')return null;
  const net=cleanNet(w.net);if(net===null)return null;
  // Arrays omitidos continuam omitidos (o cliente só reenvia o que mudou).
  const arr=(v,n)=>Array.isArray(v)?v.slice(0,n):undefined;
  const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:null;
  let clean;
  try{
    clean={net,
      seq:num(w.seq,0,1e12),full:!!w.full,area:num(w.area,0,5),sec:num(w.sec,-1,100),
      state:String(w.state||'play').slice(0,16),t:num(w.t,0,1e9),
      enemies:arr(w.enemies,300)||[],eids:arr(w.eids,400)||[],
      bossId:num(w.bossId,0,1e9),miniId:num(w.miniId,0,1e9),miniDone:!!w.miniDone,
      projectiles:arr(w.projectiles,260)||[],pickups:arr(w.pickups,260)||[],
      hazards:arr(w.hazards,120),pits:arr(w.pits,120),plats:arr(w.plats,120),
      solids:arr(w.solids,260),vzG:arr(w.vzG,100),
      bossStarted:!!w.bossStarted,bossKilled:!!w.bossKilled,exitOpen:!!w.exitOpen,
      clearT:num(w.clearT,0,10000),cine:obj(w.cine),lock:obj(w.lock),arena:obj(w.arena),
      cz:arr(w.cz,100)||[],winN:num(w.winN,0,1000),darkT:num(w.darkT,0,10),
      bs:obj(w.bs),abG:obj(w.abG),
      amb:w.amb&&typeof w.amb==='object'?{state:num(w.amb.state,0,10),wave:num(w.amb.wave,0,100)}:null,
      cp:w.cp&&typeof w.cp==='object'?{x:num(w.cp.x,0,1000000)}:null,
      stats:w.stats&&typeof w.stats==='object'?{kills:num(w.stats.kills,0,1e9),bossDmg:num(w.stats.bossDmg,0,1e9)}:{}
    };
    const raw=JSON.stringify(clean);
    if(raw.length>1500000)return null;
    return JSON.parse(raw);
  }catch(_){return null}
}
function inRoom(socket,code){
  const room=rooms.get(code);
  if(!room||socketRoom.get(socket.id)!==code)return null;
  return room;
}
function duelPayload(r,extra={}){
  const d=r.duel||{};
  return Object.assign({round:d.round||1,wins:Object.assign({},d.wins||{}),phase:d.phase||'prep'},extra);
}
// Duelo PvP: o servidor é a autoridade do placar (melhor de 3), assim os dois aparelhos sempre concordam.
function startDuelRound(r,first){
  if(!r.duel)return;
  r.duel.phase='prep';
  io.to(r.code).emit(first?'duel-prep':'duel-reset',duelPayload(r));
  later(r,first?DUEL_PREP_MS:DUEL_PREP2_MS,()=>{
    if(!r.duel||r.duel.over)return;
    r.duel.phase='fight';
    io.to(r.code).emit('duel-fight',duelPayload(r));
  });
}

io.on('connection',socket=>{
  // Socket.IO restaurou o ID e a associação; ainda confirmamos no cadastro real.
  const restoredCode=socketRoom.get(socket.id),restored=rooms.get(restoredCode);
  if(socket.recovered&&restored&&restored.players.has(socket.id)){
    cancelDeparture(socket.id);restored.players.get(socket.id).connected=true;
    socket.join(restoredCode);
    setImmediate(()=>{
      if(rooms.get(restoredCode)!==restored||!socket.connected)return;
      updateRoom(restored);
      // Nunca tratar o último delta em cache como snapshot completo.
      if(restored.started&&restored.mode==='coop')io.to(restored.host).emit('world-resync');
    });
  }

  socket.on('create-room',(data={},ack=()=>{})=>{
    leaveRoom(socket);
    const code=makeCode(),room={code,host:socket.id,mode:data.mode==='pvp'?'pvp':'coop',
      players:new Map([[socket.id,{name:cleanName(data.name)}]])};
    rooms.set(code,room);socket.join(code);socketRoom.set(socket.id,code);
    ack({ok:true,code,mode:room.mode,id:socket.id});updateRoom(room);
  });
  socket.on('join-room',(data={},ack=()=>{})=>{
    const code=String(data.code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
    const room=rooms.get(code);
    if(!room)return ack({ok:false,error:'Sala não encontrada. Confira o código.'});
    if(room.started&&!room.players.has(socket.id))return ack({ok:false,error:'A partida já começou. A sessão anterior não foi recuperada; volte à capa e crie outra sala.'});
    if(room.players.size>=2&&!room.players.has(socket.id))return ack({ok:false,error:'A sala já está cheia.'});
    if(socketRoom.get(socket.id)!==code)leaveRoom(socket);
    cancelDeparture(socket.id);room.players.set(socket.id,{name:cleanName(data.name),connected:true});
    socket.join(code);socketRoom.set(socket.id,code);
    ack({ok:true,code,mode:room.mode,id:socket.id});updateRoom(room);
  });
  socket.on('leave-room',()=>leaveRoom(socket));
  socket.on('set-name',(data={})=>{
    const room=inRoom(socket,String(data.code||''));if(!room)return;
    const p=room.players.get(socket.id);if(!p)return;
    p.name=cleanName(data.name);updateRoom(room);
  });
  socket.on('start-match',(data={},ack=()=>{})=>{
    const code=String(data.code||''),room=rooms.get(code);
    if(!room||socketRoom.get(socket.id)!==code)return ack({ok:false,error:'Você não está nessa sala.'});
    if(room.host!==socket.id)return ack({ok:false,error:'Somente o criador pode iniciar.'});
    if(room.started&&!(room.mode==='pvp'&&room.duel?.over))return ack({ok:false,error:'A partida já está em andamento.'});
    if(room.players.size!==2||[...room.players.values()].some(p=>p.connected===false))return ack({ok:false,error:'Espere seu amigo entrar na sala.'});
    clearTimers(room);
    room.mode=data.mode==='pvp'?'pvp':'coop';
    const area=Math.floor(num(data.area,0,5)),cpx=num(data.cpx,0,1000000);
    room.started=true;room.worldState=null;
    room.duel=room.mode==='pvp'?{round:1,wins:{},phase:'prep',over:false,lockUntil:0}:null;
    for(const id of room.players.keys())room.duel&&(room.duel.wins[id]=0);
    io.to(code).emit('match-start',{code,mode:room.mode,area,cpx,names:namesOf(room),duel:room.duel?duelPayload(room):null});
    updateRoom(room);
    if(room.duel)startDuelRound(room,true);
    ack({ok:true});
  });
  socket.on('player-state',(data={})=>{
    const code=String(data.code||''),room=inRoom(socket,code);
    if(!room)return;
    const me=room.players.get(socket.id);
    // O nome vem sempre do cadastro da sala: não depende do que o cliente envia a cada pacote.
    const state=cleanPlayerState(data.state||{},me&&me.name);if(!state)return;
    socket.to(code).emit('player-state',{id:socket.id,state});
  });
  // O anfitrião é a autoridade do mundo compartilhado no modo cooperativo.
  socket.on('world-state',(data={})=>{
    const code=String(data.code||''),room=rooms.get(code);
    if(!room||socketRoom.get(socket.id)!==code||room.host!==socket.id||room.mode!=='coop'||!room.started)return;
    const now=Date.now(),last=lastWorld.get(socket.id)||0;
    if(now-last<20)return;
    lastWorld.set(socket.id,now);
    const world=cleanWorld(data.world);if(!world)return;
    room.worldState=world;
    socket.to(code).emit('world-state',world);
  });
  // O convidado pede um snapshot completo quando perde um pacote de diferenças.
  socket.on('world-resync',(data={})=>{
    const code=String(data.code||''),room=rooms.get(code);
    if(!room||socketRoom.get(socket.id)!==code||room.host===socket.id||room.mode!=='coop'||!room.started)return;
    io.to(room.host).emit('world-resync');
  });
  // Golpes do convidado são encaminhados ao anfitrião para aplicar no inimigo real.
  socket.on('combat-hit',(data={})=>{
    const code=String(data.code||''),room=rooms.get(code);
    if(!room||socketRoom.get(socket.id)!==code||room.host===socket.id||room.mode!=='coop'||!room.started)return;
    const now=Date.now(),last=lastHit.get(socket.id)||0;
    if(now-last<40)return;
    lastHit.set(socket.id,now);
    const enemyId=typeof data.enemyId==='string'&&/^[a-zA-Z0-9:_-]{1,100}$/.test(data.enemyId)
      ?data.enemyId:num(data.enemyId,1,1e9);
    const base=num(data.base,0,250);
    if(!enemyId||!base)return;
    const options={};
    for(const k of ['src','kx','ky','stun','quiet','fromX','noKb','heavy','dot','finisher']){
      const v=(data.options||{})[k];
      if(['string','number','boolean'].includes(typeof v))options[k]=v;
    }
    if(options.src!==undefined&&!['sword','heavy','counter','chain','fire','tele','burn'].includes(options.src))return;
    for(const k of ['kx','ky','stun'])if(options[k]!==undefined)options[k]=num(options[k],-500,500);
    if(options.fromX!==undefined)options.fromX=num(options.fromX,-100000,1000000);
    io.to(room.host).emit('combat-hit',{
      enemyId,base,fromX:num(data.fromX,-100000,1000000),options
    });
  });
  // Coleta de itens do convidado: remove o item do mundo compartilhado no anfitrião.
  socket.on('pickup-collected',(data={})=>{
    const code=String(data.code||''),room=rooms.get(code);
    if(!room||socketRoom.get(socket.id)!==code||room.host===socket.id||room.mode!=='coop'||!room.started)return;
    io.to(room.host).emit('pickup-collected',{pickupId:num(data.pickupId,1,1e9)});
  });
  // Dano calculado pelo anfitrião contra o personagem convidado.
  socket.on('player-damage',(data={})=>{
    const code=String(data.code||''),room=rooms.get(code);
    if(!room||socketRoom.get(socket.id)!==code||room.host!==socket.id||room.mode!=='coop'||!room.started)return;
    const damage=num(data.damage,0,100000);if(!damage)return;
    const out={damage,fromX:num(data.fromX,-100000,1000000),heavy:!!data.heavy,ignoreDefense:true};
    // Efeitos de controle do chefe (prender/puxar) também precisam chegar ao convidado.
    if(Number(data.rooted)>0){
      out.rooted=num(data.rooted,0,5);
      if(Number.isFinite(Number(data.pullTo)))out.pullTo=num(data.pullTo,-100000,1000000);
      if(Number.isFinite(Number(data.pullSpd)))out.pullSpd=num(data.pullSpd,0,800);
    }
    io.to(code).except(socket.id).emit('player-damage',out);
  });
  // Duelo: quem cai avisa o servidor; o servidor conta o ponto e decide o próximo passo.
  socket.on('duel-down',(data={})=>{
    const code=String(data.code||''),room=inRoom(socket,code);
    if(!room||room.mode!=='pvp'||!room.started||!room.duel||room.duel.over)return;
    const d=room.duel,now=Date.now();
    if(d.phase!=='fight'||now<d.lockUntil)return;
    d.lockUntil=now+2500;d.phase='between';
    const loser=socket.id;
    const winner=[...room.players.keys()].find(id=>id!==loser);
    if(!winner)return;
    d.wins[winner]=(d.wins[winner]||0)+1;
    const over=d.wins[winner]>=DUEL_WINS;
    d.over=over;
    io.to(code).emit('duel-round',duelPayload(room,{winner,loser,over,matchWinner:over?winner:null}));
    if(!over){
      d.round++;
      later(room,DUEL_BETWEEN_MS,()=>startDuelRound(room,false));
    }
  });
  socket.on('disconnect',reason=>suspendConnection(socket,reason));
});
if(require.main===module)server.listen(PORT,'0.0.0.0',()=>console.log(`Penitente V7 / R9.1 listening on ${PORT}`));
module.exports={server,io};
