'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright-core');
const {server,io}=require('../server');
const game=path.join(__dirname,'..','Penitente_R9_17_Progressao_Encerramento (1).html');
const client=path.join(path.dirname(path.dirname(require.resolve('socket.io'))),'client-dist','socket.io.min.js');
test('dois navegadores do jogo criam sala e concluem a sincronização cooperativa e recuperam quedas', {timeout:45000},async()=>{
  let browser,web,host,guest;
  try{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const socketUrl=`http://127.0.0.1:${server.address().port}`;
    web=http.createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});fs.createReadStream(game).pipe(res)});
    await new Promise(resolve=>web.listen(0,'127.0.0.1',resolve));
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
    const errors=[];
    async function open(){const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));await page.route('https://cdn.socket.io/**',route=>route.fulfill({path:client,contentType:'application/javascript'}));await page.goto(`http://127.0.0.1:${web.address().port}/`);await page.evaluate(url=>{MP.server=url},socketUrl);await page.locator('[data-act="multiplayer-open"]').click();await page.waitForFunction(()=>MP.connected,null,{timeout:5000});return page}
    host=await open();guest=await open();
    await host.locator('[data-act="mp-create"]').click();await host.waitForFunction(()=>MP.room&&MP.role==='host');
    const code=await host.evaluate(()=>MP.room);
    await guest.locator('#mp-room').fill(code);await guest.locator('[data-act="mp-join"]').click();
    await guest.waitForFunction(()=>MP.role==='guest');await host.waitForFunction(()=>MP.partner);
    await host.locator('[data-act="mp-start"]').click();
    await Promise.all([host.waitForFunction(()=>NET.active&&!mpBlocked(),null,{timeout:10000}),guest.waitForFunction(()=>NET.active&&MP.worldReady&&!NET.sync&&!mpBlocked(),null,{timeout:10000})]);
    assert.equal(await host.evaluate(()=>scene),'play');assert.equal(await guest.evaluate(()=>scene),'play');
    assert.equal(await guest.evaluate(()=>R.idx),await host.evaluate(()=>R.idx));
    const guestId=await guest.evaluate(()=>MP.socket.id);
    await guest.evaluate(()=>{MP.socket.io.engine.close()});
    await guest.waitForFunction(()=>NET.recover,null,{timeout:5000});
    await guest.waitForFunction(()=>MP.socket.recovered&&NET.member&&MP.worldReady&&!NET.sync&&!mpBlocked(),null,{timeout:15000});
    await host.waitForFunction(()=>NET.active&&!mpBlocked(),null,{timeout:15000});
    assert.equal(await guest.evaluate(()=>MP.socket.id),guestId);
    const hostId=await host.evaluate(()=>MP.socket.id);
    await host.evaluate(()=>{MP.socket.io.engine.close()});await host.waitForFunction(()=>NET.recover,null,{timeout:5000});
    await host.waitForFunction(()=>MP.socket.recovered&&NET.member&&!mpBlocked(),null,{timeout:15000});
    await guest.waitForFunction(()=>NET.active&&MP.worldReady&&!NET.sync&&!mpBlocked(),null,{timeout:15000});
    assert.equal(await host.evaluate(()=>MP.socket.id),hostId);assert.deepEqual(errors,[]);
  }finally{
    if(host)await host.close();if(guest)await guest.close();if(browser)await browser.close();
    await new Promise(resolve=>io.close(resolve));if(web)await new Promise(resolve=>web.close(resolve));
  }
});
