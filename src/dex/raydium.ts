import { Quote } from './types';

const BASE_PRICES: Record<string, number> = {
    'SOL/USDC': 98.5,
    'SOL/USDT': 98.4,
    'ETH/USDC': 3450.0,
    'BTC/USDC': 42500.0,
};

function getBasePrice(pair: string): number {
    return BASE_PRICES[pair] || 100;
}

function addVariance(price: number): number {
    // 2-5% variance
    const variance = 0.02 + Math.random() * 0.03;
    const direction = Math.random() > 0.5 ? 1 : -1;
    return price * (1 + direction * variance);
}

async function simulateLatency(): Promise<void> {
    const delay = 200 + Math.random() * 100; // 200-300ms
    await new Promise((resolve) => setTimeout(resolve, delay));
}

export async function getRaydiumQuote(pair: string): Promise<Quote> {
    await simulateLatency();

    const basePrice = getBasePrice(pair);
    const price = addVariance(basePrice);

    return {
        dex: 'raydium',
        price: Number(price.toFixed(4)),
        liquidity: 50000 + Math.random() * 100000,
        timestamp: Date.now(),
    };
}
