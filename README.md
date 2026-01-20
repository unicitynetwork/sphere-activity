# Sphere Activity Service

A lightweight activity tracking service for Unicity Sphere. Records and streams user activities like token transfers, marketplace posts, and wallet creation events.

## Tech Stack

- **Hono** - Web framework
- **Drizzle ORM** - Database ORM
- **SQLite** (better-sqlite3) - Database
- **Server-Sent Events (SSE)** - Real-time streaming

## Setup

```bash
npm install
cp .env.example .env
```

## Development

```bash
npm run dev
```

## Production

```bash
npm run build
npm start
```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `DATABASE_URL` | SQLite database path | `./data/activities.db` |
| `ACTIVITY_API_KEY` | API key for authentication | Auto-generated |
| `ALLOWED_ORIGINS` | Comma-separated origins that skip API key auth | (none) |

### Authentication

The service uses a dual authentication model:

1. **Origin-based auth** - Requests from origins listed in `ALLOWED_ORIGINS` are allowed without an API key. This is for browser-based frontends that cannot securely store API keys.

2. **API key auth** - All other requests (backend services, CLI tools) must include the API key in the `Authorization` header.

Example `ALLOWED_ORIGINS`:
```
ALLOWED_ORIGINS=https://unicitynetwork.github.io,https://sphere.unicity.network,http://localhost:5173
```

## API Endpoints

### GET /health

Health check endpoint.

**Response:**
```json
{ "status": "ok" }
```

### GET /activities

Fetch activities with pagination.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max items to return (default: 50, max: 100) |
| `cursor` | string | Pagination cursor (activity ID) |
| `kind` | string | Filter by activity kind |

**Response:**
```json
{
  "activities": [
    {
      "id": 123,
      "kind": "token_transfer",
      "unicityId": "@alice",
      "data": { "amount": "100", "symbol": "ALPHA" },
      "isPublic": true,
      "createdAt": "2025-01-20T12:00:00.000Z"
    }
  ],
  "nextCursor": "122"
}
```

### GET /activities/stream

Server-Sent Events stream for real-time activity updates.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `lastId` | string | Resume from this activity ID |

**Event Format:**
```
data: {"id":123,"kind":"token_transfer",...}
```

### POST /activities

Create a new activity. **Requires authentication.**

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <api_key>  # Required if origin not in ALLOWED_ORIGINS
```

**Request Body:**
```json
{
  "kind": "token_transfer",
  "unicityId": "@alice",
  "data": { "amount": "100", "symbol": "ALPHA" },
  "isPublic": true
}
```

**Valid `kind` values:**
- `marketplace_post` - User posted an item for sale
- `token_transfer` - Token was transferred
- `wallet_created` - New wallet was created
- `game_started` - User started a game
- `bet_placed` - User placed a bet
- `otc_purchase` - OTC purchase completed
- `merch_order` - Merchandise order placed

**Response (201):**
```json
{
  "id": 123,
  "createdAt": "2025-01-20T12:00:00.000Z"
}
```

## Database

SQLite database with auto-initialization. Tables are created on first run.

**Schema:**
```sql
CREATE TABLE activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  unicity_id TEXT,
  data TEXT,
  is_public INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
)
```

## Usage Examples

### Fetch recent activities
```bash
curl http://localhost:3001/activities?limit=10
```

### Post an activity (with API key)
```bash
curl -X POST http://localhost:3001/activities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"kind": "token_transfer", "unicityId": "@alice", "data": {"amount": "100"}}'
```

### Subscribe to real-time updates
```bash
curl -N http://localhost:3001/activities/stream
```

### JavaScript SSE client
```javascript
const events = new EventSource('http://localhost:3001/activities/stream');
events.onmessage = (e) => {
  const activity = JSON.parse(e.data);
  console.log('New activity:', activity);
};
```
