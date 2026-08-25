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
import { existsSync } from 'node:fs';
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
