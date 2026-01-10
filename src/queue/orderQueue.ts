import { Queue } from 'bullmq';
import { createRedisConnection } from './connection';
import { OrderPayload } from '../dex/types';

const connection = createRedisConnection() as any;

export const orderQueue = new Queue<OrderPayload>('order-execution', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000, // 1s, 2s, 4s
        },
        removeOnComplete: 100,
        removeOnFail: 50,
    },
});

orderQueue.on('error', (err) => {
    console.error('[queue] error:', err.message);
});

export async function addOrderToQueue(order: OrderPayload): Promise<string> {
    const job = await orderQueue.add('execute', order, {
        jobId: order.orderId,
    });
    console.log(`[queue] order ${order.orderId} added to queue`);
    return job.id!;
}
