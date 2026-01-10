# Order Execution Engine

A production-ready order execution engine with mock DEX routing, queue-based processing, and real-time WebSocket updates.

## 🚀 Live Demo

**Deployed URL:** `https://order-engine.up.railway.app`

## Architecture

```
Client → POST /api/orders/execute → Fastify → BullMQ Queue
                                       ↓
                                  WebSocket ← Worker → DEX Router
                                       ↓           ↓
                                  Live Updates   Raydium/Meteora
```

### Components

| Component | Tech | Purpose |
|-----------|------|---------|
| Server | Fastify | API + WebSocket |
| Queue | BullMQ | Job processing with retries |
| Database | PostgreSQL | Order history |
| Cache | Redis | Active orders + queue backend |

## Why Market Order?

Market Orders execute immediately at current price - simplest order type to demonstrate the full flow: routing, execution, and status updates. No complex trigger logic needed.

**Extending to Limit/Sniper Orders:**
- **Limit:** Store target price, subscribe to price feed, execute when target is hit
- **Sniper:** Monitor for new pool listings, execute immediately on detection

## API Reference

### Execute Order

```bash
POST /api/orders/execute
Content-Type: application/json

{
  "pair": "SOL/USDC",
  "side": "buy",
  "amount": 10,
  "slippageTolerance": 0.01
}
```

Response:
```json
{
  "orderId": "uuid-here",
  "status": "pending",
  "wsUrl": "/ws/orders/{orderId}",
  "message": "Order created. Connect to WebSocket for live updates."
}
```

### WebSocket Updates

Connect to: `ws://localhost:3000/ws/orders/{orderId}`

Events (in order):
```
pending → routing → building → submitted → confirmed
                                        ↘ failed
```

Each event:
```json
{
  "orderId": "uuid",
  "status": "routing",
  "timestamp": 1704900000000,
  "dex": "raydium",      // on building
  "price": 98.5,         // on confirmed
  "txHash": "0x...",     // on confirmed
  "error": "..."         // on failed
}
```

## Queue & Retry Logic

- **Concurrency:** 10 workers process orders simultaneously
- **Capacity:** Handles 100+ orders/min
- **Retries:** 3 attempts with exponential backoff (1s → 2s → 4s)
- **Failure:** After 3 failed attempts, emits `failed` WebSocket event

## Local Setup

### Prerequisites
- Node.js 20+
- Docker (for Redis + PostgreSQL)

### Steps

```bash
# 1. Clone and install
git clone https://github.com/your-username/order-execution-engine.git
cd order-execution-engine
npm install

# 2. Start dependencies
docker-compose up -d

# 3. Setup database
cp .env.example .env
npm run db:push
npm run db:generate

# 4. Run server
npm run dev
```

Server runs on `http://localhost:3000`

## Testing

```bash
npm test
```

15+ tests covering:
- DEX quote fetching
- Price comparison (buy = lowest, sell = highest)
- Queue retry configuration
- WebSocket connection lifecycle
- Order status progression

## Deployment (Railway)

### Quick Deploy

1. Push to GitHub
2. Connect repo to Railway
3. Add services: PostgreSQL, Redis
4. Set environment variables from `.env.example`
5. Deploy

Railway auto-detects Node.js and runs `npm start`.

### Environment Variables

```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
PORT=3000
NODE_ENV=production
```

## Postman Collection

Import `postman/order-execution.json`:

1. **Execute Order** - Creates order and returns orderId
2. **Get Order** - Fetch order status by ID
3. **List Orders** - Get order history

For WebSocket testing, use Postman's WebSocket feature or `wscat`:
```bash
wscat -c ws://localhost:3000/ws/orders/{orderId}
```

## Demo Video Script

1. **Show Architecture** (20s)
   - Quick overview of the flow

2. **Submit Orders** (40s)
   - Open terminal with `wscat` for WebSocket
   - Submit 3-5 orders via Postman
   - Watch status updates in real-time

3. **Show Routing** (20s)
   - Point out console logs showing:
     - Quote comparison between DEXes
     - Best price selection

4. **Show Database** (20s)
   - Orders table with status history
   - Status transitions recorded

## Project Structure

```
src/
├── api/
│   └── orders.ts       # REST endpoints
├── ws/
│   ├── handler.ts      # WebSocket routes
│   └── manager.ts      # Connection manager
├── queue/
│   ├── connection.ts   # Redis connection
│   ├── orderQueue.ts   # BullMQ queue
│   └── worker.ts       # Order processor
├── dex/
│   ├── types.ts        # Type definitions
│   ├── raydium.ts      # Raydium mock
│   ├── meteora.ts      # Meteora mock
│   └── router.ts       # Quote aggregation + execution
├── services/
│   └── orderService.ts # Business logic
├── db/
│   └── index.ts        # Prisma client
├── tests/
│   ├── router.test.ts
│   ├── queue.test.ts
│   ├── websocket.test.ts
│   └── order.test.ts
└── index.ts            # Entry point
```

## License

MIT
