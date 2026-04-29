import { supabase } from '@/lib/supabase'
import type { ScoreboardState } from '@/lib/types'

export async function loadScoreboard(roomId: string) {
  const { data, error } = await supabase
    .from('scoreboards')
    .select('*')
    .eq('room_id', roomId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    roomId: data.room_id,
    homeTeam: data.home_team,
    awayTeam: data.away_team,
    homeScore: data.home_score,
    awayScore: data.away_score,
    updatedAt: new Date(data.updated_at).getTime(),
  } satisfies ScoreboardState
}

export async function saveScoreboard(state: ScoreboardState) {
  const { data, error } = await supabase
    .from('scoreboards')
    .upsert({
      room_id: state.roomId,
      home_team: state.homeTeam,
      away_team: state.awayTeam,
      home_score: state.homeScore,
      away_score: state.awayScore,
      updated_at: new Date(state.updatedAt).toISOString(),
    })
    .select()
    .single()

  if (error) throw error

  return {
    roomId: data.room_id,
    homeTeam: data.home_team,
    awayTeam: data.away_team,
    homeScore: data.home_score,
    awayScore: data.away_score,
    updatedAt: new Date(data.updated_at).getTime(),
  } satisfies ScoreboardState
}