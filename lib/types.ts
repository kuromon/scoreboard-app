export type ScoreboardState = {
  roomId: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  updatedAt: number
}

export type ConnectionStatus = 'connecting' | 'live' | 'reconnecting' | 'waiting'