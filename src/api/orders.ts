import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createOrder, getOrder, getOrderHistory } from '../services/orderService';

const executeOrderSchema = z.object({
    pair: z.string().min(3),
    side: z.enum(['buy', 'sell']),
    amount: z.number().positive(),
    slippageTolerance: z.number().min(0.001).max(0.5).optional(),
});

export async function orderRoutes(fastify: FastifyInstance) {
    fastify.post('/api/orders/execute', async (request, reply) => {
        try {
            const body = executeOrderSchema.parse(request.body);
            const order = await createOrder(body);

            return reply.status(201).send({
                orderId: order.id,
                status: 'pending',
                wsUrl: `/ws/orders/${order.id}`,
                message: 'Order created. Connect to WebSocket for live updates.',
            });
        } catch (err: any) {
            if (err.name === 'ZodError') {
                return reply.status(400).send({
                    error: 'Validation failed',
                    details: err.errors,
                });
            }
            console.error('[api] order creation failed:', err.message);
            return reply.status(500).send({ error: 'Failed to create order' });
        }
    });

    fastify.get('/api/orders/:orderId', async (request, reply) => {
        const { orderId } = request.params as { orderId: string };
        const order = await getOrder(orderId);

        if (!order) {
            return reply.status(404).send({ error: 'Order not found' });
        }

        return order;
    });

    fastify.get('/api/orders', async (request, reply) => {
        const { limit } = request.query as { limit?: string };
        const orders = await getOrderHistory(limit ? parseInt(limit) : 50);
        return orders;
    });

    fastify.get('/api/health', async () => {
        return { status: 'ok', timestamp: Date.now() };
    });
}
