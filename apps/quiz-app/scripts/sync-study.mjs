// 把 study/<course>/ 课程小站同步到 quiz-app/public/study/<course>/，
// 供答题站通过 /study/<course> 路径静态托管（vite 原样打入 dist，相对路径完整保留）。
// teach skill 持续往 study/<course>/ 产出课程；每次 build 前跑此脚本即可同步。
//
// 用法：node quiz-app/scripts/sync-study.mjs
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');

// 课程源目录清单：study/<name>/ → public/study/<name>/
const COURSES = ['ba', 'networking'];

mkdirSync(join(__dirname, '..', 'public', 'study'), { recursive: true });

for (const name of COURSES) {
  const src = join(repoRoot, 'study', name);
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
