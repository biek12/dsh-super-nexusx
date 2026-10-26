import { summarizeContext, priceBook } from '../src/context.jsx';
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { placeMenu } from '../src/menu.jsx';
import { Settings } from '../src/settings.jsx';
import { FloatingPet, PetSettings } from '../src/pets/pet.jsx';
import { FolderTree } from '../src/ui.jsx';
import { createController } from '../src/controller.js';
import { applyOperation, defaultMeta, emptyState } from '../src/model.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://127.0.0.1/' });
for (const name of ['window', 'document', 'HTMLElement', 'HTMLDialogElement', 'localStorage']) globalThis[name] = dom.window[name];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
HTMLDialogElement.prototype.showModal = function () { this.open = true; };
HTMLDialogElement.prototype.close = function () { this.open = false; };
async function waitForUI(condition, timeout = 3500) {
  const deadline = Date.now() + timeout;
  while (!condition()) {
    assert.ok(Date.now() < deadline, 'Timed out waiting for UI transition');
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 25)); });
  }
}
const catalog = [{ workspaceId: 'a', title: '工作区 A', sessionIds: ['s1', 's2'], sessions: [{ id: 's1', title: '会话一' }, { id: 's2', title: '会话二' }] }, { workspaceId: 'b', title: '工作区 B', sessionIds: [], sessions: [] }];
test('pet interactions select real animation states, show dialogue and persist drag position', async t => {
  const controller = createController({ initial: emptyState(), poll: false, persist: async (state, op) => applyOperation(state, op, catalog) });
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  await act(async () => root.render(<FloatingPet controller={controller}/>));
  t.after(async () => { await act(async () => root.unmount()); controller.dispose(); container.remove(); });
  const body = container.querySelector('.lg-pet-body');
  assert.equal(container.querySelector('.lg-pet-sprite').dataset.state, 'idle');
  await act(async () => body.click());
  assert.equal(container.querySelector('.lg-pet-sprite').dataset.state, 'hover');
  assert.match(container.querySelector('.lg-pet-dialogue').textContent, /摸摸头/);
  await waitForUI(() => container.querySelector('#lg-pet-card')?.dataset.phase === 'shown');
  body.setPointerCapture = () => {}; body.releasePointerCapture = () => {};
  const pointer = (type, x, y) => body.dispatchEvent(new window.MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y }));
  await act(async () => { pointer('pointerdown', 600, 400); pointer('pointermove', 300, 200); });
  assert.equal(container.querySelector('.lg-pet-sprite').dataset.state, 'drag');
  await waitForUI(() => container.querySelector('#lg-pet-card')?.dataset.phase === 'exit');
  assert.match(container.querySelector('.lg-pet-dialogue').textContent, /摸摸头/);
  await waitForUI(() => container.querySelector('.lg-pet-drag-speech'));
  assert.match(container.querySelector('.lg-pet-drag-speech').textContent, /爪爪/);
  await act(async () => { pointer('pointerup', 300, 200); await new Promise(resolve => setTimeout(resolve, 0)); });
  const p = controller.getSnapshot().state.preferences;
  assert.ok(p.petX < 0.92 && p.petY < 0.86);
  assert.equal(container.querySelector('.lg-pet-sprite').dataset.state, 'land');
  await waitForUI(() => container.querySelector('.lg-pet-drag-speech')?.textContent.includes('爪爪着地'));
  assert.match(container.querySelector('.lg-pet-drag-speech').textContent, /爪爪着地/);
  await act(async () => controller.mutate({ type: 'preferences', patch: { petEnabled: false } }));
  assert.equal(container.querySelector('.lg-pet'), null);
});
for (const desktop of [false, true]) {
  test(`pet information is click-only and repeated clicks renew the same message (${desktop ? 'desktop' : 'window'})`, async t => {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'] });
    const controller = createController({ initial: emptyState(), poll: false, persist: async (state, op) => applyOperation(state, op, catalog) });
    const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
    t.after(async () => { await act(async () => root.unmount()); controller.dispose(); container.remove(); });
    await act(async () => root.render(<FloatingPet controller={controller} desktop={desktop}/>));
    const body = container.querySelector('.lg-pet-body');
    const advance = async ms => { await act(async () => { t.mock.timers.tick(ms); }); };
    const hover = () => body.dispatchEvent(new window.MouseEvent('pointerover', { bubbles: true, relatedTarget: document.body }));
    await act(async () => { hover(); body.focus(); });
    assert.equal(container.querySelector('#lg-pet-card'), null, 'hover and focus do not open information');
    await act(async () => { body.click(); body.click(); });
    const text = container.querySelector('.lg-pet-dialogue').textContent;
    assert.match(text, /摸摸头/);
    await advance(20); await advance(20);
    const cloud = container.querySelector('#lg-pet-card');
    assert.equal(cloud.dataset.phase, 'shown');
    await advance(7000);
    body.setPointerCapture = () => {}; body.releasePointerCapture = () => {};
    await act(async () => {
      body.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 0 }));
      body.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, button: 0 }));
      body.dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 1 }));
      hover(); body.blur(); body.focus();
    });
    assert.equal(container.querySelector('.lg-pet-dialogue').textContent, text);
    assert.equal(cloud.dataset.phase, 'shown', 'repeated click does not start a content transition');
    await advance(1100);
    assert.equal(body.getAttribute('aria-expanded'), 'true', 'click renews the original deadline');
    await advance(6900); await advance(1);
    assert.equal(cloud.dataset.phase, 'exit');
    await act(async () => body.click());
    await advance(600);
    assert.equal(container.querySelector('#lg-pet-card'), null, 'exit cannot be interrupted by another information message');
    await act(async () => { hover(); body.blur(); body.focus(); });
    assert.equal(container.querySelector('#lg-pet-card'), null);
    await act(async () => body.click());
    assert.notEqual(container.querySelector('.lg-pet-dialogue').textContent, text, 'a new click after closure can open the next message');
  });
}
test('pet character selection survives reload and rejected positions preserve durable preferences', async t => {
  let durable = emptyState();
  const controller = createController({ initial: durable, poll: false, persist: async (state, op) => { durable = applyOperation(state, op, catalog); return durable; } });
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  await act(async () => root.render(<PetSettings controller={controller}/>));
  t.after(async () => { await act(async () => root.unmount()); controller.dispose(); container.remove(); });
  await act(async () => container.querySelectorAll('.lg-pet-choices button')[2].click());
  assert.equal(durable.preferences.petCharacter, 'mizu');
  assert.equal(container.querySelectorAll('.lg-pet-choices button')[2].getAttribute('aria-pressed'), 'true');
  const previous = JSON.stringify(durable);
  await act(async () => { await assert.rejects(controller.mutate({ type: 'preferences', patch: { petX: Infinity } })); });
  assert.equal(JSON.stringify(durable), previous);
});
async function fixture(t, overrides = {}) {
  localStorage.clear();
  const initial = emptyState();
  initial.folders = [
    { ...defaultMeta(), id: 'parent', workspaceId: 'a', parentId: null, name: '父目录', order: 0 },
    { ...defaultMeta(), id: 'child', workspaceId: 'a', parentId: 'parent', name: '子目录', order: 0 },
    { ...defaultMeta(), id: 'sibling', workspaceId: 'a', parentId: null, name: '兄弟目录', order: 1 },
  ];
  const controller = createController({ initial, poll: false, persist: async (state, operation) => applyOperation(state, operation, catalog) });
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  await act(async () => { root.render(<FolderTree controller={controller} catalog={catalog} activeId="s1" openSession={() => {}} createSession={() => {}} {...overrides}/>); });
  t.after(async () => { await act(async () => root.unmount()); controller.dispose(); container.remove(); });
  return { container, controller, render: async props => { await act(async () => root.render(<FolderTree controller={controller} catalog={catalog} activeId="s1" openSession={() => {}} createSession={() => {}} {...overrides} {...props}/>)); }, row: id => container.querySelector(`[data-id="${id}"]`) };
}
async function drag(f, sourceId, targetId, y = 20) {
  const source = f.row(sourceId), target = f.row(targetId);
  target.getBoundingClientRect = () => ({ top: 0, height: 40 });
  const data = {}; const transfer = { effectAllowed: '', dropEffect: '', setData: (key, value) => { data[key] = value; } };
  const event = (type, node) => { const e = new window.Event(type, { bubbles: true, cancelable: true }); Object.defineProperties(e, { dataTransfer: { value: transfer }, clientY: { value: y } }); node.dispatchEvent(e); return e; };
  await act(async () => { event('dragstart', source); });
  let accepted;
  await act(async () => { accepted = event('dragover', target).defaultPrevented; });
  if (accepted) await act(async () => { event('drop', target); await new Promise(resolve => setTimeout(resolve, 0)); });
  await act(async () => { event('dragend', source); });
  return accepted;
}
test('dragging a Session into a nested folder renders exactly one row at the new level', async t => {
  const f = await fixture(t); assert.equal(await drag(f, 's1', 'child'), true);
  assert.equal(f.controller.getSnapshot().state.sessions.s1.folderId, 'child');
  assert.equal(f.container.querySelectorAll('[data-id="s1"]').length, 1);
  assert.equal(f.row('s1').getAttribute('aria-level'), '4');
});
test('folder dragging supports nesting and ordering without cycles', async t => {
  const f = await fixture(t); assert.equal(await drag(f, 'sibling', 'child'), true);
  assert.equal(f.controller.getSnapshot().state.folders.find(f => f.id === 'sibling').parentId, 'child');
  assert.equal(await drag(f, 'parent', 'sibling'), false);
  assert.equal(f.controller.getSnapshot().state.folders.find(f => f.id === 'parent').parentId, null);
});
test('dragging a folder before its sibling changes the rendered order', async t => {
  const f = await fixture(t); assert.equal(await drag(f, 'sibling', 'parent', 2), true);
  const rows = [...f.container.querySelectorAll('[role="treeitem"]')].map(r => r.dataset.id);
  assert.ok(rows.indexOf('sibling') < rows.indexOf('parent'));
});
test('dragging across workspaces is refused by the visible drop target', async t => {
  const f = await fixture(t); assert.equal(await drag(f, 's1', 'b'), false);
  assert.equal(f.controller.getSnapshot().state.revision, 0);
});
test('F2 opens a keyboard-reachable metadata editor with all manual controls', async t => {
  const f = await fixture(t);
  await act(async () => f.row('child').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'F2', bubbles: true })));
  const dialog = f.container.querySelector('dialog'); assert.equal(dialog.open, true);
  assert.ok(dialog.textContent.includes('手动状态')); assert.equal(dialog.querySelectorAll('.lg-color').length, 7);
  assert.equal(dialog.querySelector('input').value, '子目录');
  assert.equal([...dialog.querySelectorAll('select')][0].querySelector('[value="child"]'), null);
});

test('collapse keeps an animated mounted branch and excludes its descendants from arrow navigation', async t => {
  const f = await fixture(t);
  await act(async () => f.row('parent').click());
  const group = f.row('parent').nextElementSibling;
  assert.ok(group.classList.contains('is-collapsed')); assert.equal(group.hasAttribute('inert'), true);
  assert.ok(f.row('child')); assert.equal(f.row('parent').getAttribute('aria-expanded'), 'false');
  f.row('parent').focus();
  await act(async () => f.row('parent').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })));
  assert.equal(document.activeElement, f.row('sibling'));
  await act(async () => f.row('parent').click());
  assert.equal(group.hasAttribute('inert'), false); assert.equal(group.classList.contains('is-collapsed'), false);
});
test('row menu exposes folder deletion, confirmation preserves chats and promotes children', async t => {
  const f = await fixture(t); await drag(f, 's1', 'parent');
  await act(async () => f.row('parent').querySelector('[data-edit]').click());
  assert.ok(f.container.querySelector('.lg-row-menu'));
  await act(async () => f.container.querySelector('.lg-row-menu .lg-danger').click());
  assert.ok(f.container.querySelector('dialog').textContent.includes('聊天记录与标记保留'));
  await act(async () => { f.container.querySelector('.lg-delete-confirm').click(); await new Promise(resolve => setTimeout(resolve, 0)); });
  assert.equal(f.row('parent'), null); assert.ok(f.row('child')); assert.ok(f.row('s1'));
  assert.equal(f.controller.getSnapshot().state.folders.find(f => f.id === 'child').parentId, null);
  assert.equal(f.controller.getSnapshot().state.sessions.s1.folderId, null);
});

test('context menu uses pointer coordinates, has no modal, supports Escape and returns focus', async t => {
  const f = await fixture(t); f.row('parent').focus();
  await act(async () => f.row('parent').dispatchEvent(new window.MouseEvent('contextmenu', { bubbles:true, cancelable:true, clientX:120, clientY:180 })));
  const menu = f.container.querySelector('[role="menu"]');
  assert.equal(menu.style.left, '120px'); assert.equal(menu.style.top, '180px'); assert.equal(f.container.querySelector('dialog'), null);
  assert.ok(menu.querySelector('[role="menuitem"].lg-danger'));
  await act(async () => menu.dispatchEvent(new window.KeyboardEvent('keydown', { key:'Escape', bubbles:true })));
  assert.equal(f.container.querySelector('[role="menu"]'), null); assert.equal(document.activeElement, f.row('parent'));
});
test('workspace removal calls only native remove after confirmation and keeps folder metadata', async t => {
  const calls=[]; const f = await fixture(t, { removeWorkspace: async id => calls.push(id) });
  await act(async () => f.row('a').querySelector('[data-edit]').click());
  await act(async () => f.container.querySelector('[role="menuitem"].lg-danger').click());
  assert.equal(calls.length,0); assert.ok(f.container.querySelector('dialog').textContent.includes('磁盘文件、聊天记录及目录标记保留'));
  await act(async () => { f.container.querySelector('.lg-delete-confirm').click(); await new Promise(resolve => setTimeout(resolve,0)); });
  assert.deepEqual(calls,['a']); assert.equal(f.controller.getSnapshot().state.folders.length,3);
});
test('conversation archive has undo and never requests forced activity stop', async t => {
  const calls=[]; const f = await fixture(t, { archiveSession: async id => calls.push(['archive',id]), unarchiveSession: async id => calls.push(['restore',id]) });
  await act(async () => f.row('s1').querySelector('[data-edit]').click());
  const archive=[...f.container.querySelectorAll('[role="menuitem"]')].find(n => n.textContent==='归档会话');
  await act(async () => { archive.click(); await new Promise(resolve => setTimeout(resolve,0)); });
  assert.deepEqual(calls,[['archive','s1']]); assert.ok(f.container.querySelector('.lg-undo'));
  await act(async () => { f.container.querySelector('.lg-undo button').click(); await new Promise(resolve => setTimeout(resolve,0)); });
  assert.deepEqual(calls,[['archive','s1'],['restore','s1']]); assert.equal(f.container.querySelector('.lg-undo'),null);
});
test('busy session archive refusal keeps conversation and surfaces actionable error', async t => {
  const refusal=Object.assign(new Error('active'),{rpcError:{code:'workspace/session-active'}});
  const f = await fixture(t, { archiveSession: async () => {throw refusal;}, unarchiveSession: async () => {} });
  await act(async () => f.row('s1').querySelector('[data-edit]').click());
  const archive=[...f.container.querySelectorAll('[role="menuitem"]')].find(n => n.textContent==='归档会话');
  await act(async () => { archive.click(); await new Promise(resolve => setTimeout(resolve,0)); });
  assert.ok(f.row('s1')); assert.equal(f.container.querySelector('.lg-undo'),null); assert.ok(f.container.textContent.includes('请先停止后再归档'));
});

test('menu flips upward and stays inside all viewport edges', () => {
  assert.deepEqual(placeMenu({x:790,y:590},{width:216,height:120},{width:800,height:600}),{x:576,y:463});
  assert.deepEqual(placeMenu({x:120,y:106,top:80,align:'end'},{width:216,height:120},{width:800,height:600}),{x:8,y:106});
});
test('Session menu exposes native actions; copying the exact identity does not change metadata', async t => {
  const copied=[];const f=await fixture(t,{renameSession:async()=>{},pinSession:async()=>{},unpinSession:async()=>{},forkSession:async()=>{},copySessionId:async id=>copied.push(id),archiveSession:async()=>{}});
  await act(async()=>f.row('s1').querySelector('[data-edit]').click());
  const labels=[...f.container.querySelectorAll('[role="menuitem"]')].map(n=>n.textContent);
  for(const label of ['重命名会话','置顶会话','分叉会话','复制 Session ID','归档会话'])assert.ok(labels.includes(label),label);
  await act(async()=>{[...f.container.querySelectorAll('[role="menuitem"]')].find(n=>n.textContent==='复制 Session ID').click();});
  assert.deepEqual(copied,['s1']);assert.equal(f.controller.getSnapshot().state.revision,0);
});
test('native pinned conversations lead their existing folder and offer unpin',async t=>{
  const localCatalog=catalog.map(w=>({...w,sessions:w.sessions.map(s=>({...s,pinned:s.id==='s2'}))}));const calls=[];
  const f=await fixture(t,{catalog:localCatalog,pinSession:async()=>{},unpinSession:async id=>calls.push(id)});
  const rows=[...f.container.querySelectorAll('[data-kind="session"]')].map(n=>n.dataset.id);
  assert.deepEqual(rows,['s2','s1']);assert.ok(f.row('s2').querySelector('.lg-pin'));
  await act(async()=>f.row('s2').querySelector('[data-edit]').click());
  await act(async()=>{[...f.container.querySelectorAll('[role="menuitem"]')].find(n=>n.textContent==='取消置顶').click();});
  assert.deepEqual(calls,['s2']);assert.equal(f.controller.getSnapshot().state.revision,0);
});
test('fork opens new native session and assigns exactly the source virtual folder',async t=>{
  const opens=[];const workspace=catalog[0];const child={id:'fork-child',title:'分叉'};
  t.after(()=>{workspace.sessionIds=workspace.sessionIds.filter(id=>id!==child.id);workspace.sessions=workspace.sessions.filter(s=>s.id!==child.id);});
  const f=await fixture(t,{forkSession:async()=>{workspace.sessionIds.push(child.id);workspace.sessions.push(child);return child.id;},openSession:id=>opens.push(id)});
  await drag(f,'s1','child');
  await act(async()=>f.row('s1').querySelector('[data-edit]').click());
  await act(async()=>{[...f.container.querySelectorAll('[role="menuitem"]')].find(n=>n.textContent==='分叉会话').click();await new Promise(resolve=>setTimeout(resolve,0));});
  assert.deepEqual(opens,[child.id]);assert.equal(f.controller.getSnapshot().state.sessions[child.id].folderId,'child');
  assert.equal(f.container.querySelectorAll(`[data-id="${child.id}"]`).length,1);
});

async function selectSessionMenu(f, id, label) {
  await act(async () => f.row(id).querySelector('[data-edit]').click());
  const button=[...f.container.querySelectorAll('[role="menuitem"]')].find(n => n.textContent===label);
  assert.ok(button, `Missing menu item: ${label}`);
  await act(async () => { button.click(); await new Promise(resolve=>setTimeout(resolve,0)); });
}
test('session menu renames through native callback and copy/pin failures are visible', async t => {
  const calls=[]; const f=await fixture(t,{renameSession:async(...args)=>calls.push(['rename',...args]),pinSession:async id=>calls.push(['pin',id]),unpinSession:async()=>{},copySessionId:async()=>{throw new Error('剪贴板拒绝');},forkSession:async()=>{}});
  await selectSessionMenu(f,'s1','重命名会话');
  const form=f.container.querySelector('dialog form');
  await act(async () => form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));
  assert.deepEqual(calls,[['rename','s1','会话一']]); assert.equal(f.container.querySelector('dialog'),null);
  await selectSessionMenu(f,'s1','置顶会话'); assert.deepEqual(calls.at(-1),['pin','s1']);
  await selectSessionMenu(f,'s1','复制 Session ID'); assert.ok(f.container.textContent.includes('剪贴板拒绝'));
});
test('pinned sessions lead their own folder once and expose unpin', async t => {
  const f=await fixture(t,{pinSession:async()=>{},unpinSession:async()=>{}});
  await drag(f,'s2','child');
  const pinnedCatalog=catalog.map(w=>({...w,sessions:w.sessions.map(s=>({...s,pinned:s.id==='s2'}))}));
  await f.render({catalog:pinnedCatalog});
  assert.equal(f.container.querySelectorAll('[data-id="s2"]').length,1);assert.equal(f.row('s2').getAttribute('aria-level'),'4');assert.ok(f.row('s2').querySelector('.lg-pin'));
  const rows=[...f.container.querySelectorAll('[role="treeitem"]')].map(n=>n.dataset.id);
  assert.ok(rows.indexOf('s2')>rows.indexOf('child'));
  await act(async () => f.row('s2').querySelector('[data-edit]').click()); assert.ok([...f.container.querySelectorAll('[role="menuitem"]')].some(n=>n.textContent==='取消置顶'));
});
test('fork refusal shows a migration instruction without creating a local duplicate', async t => {
  const error=Object.assign(new Error('migration'),{rpcError:{code:'session/migration-required'}});
  const f=await fixture(t,{forkSession:async()=>{throw error;}});
  await selectSessionMenu(f,'s1','分叉会话');assert.ok(f.container.textContent.includes('完成原生迁移后再分叉'));assert.equal(f.controller.getSnapshot().state.revision,0);
});

test('collapsed sidebar browses nested folders and opens chats without expanding the sidebar', async t => {
  const calls=[]; const f=await fixture(t,{expandSidebar:()=>calls.push('expanded'),openSession:id=>calls.push(id)});
  await drag(f,'s1','child');await act(async()=>f.row('parent').click());
  await f.render({wide:false});assert.equal(f.container.querySelector('[role="tree"]'),null);
  const trigger=f.container.querySelector('[aria-label="浏览工作区与会话"]');await act(async()=>trigger.click());
  const choose=async id=>{await act(async()=>f.container.querySelector(`[data-cascade-id="${id}"]`).click());};
  await choose('a');await choose('parent');await choose('child');
  assert.ok(f.container.querySelector('[data-cascade-id="s1"]'));await choose('s1');assert.deepEqual(calls,['s1']);assert.equal(f.container.querySelector('.lg-cascade'),null);
  await f.render({wide:true});assert.equal(f.row('parent').getAttribute('aria-expanded'),'false');
});
test('rail menu supports arrow navigation, Escape focus and outside dismissal',async t=>{
 const f=await fixture(t,{wide:false});const trigger=f.container.querySelector('[aria-haspopup="menu"]');
 await act(async()=>trigger.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})));const workspace=f.container.querySelector('[data-cascade-id="a"]');assert.equal(document.activeElement,workspace);
 await act(async()=>workspace.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})));assert.ok(f.container.querySelector('[data-level="1"]'));
 await act(async()=>document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));assert.equal(f.container.querySelector('.lg-cascade'),null);assert.equal(document.activeElement,trigger);
 await act(async()=>trigger.click());await act(async()=>document.body.dispatchEvent(new window.Event('pointerdown',{bubbles:true})));assert.equal(f.container.querySelector('.lg-cascade'),null);
});
test('the directory has no permanent local-save footer',async t=>{const f=await fixture(t);assert.equal(f.container.querySelector('.lg-tree-bottom'),null);assert.equal(f.container.textContent.includes('目录与标记已保存至本机'),false);});

test('theme settings switch all native modes without disabling the skin and reflect external changes', async t => {
  const controller=createController({initial:emptyState(),poll:false,persist:async (state,op)=>applyOperation(state,op,catalog)});
  let snapshot={preference:'system'}; const listeners=new Set(),calls=[];
  const appearance={getSnapshot:()=>snapshot,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},select:mode=>{calls.push(mode);snapshot={preference:mode};for(const fn of listeners)fn();}};
  const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
  t.after(async()=>{await act(async()=>root.unmount());controller.dispose();container.remove();assert.equal(listeners.size,0);});
  await act(async()=>root.render(<Settings controller={controller} appearance={appearance} skin={{choose:async()=>{throw new Error('Unexpected skin toggle');}}}/>));
  const modes=()=>[...container.querySelectorAll('[aria-label="外观模式"] button')];
  assert.deepEqual(modes().map(b=>b.textContent),['明亮','暗黑','跟随系统']);
  for(const [i,mode]of ['light','dark','system'].entries()){await act(async()=>modes()[i].click());assert.equal(modes()[i].getAttribute('aria-pressed'),'true');assert.equal(controller.getSnapshot().state.preferences.theme,true);assert.equal(calls.at(-1),mode);}
  await act(async()=>{snapshot={preference:'dark'};for(const fn of listeners)fn();});assert.equal(modes()[1].getAttribute('aria-pressed'),'true');
});

test('every rail folder level offers creation in the exact folder, with workspace creation at the root',async t=>{
 const created=[];const f=await fixture(t,{wide:false,createSession:async (...args)=>created.push(args),createWorkspace:async()=>created.push('workspace')});
 const click=async selector=>{await act(async()=>f.container.querySelector(selector).click());};
 await click('[aria-label="浏览工作区与会话"]');await click('[data-cascade-id="a"]');await click('[data-cascade-id="parent"]');await click('[data-cascade-id="child"]');
 const button=f.container.querySelector('[data-level="3"] footer button');assert.equal(button.textContent,'新建会话');await act(async()=>button.click());assert.deepEqual(created,[['a','child']]);
 await click('[aria-label="浏览工作区与会话"]');const add=[...f.container.querySelectorAll('[role="menuitem"]')].find(b=>b.textContent==='添加工作区');assert.ok(add);await act(async()=>add.click());assert.deepEqual(created,[['a','child'],'workspace']);
});
test('expanded tree exposes native workspace creation and folder-local conversation creation',async t=>{
 const calls=[];const f=await fixture(t,{createWorkspace:async()=>{calls.push('workspace');return {workspaceId:'new'};},createSession:async (...args)=>calls.push(args)});
 await act(async()=>f.container.querySelector('[aria-label="添加工作区"]').click());assert.deepEqual(calls,['workspace']);
 await act(async()=>f.row('child').querySelector('[data-edit]').click());const create=[...f.container.querySelectorAll('[role="menuitem"]')].find(b=>b.textContent==='新建会话');await act(async()=>create.click());assert.deepEqual(calls,['workspace',['a','child']]);
});

test('project drag persists top-level order and refuses nesting into any folder or session', async t => {
  const f = await fixture(t);
  assert.equal(f.row('a').draggable, true);
  assert.equal(await drag(f, 'b', 'a', 2), true);
  assert.deepEqual(f.controller.getSnapshot().state.workspaceOrder, ['b','a']);
  assert.deepEqual([...f.container.querySelectorAll('[data-kind="workspace"]')].map(row=>row.dataset.id), ['b','a']);
  const before = JSON.stringify(f.controller.getSnapshot().state);
  assert.equal(await drag(f, 'b', 'child'), false);
  assert.equal(await drag(f, 'b', 's1'), false);
  assert.equal(JSON.stringify(f.controller.getSnapshot().state), before);
  assert.equal(await drag(f, 'b', 'a', 38), true);
  assert.deepEqual(f.controller.getSnapshot().state.workspaceOrder, ['a','b']);
});

test('context summary shares upstream pricing, current occupancy and daily ledger without treating missing data as zero', () => {
  const book = priceBook({deepseek:{models:{'deepseek-flash':{cost:{input:1,cache_read:0.1,output:2}}}}});
  const cost = {deepseek:{'deepseek-flash':{off:{uncached:150000,cacheRead:0,cacheWrite:0,output:0}}}};
  const summary = summarizeContext({current:'s1',byId:{s1:{id:'s1',projectionValues:{contextPressure:{projectedTokens:500,contextWindow:1000},contextTimeline:{cost},contextActivity:{days:{'2026-10-23':{tokens:150000,requests:1,cost}}}}}}}, book, new Date(2026,9,23));
  assert.equal(summary.occupancy,50); assert.equal(summary.todayCost,'¥1.00'); assert.equal(summary.sessionCost,'¥1.00');
  assert.equal(summarizeContext({byId:{}}, book).todayCost,null);
  assert.equal(summarizeContext({byId:{}}, book).occupancy,null);
});

test('pet pricing passes canonical model identities to the upstream multi-vendor resolver', () => {
  const model = (canonical, input) => ({canonical_model_id:canonical,cost:{input,output:input}});
  const book = priceBook({
    gateway:{models:{'vendor-a-model':model('vendor-a/model',1),'vendor-b-model':model('vendor-b/model',2)}},
    'vendor-b':{models:{other:model('vendor-b/other',3)}},
  });
  const cost = {gateway:{other:{off:{uncached:150000,cacheRead:0,cacheWrite:0,output:0}}}};
  const snapshot = {current:'a',byId:{a:{id:'a',projectionValues:{contextTimeline:{cost}}}}};
  assert.equal(summarizeContext(snapshot,book).sessionCost,'¥3.00');
});

test('pet pricing does not report unpriced subscription-plan usage as a free API call', () => {
  const book = priceBook({'example-coding-plan':{models:{exclusive:{cost:{input:0,output:0}}}}});
  const cost = {'example-coding-plan':{exclusive:{off:{uncached:150000,cacheRead:0,cacheWrite:0,output:0}}}};
  const snapshot = {current:'a',byId:{a:{id:'a',projectionValues:{contextTimeline:{cost}}}}};
  assert.equal(summarizeContext(snapshot,book).sessionCost,null);
});

test('pet bubble retains balance through an outage and closes by deadline after pointer leave', async t => {
  const controller=createController({initial:emptyState(),poll:false,persist:async(state,op)=>applyOperation(state,op,catalog)});
  let failed=false;
  const account=async()=>{if(failed)throw Error('temporary outage');return {ok:true,value:{status:'ready',value:[],bonusWallets:[{currency:'CNY',balance:'8.25'}]}};};
  const summary={todayTokens:12345,todayCost:'¥0.23',sessionCost:'¥0.10'};
  const context={subscribe:()=>()=>{},getSnapshot:()=>summary};
  const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
  t.after(async()=>{await act(async()=>root.unmount());controller.dispose();container.remove();});
  await act(async()=>root.render(<FloatingPet controller={controller} account={account} context={context}/>));
  const body=container.querySelector('.lg-pet-body');
  await act(async()=>body.click());
  await waitForUI(() => container.querySelector('.lg-pet-card')?.textContent.includes('¥8.25'));
  let card=container.querySelector('.lg-pet-card');
  assert.match(card.textContent,/¥8.25/);assert.match(card.textContent,/12,345 tokens/);assert.match(card.textContent,/¥0.23/);
  for(const removed of ['糯米','奶油小猫','当前上下文','官方规则','关闭','暂时','待识别']) assert.ok(!card.textContent.includes(removed),removed);
  assert.equal(card.querySelector('button'),null);
  body.setPointerCapture=()=>{};body.releasePointerCapture=()=>{};
  await act(async()=>{body.dispatchEvent(new window.MouseEvent('pointerdown',{bubbles:true,button:0}));body.dispatchEvent(new window.MouseEvent('pointerup',{bubbles:true,button:0}));body.dispatchEvent(new window.MouseEvent('pointerout',{bubbles:true,relatedTarget:document.body}));await new Promise(resolve=>setTimeout(resolve,180));});
  assert.equal(container.querySelector('#lg-pet-card').dataset.phase,'shown');
  await waitForUI(() => !container.querySelector('#lg-pet-card'), 10000);
  failed=true;
  await act(async()=>body.click());
  card=container.querySelector('.lg-pet-card');assert.match(card.textContent,/¥8.25/);assert.ok(!card.textContent.includes('temporary outage'));
});

test('daily context totals include each subagent once and distinguish an empty day from missing projections', () => {
  const cost={deepseek:{'deepseek-flash':{off:{uncached:150000,cacheRead:0,cacheWrite:0,output:0}}}};
  const book=priceBook({deepseek:{models:{'deepseek-flash':{cost:{input:1,output:2}}}}});
  const row=(id,parentId,tokens)=>({id,parentId,projectionValues:{contextTimeline:{cost},contextActivity:{days:{'2026-10-23':{tokens,requests:1,cost}}}}});
  const snapshot={current:'a',byId:{a:row('a',null,10),b:row('b','a',20)}};
  const summary=summarizeContext(snapshot,book,new Date(2026,9,23));
  assert.equal(summary.todayTokens,30);assert.equal(summary.todayCost,'¥2.00');assert.equal(summary.sessionCost,'¥2.00');
  assert.equal(summarizeContext(snapshot,book,new Date(2026,9,24)).todayTokens,0);
  assert.equal(summarizeContext({byId:{a:{id:'a'}}},book,new Date(2026,9,23)).todayTokens,null);
});
