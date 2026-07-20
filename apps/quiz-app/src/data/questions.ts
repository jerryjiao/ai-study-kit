import type { Question } from '../types';
import raw from './questions.json';

// 题库（构建期由 scripts/merge.mjs 生成 questions.json）。统一类型，供页面 import。
export const questions = raw as Question[];
