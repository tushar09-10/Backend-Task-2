import { WebSocket } from 'ws';

type OrderStatus = 'pending' | 'routing' | 'building' | 'submitted' | 'confirmed' | 'failed';

interface StatusEvent {
    orderId: string;
    status: OrderStatus;
    timestamp: number;
    txHash?: string;
    error?: string;
    dex?: string;
    price?: number;
}

class WebSocketManager {
    private connections: Map<string, WebSocket> = new Map();

    register(orderId: string, ws: WebSocket): void {
        this.connections.set(orderId, ws);
        console.log(`[ws] registered connection for order ${orderId}`);

        ws.on('close', () => {
            this.connections.delete(orderId);
            console.log(`[ws] connection closed for order ${orderId}`);
        });
    }

    send(orderId: string, event: StatusEvent): void {
        const ws = this.connections.get(orderId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(event));
            console.log(`[ws] sent ${event.status} to order ${orderId}`);
        }
    }

    broadcast(event: StatusEvent): void {
        this.send(event.orderId, event);
    }

    isConnected(orderId: string): boolean {
        const ws = this.connections.get(orderId);
        return ws !== undefined && ws.readyState === WebSocket.OPEN;
    }

    close(orderId: string): void {
        const ws = this.connections.get(orderId);
        if (ws) {
            ws.close();
            this.connections.delete(orderId);
        }
    }

    getConnectionCount(): number {
        return this.connections.size;
    }
}

export const wsManager = new WebSocketManager();
export { StatusEvent, OrderStatus };
