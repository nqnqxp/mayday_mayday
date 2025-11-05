# Mayday Mayday - Next.js + Three.js Project

A Next.js project set up for Three.js with API proxy capabilities.

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
- `components/` - React/Three.js components
- `lib/` - Utility functions and API helpers
- `app/api/proxy/` - API proxy routes
