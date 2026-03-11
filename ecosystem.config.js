module.exports = {
  apps: [
    {
      name: "cashive",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/root/cashive",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Restart policy
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 5000,
      // Logging
      error_file: "/root/cashive/logs/pm2-error.log",
      out_file: "/root/cashive/logs/pm2-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      // Memory limit — restart if exceeded
      max_memory_restart: "512M",
    },
  ],
};
