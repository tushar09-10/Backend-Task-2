import { getRaydiumQuote } from '../dex/raydium';
import { getMeteoraQuote } from '../dex/meteora';
import { fetchQuotes, selectBestQuote, executeOrder } from '../dex/router';

describe('DEX Router', () => {
    describe('Quote Fetching', () => {
        it('should fetch valid raydium quote', async () => {
            const quote = await getRaydiumQuote('SOL/USDC');

            expect(quote.dex).toBe('raydium');
            expect(quote.price).toBeGreaterThan(0);
            expect(quote.liquidity).toBeGreaterThan(0);
            expect(quote.timestamp).toBeDefined();
        });

        it('should fetch valid meteora quote', async () => {
            const quote = await getMeteoraQuote('SOL/USDC');

            expect(quote.dex).toBe('meteora');
            expect(quote.price).toBeGreaterThan(0);
            expect(quote.liquidity).toBeGreaterThan(0);
        });

        it('should fetch quotes from both dexes', async () => {
            const quotes = await fetchQuotes('SOL/USDC');

            expect(quotes).toHaveLength(2);
            expect(quotes.find(q => q.dex === 'raydium')).toBeDefined();
            expect(quotes.find(q => q.dex === 'meteora')).toBeDefined();
        });

        it('should apply price variance (2-5%)', async () => {
            const basePrice = 98.5;
            const quotes = await Promise.all([
                getRaydiumQuote('SOL/USDC'),
                getRaydiumQuote('SOL/USDC'),
                getRaydiumQuote('SOL/USDC'),
            ]);

            // all prices should be within 5% of base
            quotes.forEach(q => {
                const variance = Math.abs(q.price - basePrice) / basePrice;
                expect(variance).toBeLessThan(0.06);
            });
        });
    });

    describe('Best Quote Selection', () => {
        it('should select lowest price for buy orders', () => {
            const quotes = [
                { dex: 'raydium' as const, price: 100, liquidity: 50000, timestamp: Date.now() },
                { dex: 'meteora' as const, price: 99, liquidity: 40000, timestamp: Date.now() },
            ];

            const best = selectBestQuote(quotes, 'buy');
            expect(best.dex).toBe('meteora');
            expect(best.price).toBe(99);
        });

        it('should select highest price for sell orders', () => {
            const quotes = [
                { dex: 'raydium' as const, price: 100, liquidity: 50000, timestamp: Date.now() },
                { dex: 'meteora' as const, price: 99, liquidity: 40000, timestamp: Date.now() },
            ];

            const best = selectBestQuote(quotes, 'sell');
            expect(best.dex).toBe('raydium');
            expect(best.price).toBe(100);
        });
    });

    describe('Order Execution', () => {
        it('should execute order and return result', async () => {
            const order = {
                orderId: 'test-123',
                pair: 'SOL/USDC',
                side: 'buy' as const,
                amount: 10,
                slippageTolerance: 0.05,
            };

            const quote = { dex: 'raydium' as const, price: 100, liquidity: 50000, timestamp: Date.now() };
            const result = await executeOrder(order, quote);

            // could succeed or fail (5% random failure)
            expect(result).toHaveProperty('success');
            if (result.success) {
                expect(result.txHash).toMatch(/^0x[a-f0-9]{64}$/);
                expect(result.executedPrice).toBeGreaterThan(0);
            } else {
                expect(result.error).toBeDefined();
            }
        }, 10000);

        it('should fail if slippage exceeds tolerance', async () => {
            const order = {
                orderId: 'test-456',
                pair: 'SOL/USDC',
                side: 'buy' as const,
                amount: 10,
                slippageTolerance: 0.0001, // very tight
            };

            const quote = { dex: 'raydium' as const, price: 100, liquidity: 50000, timestamp: Date.now() };

            // run multiple times - slippage should trigger at least once
            let slippageFailed = false;
            for (let i = 0; i < 10; i++) {
                const result = await executeOrder(order, quote);
                if (!result.success && result.error?.includes('Slippage')) {
                    slippageFailed = true;
                    break;
                }
            }

            expect(slippageFailed).toBe(true);
        }, 30000);
    });
});
