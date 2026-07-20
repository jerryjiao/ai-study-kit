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
  return idx >= 0 ? idx : 0;
}

/** 记忆当前题 id（在离开当前题 / 前进时调用） */
export function savePosId(scope: string, id: string): void {
  try { localStorage.setItem(key(scope), id); } catch { /* 忽略配额 */ }
}

/** 清除该模式的位置记忆（用于「重置顺序」：回到第一题） */
export function clearPos(scope: string): void {
  try { localStorage.removeItem(key(scope)); } catch { /* 忽略 */ }
}
