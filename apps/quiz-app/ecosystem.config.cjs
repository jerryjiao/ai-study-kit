// PM2 进程配置：避免 npm script 里 `--` 被拦截导致 args 丢失的问题。
// 用法：pm2 start ecosystem.config.cjs（在 quiz-app/ 目录下）
// deploy:pm2 脚本调用 pm2:restart → pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'quiz-app',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'server/index.ts',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
    },
  ],
};
