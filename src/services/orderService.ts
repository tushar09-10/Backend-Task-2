import prisma from '../db';
import { addOrderToQueue } from '../queue/orderQueue';
import { redis } from '../queue/connection';

interface CreateOrderInput {
    pair: string;
    side: 'buy' | 'sell';
    amount: number;
    slippageTolerance?: number;
}

export async function createOrder(input: CreateOrderInput) {
    const { pair, side, amount, slippageTolerance = 0.01 } = input;

    const order = await prisma.order.create({
        data: {
            pair,
            side,
            amount,
            slippage: slippageTolerance,
            status: 'pending',
        },
    });

    // store in redis for quick lookup
    await redis.setex(`order:${order.id}`, 3600, JSON.stringify({
        id: order.id,
        pair,
        side,
        amount,
        status: 'pending',
    }));

    // add to queue
    await addOrderToQueue({
        orderId: order.id,
        pair,
        side,
        amount: Number(amount),
        slippageTolerance,
    });

    console.log(`[service] order created: ${order.id}`);
    return order;
}

export async function getOrder(orderId: string) {
    // try redis first
    const cached = await redis.get(`order:${orderId}`);
    if (cached) {
        return JSON.parse(cached);
    }

    // fallback to db
    return prisma.order.findUnique({
        where: { id: orderId },
        include: { transitions: true },
    });
}

export async function getOrderHistory(limit = 50) {
    return prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { transitions: true },
    });
}
