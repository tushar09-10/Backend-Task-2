# Demo Video Script (1-2 minutes)

## 1. Architecture Overview (20 seconds)
Show the README architecture diagram and briefly explain:
- "Orders come in via REST API"
- "Get processed through BullMQ queue"
- "DEX router fetches quotes from Raydium and Meteora"
- "Real-time updates via WebSocket"

## 2. Submit Orders (40 seconds)

Open two terminals:

### Terminal 1 - WebSocket listener
```bash
# After getting orderId from Postman, connect:
wscat -c wss://order-engine.up.railway.app/ws/orders/{orderId}
```

### Terminal 2 - Server logs (if local)
```bash
npm run dev
```

### Postman
- Send 3-5 orders using "Execute Order - Buy SOL" request
- Show the orderId returned
- Point to WebSocket terminal showing status updates

## 3. Routing Decisions (20 seconds)
Look at console logs showing:
```
[router] quotes fetched - raydium: 98.5, meteora: 99.1
[router] best quote for buy: raydium @ 98.5
[router] executing on raydium for order abc-123
```

## 4. Database Check (20 seconds)
Show PostgreSQL (Railway dashboard or local):
- Orders table with different statuses
- Status transitions showing the full lifecycle

## Key Points to Mention
- Queue handles 10 concurrent orders
- Auto-retry on failure (3 attempts)
- Price variance simulates real DEX behavior
- ~2-3 second execution time per order

## Wrap Up
"Full order lifecycle from pending to confirmed with real-time updates and proper error handling."
