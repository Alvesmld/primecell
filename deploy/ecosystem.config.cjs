/** PM2 — uso: pm2 start deploy/ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: 'primecell',
      cwd: './server',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        CLIENT_DIST_PATH: '../client/dist',
      },
    },
  ],
};
