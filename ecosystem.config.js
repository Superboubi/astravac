module.exports = {
  apps: [
    {
      name: 'astravac',
      script: './start.sh',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOSTNAME: '0.0.0.0',
      },
    },
  ],
}
