require('dotenv').config();
const Redis = require('ioredis');
const { createClient } = require('redis');

function getRedisTarget() {
  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
  };
}

function withOptionalAuth(options) {
  if (process.env.REDIS_PASSWORD) {
    options.password = process.env.REDIS_PASSWORD;
  }
  if (process.env.REDIS_USERNAME) {
    options.username = process.env.REDIS_USERNAME;
  }
  return options;
}

function getIoredisOptions() {
  return withOptionalAuth({
    ...getRedisTarget(),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    enableOfflineQueue: true,
    connectTimeout: 10000,
    retryStrategy(times) {
      return Math.min(times * 50, 2000);
    },
  });
}

function createIoredisClient(label) {
  const client = new Redis(getIoredisOptions());

  client.on('error', (err) => {
    console.error(`${label}:`, err.message);
  });

  client.on('close', () => {
    console.warn(`${label}: conexão fechada, reconectando`);
  });

  return client;
}

function createSessionRedisClient() {
  const { host, port } = getRedisTarget();

  const client = createClient(
    withOptionalAuth({
      socket: {
        host,
        port,
        connectTimeout: 10000,
        keepAlive: 5000,
        reconnectStrategy(retries) {
          return Math.min(retries * 50, 2000);
        },
      },
      pingInterval: 10000,
    })
  );

  client.on('error', (err) => {
    console.error('Redis sessão:', err.message);
  });

  client.on('reconnecting', () => {
    console.warn('Redis sessão: reconectando...');
  });

  client.on('ready', () => {
    console.log('Redis sessão: conectado');
  });

  return client;
}

module.exports = {
  getIoredisOptions,
  createIoredisClient,
  createSessionRedisClient,
};
