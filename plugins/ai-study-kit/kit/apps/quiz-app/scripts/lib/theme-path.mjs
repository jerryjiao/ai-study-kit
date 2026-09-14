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
 */
import { existsSync, readFileSync } from 'node:fs';
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

/** 粘滞主题解析（sync-examples / sync-study 同一口径，别各写一份）：
 *  EXAMPLE_THEME 已设 → 用之；否则读 <dataDir>/theme.json 沿用已同步主题
 *  （外部主题包记 dir 绝对路径，仓库内主题记名字）；都没有才回落 dev-intro。
 *  两个 sync 脚本的主题解析必须一致——sync-study 裸跑不读粘滞主题会把
 *  dev-intro 课程站静默同步到别的主题的数据层上（审计 bug #52）。
 *  theme.json 损坏 → 打 warn 再回落 dev-intro，绝不静默换主题（审计 bug #54）。 */
export function detectStickyTheme(dataDir, repoRoot, fallback = 'dev-intro') {
  if (process.env.EXAMPLE_THEME) return process.env.EXAMPLE_THEME;
  const themeFile = join(dataDir, 'theme.json');
  if (existsSync(themeFile)) {
    try {
      const t = JSON.parse(readFileSync(themeFile, 'utf-8'));
      if (t.dir && existsSync(t.dir)) return t.dir;          // 外部主题包：粘滞完整路径
      if (t.theme && existsSync(join(repoRoot, 'examples', t.theme))) return t.theme;
    } catch {
      console.warn(`[sync] theme.json 损坏（${themeFile}），已回退 ${fallback}——如非预期请检查该文件`);
    }
  }
  return fallback;
}
