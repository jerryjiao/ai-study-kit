/** 主题目录解析（sync-examples / sync-study / teach-generate / grill-wrong 共用）。
 *
 *  EXAMPLE_THEME / --theme 的值支持两种形态：
 *  ① 仓库内主题名（'dev-intro'，不含路径分隔符）→ <repoRoot>/examples/<name>/
 *  ② 外部主题包路径（含 / 或 \，如 'D:/x/theme/my-topic'、'/home/u/packs/my-topic'，
 *     git-bash/msys 的 '/d/x/...' 也能识别）→ 该目录本身，主题名取 basename。
 *
 *  外部形态让消费者把主题内容放在套件仓库之外（自己的项目目录），kit 只当工具——
 *  public/study/<name>/、src/data/theme.json、coursesRead 的 "<theme>/<file>" key
 *  都用 basename，与仓库内同名主题完全等价。见 docs/adr/0004。
 *
 *  外部形态的粘滞指针住 <dataDir>/../.theme-state.json（= apps/quiz-app/ 下，src/ 之外，
 *  前端结构上碰不到）：src/data/theme.json 被 5 个前端文件 import 会打进公开 bundle，
 *  绝不能携带构建机绝对路径（泄露路径 + 同 commit 跨机器构建哈希漂移）。
 */
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { basename, isAbsolute, join, resolve } from 'node:path';

export function resolveThemeDir(raw, repoRoot) {
  let p = String(raw).trim();
  // msys/git-bash 会把 'D:\x' 显示为 '/d/x' 形式；win32 下 Node 不识别，转换之
  if (process.platform === 'win32' && /^\/[a-zA-Z]\//.test(p)) p = p[1] + ':' + p.slice(2);
  if (/[\\/]/.test(p)) {
    const dir = isAbsolute(p) ? resolve(p) : resolve(process.cwd(), p);
    return { raw: p, dir, name: basename(dir) || 'theme', external: true };
  }
  return { raw: p, dir: join(repoRoot, 'examples', p), name: p, external: false };
}

/** 主题目录是否可用（存在性防呆，供调用方报友好错误）。 */
export function themeDirExists(dir) {
  return existsSync(dir);
}

/** .theme-state.json 文件名（外部主题包粘滞指针，住 <appRoot>/ = src/ 的上一级）。 */
export const THEME_STATE_FILENAME = '.theme-state.json';

/** .theme-state.json 的规范位置：<dataDir>/../../（dataDir 恒为 <appRoot>/src/data 形态，
 *  两个调用方 sync-examples / sync-study 均如此传入）。落在 apps/quiz-app/ 下——src/ 之外，
 *  前端结构上碰不到（src/ 内的话 vite import 范围够得着，等于没搬出 bundle 边界）。 */
export function themeStatePath(dataDir) {
  return join(dataDir, '..', '..', THEME_STATE_FILENAME);
}

/** 读外部主题包粘滞指针（.theme-state.json 的 dir）。无文件 → null；损坏 → warn 后 null
 *  （同 theme.json 损坏的态度：打 warn 不静默，交给后续粘滞源/默认主题）。 */
export function readThemeStateDir(dataDir) {
  const stateFile = themeStatePath(dataDir);
  if (!existsSync(stateFile)) return null;
  try {
    const s = JSON.parse(readFileSync(stateFile, 'utf-8'));
    return s.dir || null;
  } catch {
    console.warn(`[sync] ${THEME_STATE_FILENAME} 损坏（${stateFile}），已忽略该粘滞指针——如非预期请检查该文件`);
    return null;
  }
}

/** 写外部主题包粘滞指针：{"dir": "<绝对路径>"}。仅外部形态调用（sync-examples 落位）。 */
export function writeThemeState(dataDir, dir) {
  writeFileSync(themeStatePath(dataDir), JSON.stringify({ dir }, null, 2) + '\n');
}

/** 清除外部主题包粘滞指针（显式切回仓库内主题名时重置，无文件 = no-op）。 */
export function clearThemeState(dataDir) {
  const stateFile = themeStatePath(dataDir);
  if (existsSync(stateFile)) rmSync(stateFile, { force: true });
}

/** 粘滞主题解析（sync-examples / sync-study 同一口径，别各写一份）：
 *  EXAMPLE_THEME 已设 → 用之；否则按 .theme-state.json 的 dir 沿用外部主题包，
 *  再退到 <dataDir>/theme.json 沿用已同步主题（仓库内主题记名字；旧版本曾把外部
 *  主题包的 dir 也记在这里，兼容读——读到即用，sync-examples 本次迁移进 .theme-state.json）；
 *  都没有才回落 dev-intro。
 *  两个 sync 脚本的主题解析必须一致——sync-study 裸跑不读粘滞主题会把
 *  dev-intro 课程站静默同步到别的主题的数据层上（审计 bug #52）。
 *  theme.json / .theme-state.json 损坏 → 打 warn 再回落 dev-intro，绝不静默换主题（审计 bug #54）。 */
export function detectStickyTheme(dataDir, repoRoot, fallback = 'dev-intro') {
  if (process.env.EXAMPLE_THEME) return process.env.EXAMPLE_THEME;
  const stateDir = readThemeStateDir(dataDir);
  if (stateDir && existsSync(stateDir)) return stateDir;    // 外部主题包：粘滞完整路径
  const themeFile = join(dataDir, 'theme.json');
  if (existsSync(themeFile)) {
    try {
      const t = JSON.parse(readFileSync(themeFile, 'utf-8'));
      if (t.dir && existsSync(t.dir)) return t.dir;          // 旧项目残留 dir：兼容读（本次 sync 迁移走）
      if (t.theme && existsSync(join(repoRoot, 'examples', t.theme))) return t.theme;
    } catch {
      console.warn(`[sync] theme.json 损坏（${themeFile}），已回退 ${fallback}——如非预期请检查该文件`);
    }
  }
  return fallback;
}
