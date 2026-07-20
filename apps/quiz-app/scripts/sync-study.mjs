// 把 examples/<course>/ 课程小站同步到 quiz-app/public/study/<course>/，
// 供答题站通过 /study/<course> 路径静态托管（vite 原样打入 dist，相对路径完整保留）。
// teach skill 持续往 examples/<course>/ 产出课程；每次 build 前跑此脚本即可同步。
//
// 用法：node apps/quiz-app/scripts/sync-study.mjs
//       EXAMPLE_THEME=my-topic node apps/quiz-app/scripts/sync-study.mjs
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');

// 课程源目录：examples/<theme>/ → public/study/<theme>/
// 切换主题：改 EXAMPLE_THEME 环境变量。多个主题可放进数组（如 ['dev-intro', 'k8s-basics']）。
const EXAMPLE_THEME = process.env.EXAMPLE_THEME || 'dev-intro';
const COURSES = [EXAMPLE_THEME];

mkdirSync(join(__dirname, '..', 'public', 'study'), { recursive: true });

for (const name of COURSES) {
  const src = join(repoRoot, 'examples', name);
  const dest = join(__dirname, '..', 'public', 'study', name);

  if (!existsSync(src)) {
    console.warn(`[sync-study] 源目录不存在：${src}（尚未创建课程？跳过）`);
    continue;
  }

  // 清空旧 dest 再拷（删除已移除的文件）。
  // Windows 上目录被占用时 rmSync 会 EPERM，此时降级为 cpSync 覆盖（不删旧文件，
  // 新内容会覆盖同名文件；仅遗留已删除文件的旧副本，不影响功能）。
  if (existsSync(dest)) {
    try {
      rmSync(dest, { recursive: true, force: true });
    } catch (e) {
      if (e.code === 'EPERM' || e.code === 'ENOTEMPTY') {
        console.warn(`[sync-study] ${dest} 被占用，降级为覆盖模式（旧文件可能残留）`);
      } else {
        throw e;
      }
    }
  }
  cpSync(src, dest, { recursive: true });
  console.log(`[sync-study] 已同步课程 → public/study/${name}/`);
}
