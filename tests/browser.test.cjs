'use strict';
const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright-core');
const file = path.join(__dirname,'..','Penitente_R9_17_Progressao_Encerramento (1).html');
let browser, web, base;
before(async () => {
  web=http.createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});fs.createReadStream(file).pipe(res)});
  await new Promise(resolve=>web.listen(0,'127.0.0.1',resolve));
  base=`http://127.0.0.1:${web.address().port}/`;
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
});
after(async () => {if(browser)await browser.close();if(web)await new Promise(resolve=>web.close(resolve));});
async function newPage(saved) {
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  if(saved)await page.addInitScript(save=>localStorage.setItem('penitente-inferno-eterno-v1',JSON.stringify(save)),saved);
  await page.route('https://cdn.socket.io/**',route=>route.abort());
  await page.goto(base);
  return page;
}
test('tela inicial carrega e uma jornada começa sem erros de execução',async()=>{
  const page=await newPage(), errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.locator('[data-act="new-start"]').click();
  assert.equal(await page.evaluate(()=>scene),'play');
  assert.equal(await page.evaluate(()=>SAVE.prog.started),true);
  await page.waitForTimeout(350);
  assert.deepEqual(errors,[]);
  await page.close();
});
test('teclas e mouse com a mesma ação mantêm o comando até soltar a última entrada',async()=>{
  const page=await newPage();
  await page.evaluate(()=>{startArea(0,{fresh:true});R.state='play';R.paused=false;Input.clear()});
  await page.keyboard.down('KeyA');await page.keyboard.down('ArrowLeft');await page.keyboard.up('KeyA');
  assert.equal(await page.evaluate(()=>Input.down.left),true);
  await page.keyboard.up('ArrowLeft');assert.equal(await page.evaluate(()=>Input.down.left),false);
  await page.keyboard.down('KeyJ');
  await page.locator('canvas').first().dispatchEvent('pointerdown',{pointerType:'mouse',button:0,offsetX:100,offsetY:100});
  await page.keyboard.up('KeyJ');assert.equal(await page.evaluate(()=>Input.down.attack),true);
  await page.dispatchEvent('body','pointerup',{pointerType:'mouse',button:0});
  assert.equal(await page.evaluate(()=>Input.down.attack),false);
  await page.close();
});
test('salvamento antigo mantém progresso e configurações ao carregar',async()=>{
  const old={v:2,level:7,coins:83,skills:{sp2:1},gear:{sword:'s1'},owned:['s0','s1'],prog:{started:true,area:2,cpx:123,bossDone:{b_guard:true}},settings:{music:.25}};
  const page=await newPage(old);
  const state=await page.evaluate(()=>({level:SAVE.level,coins:SAVE.coins,skill:SAVE.skills.sp2,gear:SAVE.gear.sword,area:SAVE.prog.area,boss:SAVE.prog.bossDone.b_guard,music:SAVE.settings.music}));
  assert.deepEqual(state,{level:7,coins:83,skill:1,gear:'s1',area:2,boss:true,music:.25});
  await page.close();
});
test('pulo, ataque e esquiva respondem em uma área iniciada',async()=>{
  const page=await newPage();
  await page.evaluate(()=>{startArea(0,{fresh:true});R.state='play';R.dlg=null;R.card=null;R.P.inv=10;Input.clear()});
  const startY=await page.evaluate(()=>R.P.y);
  await page.keyboard.down('Space');await page.waitForTimeout(100);await page.keyboard.up('Space');
  assert.ok(await page.evaluate(y=>R.P.y<y,startY),'pulo deve elevar o personagem');
  await page.waitForTimeout(800);
  await page.keyboard.down('KeyJ');await page.waitForTimeout(30);
  assert.equal(await page.evaluate(()=>R.P.act&&R.P.act.k),'quick');
  await page.keyboard.up('KeyJ');await page.waitForTimeout(500);
  await page.keyboard.down('ShiftLeft');await page.waitForTimeout(30);
  assert.equal(await page.evaluate(()=>R.P.act&&R.P.act.k),'dodge');
  await page.keyboard.up('ShiftLeft');await page.close();
});
test('controle simulado continua ativo após entrada por toque',async()=>{
  const page=await newPage();
  await page.evaluate(()=>{startArea(0,{fresh:true});R.state='play';R.dlg=null;R.paused=false;Input.clear()});
  await page.dispatchEvent('body','pointerdown',{pointerType:'touch',pointerId:15});
  const result=await page.evaluate(()=>{
    const buttons=Array.from({length:17},()=>({pressed:false,value:0}));
    const pad={connected:true,buttons,axes:[.9,0]};
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});
    Pad.resync();Pad.poll();return {connected:Pad.usable(),right:Input.down.right};
  });
  assert.deepEqual(result,{connected:true,right:true});
  await page.close();
});
test('descrições das armaduras correspondem ao bônus de vida aplicado',async()=>{
  const page=await newPage();
  const result=await page.evaluate(()=>{
    SAVE.gear.armor='a0';const base=calcStats().maxHp;
    return ['a1','a2'].map(id=>{SAVE.gear.armor=id;return {description:gearById(id).d,bonus:calcStats().maxHp-base}});
  });
  assert.deepEqual(result,[{description:'+18 de vida e 6% de redução de dano.',bonus:18},{description:'+36 de vida e 12% de redução de dano.',bonus:36}]);
  await page.close();
});
test('progresso ilegível é preservado antes de um novo salvamento',async()=>{
  const page=await browser.newPage();
  const raw='{progresso interrompido';
  await page.addInitScript(value=>localStorage.setItem('penitente-inferno-eterno-v1',value),raw);
  await page.route('https://cdn.socket.io/**',route=>route.abort());await page.goto(base);
  assert.match(await page.locator('[role="alert"]').innerText(),/cópia foi guardada/);
  await page.evaluate(()=>{SAVE.coins=12;saveGame()});
  const result=await page.evaluate(()=>({saved:JSON.parse(localStorage.getItem(SAVE_KEY)).coins,backups:Object.keys(localStorage).filter(k=>k.startsWith(SAVE_KEY+'-recuperacao-')).map(k=>localStorage.getItem(k))}));
  assert.equal(result.saved,12);assert.deepEqual(result.backups,[raw]);await page.close();
});
test('se a cópia de segurança falhar, o progresso original não é sobrescrito',async()=>{
  const page=await browser.newPage();
  const raw='{progresso interrompido';
  await page.addInitScript(value=>{
    localStorage.setItem('penitente-inferno-eterno-v1',value);
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(k,v){if(k.includes('-recuperacao-'))throw new Error('sem espaço');return original.call(this,k,v)};
  },raw);
  await page.route('https://cdn.socket.io/**',route=>route.abort());await page.goto(base);
  assert.match(await page.locator('[role="alert"]').innerText(),/salvamento automático foi pausado/);
  await page.evaluate(()=>{SAVE.coins=12;saveGame()});
  assert.equal(await page.evaluate(()=>localStorage.getItem(SAVE_KEY)),raw);await page.close();
});
test('slots ilegíveis não são exibidos como vazios nem sobrescritos',async()=>{
  const page=await browser.newPage();const raw='{slots incompletos';
  await page.addInitScript(value=>localStorage.setItem('penitente-inferno-eterno-slots-v1',value),raw);
  await page.route('https://cdn.socket.io/**',route=>route.abort());await page.goto(base);
  await page.locator('[data-act="title-slots"]').click();
  assert.match(await page.locator('[role="alert"]').innerText(),/dados foram preservados/);
  assert.equal(await page.evaluate(()=>slotsWrite(Array(6).fill(null))),false);
  assert.equal(await page.evaluate(()=>localStorage.getItem(SLOTS_KEY)),raw);
  await page.close();
});
test('opções baixam dados originais e cópia ilegível sem alterar o armazenamento',async()=>{
  const page=await browser.newPage({acceptDownloads:true});const raw='{save danificado';
  await page.addInitScript(value=>localStorage.setItem('penitente-inferno-eterno-v1',value),raw);
  await page.route('https://cdn.socket.io/**',route=>route.abort());await page.goto(base);
  await page.locator('[data-act="opts-title"]').click();
  await page.locator('[data-act="opts-go"][data-id="game"]').click();
  const waiting=page.waitForEvent('download');await page.locator('[data-act="export-save"]').click();const download=await waiting;
  assert.equal(download.suggestedFilename(),'penitente-dados.json');
  const stream=await download.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);
  const bundle=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const backup=Object.keys(bundle.dados).find(k=>k.startsWith('penitente-inferno-eterno-v1-recuperacao-'));
  assert.equal(bundle.dados[backup],raw);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),backup),raw);
  await page.close();
});
test('pausa abre mapa e permite navegar pelas abas principais do Arsenal',async()=>{
  const page=await newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(()=>{startArea(0,{fresh:true});R.state='play';R.dlg=null;R.card=null;R.P.inv=10;Input.clear()});
  await page.keyboard.press('Escape');await page.locator('[data-act="pause-map"]').click();
  assert.ok(await page.locator('#modalBox svg').count()>0,'mapa deve apresentar desenho');
  await page.locator('#modalBox [data-act="pause-back"]').first().click();
  await page.locator('[data-act="pause-arsenal"]').click();
  for(const tab of ['skills','gear','best','lore']){
    await page.locator(`[data-act="tab"][data-id="${tab}"]`).click();
    assert.equal(await page.evaluate(()=>hubTab),tab);
  }
  assert.deepEqual(errors,[]);await page.close();
});
test('slots com estrutura desconhecida são preservados',async()=>{
  for(const raw of ['[{"save_antigo":true}]','[null,null,null,null,null,null,{"data":{"coins":42}}]']){
    const page=await browser.newPage();
    await page.addInitScript(value=>localStorage.setItem('penitente-inferno-eterno-slots-v1',value),raw);
    await page.route('https://cdn.socket.io/**',route=>route.abort());await page.goto(base);
    await page.locator('[data-act="title-slots"]').click();
    assert.match(await page.locator('[role="alert"]').innerText(),/dados foram preservados/);
    assert.equal(await page.evaluate(()=>slotsWrite(Array(6).fill(null))),false);
    assert.equal(await page.evaluate(()=>localStorage.getItem(SLOTS_KEY)),raw);await page.close();
  }
});
test('dano, morte e retorno ao último ponto',async()=>{
  const page=await newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(()=>{startArea(0,{fresh:true});R.state='play';R.dlg=null;R.P.inv=0;R.P.dinv=0;R.cp.x=210;R.P.x=300;R.P.hp=5});
  assert.equal(await page.evaluate(()=>hurtPlayer(100,R.P.x-20)),true);
  assert.deepEqual(await page.evaluate(()=>({dead:R.P.dead,state:R.state})),{dead:true,state:'dead'});
  await page.evaluate(()=>respawn());
  const state=await page.evaluate(()=>({dead:R.P.dead,state:R.state,hp:R.P.hp,x:R.P.x}));
  assert.equal(state.dead,false);assert.equal(state.state,'play');assert.ok(state.hp>0);assert.equal(state.x,210);
  assert.deepEqual(errors,[]);await page.close();
});
test('compra de melhoria, habilidade e equipamento preserva recursos e progresso',async()=>{
  const page=await newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(()=>{SAVE.level=5;SAVE.coins=2000;SAVE.souls=50;startArea(0,{fresh:true});R.state='play';R.dlg=null;R.card=null;R.P.inv=10;Input.clear()});
  await page.keyboard.press('Escape');await page.locator('[data-act="pause-arsenal"]').click();
  await page.locator('[data-act="buy-upg"][data-id="hp"]').click();
  assert.equal(await page.evaluate(()=>SAVE.upg.hp),1);
  await page.locator('[data-act="tab"][data-id="skills"]').click();
  await page.locator('[data-act="sk-sel"][data-id="ch1"]').first().click();
  await page.locator('[data-act="buy-skill"][data-id="ch1"]').click();
  assert.equal(await page.evaluate(()=>SAVE.skills.ch1),1);
  await page.locator('[data-act="tab"][data-id="gear"]').click();
  await page.locator('[data-act="buy-gear"][data-id="s1"]').first().click();
  assert.equal(await page.evaluate(()=>SAVE.gear.sword),'s1');
  await page.reload();
  assert.deepEqual(await page.evaluate(()=>({hp:SAVE.upg.hp,skill:SAVE.skills.ch1,sword:SAVE.gear.sword})),{hp:1,skill:1,sword:'s1'});
  assert.deepEqual(errors,[]);await page.close();
});
test('slot manual recupera o progresso registrado',async()=>{
  const page=await newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(()=>{startArea(0,{fresh:true});R.state='play';R.dlg=null;R.card=null;R.P.inv=10;SAVE.coins=123;SAVE.skills.sp2=1;Input.clear()});
  await page.keyboard.press('Escape');await page.locator('[data-act="pause-save"]').click();
  await page.locator('[data-act="slot-save"][data-id="0"]').click();
  await page.evaluate(()=>{SAVE.coins=1;SAVE.skills.sp2=0;saveGame()});
  await page.locator('[data-act="slot-load"][data-id="0"]').click();
  await page.locator('[data-act="slot-yes"][data-id="0"]').click();
  assert.deepEqual(await page.evaluate(()=>({coins:SAVE.coins,skill:SAVE.skills.sp2,area:SAVE.prog.area})),{coins:123,skill:1,area:0});
  assert.deepEqual(errors,[]);await page.close();
});
test('diálogo cinematográfico pode ser pulado sem deslocar o protagonista',async()=>{
  const page=await newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const result=await page.evaluate(()=>{
    startArea(0,{fresh:true});R.state='play';R.dlg=null;R.P.x=550;R.P.y=GY;
    const before={x:R.P.x,y:R.P.y};
    const started=startDialog('c2_cinzas',null,{encounterIntro:true,back:'play'});
    const during={state:R.state,movie:!!R.dlg?.movie};skipDialog();
    return {started,during,after:{state:R.state,x:R.P.x,y:R.P.y},before};
  });
  assert.equal(result.started,true);assert.deepEqual(result.during,{state:'talk',movie:true});
  assert.deepEqual(result.after,{state:'play',...result.before});assert.deepEqual(errors,[]);await page.close();
});
test('troca de área preserva habilidades e equipamentos',async()=>{
  const page=await newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const result=await page.evaluate(()=>{
    startArea(0,{fresh:true});SAVE.skills.sp2=1;SAVE.owned.push('s1');SAVE.gear.sword='s1';
    startArea(1,{fresh:true,cpx:1100});
    return {area:R.idx,saveArea:SAVE.prog.area,checkpoint:SAVE.prog.cpx,skill:SAVE.skills.sp2,gear:SAVE.gear.sword};
  });
  assert.deepEqual(result,{area:1,saveArea:1,checkpoint:1100,skill:1,gear:'s1'});assert.deepEqual(errors,[]);await page.close();
});
test('interação com NPC inicia diálogo e devolve controle ao encerrar',async()=>{
  const page=await newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const result=await page.evaluate(()=>{
    startArea(0,{fresh:true});R.state='play';R.dlg=null;R.E=[];R.PR=[];R.lock=null;R.P.onGround=true;R.dialogueQuiet=2;
    const npc=R.npcs.find(n=>n.dlg==='cinzeiro_0');R.P.x=npc.x;const target=interactTarget();
    doInteract({k:'npc',o:npc});const state=R.state,dialogue=!!R.dlg;skipDialog();
    return {target:target?.k,state,dialogue,returned:R.state,talked:!!SAVE.prog.talked.cinzeiro_0};
  });
  assert.deepEqual(result,{target:'npc',state:'talk',dialogue:true,returned:'play',talked:true});assert.deepEqual(errors,[]);await page.close();
});
test('arena inicia o chefe original e a luta após a introdução',async()=>{
  const page=await newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const result=await page.evaluate(()=>{
    startArea(0,{fresh:true});R.state='play';R.dlg=null;R.E=[];R.PR=[];R.lock=null;R.P.onGround=true;R.dialogueQuiet=2;
    startBoss();const intro={state:R.state,type:R.boss?.type,locked:!!R.lock};startFight();
    return {intro,after:R.state,boss:R.boss?.type};
  });
  assert.deepEqual(result,{intro:{state:'cine',type:'b_guard',locked:true},after:'play',boss:'b_guard'});assert.deepEqual(errors,[]);await page.close();
});
test('Ressonância gasta carga e mantém o progresso do capítulo',async()=>{
  const page=await newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const result=await page.evaluate(()=>{
    SAVE.prog.c2={done:true};c23Start();R.state='play';R.dlg=null;R.paused=false;R.c23.charge=2;R.c23.reveal=0;R.t=10;
    c23Resonate();return {chapter:R.st.chapter,charge:R.c23.charge,reveal:R.c23.reveal,stored:SAVE.prog.c2e2.charge};
  });
  assert.deepEqual(result,{chapter:23,charge:1,reveal:16,stored:1});assert.deepEqual(errors,[]);await page.close();
});
test('golpe atinge inimigo no alcance e não repete dano no mesmo ataque',async()=>{
  const page=await newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const result=await page.evaluate(()=>{
    startArea(0,{fresh:true});R.state='play';R.dlg=null;R.E=[];R.PR=[];R.P.x=300;R.P.y=GY;R.P.f=1;R.P.onGround=true;
    const enemy=spawnEnemy('soldier',320,{rise:0,active:true});const before=enemy.hp,hit=new Set();
    const first=strike('quick',1,hit),after=enemy.hp,second=strike('quick',1,hit);
    return {before,after,first,second,last:enemy.hp};
  });
  assert.equal(result.first,1);assert.ok(result.after<result.before);assert.equal(result.second,0);assert.equal(result.last,result.after);assert.deepEqual(errors,[]);await page.close();
});
test('movimento rápido não atravessa paredes e permite passar acima delas',async()=>{
  const page=await newPage();
  const result=await page.evaluate(()=>{
    startArea(0,{fresh:true});R.state='play';R.dlg=null;R.P.w=16;R.P.h=38;
    R.solids=[{x:180,y:GY-50,w:4,h:50},{x:140,y:GY-50,w:4,h:50}];
    function move(x,y,vx){Object.assign(R.P,{x,y,vx,vy:0});physics(R.P,1/60);return {x:R.P.x,vx:R.P.vx}}
    return {right:move(100,GY,9000),left:move(220,GY,-9000),above:move(100,GY-90,9000)};
  });
  assert.deepEqual(result.right,{x:132,vx:0});assert.deepEqual(result.left,{x:192,vx:0});assert.equal(result.above.x,250);assert.equal(result.above.vx,9000);await page.close();
});
test('coyote time e pulo antecipado funcionam sem liberar pulo duplo',async()=>{
  const page=await newPage();
  const result=await page.evaluate(()=>{
    startArea(0,{fresh:true});R.state='play';R.dlg=null;R.E=[];R.P.act=null;R.P.hurtT=0;R.P.rooted=0;
    const P=R.P;Input.clear();Object.assign(P,{x:400,y:GY-5,vy:10,vx:0,onGround:false,coyote:.08,jumps:0});Input.set('jump',true,'test');updPlayer(1/60);const coyote=P.vy<0;
    Input.clear();Object.assign(P,{x:400,y:GY-1,vy:100,vx:0,onGround:false,coyote:0,jumps:1,act:null});Input.set('jump',true,'test');updPlayer(1/60);const landed=P.onGround;updPlayer(1/60);const buffered=P.vy<0&&!P.onGround;
    return {coyote,landed,buffered,secondJumpUnlocked:!!SAVE.skills.sp2};
  });
  assert.deepEqual(result,{coyote:true,landed:true,buffered:true,secondJumpUnlocked:false});await page.close();
});
test('avanço do arpão termina ao bater na parede e continua em caminho livre',async()=>{
  const page=await newPage();
  const result=await page.evaluate(()=>{
    startArea(0,{fresh:true});R.state='play';R.dlg=null;R.E=[];R.PR=[];R.P.act=null;R.P.rooted=0;R.P.hurtT=0;R.P.w=16;R.P.h=38;
    R.solids=[{x:110,y:GY-50,w:4,h:50}];
    Object.assign(R.P,{x:100,y:GY,vx:0,vy:0,onGround:true,dash:{dir:1,tx:180,t:.3}});updPlayer(1/60);
    const wall={x:R.P.x,dash:R.P.dash,vx:R.P.vx};
    R.solids=[];Object.assign(R.P,{x:100,y:GY,vx:0,vy:0,onGround:true,dash:{dir:1,tx:180,t:.3}});updPlayer(1/60);
    return {wall,free:{x:R.P.x,dash:!!R.P.dash}};
  });
  assert.deepEqual(result.wall,{x:102,dash:null,vx:0});assert.ok(result.free.x>100);assert.equal(result.free.dash,true);await page.close();
});
test('queda lateral não prende o personagem em cima de plataforma já ultrapassada',async()=>{
  const page=await newPage();
  const result=await page.evaluate(()=>{
    startArea(0,{fresh:true});R.state='play';R.dlg=null;R.solids=[];R.st.plats=[[100,80,40]];R.st.vp=[];
    const top=GY-80;
    function move(x,y,vx,vy){Object.assign(R.P,{x,y,vx,vy,onGround:false});physics(R.P,1/60);return {x:R.P.x,y:R.P.y,ground:R.P.onGround}}
    return {top,side:move(95,top-1,420,450),land:move(110,top-2,0,180)};
  });
  assert.equal(result.side.ground,false);assert.ok(result.side.y>result.top);assert.equal(result.land.y,result.top);assert.equal(result.land.ground,true);await page.close();
});
test('soltar pulo reduz a subida mesmo durante golpe rápido no ar',async()=>{
  const page=await newPage();
  const result=await page.evaluate(()=>{
    startArea(0,{fresh:true});R.state='play';R.dlg=null;R.E=[];R.PR=[];R.P.rooted=0;R.P.hurtT=0;
    function run(held){Input.clear();Object.assign(R.P,{x:500,y:GY-50,vy:-250,vx:0,onGround:false,act:{k:'quick',t:0,dur:1,n:1,set:new Set()}});Input.set('jump',held,'test');updPlayer(1/60);return R.P.vy}
    return {released:run(false),held:run(true)};
  });
  assert.ok(result.released>result.held);assert.ok(result.released<0);await page.close();
});
test('pulo antecipado próximo ao chão preserva o pulo duplo desbloqueado',async()=>{
  const page=await newPage();
  const result=await page.evaluate(()=>{
    SAVE.skills.sp2=1;startArea(0,{fresh:true});R.state='play';R.dlg=null;R.E=[];R.PR=[];R.P.hurtT=0;R.P.rooted=0;R.st.plats=[];R.st.pits=[];
    const P=R.P;
    function setup(y,vy){Input.clear();Object.assign(P,{x:400,y,vy,vx:0,onGround:false,coyote:0,jumps:1,act:null});Input.set('jump',true,'test')}
    setup(GY-8,120);let near;for(let i=0;i<8;i++){Input.t+=1/60;updPlayer(1/60);if(P.vy<0){near={jumps:P.jumps,vy:P.vy};break}}
    setup(GY-80,120);Input.t+=1/60;updPlayer(1/60);const midair={jumps:P.jumps,vy:P.vy};
    R.st.pits=[[380,80]];setup(GY-8,120);Input.t+=1/60;updPlayer(1/60);const pit={jumps:P.jumps,vy:P.vy};
    return {near,midair,pit};
  });
  assert.equal(result.near.jumps,1);assert.ok(result.near.vy<0);
  assert.equal(result.midair.jumps,2);assert.ok(result.midair.vy<0);
  assert.equal(result.pit.jumps,2);assert.ok(result.pit.vy<0);await page.close();
});
test('toques simultâneos de pulo e golpe permanecem independentes',async()=>{
  const page=await newPage();
  await page.evaluate(()=>{startArea(0,{fresh:true});R.state='play';R.dlg=null;R.paused=false;Input.clear()});
  await page.locator('#touch [data-a="jump"]').dispatchEvent('pointerdown',{pointerType:'touch',pointerId:21});
  await page.locator('#touch [data-a="attack"]').dispatchEvent('pointerdown',{pointerType:'touch',pointerId:22});
  assert.deepEqual(await page.evaluate(()=>({jump:Input.down.jump,attack:Input.down.attack})),{jump:true,attack:true});
  await page.locator('#touch [data-a="jump"]').dispatchEvent('pointerup',{pointerType:'touch',pointerId:21});
  assert.deepEqual(await page.evaluate(()=>({jump:Input.down.jump,attack:Input.down.attack})),{jump:false,attack:true});
  await page.locator('#touch [data-a="attack"]').dispatchEvent('pointerup',{pointerType:'touch',pointerId:22});
  assert.equal(await page.evaluate(()=>Input.down.attack),false);await page.close();
});
test('dois dedos no mesmo botão continuam ativos até ambos serem soltos',async()=>{
  const page=await newPage();await page.evaluate(()=>{startArea(0,{fresh:true});R.state='play';R.dlg=null;R.paused=false;Input.clear()});
  const button=page.locator('#touch [data-a="attack"]');
  await button.dispatchEvent('pointerdown',{pointerType:'touch',pointerId:31});await button.dispatchEvent('pointerdown',{pointerType:'touch',pointerId:32});
  await button.dispatchEvent('pointerup',{pointerType:'touch',pointerId:31});assert.equal(await page.evaluate(()=>Input.down.attack),true);
  await button.dispatchEvent('pointerup',{pointerType:'touch',pointerId:32});assert.equal(await page.evaluate(()=>Input.down.attack),false);await page.close();
});
test('ao soltar um dedo do direcional, o outro mantém sua direção',async()=>{
  const page=await newPage();await page.evaluate(()=>{startArea(0,{fresh:true});R.state='play';R.dlg=null;R.paused=false;Input.clear()});
  const left=page.locator('#touch [data-a="left"]'),right=page.locator('#touch [data-a="right"]');
  await left.dispatchEvent('pointerdown',{pointerType:'touch',pointerId:41});await right.dispatchEvent('pointerdown',{pointerType:'touch',pointerId:42});
  await right.dispatchEvent('pointerup',{pointerType:'touch',pointerId:42});assert.deepEqual(await page.evaluate(()=>({left:!!Input.down.left,right:!!Input.down.right})),{left:true,right:false});
  await page.evaluate(()=>Input.clear());await left.dispatchEvent('pointerup',{pointerType:'touch',pointerId:41});
  assert.deepEqual(await page.evaluate(()=>({left:!!Input.down.left,right:!!Input.down.right})),{left:false,right:false});await page.close();
});
test('pausa cancela os dedos anteriores e não interrompe um novo toque',async()=>{
  const page=await newPage();await page.evaluate(()=>{startArea(0,{fresh:true});R.state='play';R.dlg=null;R.paused=false;Input.clear()});
  const attack=page.locator('#touch [data-a="attack"]');
  await attack.dispatchEvent('pointerdown',{pointerType:'touch',pointerId:61});await page.evaluate(()=>Input.clear());
  assert.equal(await page.evaluate(()=>!!Input.down.attack),false);
  assert.equal(await attack.evaluate(el=>el.classList.contains('on')),false);
  await attack.dispatchEvent('pointerdown',{pointerType:'touch',pointerId:62});await attack.dispatchEvent('pointerup',{pointerType:'touch',pointerId:61});
  assert.equal(await page.evaluate(()=>Input.down.attack),true);
  await attack.dispatchEvent('pointerup',{pointerType:'touch',pointerId:62});assert.equal(await page.evaluate(()=>Input.down.attack),false);
  assert.equal(await page.evaluate(()=>Object.keys(Input.sources.attack||{}).filter(k=>k.startsWith('touch:')).length),0);
  await page.close();
});
test('botão compartilhado preserva pulo iniciado e não duplica comando em diálogo',async()=>{
  const page=await newPage();
  const result=await page.evaluate(()=>{
    startArea(0,{fresh:true});R.state='play';R.dlg=null;R.E=[];R.PR=[];R.paused=false;Input.clear();
    const buttons=Array.from({length:17},()=>({pressed:false,value:0}));const pad={connected:true,buttons,axes:[0,0]};
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});Pad.resync();
    buttons[0].pressed=true;Pad.poll();const jumping=!!Input.down.jump;Input.take('jump');
    R.near={k:'npc'};Pad.poll();const nearJump=!!Input.down.jump;
    buttons[0].pressed=false;Pad.poll();Input.press={};buttons[0].pressed=true;Pad.poll();const interaction=Input.take('interact'),nearPress=!!Input.down.jump;
    buttons[0].pressed=false;Pad.poll();Input.clear();R.near=null;R.state='talk';buttons[0].pressed=true;Pad.poll();
    const dialogue={interact:Input.take('interact'),jump:!!Input.down.jump,bufferedJump:Input.peek('jump')};
    return {jumping,nearJump,interaction,nearPress,dialogue};
  });
  assert.deepEqual(result,{jumping:true,nearJump:true,interaction:true,nearPress:false,dialogue:{interact:true,jump:false,bufferedJump:false}});await page.close();
});
test('atalhos de teclado e pulo remapeado do gamepad funcionam junto a um NPC',async()=>{
  const page=await newPage();
  const result=await page.evaluate(()=>{
    startArea(0,{fresh:true});R.state='play';R.dlg=null;R.E=[];R.PR=[];R.paused=false;Input.clear();
    const buttons=Array.from({length:17},()=>({pressed:false,value:0}));const pad={connected:true,buttons,axes:[0,0]};
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});Pad.resync();R.near={k:'npc'};
    Input.set('jump',true,'key:Space');buttons[0].pressed=true;Pad.poll();const keyboard=!!Input.down.jump;
    buttons[0].pressed=false;Pad.poll();Input.clear();SAVE.settings.padMap={...PAD_DEFAULT,jump:2};Pad.resync();
    buttons[2].pressed=true;Pad.poll();const remapped=!!Input.down.jump;
    return {keyboard,remapped};
  });
  assert.deepEqual(result,{keyboard:true,remapped:true});await page.close();
});
test('câmera respeita limites do cenário e enquadra arenas menores que a tela',async()=>{
  const page=await newPage();
  const result=await page.evaluate(()=>{
    startArea(0,{fresh:true});R.state='play';R.dlg=null;R.st.length=1000;R.P.f=1;
    function cam(lock,x){R.lock=lock;R.cam=0;R.P.x=x;updCam(1);return R.cam}
    return {short:cam({min:650,max:750},700),edge:cam({min:-30,max:300},80),right:cam({min:900,max:1300},950),normal:cam({min:200,max:900},850),world:cam(null,1000)};
  });
  assert.deepEqual(result,{short:460,edge:0,right:520,normal:420,world:520});await page.close();
});
test('entrada em arena movimenta câmera suavemente sem sair do cenário',async()=>{
  const page=await newPage();
  const result=await page.evaluate(()=>{
    startArea(0,{fresh:true});R.state='play';R.dlg=null;R.st.length=1000;R.P.x=400;R.P.f=1;R.cam=0;R.lock={min:200,max:900};
    updCam(1/60);return R.cam;
  });
  assert.ok(result>0&&result<200);await page.close();
});
test('áreas principais e desvios iniciais carregam e renderizam',async()=>{
  const page=await newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(let i=0;i<6;i++){
    const area=await page.evaluate(i=>{startArea(i,{fresh:true,cpx:80});return {id:R.st.id,expected:STAGES[i].id,player:Number.isFinite(R.P.x)}},i);
    assert.equal(area.id,area.expected);assert.equal(area.player,true);await page.waitForTimeout(80);
  }
  for(let i=0;i<3;i++){
    const area=await page.evaluate(i=>{startArea(SECRET_DEFS[i].parent,{fresh:true,secret:i});return {id:R.st.id,expected:SECRETS[i].id,player:Number.isFinite(R.P.x)}},i);
    assert.equal(area.id,area.expected);assert.equal(area.player,true);await page.waitForTimeout(80);
  }
  assert.deepEqual(errors,[]);await page.close();
});
test('áreas posteriores da campanha carregam preservando os requisitos de progresso',async()=>{
  const page=await newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const chapters=[];
  for(let i=0;i<4;i++){
    chapters.push(await page.evaluate(i=>{
      if(i===0)c2Start();
      if(i===1){SAVE.prog.c2.done=true;c23Start()}
      if(i===2){SAVE.prog.c2e2.done=true;c24Start()}
      if(i===3){SAVE.prog.c2e3.done=true;c25Start()}
      return R.st.chapter;
    },i));
    await page.waitForTimeout(150);
  }
  assert.deepEqual(chapters,[2,23,24,25]);assert.deepEqual(errors,[]);await page.close();
});
test('navegação por gamepad alcança os visuais entre equipamento e memórias',async()=>{
  const page=await newPage();
  const result=await page.evaluate(()=>{
    startArea(0,{fresh:true});R.state='play';R.dlg=null;openArsenal('gear');
    const buttons=Array.from({length:17},()=>({pressed:false,value:0}));const pad={connected:true,buttons,axes:[0,0]};
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});Pad.resync();
    buttons[5].pressed=true;Pad.poll();const first=hubTab;
    buttons[5].pressed=false;Pad.poll();buttons[5].pressed=true;Pad.poll();const second=hubTab;
    return {first,second};
  });
  assert.deepEqual(result,{first:'skins',second:'lore'});await page.close();
});
test('ataques automáticos não viram para inimigo fora da altura do golpe',async()=>{
  const page=await newPage();
  const result=await page.evaluate(()=>{
    startArea(0,{fresh:true});R.state='play';R.dlg=null;R.E=[];R.PR=[];Input.clear();
    Object.assign(R.P,{x:300,y:GY,f:1,onGround:true,act:null});
    const high=spawnEnemy('soldier',290,{rise:0,active:true});high.y=GY-120;
    const near=spawnEnemy('soldier',330,{rise:0,active:true});near.y=GY;
    function facing(fn){R.P.f=-1;R.P.act=null;fn();return R.P.f}
    return {quick:facing(startQuick),heavy:facing(startHeavy),chain:facing(startChain)};
  });
  assert.deepEqual(result,{quick:1,heavy:1,chain:1});await page.close();
});
test('direção manual e alvo aéreo do golpe continuam funcionando',async()=>{
  const page=await newPage();
  const result=await page.evaluate(()=>{
    startArea(0,{fresh:true});R.state='play';R.dlg=null;R.E=[];R.PR=[];Input.clear();
    Object.assign(R.P,{x:300,y:GY,f:-1,onGround:true,act:null});
    const enemy=spawnEnemy('soldier',330,{rise:0,active:true});enemy.y=GY;
    Input.set('left',true,'test');startQuick();const manual=R.P.f;Input.clear();
    R.P.y=GY-110;enemy.y=GY-110;R.P.f=-1;R.P.act=null;startQuick();const airborne=R.P.f;
    return {manual,airborne};
  });
  assert.deepEqual(result,{manual:-1,airborne:1});await page.close();
});
test('arpão não mira automaticamente em inimigos que não pode puxar',async()=>{
  const page=await newPage();
  const result=await page.evaluate(()=>{
    startArea(0,{fresh:true});R.state='play';R.dlg=null;R.E=[];R.PR=[];Input.clear();Object.assign(R.P,{x:300,y:GY,f:-1,onGround:true});
    const asleep=spawnEnemy('soldier',290,{rise:0,active:false});asleep.roaming=true;
    const hidden=spawnEnemy('assassin',285,{rise:0,active:true});hidden.st='hide';
    const faded=spawnEnemy('soldier',280,{rise:0,active:true});faded.fade=.2;
    const reachable=spawnEnemy('soldier',330,{rise:0,active:true});
    const before=reachable.hp;startChain();resolveChain(R.P.act);return {facing:R.P.f,hit:reachable.hp<before};
  });
  assert.deepEqual(result,{facing:1,hit:true});await page.close();
});
test('direção automática escolhe inimigo visível em vez de alvo atrás de parede',async()=>{
  const page=await newPage();
  const result=await page.evaluate(()=>{
    startArea(0,{fresh:true});R.state='play';R.dlg=null;R.E=[];R.PR=[];Input.clear();
    Object.assign(R.P,{x:300,y:GY,f:-1,onGround:true});R.solids=[{x:286,y:GY-60,w:4,h:60}];
    const hidden=spawnEnemy('soldier',280,{rise:0,active:true});const visible=spawnEnemy('soldier',330,{rise:0,active:true});
    function facing(fn){R.P.f=-1;R.P.act=null;fn();return R.P.f}
    const blocked={quick:facing(startQuick),heavy:facing(startHeavy),chain:facing(startChain)};
    R.solids[0].dead=true;const open=facing(startQuick);
    return {blocked,open};
  });
  assert.deepEqual(result,{blocked:{quick:1,heavy:1,chain:1},open:-1});await page.close();
});
