module.exports = {
    apps: [
        {
            name: 'arihant-server',
            cwd: '/var/www/arihant/server',
            script: 'index.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            env: {
                NODE_ENV: 'production',
                PORT: 5001,
            },
        },
    ],
};
