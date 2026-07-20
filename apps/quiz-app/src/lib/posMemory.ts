/**
 * 按题 id 记忆浏览位置：题库或列表增删后，按 id 仍能定位回上次位置。
 * 三个浏览模式各自独立 key：顺序练习 / 错题重练 / 看题模式。
 */

function key(scope: string): string {
  return `ask-${scope}-pos-id`;
}

/** 读取上次记忆的题 id，在当前列表中找到其索引；找不到回起点 0 */
export function loadPosIndex(scope: string, ids: string[]): number {
  const last = localStorage.getItem(key(scope));
  const idx = !last ? -1 : ids.indexOf(last);
  const result = idx >= 0 ? idx : 0;
  // [诊断] 抓 pos 记忆的所有读取：定位落点的根源
  try {
    console.log('[pos] loadPosIndex', {
      scope, last记忆: last, ids长度: ids.length,
      ids首尾: ids.length ? [ids[0], '...', ids[ids.length - 1]] : '[]',
      last在ids索引: idx, 返回: result,
    });
  } catch { /* ignore */ }
  return result;
}

/** 记忆当前题 id（在离开当前题 / 前进时调用） */
export function savePosId(scope: string, id: string): void {
  // [诊断] 抓位置记忆的所有写入
  try { console.log('[pos] savePosId', { scope, id }); } catch { /* ignore */ }
  try { localStorage.setItem(key(scope), id); } catch { /* 忽略配额 */ }
}

/** 清除该模式的位置记忆（用于「重置顺序」：回到第一题） */
export function clearPos(scope: string): void {
  try { localStorage.removeItem(key(scope)); } catch { /* 忽略 */ }
}
