import { Quote } from './types';

const BASE_PRICES: Record<string, number> = {
    'SOL/USDC': 98.6,
    'SOL/USDT': 98.5,
    'ETH/USDC': 3452.0,
    'BTC/USDC': 42520.0,
};

function getBasePrice(pair: string): number {
    return BASE_PRICES[pair] || 100.5;
}

function addVariance(price: number): number {
    const variance = 0.02 + Math.random() * 0.03;
    const direction = Math.random() > 0.5 ? 1 : -1;
    return price * (1 + direction * variance);
}

async function simulateLatency(): Promise<void> {
    const delay = 200 + Math.random() * 100;
    await new Promise((resolve) => setTimeout(resolve, delay));
}

export async function getMeteoraQuote(pair: string): Promise<Quote> {
    await simulateLatency();

    const basePrice = getBasePrice(pair);
    const price = addVariance(basePrice);

    return {
        dex: 'meteora',
        price: Number(price.toFixed(4)),
        liquidity: 40000 + Math.random() * 80000,
        timestamp: Date.now(),
    };
}
