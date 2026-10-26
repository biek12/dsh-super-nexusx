import { estimateSessionCost, mergeCostUsage, formatCost, priceIndexOf } from '../vendor/dsh-context/src/client/cost.ts';
import { activityOf, timelineOf } from '../vendor/dsh-context/src/client/services.ts';
import { dayKeyOf } from '../vendor/dsh-context/src/shared/days.ts';

export function priceBook(data) {
  const prices = {}, canonicalOf = {};
  for (const [pid, provider] of Object.entries(data ?? {})) {
    prices[pid] = {};
    for (const [mid, model] of Object.entries(provider.models ?? {})) {
      const c = model.cost;
      if (!c || !Number.isFinite(c.input) || !Number.isFinite(c.output)) continue;
      prices[pid][mid] = { miss: c.input, hit: c.cache_read ?? c.input, write: c.cache_write ?? c.input, out: c.output };
      if (typeof model.canonical_model_id === 'string' && model.canonical_model_id.length > 0) {
        (canonicalOf[pid] ??= {})[mid] = model.canonical_model_id;
      }
    }
  }
  return { prices, index: priceIndexOf(prices, canonicalOf) };
}
export function summarizeContext(snapshot, book, now = new Date()) {
  const rows = Object.values(snapshot?.byId ?? {}).filter(row => row && !row.blank);
  const byId = snapshot?.byId ?? {};
  const active = rows.find(row => row.id === snapshot.current) ?? rows.find(row => row.retainedBy?.mainView > 0);
  const values = active?.projectionValues ?? {};
  const day = dayKeyOf(now.getTime());
  const ledgers = rows.map(row => activityOf(row.projectionValues?.contextActivity)).filter(Boolean);
  const daily = ledgers.map(activity => activity.days[day]).filter(Boolean);
  const todayUsage = mergeCostUsage(...daily.map(item => item.cost));
  const cost = book ? estimateSessionCost(todayUsage, book, 'cny') : null;
  const family = new Set(active ? [active.id] : []);
  const visit = id => { for (const row of rows) if (row.parentId === id && !family.has(row.id)) { family.add(row.id); visit(row.id); } };
  if (active) visit(active.id);
  const sessionUsage = mergeCostUsage(...[...family].map(id => timelineOf(byId[id]?.projectionValues?.contextTimeline)?.cost));
  const sessionCost = book ? estimateSessionCost(sessionUsage, book, 'cny') : null;
  const pressure = values.contextPressure;
  const tokens = pressure?.projectedTokens ?? pressure?.pressureTokens ?? timelineOf(values.contextTimeline)?.current.total;
  const window = pressure?.contextWindow;
  return { sessionId: active?.id ?? null, tokens: Number.isFinite(tokens) ? tokens : null,
    occupancy: Number.isFinite(tokens) && window > 0 ? tokens / window * 100 : null,
    todayTokens: ledgers.length ? daily.reduce((sum, item) => sum + (item.tokens ?? 0), 0) : null,
    todayCost: cost === null ? null : formatCost(cost, 'cny'),
    sessionCost: sessionCost === null ? null : formatCost(sessionCost, 'cny'), updatedAt: Date.now() };
}
