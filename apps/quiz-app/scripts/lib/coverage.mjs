// coverage.mjs — 考点覆盖快照（内容无关，web「讲过」信号的上站通道）。
//
// 隐私边界：study/records/ 的学习记录是学习者私有（个人叙述：金句、错点原文），
// 永不上站；web 首页面板需要的只是「哪些考点被讲过 / 口头练了几次」。本模块把全景
// 压成**只含考点 id、三信号布尔、计数**的快照——不含任何叙述文字（有专门的内容断言
// 测试盯住这条边界）。快照由 sync-examples 在 build 时写 src/data/coverage.json（同步产物），
// 面板新鲜度 = 上次 build；聊天层（mastery-report --panorama）永远现算最新。
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseSessionRecord } from './records.mjs';

/** 快照允许的字段白名单——内容断言测试之外的形状兜底（新增字段必须过「无个人叙述」评审）。 */
const POINT_KEYS = ['ep', 'taught', 'practiced', 'mastered', 'oral'];
const ORAL_KEYS = ['asked', 'correct'];

/**
 * 全景（buildPanorama 输出）→ 内容无关覆盖快照（纯函数）。
 * 只保留 id/布尔/计数；剥掉 name（web 从 theme.json examPoints 取显示名）与一切叙述性字段。
 * @param {object} panorama buildPanorama 的输出
 * @returns {{generatedAt: string, courseTaughtAll: boolean, points: Array}}
 */
export function buildCoverageSnapshot(panorama) {
  return {
    generatedAt: new Date().toISOString(),
    courseTaughtAll: !!panorama.courseTaughtAll,
    points: (panorama.groups ?? []).flatMap((g) => (g.points ?? []).map((p) => {
      const out = {
        ep: p.ep,
        taught: !!p.taught,
        practiced: !!p.practiced,
        mastered: !!p.mastered,
        oral: p.oral ? { asked: p.oral.asked, correct: p.oral.correct } : null,
      };
      for (const k of Object.keys(out)) if (!POINT_KEYS.includes(k)) delete out[k];
      if (out.oral) for (const k of Object.keys(out.oral)) if (!ORAL_KEYS.includes(k)) delete out.oral[k];
      return out;
    })),
  };
}

/** 读契约二学习记录（现行 study/records/ + 旧布局 learning-records/），坏文件跳过不拖垮。 */
export function readSessionRecords(themeDir) {
  const records = [];
  for (const dir of ['study/records', 'learning-records']) {
    const recDir = join(themeDir, dir);
    if (!existsSync(recDir)) continue;
    for (const f of readdirSync(recDir).filter((x) => x.endsWith('.md')).sort()) {
      try { records.push(parseSessionRecord(readFileSync(join(recDir, f), 'utf-8'))); } catch { /* 单文件坏不拖垮 */ }
    }
  }
  return records;
}

/** 课已学完状态（显式确认制，与 progress.ts isCourseRead / state.md §3 同口径）。 */
export function lessonsReadState(themeDir, themeName, progress) {
  const lessonsDir = join(themeDir, 'lessons');
  const lessonFiles = existsSync(lessonsDir) ? readdirSync(lessonsDir).filter((f) => f.endsWith('.html')) : [];
  const lessonsDone = lessonFiles.filter((f) => {
    const seen = (progress?.coursesRead || {})[`${themeName}/${f}`];
    if (seen === undefined) return false;
    const tomb = (progress?.coursesReadTombstones || {})[`${themeName}/${f}`];
    return tomb === undefined ? true : seen > tomb;
  }).length;
  return { lessonsTotal: lessonFiles.length, lessonsDone };
}
