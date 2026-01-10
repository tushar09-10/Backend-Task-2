import { FastifyInstance } from 'fastify';
import { wsManager } from './manager';

export async function wsRoutes(fastify: FastifyInstance) {
    fastify.get('/ws/orders/:orderId', { websocket: true }, (socket, request) => {
        const { orderId } = request.params as { orderId: string };

        console.log(`[ws] client connected for order ${orderId}`);

        wsManager.register(orderId, socket);

        // send initial ack
        socket.send(JSON.stringify({
            type: 'connected',
            orderId,
            message: 'Listening for order updates',
        }));

        socket.on('message', (data) => {
            // ping/pong for connection health
            const msg = data.toString();
            if (msg === 'ping') {
                socket.send('pong');
            }
        });

        socket.on('error', (err) => {
            console.error(`[ws] error for order ${orderId}:`, err.message);
        });
    });
}
