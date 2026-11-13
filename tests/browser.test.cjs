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
