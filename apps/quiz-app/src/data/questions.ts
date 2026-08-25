import type { Question } from '../types';
import raw from './questions.json';

// 题库（构建期由 scripts/sync-examples.mjs 从 examples/<theme>/questions.json 同步而来）。
// 单一事实来源 = examples/<theme>/questions.json，本文件是运行期 import 的入口。
export const questions = raw as unknown as Question[];
