'use strict';
const http = require('http');
const { Server } = require('socket.io');

const PORT = Number(process.env.PORT || 3000);
const server = http.createServer((req, res) => {
  res.writeHead(200, {'content-type':'text/plain; charset=utf-8','cache-control':'no-store'});
  res.end('Penitente: Inferno Eterno — servidor multiplayer ativo.\\n');
});
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST'] },
  transports: ['websocket','polling'],
  pingInterval: 10000,
  pingTimeout: 20000,
  maxHttpBufferSize: 2e6
});

const rooms = new Map();
const socketRoom = new Map();
const lastWorld = new Map();
const lastHit = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeCode(){
  let code;
  do { code=Array.from({length:6},()=>CODE_CHARS[Math.floor(Math.random()*CODE_CHARS.length)]).join(''); }
  while(rooms.has(code));
  return code;
}
function cleanName(v){
  return String(v||'Penitente').replace(/[<>\\u0000-\\u001f]/g,'').trim().slice(0,16)||'Penitente';
}
function roomInfo(r){return {code:r.code,players:r.players.size,host:r.host,mode:r.mode};}
function updateRoom(r){io.to(r.code).emit('room-update',roomInfo(r));}
function leaveRoom(socket){
  const code=socketRoom.get(socket.id);if(!code)return;
  const r=rooms.get(code);socketRoom.delete(socket.id);socket.leave(code);
  lastWorld.delete(socket.id);lastHit.delete(socket.id);
  if(!r)return;
  r.players.delete(socket.id);io.to(code).emit('player-left');
  if(!r.players.size){rooms.delete(code);return;}
  if(r.host===socket.id)r.host=r.players.keys().next().value;
  updateRoom(r);
}
function num(v,min,max,fallback=0){v=Number(v);return Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;}
function cleanPlayerState(s={}){
  return {
    x:num(s.x,-100000,1000000),y:num(s.y,-1000,2000),f:Number(s.f)<0?-1:1,
    run:!!s.run,air:num(s.air,-1,1),dodge:!!s.dodge,hurt:!!s.hurt,rage:!!s.rage,
    name:cleanName(s.name),hp:num(s.hp,0,100000),maxHp:num(s.maxHp,1,100000,1),
    dead:!!s.dead,inv:num(s.inv,0,10),dinv:num(s.dinv,0,10),
    atkSeq:num(s.atkSeq,0,1e9),act:String(s.act||'').slice(0,24),
    atkP:num(s.atkP,0,1,0),atkN:Math.floor(num(s.atkN,1,3,1)),
    atkDamage:num(s.atkDamage,0,100000),revive:!!s.revive
  };
}
function cleanWorld(w){
  if(!w||typeof w!=='object')return null;
  const arr=(v,n)=>Array.isArray(v)?v.slice(0,n):[];
  let clean;
  try{
    clean={
      seq:num(w.seq,0,1e12),area:num(w.area,0,5),sec:num(w.sec,-1,100),
      state:String(w.state||'play').slice(0,16),t:num(w.t,0,1e9),
      enemies:arr(w.enemies,180),projectiles:arr(w.projectiles,220),pickups:arr(w.pickups,220),
      hazards:arr(w.hazards,120),pits:arr(w.pits,120),plats:arr(w.plats,120),
      solids:arr(w.solids,240),vzG:arr(w.vzG,80),
      bossStarted:!!w.bossStarted,bossKilled:!!w.bossKilled,exitOpen:!!w.exitOpen,
      cp:w.cp&&typeof w.cp==='object'?{x:num(w.cp.x,0,1000000)}:null,
      boss:w.boss&&typeof w.boss==='object'?w.boss:null,
      encounter:w.encounter&&typeof w.encounter==='object'?{
        id:typeof w.encounter.id==='string'?w.encounter.id.slice(0,100):null,
        area:num(w.encounter.area,0,5),sec:num(w.encounter.sec,-1,100),
        state:String(w.encounter.state||'play').slice(0,16),
        clearT:num(w.encounter.clearT,0,10000),
        cine:w.encounter.cine&&typeof w.encounter.cine==='object'?w.encounter.cine:null,
        lock:w.encounter.lock&&typeof w.encounter.lock==='object'?w.encounter.lock:null,
        exitOpen:!!w.encounter.exitOpen,
        arena:w.encounter.arena&&typeof w.encounter.arena==='object'?w.encounter.arena:null,
        bossKilled:!!w.encounter.bossKilled
      }:null,
      clearT:num(w.clearT,0,10000),
      cine:w.cine&&typeof w.cine==='object'?w.cine:null,
      lock:w.lock&&typeof w.lock==='object'?w.lock:null,
      arena:w.arena&&typeof w.arena==='object'?w.arena:null,
      stats:w.stats&&typeof w.stats==='object'?{kills:num(w.stats.kills,0,1e9),bossDmg:num(w.stats.bossDmg,0,1e9)}:{}
    };
    const raw=JSON.stringify(clean);
    if(raw.length>1500000)return null;
    // Re-parse to reject unsupported/cyclic values and strip prototypes.
    clean=JSON.parse(raw);
    return clean;
  }catch(_){return null}
}
io.on('connection',socket=>{
  socket.on('create-room',(data={},ack=()=>{})=>{
    leaveRoom(socket);
    const code=makeCode(),room={code,host:socket.id,mode:data.mode==='pvp'?'pvp':'coop',
      players:new Map([[socket.id,{name:cleanName(data.name)}]])};
    rooms.set(code,room);socket.join(code);socketRoom.set(socket.id,code);
    ack({ok:true,code,mode:room.mode});updateRoom(room);
  });
  socket.on('join-room',(data={},ack=()=>{})=>{
    const code=String(data.code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
    const room=rooms.get(code);
    if(!room)return ack({ok:false,error:'Sala não encontrada. Confira o código.'});
    if(room.started)return ack({ok:false,error:'A partida já começou. Crie uma nova sala para entrar.'});
    if(room.players.size>=2)return ack({ok:false,error:'A sala já está cheia.'});
    leaveRoom(socket);
    room.players.set(socket.id,{name:cleanName(data.name)});
    socket.join(code);socketRoom.set(socket.id,code);
    ack({ok:true,code,mode:room.mode});updateRoom(room);
  });
  socket.on('start-match',(data={},ack=()=>{})=>{
    const code=String(data.code||''),room=rooms.get(code);
    if(!room||socketRoom.get(socket.id)!==code)return ack({ok:false,error:'Você não está nessa sala.'});
    if(room.host!==socket.id)return ack({ok:false,error:'Somente o criador pode iniciar.'});
    if(room.players.size!==2)return ack({ok:false,error:'Espere seu amigo entrar na sala.'});
    room.mode=data.mode==='pvp'?'pvp':'coop';
    const area=Math.floor(num(data.area,0,5)),cpx=num(data.cpx,0,1000000);
    room.started=true;room.mode=room.mode;
    io.to(code).emit('match-start',{code,mode:room.mode,area,cpx});
    ack({ok:true});
  });
  socket.on('player-state',(data={})=>{
    const code=String(data.code||''),room=rooms.get(code);
    if(!room||socketRoom.get(socket.id)!==code)return;
    const state=cleanPlayerState(data.state||{});
    socket.to(code).emit('player-state',{id:socket.id,state});
  });
  // O anfitrião é a autoridade do mundo compartilhado no modo cooperativo.
  socket.on('world-state',(data={})=>{
    const code=String(data.code||''),room=rooms.get(code);
    if(!room||socketRoom.get(socket.id)!==code||room.host!==socket.id||room.mode!=='coop'||!room.started)return;
    const now=Date.now(),last=lastWorld.get(socket.id)||0;
    if(now-last<140)return;
    lastWorld.set(socket.id,now);
    const world=cleanWorld(data.world);if(!world)return;
    room.worldState=world;
    socket.to(code).emit('world-state',world);
  });
  // Golpes do convidado são encaminhados ao anfitrião para aplicar no inimigo real.
  socket.on('combat-hit',(data={})=>{
    const code=String(data.code||''),room=rooms.get(code);
    if(!room||socketRoom.get(socket.id)!==code||room.host===socket.id||room.mode!=='coop'||!room.started)return;
    const now=Date.now(),last=lastHit.get(socket.id)||0;
    if(now-last<70)return;
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
    io.to(code).except(socket.id).emit('player-damage',{
      damage,fromX:num(data.fromX,-100000,1000000),heavy:!!data.heavy,ignoreDefense:true
    });
  });
  socket.on('disconnect',()=>leaveRoom(socket));
});
server.listen(PORT,'0.0.0.0',()=>console.log(`Penitente multiplayer listening on ${PORT}`));
