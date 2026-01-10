import { wsManager } from '../ws/manager';
import { WebSocket } from 'ws';

describe('WebSocket Manager', () => {
    beforeEach(() => {
        (wsManager as any).connections.clear();
    });

    function createMockWs(readyState = 1) {
        return {
            readyState,
            send: jest.fn(),
            on: jest.fn(),
            close: jest.fn(),
        } as unknown as WebSocket;
    }

    it('should register a connection', () => {
        const mockWs = createMockWs();
        wsManager.register('order-1', mockWs);
        expect(wsManager.isConnected('order-1')).toBe(true);
        expect(wsManager.getConnectionCount()).toBe(1);
    });

    it('should send message to connected client', () => {
        const mockWs = createMockWs();
        wsManager.register('order-2', mockWs);
        wsManager.send('order-2', {
            orderId: 'order-2',
            status: 'pending',
            timestamp: Date.now(),
        });
        expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('pending'));
    });

    it('should not send to disconnected client', () => {
        const mockWs = createMockWs(3); // CLOSED
        wsManager.register('order-3', mockWs);
        wsManager.send('order-3', {
            orderId: 'order-3',
            status: 'pending',
            timestamp: Date.now(),
        });
        expect(mockWs.send).not.toHaveBeenCalled();
    });

    it('should close connection', () => {
        const mockWs = createMockWs();
        wsManager.register('order-4', mockWs);
        wsManager.close('order-4');
        expect(mockWs.close).toHaveBeenCalled();
        expect(wsManager.isConnected('order-4')).toBe(false);
    });

    it('should handle multiple connections', () => {
        const mockWs1 = createMockWs();
        const mockWs2 = createMockWs();
        wsManager.register('order-5', mockWs1);
        wsManager.register('order-6', mockWs2);
        expect(wsManager.getConnectionCount()).toBe(2);
        expect(wsManager.isConnected('order-5')).toBe(true);
        expect(wsManager.isConnected('order-6')).toBe(true);
    });
});
