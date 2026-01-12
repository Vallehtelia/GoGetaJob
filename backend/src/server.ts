import { buildApp } from './app.js';
import { config } from './config/index.js';

async function start() {
  try {
    const app = await buildApp();

    await app.listen({
      port: config.app.port,
      host: config.app.host,
    });

    app.log.info(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║         🚀 GoGetaJob (GGJ) Backend API           ║
║                                                   ║
║  Environment: ${config.app.env.padEnd(35)} ║
║  Server:      http://${config.app.host}:${config.app.port.toString().padEnd(27)} ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
    `);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

start();


