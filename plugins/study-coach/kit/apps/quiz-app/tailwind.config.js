/** 设计 token 系统：全站字体 / 阴影档 / 动画的唯一权威源。
 *  语义色 token（bg-surface / text-primary / …）指向 CSS 变量，在 index.css 的
 *  :root 和 .dark 下分别赋值，切夜间模式只需 html.classList.toggle('dark')。 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          app: 'rgb(var(--color-bg-app) / <alpha-value>)',         // 页面底色
          surface: 'rgb(var(--color-bg-surface) / <alpha-value>)', // 卡片/浮层
          subtle: 'rgb(var(--color-bg-subtle) / <alpha-value>)',   // 次级面板/折叠区底色
          hover: 'rgb(var(--color-bg-hover) / <alpha-value>)',     // hover 态
        },
        text: {
          primary: 'rgb(var(--color-text-primary) / <alpha-value>)',   // 标题/正文主色
          secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)', // 次级文字
          muted: 'rgb(var(--color-text-muted) / <alpha-value>)',       // 辅助/说明文字
          faint: 'rgb(var(--color-text-faint) / <alpha-value>)',       // 最弱（占位/图标）
          accent: 'rgb(var(--color-text-accent) / <alpha-value>)',     // 强调色（靛蓝）
        },
        border: {
          DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
          strong: 'rgb(var(--color-border-strong) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      // 三档阴影：soft（轻提示）/ card（卡片）/ pop（弹层、主操作悬浮）
      boxShadow: {
        soft: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        card: '0 2px 8px -2px rgb(0 0 0 / 0.08), 0 1px 3px 0 rgb(0 0 0 / 0.04)',
        pop: '0 8px 24px -4px rgb(0 0 0 / 0.12), 0 2px 6px -2px rgb(0 0 0 / 0.06)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(.96)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        // Anki 风格换卡：轻微的右进左出感，强化"翻到下一张"的认知
        'card-next': {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        // 答案区翻出：从下方淡入，模拟"翻面"
        'flip-in': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(.98)' },
          '60%': { opacity: '1' },
          '100%': { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'fade-in': 'fade-in .2s ease-out',
        'scale-in': 'scale-in .15s ease-out',
        'card-next': 'card-next .22s ease-out',
        'flip-in': 'flip-in .25s ease-out',
      },
    },
  },
  plugins: [],
};
