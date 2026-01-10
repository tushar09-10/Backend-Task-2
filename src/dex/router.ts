import { getRaydiumQuote } from './raydium';
import { getMeteoraQuote } from './meteora';
import { Quote, ExecutionResult, OrderPayload } from './types';

function generateTxHash(): string {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) {
        hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
}

export async function fetchQuotes(pair: string): Promise<Quote[]> {
    const [raydium, meteora] = await Promise.all([
        getRaydiumQuote(pair),
        getMeteoraQuote(pair),
    ]);

    console.log(`[router] quotes fetched - raydium: ${raydium.price}, meteora: ${meteora.price}`);

    return [raydium, meteora];
}

export function selectBestQuote(quotes: Quote[], side: 'buy' | 'sell'): Quote {
    // buy = want lowest price, sell = want highest price
    const sorted = [...quotes].sort((a, b) => {
        return side === 'buy' ? a.price - b.price : b.price - a.price;
    });

    const best = sorted[0];
    console.log(`[router] best quote for ${side}: ${best.dex} @ ${best.price}`);

    return best;
}

export async function executeOrder(
    order: OrderPayload,
    quote: Quote
): Promise<ExecutionResult> {
    console.log(`[router] executing on ${quote.dex} for order ${order.orderId}`);

    // simulate execution delay (2-3 seconds)
    const execDelay = 2000 + Math.random() * 1000;
    await new Promise((resolve) => setTimeout(resolve, execDelay));

    // apply slippage (small random variance from quote)
    const slippageAmount = quote.price * (Math.random() * 0.005); // up to 0.5%
    const finalPrice = order.side === 'buy'
        ? quote.price + slippageAmount
        : quote.price - slippageAmount;

    // check slippage tolerance
    const priceChange = Math.abs(finalPrice - quote.price) / quote.price;
    if (priceChange > order.slippageTolerance) {
        console.log(`[router] slippage exceeded: ${(priceChange * 100).toFixed(2)}% > ${(order.slippageTolerance * 100).toFixed(2)}%`);
        return {
            success: false,
            error: `Slippage exceeded: ${(priceChange * 100).toFixed(2)}%`,
        };
    }

    // 5% chance of random failure for realism
    if (Math.random() < 0.05) {
        console.log(`[router] execution failed for order ${order.orderId}`);
        return {
            success: false,
            error: 'Transaction simulation failed',
        };
    }

    const txHash = generateTxHash();
    console.log(`[router] order ${order.orderId} executed: ${txHash}`);

    return {
        success: true,
        txHash,
        executedPrice: Number(finalPrice.toFixed(4)),
    };
}

export { Quote, ExecutionResult, OrderPayload };
