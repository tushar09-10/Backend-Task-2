import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { execSync } from 'child_process';
import { orderRoutes } from './api/orders';
import { wsRoutes } from './ws/handler';
import { createWorker } from './queue/worker';
import prisma from './db';

const PORT = parseInt(process.env.PORT || '3000');

async function main() {
    // Run migrations at runtime in production (Railway recommended approach)
    if (process.env.NODE_ENV === 'production') {
        console.log('Running database migrations...');
        execSync('npx prisma db push', { stdio: 'inherit' });
        console.log('Migrations complete.');
    }

    const fastify = Fastify({
        logger: {
            level: 'info',
            transport: process.env.NODE_ENV !== 'production' ? {
                target: 'pino-pretty',
                options: { colorize: true },
            } : undefined,
        },
    });

    await fastify.register(cors, {
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    });

    await fastify.register(websocket);
    await fastify.register(orderRoutes);
    await fastify.register(wsRoutes);

    // start queue worker
    createWorker();

    // graceful shutdown
    const shutdown = async () => {
        console.log('shutting down...');
        await fastify.close();
        await prisma.$disconnect();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    try {
        await fastify.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`server running on port ${PORT}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

main();
