const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const read=f=>fs.readFileSync(path.join(__dirname,'../browser-extension',f),'utf8');
function worker(){
  const events={},options=[],opens=[],closed=[],memory={};
  const event=n=>({addListener:fn=>events[n]=fn});
  const chrome={sidePanel:{setPanelBehavior:async o=>options.push(o),setOptions:async o=>options.push(o),open:async o=>opens.push(o),close:async o=>closed.push(o),onOpened:event('opened'),onClosed:event('closed')},runtime:{onInstalled:event('install'),onStartup:event('startup')},action:{onClicked:event('click')},tabs:{onUpdated:event('update'),onActivated:event('activate'),onRemoved:event('remove'),get:async id=>({id,active:true})},storage:{local:{get:async k=>({[k]:memory[k]}),set:async o=>Object.assign(memory,o)}}};
  const context=vm.createContext({chrome,console,URL});
  chrome.sidePanel.getOptions=async()=>({enabled:false});
  chrome.windows={getAll:async()=>[{id:10},{id:20}]};
  context.importScripts=f=>vm.runInContext(read(f),context);
  vm.runInContext(read('background.js'),context);
  return {events,options,opens,closed,memory,context,chrome};
}
test('manifest has no global panel fallback that can follow every tab',()=>{
  assert.equal(JSON.parse(read('manifest.json')).side_panel,undefined);
});
test('initialization closes legacy global panels without closing any tab-specific panel',async()=>{
  const w=worker();await w.events.install();
  assert.ok(w.closed.some(o=>o.windowId===10&&o.tabId===undefined));
  assert.ok(w.closed.some(o=>o.windowId===20&&o.tabId===undefined));
  assert.ok(w.closed.every(o=>o.tabId===undefined));
});
test('manual close after worker suspension still remembers the actual page',async()=>{
  const w=worker(),tab={id:7,active:true,url:'https://example.com/known'};
  const key=w.context.contextForPage(tab);
  w.memory['state:'+key]={open:true};
  w.chrome.tabs.get=async()=>tab;
  await w.events.closed({tabId:7,path:'panel.html?context='+key});
  assert.equal(w.memory['state:'+key].open,false);
});
test('worker suspension does not reset an already configured page panel',async()=>{
  const w=worker(),tab={id:7,url:'https://example.com/known'};
  const key=w.context.contextForPage(tab);
  w.chrome.sidePanel.getOptions=async()=>({enabled:true,path:'panel.html?context='+key});
  await w.events.update(7,{url:tab.url},tab);
  assert.equal(w.options.filter(o=>o.tabId===7).length,0);
});
test('name is DumbPad and only contextual page access and local memory are added',()=>{
  const m=JSON.parse(read('manifest.json'));
  assert.equal(m.name,'DumbPad');
  assert.deepEqual(m.permissions,['sidePanel','tabs','storage']);
  for(const c of m.content_scripts){assert.deepEqual(c.matches,m.host_permissions);for(const f of [...c.js,...c.css])assert.ok(fs.existsSync(path.join(__dirname,'../browser-extension',f)));}
});
test('initialization disables global carryover and never opens panels without a click',async()=>{
  const w=worker();await w.events.install();await w.events.startup();
  assert.equal(w.opens.length,0);
  assert.ok(w.options.some(o=>o.enabled===false&&o.tabId===undefined));
  assert.ok(w.options.some(o=>o.openPanelOnActionClick===false));
});
test('click opens only its tab and revisiting a page retrieves the same opaque context',async()=>{
  const w=worker();
  await w.events.click({id:1,url:'https://example.com/article?a=1'});
  await w.events.click({id:2,url:'https://example.com/article?a=1'});
  await w.events.click({id:3,url:'https://example.com/other'});
  assert.deepEqual(w.opens.map(o=>o.tabId),[1,2,3]);
  const enabled=w.options.filter(o=>o.enabled===true);
  assert.equal(enabled[0].path,enabled[1].path);assert.notEqual(enabled[0].path,enabled[2].path);
  assert.ok(!enabled[0].path.includes('example.com'));
});
test('loading another page disables only that tab and never automatically opens Pad',async()=>{
  const w=worker();await w.events.update(8,{status:'loading'});await w.events.update(9,{status:'complete'});
  assert.ok(w.options.some(o=>o.tabId===8&&o.enabled===false));assert.ok(!w.options.some(o=>o.tabId===9));assert.equal(w.opens.length,0);
});
test('open is invoked in the original click turn before any promise can discard its gesture',async()=>{
  const w=worker();const opening=w.events.click({id:1,url:'https://example.com/'});
  assert.equal(w.opens.length,1);await opening;
});
test('URL-only SPA navigation also resets the old page panel',async()=>{
  const w=worker();await w.events.click({id:8,url:'https://example.com/old'});
  await w.events.update(8,{url:'https://example.com/new'},{url:'https://example.com/new'});
  assert.equal(w.options.filter(o=>o.tabId===8).at(-1).enabled,false);
});
test('open state is remembered per page and restored as a native option without background open calls',async()=>{
  const w=worker();const tab={id:7,url:'https://example.com/known'};
  await w.events.click(tab);const key=w.context.contextForPage(tab);
  assert.equal(w.memory['state:'+key].open,true);
  await w.events.update(7,{url:'https://example.com/new'},{url:'https://example.com/new'});
  assert.equal(w.memory['state:'+key].open,true);
  await w.events.update(7,{url:tab.url},{url:tab.url});
  assert.equal(w.options.filter(o=>o.tabId===7).at(-1).enabled,true);
  assert.equal(w.opens.length,1);
});
test('manual close is remembered while navigation hides preserve the old page state',async()=>{
  const w=worker();const tab={id:7,url:'https://example.com/known'};await w.events.click(tab);
  let currentURL=tab.url;
  w.chrome.tabs.get=async id=>({id,active:true,url:currentURL});
  const key=w.context.contextForPage(tab);const info={tabId:7,path:'panel.html?context='+key};
  await w.events.opened(info);
  await w.events.update(7,{url:'https://example.com/new'},{url:'https://example.com/new'});
  currentURL='https://example.com/new';
  await w.events.closed(info);assert.equal(w.memory['state:'+key].open,true);
  currentURL=tab.url;await w.events.update(7,{url:tab.url},{url:tab.url});await w.events.opened(info);await w.events.closed(info);
  assert.equal(w.memory['state:'+key].open,false);
});
test('new internal pages have separate transient contexts',async()=>{
  const w=worker();await w.events.click({id:4,url:'chrome://newtab/'});await w.events.click({id:5,url:'chrome://newtab/'});
  const enabled=w.options.filter(o=>o.enabled===true);assert.notEqual(enabled[0].path,enabled[1].path);
});
test('panel restores a page note and accepts changes only from its own DumbPad frame',async()=>{
  const dom=new JSDOM(read('panel.html'),{url:'chrome-extension://test/panel.html?context=page-abc',runScripts:'outside-only'});
  const w=dom.window,saved=[];w.chrome={storage:{local:{get:async()=>({'page-abc':{noteId:'Notepad 16'}}),set:async o=>saved.push(o)}}};
  w.eval(read('panel.js'));await new Promise(r=>setImmediate(r));
  const frame=w.document.querySelector('iframe');assert.equal(new URL(frame.src).origin,'https://dumbpad.piggydamn.club:99');assert.equal(new URL(frame.src).searchParams.get('id'),'Notepad 16');assert.equal(new URL(frame.src).searchParams.get('dumbpad_embed'),'1');
  const send=(origin,source,noteId)=>w.dispatchEvent(new w.MessageEvent('message',{origin,source,data:{type:'dumbpad-note-selected',noteId}}));
  send('https://evil.example',frame.contentWindow,'wrong');send('https://dumbpad.piggydamn.club:99',w,'wrong');send('https://dumbpad.piggydamn.club:99',frame.contentWindow,'Notepad 17');
  await new Promise(r=>setImmediate(r));assert.equal(saved.length,1);assert.equal(saved[0]['page-abc'].noteId,'Notepad 17');assert.equal(w.document.title,'DumbPad');dom.window.close();
});
test('missing saved notebooks recover to the loaded fallback and selection metadata targets only the extension',()=>{
  const messages=[],handlers={};let poll;
  const selector={value:'valid-fallback',options:[{value:'valid-fallback'}]};
  const window={parent:{postMessage:(message,target)=>messages.push({message,target})},addEventListener:(name,fn)=>handlers[name]=fn};
  const document={documentElement:{dataset:{}},getElementById:()=>selector,addEventListener:(name,fn)=>handlers[name]=fn};
  vm.runInNewContext(read('frame.js'),{window,document,location:{href:'https://dumbpad.piggydamn.club:99/?dumbpad_embed=1&id=deleted'},chrome:{runtime:{getURL:()=> 'chrome-extension://own-extension/'}},URL,setInterval:fn=>{poll=fn;return 1;},clearInterval:()=>{}});
  poll();poll();
  assert.equal(messages.length,1);assert.equal(messages[0].message.noteId,'valid-fallback');assert.equal(messages[0].target,'chrome-extension://own-extension/');
  selector.value='new-selection';handlers.change({target:{id:'notepad-selector'}});
  assert.equal(messages.at(-1).message.noteId,'new-selection');
});
