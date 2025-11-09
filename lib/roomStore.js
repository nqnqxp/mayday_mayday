const STORE_SYMBOL = Symbol.for('mayday.roomStore')

function initStore() {
  if (!globalThis[STORE_SYMBOL]) {
    globalThis[STORE_SYMBOL] = {
      rooms: new Map(),
    }
  }
  return globalThis[STORE_SYMBOL]
}

function generateCode(length = 6) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * alphabet.length)
    result += alphabet[index]
  }
  return result
}

export function getStore() {
  return initStore()
}

export function getRoomMap() {
  return getStore().rooms
}

export function getRoom(code) {
  return getRoomMap().get(code)
}

export function createRoom(requestedCode) {
  const rooms = getRoomMap()
  let code = requestedCode?.trim().toUpperCase()

  if (code) {
    if (rooms.has(code)) {
      const error = new Error('Room code already exists')
      error.code = 'ROOM_EXISTS'
      throw error
    }
  } else {
    do {
      code = generateCode()
    } while (rooms.has(code))
  }

  const room = {
    code,
    clients: new Set(),
    metadata: {
      createdAt: Date.now(),
      explicit: Boolean(requestedCode),
    },
  }

  rooms.set(code, room)
  return room
}

export function ensureRoom(code) {
  const rooms = getRoomMap()
  const normalized = code.trim().toUpperCase()
  if (!rooms.has(normalized)) {
    return createRoom(normalized)
  }
  return rooms.get(normalized)
}

export function deleteRoom(code) {
  const rooms = getRoomMap()
  rooms.delete(code)
}

export function listRooms() {
  const rooms = getRoomMap()
  return Array.from(rooms.values()).map((room) => ({
    code: room.code,
    size: room.clients.size,
    metadata: room.metadata,
  }))
}
