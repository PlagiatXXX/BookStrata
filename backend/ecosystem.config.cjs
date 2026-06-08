// PM2 Ecosystem config — BookStrata Backend
// https://pm2.keymetrics.io/docs/usage/application-declaration/
//
// Запуск:
//   pm2 start ecosystem.config.cjs
//
// Сохранить автостарт:
//   pm2 startup   (выполнить что скажет)
//   pm2 save
//
// Мониторинг:
//   pm2 monit              — в реальном времени
//   pm2 logs               — логи
//   pm2 status             — статус процессов
//
// Zero-downtime reload:
//   pm2 reload ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: "bookstrata-api",
      script: "dist/server.js",
      cwd: __dirname,

      // Количество инстансов = число ядер CPU
      instances: 1,
      exec_mode: "fork",

      // Окружение
      env: {
        NODE_ENV: "production",
      },

      // Логи
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/var/log/bookstrata/error.log",
      out_file: "/var/log/bookstrata/out.log",
      merge_logs: true,

      // Поведение
      max_memory_restart: "500M",    // перезапуск при >500MB памяти
      max_restarts: 10,              // макс рестартов за 60с
      restart_delay: 3000,           // пауза между рестартами
      kill_timeout: 10000,           // ждём 10с до SIGKILL
      watch: false,                   // не следим за файлами (production)

      // Graceful shutdown
      kill_signal: "SIGTERM",
      shutdown_with_message: true,
    },
  ],
};
