const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'../browser-extension');
function setup(){
  const events={},opened=[],closed=[],panels=[],memory={};
  const event=n=>({addListener:fn=>events[n]=fn});
  const api={
    sidebarAction:{setPanel:async o=>panels.push(o),getPanel:async()=>'',isOpen:async()=>true,open:async()=>opened.push(true),close:async()=>closed.push(true)},
    runtime:{id:'test-addon',getURL:p=>'moz-extension://test/'+p,onMessage:event('message'),onInstalled:event('install'),onStartup:event('startup')},
    action:{onClicked:event('click')},tabs:{onUpdated:event('update'),onActivated:event('activate'),get:async id=>({id,active:id===1,windowId:1,url:'https://example.com/new'}),query:async()=>[]},
    windows:{get:async()=>({id:1}),getLastFocused:async()=>({id:1}),onFocusChanged:event('focus')},storage:{local:{get:async k=>({[k]:memory[k]}),set:async o=>Object.assign(memory,o)}}
  };
  const context=vm.createContext({browser:api,console,URL});
  vm.runInContext(fs.readFileSync(path.join(root,'firefox-background.js'),'utf8'),context);
  return {events,opened,closed,panels,memory,api};
}
test('Firefox action uses sidebarAction in the click turn and no Chrome-only API',async()=>{
  const w=setup();const opening=w.events.click({id:1,windowId:1,url:'https://example.com/article'});
  assert.equal(w.opened.length,1);await opening;
  const panel=new URL(w.panels.at(-1).panel,'moz-extension://test/');
  assert.ok(panel.searchParams.get('context').startsWith('page-'));assert.equal(panel.searchParams.get('ownerTab'),'1');
});
test('Firefox navigation replaces unknown pages with a local empty panel without gesture-only close',async()=>{
  const w=setup();w.api.sidebarAction.close=async()=>{throw Error('User gesture required');};
  await w.events.update(2,{url:'https://example.com/new'},{id:2,url:'https://example.com/new',active:false,windowId:1});
  assert.ok(w.panels.at(-1).panel.startsWith('closed.html?'));
  await w.events.update(1,{url:'https://example.com/new'},{id:1,url:'https://example.com/new',active:true,windowId:1});
  assert.ok(w.panels.at(-1).panel.startsWith('closed.html?'));
  assert.equal(w.closed.length,0);assert.equal(w.opened.length,0);
});
test('Firefox ignores lifecycle messages from unrelated senders',async()=>{
  const w=setup();await w.events.message({type:'dumbpad-panel-lifecycle',kind:'closed',tabId:1,context:'page-evil'},{id:'untrusted',url:'https://example.com/'});
  assert.deepEqual(w.memory,{});
});
test('Firefox activation reconciles a saved-closed page even if its context was configured earlier',async()=>{
  const w=setup(),tab={id:1,active:true,windowId:1,url:'https://example.com/new'};
  await w.events.click(tab);
  const configured=w.panels.at(-1).panel,key=new URL(configured,'moz-extension://test/').searchParams.get('context');
  w.api.sidebarAction.getPanel=async()=>configured;
  w.memory['state:'+key]={open:false};
  await w.events.activate({tabId:1});
  assert.ok(w.panels.at(-1).panel.startsWith('closed.html?'));
});
test('Firefox pending navigation cannot overwrite a later explicit open click',async()=>{
  const w=setup(),tab={id:1,active:true,windowId:1,url:'https://example.com/new'};
  let release,reached;
  const reading=new Promise(resolve=>reached=resolve);
  w.api.storage.local.get=()=>{reached();return new Promise(resolve=>release=resolve);};
  const following=w.events.update(1,{url:tab.url},tab);
  await reading;
  await w.events.click(tab);
  release({});await following;
  assert.ok(w.panels.at(-1).panel.startsWith('panel.html?'));
  assert.equal(w.opened.length,1);
});
test('Firefox restores the saved notebook context without background open calls',async()=>{
  const w=setup(),tab={id:1,active:true,windowId:1,url:'https://example.com/new'};
  await w.events.click(tab);
  const expected=w.panels.at(-1).panel;
  w.opened.length=0;
  await w.events.update(1,{url:tab.url},tab);
  assert.equal(w.panels.at(-1).panel,expected);assert.equal(w.opened.length,0);
});
test('Firefox records native manual close but preserves state for content replacement and closed windows',async()=>{
  const w=setup(),tab={id:1,active:true,windowId:1,url:'https://example.com/new'};
  await w.events.click(tab);
  const panel=w.panels.at(-1).panel,key=new URL(panel,'moz-extension://test/').searchParams.get('context');
  const message={type:'dumbpad-panel-lifecycle',kind:'closed',tabId:1,context:key};
  const sender={id:'test-addon',url:'moz-extension://test/'+panel};
  await w.events.message(message,sender);
  assert.equal(w.memory['state:'+key].open,true);
  w.api.sidebarAction.isOpen=async()=>false;
  w.api.windows.get=async()=>{throw Error('Closed window');};
  await w.events.message(message,sender);
  assert.equal(w.memory['state:'+key].open,true);
  w.api.windows.get=async()=>({id:1});
  await w.events.message(message,sender);
  assert.equal(w.memory['state:'+key].open,false);
});
