import IORedis, { RedisOptions } from 'ioredis';

function getRedisConfig(): RedisOptions {
    // Option 1: Full URL (Railway Redis)
    if (process.env.REDIS_URL) {
        return {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
        };
    }

    // Option 2: Individual params (Redis Cloud)
    if (!process.env.REDIS_HOST || !process.env.REDIS_PASSWORD) {
        throw new Error('REDIS_HOST and REDIS_PASSWORD are required when REDIS_URL is not set');
    }

    return {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
        username: process.env.REDIS_USERNAME || 'default',
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
    };
}

function createConnection() {
    const config = getRedisConfig();
    if (process.env.REDIS_URL) {
        return new IORedis(process.env.REDIS_URL, config);
    }
    return new IORedis(config);
}

export const redis = createConnection();

redis.on('error', (err) => {
    console.error('redis connection error:', err.message);
});

redis.on('connect', () => {
    console.log('redis connected');
});

export function createRedisConnection() {
    return createConnection();
}

