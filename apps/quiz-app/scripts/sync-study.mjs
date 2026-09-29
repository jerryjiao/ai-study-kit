// 把 examples/<course>/ 课程小站同步到 quiz-app/public/study/<course>/，
// 供答题站通过 /study/<course> 路径静态托管（vite 原样打入 dist，相对路径完整保留）。
// teach skill 持续往 examples/<course>/ 产出课程；每次 build 前跑此脚本即可同步。
// 学习者私有数据（study/records/、根级 learning-records/、根级 plan.json）只留本地，不同步（见 LOCAL_ONLY_DIRS / LOCAL_ONLY_FILES）。
//
// v0.25 票④「课程令牌同源」：拷贝后用设计令牌（src/index.css 单源）重新生成
// assets/styles.css 覆盖 public/study 副本——teach 产物零内联样式、只链该文件，
// 重跑 sync 即整体换肤（存量主题含外部主题包零改 HTML、零重产课）。生成失败
// （令牌缺失/源文件异常）时保留主题自带样式并打 warn，不中断同步。
//
// 用法：node apps/quiz-app/scripts/sync-study.mjs
//       EXAMPLE_THEME=my-topic node apps/quiz-app/scripts/sync-study.mjs
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveThemeDir, detectStickyTheme } from './lib/theme-path.mjs';
import { parseDesignTokens, buildCourseStyles } from './lib/course-theme.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');

// 隐私边界：进度档案是学习者私有数据（个人学习痕迹、待办、错因自述），只留本地，
// 永不随静态站发布。按主题包内相对路径匹配，任意主题通用：
//   study/records/     study/ 伞目录下的进度档案（现行布局）
//   learning-records/  根级旧布局兼容目录
//   .mimosa/           本地安全扫描工具落进主题包的状态目录（含会话/作者标识），非课程资产
// 注意 relPath 以主题包根为基准，故 learning-records 只匹配根级，不影响深层同名目录。
const LOCAL_ONLY_DIRS = new Set(['study/records', 'learning-records', '.mimosa']);

// 文件级排除（同一隐私边界，#97 裁决 2026-09-28）：plan.json 含 F10 写回的执行痕迹
// （status/doneDate——哪天开学/学完/搁置），是学习痕迹不是课程资产。站点 UI 消费的是
// build 时 sync-examples 产的 src/data 那份，public/study/ 这里无任何消费端，剔除零功能影响。
// relPath 按主题包根基准，'plan.json' 只匹配根级文件（嵌套同名不误伤）。
const LOCAL_ONLY_FILES = new Set(['plan.json']);

// 逐文件复制替代 cpSync 递归：部分 Windows/受限环境下 cpSync 目录级递归会被
// 安全策略直接终止进程（exit 127 无输出）；逐文件 copyFileSync 实测可正常通过。
// rel 为当前目录相对主题包根的路径（''=根），用于 LOCAL_ONLY_DIRS 匹配。
function copyTree(src, dest, rel = '') {
  mkdirSync(dest, { recursive: true });
  for (const e of readdirSync(src, { withFileTypes: true })) {
    const relPath = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (LOCAL_ONLY_DIRS.has(relPath)) {
        console.log(`[sync-study] 跳过本地目录（学习者私有数据，不上站）：${relPath}`);
        continue;
      }
      copyTree(join(src, e.name), join(dest, e.name), relPath);
    } else {
      if (LOCAL_ONLY_FILES.has(relPath)) {
        console.log(`[sync-study] 跳过本地文件（学习者私有数据，不上站）：${relPath}`);
        continue;
      }
      copyFileSync(join(src, e.name), join(dest, e.name));
    }
  }
}

// 课程源目录 → public/study/<name>/：仓库内 examples/<theme>/，或外部主题包路径
// （EXAMPLE_THEME 含路径分隔符即外部形态，见 lib/theme-path.mjs；name 取 basename，URL 不变）。
// 主题解析走 detectStickyTheme（EXAMPLE_THEME > .theme-state.json/theme.json 粘滞 > dev-intro）——与 sync-examples
// 同一口径：裸跑不读粘滞主题会把 dev-intro 课程站静默同步到别的主题的数据层上（审计 bug #52）。
const THEME_RAW = detectStickyTheme(join(__dirname, '..', 'src', 'data'), repoRoot);
const COURSES = [resolveThemeDir(THEME_RAW, repoRoot)];

mkdirSync(join(__dirname, '..', 'public', 'study'), { recursive: true });

for (const { dir: src, name, external } of COURSES) {
  const dest = join(__dirname, '..', 'public', 'study', name);

  if (!existsSync(src)) {
    console.warn(`[sync-study] 源目录不存在：${src}（尚未创建课程？跳过）`);
    continue;
  }
  if (external) console.log(`[sync-study] 外部主题包：${src} → public/study/${name}/`);

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
  copyTree(src, dest);

  // 令牌同源换肤（v0.25 票④）：public/study 副本的 assets/styles.css 用设计令牌
  // 重新生成——与答题站 Tailwind 同一份单源（src/index.css），明暗经 html.dark 切换。
  // 主题源目录（含外部主题包）零改动；文件不存在则创建（缺样式表的存量主题直接补齐）。
  const APP_ROOT = join(__dirname, '..');
  try {
    const tokens = parseDesignTokens(readFileSync(join(APP_ROOT, 'src', 'index.css'), 'utf-8'));
    // 先建父目录：手写/外部主题可能整个没有 assets/ 目录（无目录时 writeFileSync 会 ENOENT，
    // 兜底 warn 会让「缺样式表的存量主题直接补齐」的承诺落空）
    mkdirSync(join(dest, 'assets'), { recursive: true });
    writeFileSync(join(dest, 'assets', 'styles.css'), buildCourseStyles(tokens), 'utf-8');
    console.log(`[sync-study] 课程样式表已按设计令牌重生 → public/study/${name}/assets/styles.css`);
  } catch (e) {
    console.warn(`[sync-study] 课程样式表生成失败，保留主题自带样式（${e.message}）`);
  }

  console.log(`[sync-study] 已同步课程 → public/study/${name}/`);
}
