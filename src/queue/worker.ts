import { Worker, Job } from 'bullmq';
import { createRedisConnection, redis } from './connection';
import { OrderPayload } from '../dex/types';
import { fetchQuotes, selectBestQuote, executeOrder } from '../dex/router';
import { wsManager } from '../ws/manager';
import prisma from '../db';

function emitStatus(
    orderId: string,
    status: string,
    extra: Record<string, any> = {}
) {
    wsManager.broadcast({
        orderId,
        status: status as any,
        timestamp: Date.now(),
        ...extra,
    });
}

async function updateOrderStatus(
    orderId: string,
    fromState: string,
    toState: string,
    extra: Record<string, any> = {}
) {
    await prisma.order.update({
        where: { id: orderId },
        data: { status: toState, ...extra },
    });

    await prisma.statusTransition.create({
        data: {
            orderId,
            fromState,
            toState,
        },
    });
}

async function processOrder(job: Job<OrderPayload>): Promise<void> {
    const order = job.data;
    console.log(`[worker] processing order ${order.orderId}, attempt ${job.attemptsMade + 1}`);

    let currentStatus = 'pending';

    try {
        // routing
        emitStatus(order.orderId, 'routing');
        await updateOrderStatus(order.orderId, currentStatus, 'routing');
        currentStatus = 'routing';

        const quotes = await fetchQuotes(order.pair);
        const bestQuote = selectBestQuote(quotes, order.side);

        // building
        emitStatus(order.orderId, 'building', { dex: bestQuote.dex, price: bestQuote.price });
        await updateOrderStatus(order.orderId, currentStatus, 'building', { dex: bestQuote.dex });
        currentStatus = 'building';

        // submitted
        emitStatus(order.orderId, 'submitted');
        await updateOrderStatus(order.orderId, currentStatus, 'submitted');
        currentStatus = 'submitted';

        // execute
        const result = await executeOrder(order, bestQuote);

        if (result.success) {
            emitStatus(order.orderId, 'confirmed', {
                txHash: result.txHash,
                price: result.executedPrice,
            });
            await updateOrderStatus(order.orderId, currentStatus, 'confirmed', {
                txHash: result.txHash,
                executedPrice: result.executedPrice,
            });

            // Remove from Redis cache - finalized orders should be read from DB
            await redis.del(`order:${order.orderId}`);
            console.log(`[worker] order ${order.orderId} confirmed, removed from cache`);
        } else {
            throw new Error(result.error || 'Execution failed');
        }
    } catch (err: any) {
        console.error(`[worker] order ${order.orderId} failed:`, err.message);

        // only emit failed on final attempt
        if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
            emitStatus(order.orderId, 'failed', { error: err.message });
            await updateOrderStatus(order.orderId, currentStatus, 'failed', {
                error: err.message,
            });

            // Remove from Redis cache - finalized orders should be read from DB
            await redis.del(`order:${order.orderId}`);
            console.log(`[worker] order ${order.orderId} failed, removed from cache`);
        }

        throw err; // re-throw for retry
    }
}

export function createWorker() {
    const worker = new Worker<OrderPayload>('order-execution', processOrder, {
        connection: createRedisConnection() as any,
        concurrency: 10,
    });

    worker.on('completed', (job) => {
        console.log(`[worker] job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[worker] job ${job?.id} failed:`, err.message);
    });

    worker.on('error', (err) => {
        console.error('[worker] worker error:', err.message);
    });

    console.log('[worker] started with concurrency 10');
    return worker;
}
