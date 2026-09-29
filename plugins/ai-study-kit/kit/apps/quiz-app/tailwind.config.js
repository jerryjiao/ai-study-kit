/** 设计 token 系统：全站字体 / 阴影档 / 动画的唯一权威源。
 *  语义色 token（bg-surface / text-primary / …）与状态色族（st-green / st-gold / …）
 *  指向 CSS 变量，在 index.css 的 :root 和 .dark 下分别赋值，
 *  切夜间模式只需 html.classList.toggle('dark')。 */
export default {
  // src/data/*.json：theme-config.json 的 topicStyles 里写着工具类名，
  // 不进 content 扫描就不会生成对应 CSS（json 不在 ts/tsx 通配内）
  content: ['./index.html', './src/**/*.{ts,tsx}', './src/data/*.json'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 状态色族（v0.25 票①，spec #110）：绿=完成/推进、金=当前、红=错题、蓝=次级/选中。
        // 值全部来自 index.css 的 --st-* 令牌（单源，明/暗各一套，色号见彼处注释）。
        st: {
          green: {
            DEFAULT: 'rgb(var(--st-green) / <alpha-value>)',
            dark: 'rgb(var(--st-green-dark) / <alpha-value>)',
            soft: 'rgb(var(--st-green-soft) / <alpha-value>)',
            ink: 'rgb(var(--st-green-ink) / <alpha-value>)',
            low: 'rgb(var(--st-green-low) / <alpha-value>)',
            'low-dark': 'rgb(var(--st-green-low-dark) / <alpha-value>)',
          },
          blue: {
            DEFAULT: 'rgb(var(--st-blue) / <alpha-value>)',
            dark: 'rgb(var(--st-blue-dark) / <alpha-value>)',
            soft: 'rgb(var(--st-blue-soft) / <alpha-value>)',
            ink: 'rgb(var(--st-blue-ink) / <alpha-value>)',
          },
          gold: {
            DEFAULT: 'rgb(var(--st-gold) / <alpha-value>)',
            dark: 'rgb(var(--st-gold-dark) / <alpha-value>)',
            border: 'rgb(var(--st-gold-border) / <alpha-value>)',
            soft: 'rgb(var(--st-gold-soft) / <alpha-value>)',
            ink: 'rgb(var(--st-gold-ink) / <alpha-value>)',
          },
          red: {
            DEFAULT: 'rgb(var(--st-red) / <alpha-value>)',
            dark: 'rgb(var(--st-red-dark) / <alpha-value>)',
            soft: 'rgb(var(--st-red-soft) / <alpha-value>)',
            border: 'rgb(var(--st-red-border) / <alpha-value>)',
            ink: 'rgb(var(--st-red-ink) / <alpha-value>)',
          },
          track: 'rgb(var(--st-track) / <alpha-value>)',
        },
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
        // v0.25 组件基元的立体阴影（原型：卡 0 3px 0 line；按钮 0 5px 0 深一档色边）
        'card-3d': '0 3px 0 rgb(var(--color-border))',
        'btn-green': '0 5px 0 rgb(var(--st-green-dark))',
        'btn-blue': '0 5px 0 rgb(var(--st-blue-dark))',
        'btn-gold': '0 5px 0 rgb(var(--st-gold-border))',
        'btn-red': '0 5px 0 rgb(var(--st-red-dark))',
        'btn-plain': '0 5px 0 rgb(var(--color-border-strong))',
      },
      // 条纹进度条（原型 .bigbar）：绿主色 + 浅一档绿的 45° 条纹
      backgroundImage: {
        'bar-green':
          'repeating-linear-gradient(45deg, rgb(var(--st-green)) 0 12px, rgb(var(--st-stripe)) 12px 24px)',
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
