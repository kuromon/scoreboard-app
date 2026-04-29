export function generateRoomId(length = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''

  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }

  return result
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value))
}