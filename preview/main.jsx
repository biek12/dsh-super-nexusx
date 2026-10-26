import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createAppearanceSource } from '../src/appearance.js';
import { Settings, FooterToggle } from '../src/settings.jsx';
import { syncPresentation } from '../src/presentation.js';
import { FolderTree, Icon, useSource } from '../src/ui.jsx';
import { applyOperation, defaultMeta, emptyState, validateState } from '../src/model.js';
import { createController } from '../src/controller.js';
import themeCss from '../src/theme.css';
import statusMotionCss from '../src/status-motion.css';
import previewCss from './preview.css';
import { LiquidOrb } from '../src/orb.jsx';
import { copyText } from '../src/native.js';
import { installShellSkin } from '../src/skin.js';
import { EffortDemo } from './effort-demo.jsx';
import { FloatingPet, petCss } from '../src/pets/pet.jsx';
import { PetLab } from './pet-lab.jsx';
import { sidebar, hero, frame, shimmer } from '../artifacts/native-shell-fixture.js';
const F = frame.classes; const S = sidebar.classes; const H = hero.classes;
const petStyle = document.createElement('style'); petStyle.textContent = petCss; document.head.append(petStyle);
const css = document.createElement('style'); css.textContent = frame.css + sidebar.css + hero.css + shimmer.css + themeCss + statusMotionCss + previewCss; document.head.append(css); document.documentElement.dataset.platform = 'darwin';

const catalog = [
  { workspaceId: 'work', title: '设计工作室', path: '/Projects/design-studio', sessionIds: ['s1', 's2', 's3', 's4', 's5'], sessions: [
    { id: 's1', title: 'Liquid Glass 主题设计' }, { id: 's2', title: '侧栏目录的交互细节' }, { id: 's3', title: '整理设计参考与灵感' }, { id: 's4', title: '品牌色彩与字体探索' }, { id: 's5', title: '下一版的产品想法' },
  ] },
  { workspaceId: 'life', title: '生活与探索', path: '/Projects/life', sessionIds: ['s6', 's7'], sessions: [{ id: 's6', title: '十月阅读笔记' }, { id: 's7', title: '周末的短途旅行' }] },
];
const seed = emptyState();
seed.folders = [
  { ...defaultMeta(), id: 'product', workspaceId: 'work', parentId: null, name: '产品设计', order: 0, color: 'blue', tags: ['工作'], starred: true },
  { ...defaultMeta(), id: 'glass', workspaceId: 'work', parentId: 'product', name: '界面与交互', order: 0, color: 'purple', status: 'doing' },
  { ...defaultMeta(), id: 'inspiration', workspaceId: 'work', parentId: null, name: '灵感收集', order: 1, color: 'orange', tags: ['灵感'] },
  { ...defaultMeta(), id: 'reading', workspaceId: 'life', parentId: null, name: '阅读笔记', order: 0, color: 'green', status: 'done' },
];
seed.sessions = {
  s1: { ...defaultMeta(), workspaceId: 'work', folderId: 'glass', order: 0, status: 'doing', color: 'blue', tags: ['设计'], starred: true },
  s2: { ...defaultMeta(), workspaceId: 'work', folderId: 'glass', order: 1 },
  s3: { ...defaultMeta(), workspaceId: 'work', folderId: 'inspiration', order: 0 },
  s4: { ...defaultMeta(), workspaceId: 'work', folderId: 'product', order: 0, status: 'done' },
  s6: { ...defaultMeta(), workspaceId: 'life', folderId: 'reading', order: 0 },
};
const demoKey = location.search.includes('qa') ? 'dsh.liquid-glass.preview.qa.v1' : 'dsh.liquid-glass.preview.v1';
let saved; try { saved = validateState(JSON.parse(localStorage.getItem(demoKey))); } catch { saved = seed; }
const controller = createController({ initial: saved, poll: false, persist: async (state, operation) => {
  const next = applyOperation(state, operation, catalog); localStorage.setItem(demoKey, JSON.stringify(next)); return next;
} });

const schemeKey = 'dsh.preview.appearance';
const savedScheme = localStorage.getItem(schemeKey);
let previewTheme = { preference:['light','dark','system'].includes(savedScheme) ? savedScheme : 'system' };
const themeListeners = new Set();
const previewContext = { on:(_,listener) => { themeListeners.add(listener); return () => themeListeners.delete(listener); }, theme: { getTheme:() => previewTheme, setTheme:mode => { previewTheme={preference:mode}; localStorage.setItem(schemeKey,mode); for(const fn of themeListeners)fn(); } } };
const appearance = createAppearanceSource(previewContext);
function StatusDemo() {
  const [phase, setPhase] = useState('thinking'); const [seconds, setSeconds] = useState(8);
  useEffect(() => { if (phase === 'done') return; const timer = setInterval(() => setSeconds(n => n + 1), 1000); return () => clearInterval(timer); }, [phase]);
  const active = phase !== 'done'; const label = phase === 'thinking' ? '正在思考' : phase === 'tools' ? '正在准备工具调用' : '已完成'; const C = shimmer.classes;
  return <section className="preview-motion-demo" aria-label="状态动效示例"><div className="preview-motion-controls"><span>状态动效示例</span>{[['thinking','思考'],['tools','准备工具'],['done','已完成']].map(([key,text]) => <button key={key} aria-pressed={phase === key} onClick={() => setPhase(key)}>{text}</button>)}</div>
    <div data-conversation-region="chat"><div data-chat-running={active || undefined}><button className="preview-running-label" data-process-activity={phase}><span data-step-process-icon><Icon name="sun" size={14}/></span><span className={C.root} data-shimmer={active || undefined}><span className={C.content}><span className={C.text}>{label}</span></span>{active && <span className={C.decoration} aria-hidden="true" inert=""><span className={C.sweep}><span className={`${C.content} ${C.highlight}`}><span className={C.text}>{label}</span></span></span></span>}</span></button><span className="preview-run-clock">{seconds} 秒</span></div></div>
  </section>;
}
function Preview() {
  const runtime = useSource(controller);
  const [, setWorkspaceVersion] = useState(0);
  const [wide, setWide] = useState(true); const [settingsOpen, setSettingsOpen] = useState(false);
  const [active, setActive] = useState(null); const scheme = useSource(appearance).preference;
  const [extra, setExtra] = useState([]); const [pointerInside, setPointerInside] = useState(false); const [removed, setRemoved] = useState([]); const [archived, setArchived] = useState([]); const [renamed, setRenamed] = useState({}); const [sessionTitles, setSessionTitles] = useState({}); const [pinned, setPinned] = useState([]);
  useEffect(() => installShellSkin(), []);
  useEffect(() => { syncPresentation(runtime.state.preferences); document.body.dataset.liquidGlass = runtime.state.preferences.theme ? 'on' : 'off'; }, [runtime.state.preferences]);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const sync = () => { document.body.dataset.lgScheme = scheme === 'system' ? media.matches ? 'dark' : 'light' : scheme; };
    sync(); media.addEventListener('change', sync); return () => media.removeEventListener('change', sync);
  }, [scheme]);
  const allCatalog = catalog.filter(w => !removed.includes(w.workspaceId)).map(w => ({ ...w, title: renamed[w.workspaceId] ?? w.title, sessions: [...w.sessions, ...extra.filter(s => s.workspaceId === w.workspaceId)].filter(s => !archived.includes(s.id)).map(s => ({...s, title: sessionTitles[s.id] ?? s.title, pinned:pinned.includes(s.id)})) }));
  const title = allCatalog.flatMap(w => w.sessions).find(s => s.id === active)?.title ?? '新的开始';
  const create = async (workspaceId, folderId = null) => { const id = crypto.randomUUID(); catalog.find(w => w.workspaceId === workspaceId).sessionIds.push(id); setExtra(s => [...s, { id, title: '新会话', workspaceId }]); if (folderId !== null) await controller.mutate({type:'session.move',id,workspaceId,folderId}); setActive(id); return id; };
  const addWorkspace = async () => { const workspace={workspaceId:crypto.randomUUID(),title:'新工作区',path:'/Preview/workspace',sessionIds:[],sessions:[]}; catalog.push(workspace);setWorkspaceVersion(n=>n+1);return workspace; };
  return <div className="preview-page"><FloatingPet controller={controller}/><div className="preview-top"><div><span className="preview-wordmark"><Icon name="glass" size={18}/>DSH <b>超级工作台</b></span><span className="preview-tag">交互预览 · 示例数据</span></div><div><EffortDemo controller={controller}/><button className="preview-reset" onClick={() => setSettingsOpen(true)}>DSH 超级工作台</button><button className="preview-reset" onClick={() => { localStorage.removeItem(demoKey); localStorage.removeItem(`${demoKey}.collapsed`); location.reload(); }}>重置示例</button><div className="preview-appearance" role="group" aria-label="预览外观">{[['light', '浅色'], ['dark', '深色'], ['system', '跟随系统']].map(([key, label]) => <button key={key} aria-pressed={scheme === key} onClick={() => appearance.select(key)}>{label}</button>)}</div></div></div>
    <div className={`preview-window ${F.frame}`} data-sidebar-collapsed={!wide || undefined} style={{ gridTemplateColumns: `${wide ? 280 : 64}px minmax(0,1fr) 0px` }}><div className={F.sidebarCol}><div data-slot="sidebar" style={{display:'contents'}}><aside style={{ width:wide ? 280 : 64 }} className={[S.root, !wide && S.collapsed, !pointerInside && S.quietBars].filter(Boolean).join(' ')} onPointerEnter={() => setPointerInside(true)} onPointerLeave={() => setPointerInside(false)}>
      <div className={S.topStrip}><span className="preview-traffic" style={{marginRight:'auto'}}><i/><i/><i/></span><button className={S.iconButton} aria-label={wide ? "收起侧栏" : "展开侧栏"} onClick={() => setWide(!wide)}><Icon name="book"/></button></div>
      <div className={S.logoRow}><div className={S.brand} style={{ display:wide ? undefined : 'none' }}><span className={S.brandIdentity}><span className={S.brandMark}><Icon name="glass" size={24}/></span>{wide && <span className={S.brandName}><span className="lg-wordmark">DSH <small>超级工作台</small></span></span>}</span></div></div>
      <button className={S.newSession} onClick={() => setActive(null)}><Icon name="plus" size={16}/>{wide && '新会话'}</button>
      <nav className={S.panelList}>{[['glass', '插件'], ['sun', '自动化任务'], ['book', '上下文洞察'], ['sliders', '记忆系统']].map(([icon, label]) => <button key={label} className={S.panelRow} title="示例导航"><span className={S.panelGlyph}><Icon name={icon}/></span>{wide && <span className={S.panelTitle}>{label}</span>}</button>)}</nav>
      <div className={S.regionArea}><div data-slot="sidebar.workspaces" style={{display:'contents'}}><FolderTree wide={wide} expandSidebar={() => setWide(true)} controller={controller} catalog={allCatalog} activeId={active} openSession={setActive} createSession={create} createWorkspace={addWorkspace} renameWorkspace={async (id, title) => setRenamed(s => ({ ...s, [id]: title }))} removeWorkspace={async id => setRemoved(s => [...s, id])} archiveSession={async id => setArchived(s => [...s, id])} unarchiveSession={async id => setArchived(s => s.filter(i => i !== id))}
      renameSession={async (id, title) => setSessionTitles(s => ({ ...s, [id]:title }))} pinSession={async id => setPinned(s => [...s,id])} unpinSession={async id => setPinned(s => s.filter(i => i !== id))}
      copySessionId={async id => { if (!await copyText(id)) throw new Error('无法写入剪贴板'); }} forkSession={async id => { const source=allCatalog.find(w => w.sessions.some(s => s.id === id)); const child=crypto.randomUUID(); catalog.find(w => w.workspaceId === source.workspaceId).sessionIds.push(child); setExtra(s => [...s,{id:child,title:`${source.sessions.find(s => s.id === id).title} (1)`,workspaceId:source.workspaceId}]); return child; }} storageKey={`${demoKey}.collapsed`}/></div></div>
      <div className={S.footArea}><div className={S.footerActions}><button className={`lg-utility-action ${!wide ? 'lg-utility-rail' : ''}`} title="远程控制（示例）"><Icon name="sun" size={16}/>{wide && '远程控制'}</button><FooterToggle controller={controller} wide={wide}/></div><div className={S.settingsArea}><div className="preview-profile" onClick={() => setSettingsOpen(true)} title="主题设置"><span className="preview-avatar">A</span>{wide && <><div>Anjon<small>个人工作空间</small></div><Icon name="more"/></>}</div></div></div>
    </aside></div></div><main className={`preview-content ${F.centerCol}`}><header className="preview-content-header"><span>{active ? '设计工作室 / 会话' : '新会话'}</span><div><button onClick={() => setActive(active ? null : 's1')}>{active ? '新会话主页' : '查看对话'}</button><span className="preview-model">DeepSeek <Icon name="chevron" size={10}/></span></div></header>
      {!active ? <div className="preview-home"><div className="preview-home-inner"><div className={H.root}><div className={H.stack}><div className={H.headline}><span className={H.fishHitbox}><LiquidOrb/></span><span className={H.titleGroup}>DeepSeek</span></div><div className={H.body}/></div></div><div className="preview-composer fixture_composerHero"><textarea aria-label="预览消息输入框" placeholder="有什么可以帮你？"/><footer><div><button aria-label="添加附件"><Icon name="plus"/></button><span>DeepSeek</span></div><button className="preview-send" disabled aria-label="示例不可发送"><Icon name="arrow"/></button></footer></div><div className="preview-home-workspace"><Icon name="folder" size={13}/>设计工作室<Icon name="chevron" size={11}/></div><StatusDemo/></div><p className="preview-disclaimer">主页使用本机 DSH 的 HeroShell 结构与样式，输入框为示例</p></div> : <>
      <div className="preview-conversation"><div className="preview-conversation-title"><span className="preview-date">2026 年 10 月 22 日</span><h1>{title}</h1><p>让想法有序，让灵感自然流动。</p></div><div className="preview-user-message">我想要一个像 Apple 一样通透、自然的工作空间，也能让每一段对话各归其位。</div>
      <article className="preview-response"><span className="preview-assistant-icon"><Icon name="glass" size={20}/></span><div><div className="preview-response-label">DeepSeek <span>刚刚</span></div><p>让我们从清晰的层次开始。</p><p>侧栏与工具栏采用轻盈的玻璃材质，透出柔和的背景。正文保留安静的阅读底色，让注意力始终留在内容上。</p><div className="preview-feature-note"><span className="preview-note-icon"><Icon name="folder" size={18}/></span><div><strong>每一个想法，都有自己的位置</strong><p>在工作区中建立多层子目录，拖动会话调整归类。用颜色、标签和状态，记录你自己的节奏。</p></div></div><p>你可以直接试试左侧的目录：悬停后点击 <strong>＋</strong> 新建子目录，点击 <strong>···</strong> 设置标记，或拖动目录与会话来整理顺序。</p><div className="preview-response-actions"><button>复制</button><span>·</span><button>重新生成</button></div></div></article>
      </div><div className="preview-composer"><textarea aria-label="预览消息输入框" placeholder="继续你的想法…"/><footer><div><button aria-label="添加附件"><Icon name="plus"/></button><span><i/>DeepSeek</span></div><button className="preview-send" aria-label="预览：发送消息不可用" disabled><Icon name="arrow"/></button></footer></div><p className="preview-disclaimer">主题与目录功能预览 · 会话正文为示例，不发送消息</p>
    </>}</main><div className={F.rightbarCol}/><div className={F.bottomRow}/></div><footer className="preview-caption"><span>通透的导航，清晰的内容。</span><span>拖拽整理 · 多层目录 · 手动标记</span></footer>
    {settingsOpen && <div className="preview-settings-backdrop" onClick={e => { if (e.target === e.currentTarget) setSettingsOpen(false); }}><div role="dialog" aria-label="主题设置预览" className="preview-settings"><button className="lg-icon-button preview-settings-close" aria-label="关闭主题设置" onClick={() => setSettingsOpen(false)}><Icon name="close"/></button><Settings controller={controller} appearance={appearance} skin={{ choose:value => controller.mutate({ type:'preferences', patch:{ theme:value } }) }}/></div></div>}
  </div>;
}
createRoot(document.getElementById('root')).render(location.search.includes('pet-lab') ? <PetLab/> : <Preview/>);
