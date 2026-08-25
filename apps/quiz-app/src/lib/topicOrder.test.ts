import { describe, it, expect } from 'vitest';
import type { Question } from '../types';
import type { ThemeConfig } from './themeConfig';
import {
  topicLabel,
  stripSubtopicPrefix,
  layerOf,
  isPlanned,
  epDepthOf,
  orderedSubtopics,
  buildAtomicOrder,
  atomicLabel,
} from './topicOrder';

/** 机制测试不依赖"当前同步的是哪个主题"：全部走 cfg 注入。
 *  fixture 覆盖两种形态：空配置（= 无 theme-config.json 主题的回退）与典型主题配置。 */
const EMPTY_CFG: ThemeConfig = {};

const CFG: ThemeConfig = {
  topicLabels: { 'git-basics': 'Git 基础' },
  topicOrder: ['git-basics', 'linux-commands'],
  subtopics: {
    'git-basics': ['git-basics·工作流', 'git-basics·对象一', 'git-basics·对象二', 'git-basics·远端'],
  },
  sourceLabels: { book: '教材' },
  sourceLayers: { book: '核心', drill: '拓展' },
  epDepth: { 工作流: '掌握', 对象: '理解' },
  layerTopics: ['git-basics'],
};

const qs = (topic: string, subtopic: string | undefined, source: string): Question => ({
  id: `${topic}-${subtopic ?? 'all'}-${source}`,
  topic,
  subtopic,
  source,
  type: 'single',
  question: 'q',
  options: { A: 'a', B: 'b' },
  answer: ['A'],
});

describe('topicOrder 无配置回退', () => {
  it('topicLabel：未登记原样返回（含空串，供「未分类」判断）', () => {
    expect(topicLabel('git-basics', EMPTY_CFG)).toBe('git-basics');
    expect(topicLabel('', EMPTY_CFG)).toBe('');
  });
  it('layerOf：无映射返回 null；isPlanned 全部为 true（无层=全计划内）', () => {
    expect(layerOf('book', EMPTY_CFG)).toBeNull();
    expect(isPlanned({ topic: 't', source: 'drill' }, EMPTY_CFG)).toBe(true);
    expect(isPlanned({ topic: 't', source: 'anything' }, EMPTY_CFG)).toBe(true);
  });
  it('orderedSubtopics：无配置不展开（空数组）', () => {
    const list = [qs('git-basics', 'git-basics·工作流', 's')];
    expect(orderedSubtopics('git-basics', list, EMPTY_CFG)).toEqual([]);
  });
  it('buildAtomicOrder：无配置全按字母序、大类整体一条', () => {
    const list = [qs('zoo', undefined, 's'), qs('alpha', undefined, 's'), qs('mid', undefined, 's')];
    expect(buildAtomicOrder(list, EMPTY_CFG).map((a) => a.topic)).toEqual(['alpha', 'mid', 'zoo']);
  });
  it('epDepthOf：无配置无徽标', () => {
    expect(epDepthOf('工作流', EMPTY_CFG)).toBeNull();
  });
});

describe('topicOrder 配置驱动', () => {
  it('topicLabel：登记过的给显示名', () => {
    expect(topicLabel('git-basics', CFG)).toBe('Git 基础');
    expect(topicLabel('linux-commands', CFG)).toBe('linux-commands'); // 未登记原样
  });
  it('layerOf/isPlanned：核心与未登记来源算计划内，拓展不算', () => {
    expect(layerOf('book', CFG)).toBe('核心');
    expect(layerOf('drill', CFG)).toBe('拓展');
    expect(layerOf('unknown', CFG)).toBeNull();
    expect(isPlanned({ topic: 't', source: 'book' }, CFG)).toBe(true);
    expect(isPlanned({ topic: 't', source: 'unknown' }, CFG)).toBe(true);
    expect(isPlanned({ topic: 't', source: 'drill' }, CFG)).toBe(false);
  });
  it('orderedSubtopics：base 深度序 + 同 base 分块按中文序号（一<二），base 表未覆盖的落末尾', () => {
    const list = [
      qs('git-basics', 'git-basics·远端', 's'),
      qs('git-basics', 'git-basics·对象二', 's'),
      qs('git-basics', 'git-basics·工作流', 's'),
      qs('git-basics', 'git-basics·对象一', 's'),
      qs('git-basics', 'git-basics·未知块', 's'),
    ];
    expect(orderedSubtopics('git-basics', list, CFG)).toEqual([
      'git-basics·工作流',
      'git-basics·对象一',
      'git-basics·对象二',
      'git-basics·远端',
      'git-basics·未知块',
    ]);
  });
  it('buildAtomicOrder：按 topicOrder；有子主题的大类逐条、无子主题的整体一条；未列出的大类字母序追加', () => {
    const list = [
      qs('linux-commands', undefined, 's'),
      qs('git-basics', 'git-basics·对象一', 's'),
      qs('git-basics', 'git-basics·对象二', 's'),
      qs('extra', undefined, 's'),
    ];
    expect(buildAtomicOrder(list, CFG)).toEqual([
      { topic: 'git-basics', subtopic: 'git-basics·对象一' },
      { topic: 'git-basics', subtopic: 'git-basics·对象二' },
      { topic: 'linux-commands', subtopic: '' },
      { topic: 'extra', subtopic: '' },
    ]);
  });
  it('epDepthOf：剥分块后缀后按 base 查表（对象一 → 对象 → 理解）', () => {
    expect(epDepthOf('工作流', CFG)).toBe('掌握');
    expect(epDepthOf('对象一', CFG)).toBe('理解');
    expect(epDepthOf('对象二', CFG)).toBe('理解');
    expect(epDepthOf('未登记', CFG)).toBeNull();
  });
});

describe('subtopic 前缀剥离', () => {
  it('stripSubtopicPrefix：剥 · : - 三种前缀，但前缀必须是完整 ASCII 标识符', () => {
    expect(stripSubtopicPrefix('git-basics·工作流')).toBe('工作流');
    expect(stripSubtopicPrefix('git-basics:工作流')).toBe('工作流');
    expect(stripSubtopicPrefix('git-basics-工作流')).toBe('工作流');
    // topic 名自身带连字符时不能误剥：'-' 是 topic 标识符的一部分，必须剥到完整前缀
    expect(stripSubtopicPrefix('linux-commands·文件权限')).toBe('文件权限');
    expect(stripSubtopicPrefix('无前缀')).toBe('无前缀');
  });
  it('atomicLabel：无子主题用大类名（原样 topic id，不套 topicLabel——调用方自己决定）', () => {
    expect(atomicLabel('git-basics', '')).toBe('git-basics');
    expect(atomicLabel('git-basics', 'git-basics·工作流')).toBe('工作流');
  });
});
