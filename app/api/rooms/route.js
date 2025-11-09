export const runtime = 'edge'

import { createRoom, listRooms } from '@/lib/roomStore'

export async function POST(request) {
  try {
    let code
    if (request.headers.get('content-type')?.includes('application/json')) {
      const body = await request.json().catch(() => ({}))
      code = body?.code
    }

    const room = createRoom(code)

    return new Response(
      JSON.stringify({
        code: room.code,
        metadata: room.metadata,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    if (error.code === 'ROOM_EXISTS') {
      return new Response(
        JSON.stringify({ error: 'Room code already exists' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.error('Room creation failed:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create room' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function GET() {
  const rooms = listRooms()
  return new Response(JSON.stringify({ rooms }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
