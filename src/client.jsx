import { version } from '../package.json';
import { contextPlugin } from './context-plugin.js';
import { installContext } from './context.jsx';
import React, { useEffect, useSyncExternalStore } from 'react';
import { FolderTree, useSource } from './ui.jsx';
import { Settings, FooterToggle } from './settings.jsx';
import { syncPresentation, clearPresentation } from './presentation.js';
import { createController } from './controller.js';
import css from './theme.css';
import statusMotionCss from './status-motion.css';
import waitVendorCss from './wait-vendor.css';
import waitLineCss from './wait-line.css';
import { installWaitingLine } from './wait-line.js';
import { LiquidOrb } from './orb.jsx';
import { createSessionActions, createCreationActions } from './native.js';
import { createCatalog } from './catalog.js';
import { installSkinChoice, installShellSkin } from './skin.js';
import { DIRECTORY_FLOW, installDirectoryFlow } from './directory-flow.js';
import { createWorkspacePicker } from './workspace-picker.js';
import { createAppearanceSource } from './appearance.js';
import { installEffortSlider } from './effort-slider.js';
import { installSurfaceMotion } from './surface-motion.js';
import surfaceMotionCss from './surface-motion.css';
import { petCss } from './pets/pet.jsx';
import { installPet } from './pets/install.jsx';

export const inject = ['theme', 'slots', 'uiWorkspace', 'workspaces', 'sessions', 'configForms'];
const PALETTE = {
  '--dsw-alias-bg-base': { light: '#fafbfc', dark: '#171a20' },
  '--dsw-alias-bg-layer-1': { light: '#fafbfc', dark: '#171a20' },
  '--dsw-alias-bg-layer-2': { light: '#ffffff', dark: '#20242c' },
  '--dsw-alias-label-primary': { light: '#20232b', dark: '#e9edf4' },
  '--dsw-alias-label-secondary': { light: '#777f8e', dark: '#979dab' },
  '--dsw-alias-interactive-bg-hover': { light: 'rgba(0,0,0,.035)', dark: 'rgba(255,255,255,.06)' },
  '--dsw-alias-state-business-primary': { light: '#007aff', dark: '#66aaff' },
};
function createTreeComponent(ctx, controller, workspacePicker) {
  const sessionActions = createSessionActions(ctx); const creationActions = createCreationActions(ctx, controller, workspacePicker);
  const workspaceSource = ctx.workspaces.list; const sessionSource = ctx.sessions.list;
  const subscribeWorkspaces = fn => workspaceSource.subscribe(fn); const getWorkspaces = () => workspaceSource.getSnapshot();
  const subscribeSessions = fn => sessionSource.subscribe(fn); const getSessions = () => sessionSource.getSnapshot();
  return function DshFolderTree({ wide = true, expandSidebar, renderSlot }) {
    const picker = useSource(workspacePicker);
    useEffect(() => () => workspacePicker.onCancel(), []);
    const workspaces = useSyncExternalStore(subscribeWorkspaces, getWorkspaces, getWorkspaces);
    const sessions = useSyncExternalStore(subscribeSessions, getSessions, getSessions);
    const catalog = createCatalog(workspaces, sessions);
    const current = Object.values(sessions.byId).find(s => (s.retainedBy?.mainView ?? 0) > 0)?.id;
    return <><FolderTree wide={wide} expandSidebar={expandSidebar} controller={controller} catalog={catalog} activeId={current} {...sessionActions} {...creationActions}
      openSession={id => ctx.uiWorkspace.openSession(id)}
      renameWorkspace={(id, title) => ctx.workspaces.rename(id, title)} removeWorkspace={id => ctx.workspaces.delete(id)}
      archiveSession={id => ctx.uiWorkspace.archiveSession(id)} unarchiveSession={id => ctx.uiWorkspace.unarchiveSession(id)}
      onNativeView={() => controller.mutate({ type: 'preferences', patch: { tree: false } }).catch(() => {})}/>
      {renderSlot(DIRECTORY_FLOW, { ...picker, onPicked:workspacePicker.onPicked, onCancel:workspacePicker.onCancel, onError:workspacePicker.onError })}</>;
  };
}
export function apply(ctx) {
  const integratedContext = contextPlugin();
  ctx.inject(integratedContext.inject, scope => { scope.plugin(integratedContext); });
  ctx.effect(() => {
    const style = document.createElement('style'); style.dataset.plugin = 'dsh-liquid-glass'; style.textContent = css + statusMotionCss + waitVendorCss + waitLineCss + surfaceMotionCss + petCss; document.head.append(style);
    const controller = createController();
    const context = installContext(ctx);
    const releasePet = installPet({ controller, context });
    const workspacePicker = createWorkspacePicker({ createWorkspace:input => ctx.workspaces.create(input), available:() => ctx.slots.entries(DIRECTORY_FLOW).length > 0 });
    const releaseDirectoryFlow = installDirectoryFlow(ctx);
    const Tree = createTreeComponent(ctx, controller, workspacePicker);
    const skin = installSkinChoice({ controller });
    const appearance = createAppearanceSource(ctx);
    let releaseTree; let releaseTokens; let releaseShell; let releaseEffort; let releaseWaiting; let surfaceMotion; let releaseBrands = []; let themeEnabled; let treeEnabled;
    const sync = () => {
      const runtime = controller.getSnapshot();
      if (!runtime.ready) return;
      const prefs = runtime.state.preferences;
      syncPresentation(prefs);
      if (prefs.theme !== themeEnabled) {
        themeEnabled = prefs.theme;
        if (prefs.theme) {
          document.body.dataset.liquidGlass = 'on'; releaseTokens = ctx.theme.overrideTokens('dsh-liquid-glass', PALETTE);
          releaseShell = installShellSkin();
          releaseEffort = installEffortSlider(ctx, controller);
          releaseWaiting = installWaitingLine(ctx, controller);
          surfaceMotion = installSurfaceMotion({ controller, appearance });
          releaseBrands = [
            ctx.slots.inject('sidebar.brand.name', () => ctx.slots.register({ name: 'sidebar.brand.name', priority: -20 }, () => <span className="lg-wordmark">DSH <small>超级工作台</small></span>)),
            ctx.slots.inject('conversation.hero.brand.mark', () => ctx.slots.register({ name: 'conversation.hero.brand.mark', priority: -20 }, () => <LiquidOrb/>)),
          ];
        }
        else { surfaceMotion?.dispose(); surfaceMotion = undefined; delete document.body.dataset.liquidGlass; releaseTokens?.(); releaseTokens = undefined; releaseShell?.(); releaseShell = undefined; releaseEffort?.(); releaseEffort = undefined; releaseWaiting?.(); releaseWaiting = undefined; releaseBrands.forEach(release => release()); releaseBrands = []; }
      }
      if (prefs.tree !== treeEnabled) {
        const update = () => {
          if (prefs.tree) { releaseTree = ctx.slots.inject('sidebar.workspaces', () => ctx.slots.register({ name: 'sidebar.workspaces', priority: -20, children: { [DIRECTORY_FLOW]: { kind:'single', scope:'root' } } }, Tree)); treeEnabled = true; }
          else { releaseTree?.(); releaseTree = undefined; treeEnabled = false; }
        };
        if (treeEnabled !== undefined && surfaceMotion) surfaceMotion.switchWorkspace(update); else update();
      }
    };
    const unsubscribe = controller.subscribe(sync);
    const releaseSettings = ctx.slots.inject('settings.section', () => ctx.slots.register({ name: 'settings.section', id: 'liquid-glass', label: () => 'DSH 超级工作台', order: 12 }, () => <Settings controller={controller} skin={skin} appearance={appearance}/>));
    const releaseFooter = ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({ name: 'sidebar.footer.action', id: 'liquid-glass-view', order: Number.MAX_SAFE_INTEGER }, props => <FooterToggle {...props} controller={controller}/>));
    // Wait for persisted preferences before shadowing the native tree or touching theme tokens.
    controller.refresh().then(() => { if (!controller.getSnapshot().error) { sync(); console.info(`[dsh-super-nexusx] client ${version} ready`); } });
    return () => { unsubscribe(); releasePet(); context.dispose(); surfaceMotion?.dispose(); releaseTree?.(); releaseTokens?.(); releaseShell?.(); releaseEffort?.(); releaseWaiting?.(); releaseBrands.forEach(release => release()); skin.dispose(); workspacePicker.dispose(); releaseDirectoryFlow(); appearance.dispose(); releaseSettings(); releaseFooter(); controller.dispose(); delete document.body.dataset.liquidGlass; clearPresentation(); style.remove(); };
  }, 'liquid-glass: theme, folder tree and settings');
}
