export interface Quote {
    dex: 'raydium' | 'meteora';
    price: number;
    liquidity: number;
    timestamp: number;
}

export interface ExecutionResult {
    success: boolean;
    txHash?: string;
    executedPrice?: number;
    error?: string;
}

export interface OrderPayload {
    orderId: string;
    pair: string;
    side: 'buy' | 'sell';
    amount: number;
    slippageTolerance: number;
}
