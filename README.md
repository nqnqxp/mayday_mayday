# Mayday Mayday - Next.js + Three.js Project

A Next.js project set up for Three.js with API proxy capabilities and peer room linking.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the root directory:
```env
API_SERVER_URL=http://localhost:3001
```
Replace `http://localhost:3001` with the URL of your other site when it's ready.

3. Run the development server:
```bash
npm run dev
```

## Real-Time Rooms

- Use the **Room Connector** panel on `/page2` or `/page3` to open a room or join an existing code.
- Clicking **Open Room** generates (or reserves) a shared code via `POST /api/rooms`.
- Joining sends both participants through a WebSocket bridge handled by `pages/api/connect` (powered by `ws`).
- The client warms up the endpoint automatically, so the first connection succeeds even after a fresh deploy.

## API Proxy

The project includes a proxy server that connects to another site. All requests to `/api/proxy/*` will be forwarded to the server specified in `API_SERVER_URL`.

### Usage

#### Using the utility library (recommended):

```javascript
import { api } from '@/lib/api'

// GET request
const data = await api.get('endpoint/path')

// POST request
const result = await api.post('endpoint/path', { key: 'value' })

// PUT, PATCH, DELETE are also available
```

#### Direct fetch:

```javascript
// GET
fetch('/api/proxy/endpoint/path')

// POST
fetch('/api/proxy/endpoint/path', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data: 'value' })
})
```

## Project Structure

- `app/` - Next.js app directory
- `components/` - React/Three.js components (includes the room connector UI)
- `lib/` - Utility functions and API helpers
- `pages/api/` - Node runtime endpoints (WebSocket bridge)
- `app/api/proxy/` - API proxy routes
- `app/api/rooms/` - Room management endpoints
