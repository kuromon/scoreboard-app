"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { ConnectionStatus, ScoreboardState } from "@/lib/types";
import { loadScoreboard } from "@/lib/scoreboard";
import styles from "./board.module.css";

type Props = {
  params: Promise<{ roomId: string }>;
};

export default function BoardPage({ params }: Props) {
  const searchParams = useSearchParams();

  const [roomId, setRoomId] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [state, setState] = useState<ScoreboardState | null>(null);

  const rawView = searchParams.get("view")?.toLowerCase();
  const view =
    rawView === "home" || rawView === "away" || rawView === "split"
      ? rawView
      : "split";

  const isSplit = view === "split";
  const isHomeOnly = view === "home";
  const isAwayOnly = view === "away";

  const homeTeam = state?.homeTeam || "Home";
  const awayTeam = state?.awayTeam || "Away";
  const homeScore = state?.homeScore ?? 0;
  const awayScore = state?.awayScore ?? 0;

  useEffect(() => {
    params.then(({ roomId }) => setRoomId(roomId));
  }, [params]);

  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;

    async function hydrateBoard() {
      try {
        const saved = await loadScoreboard(roomId);
        if (!saved || cancelled) return;

        setState(saved);
        setStatus("live");
      } catch (error) {
        console.error("Failed to load board state:", error);
      }
    }

    void hydrateBoard();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  const channel = useMemo(() => {
    if (!roomId) return null;
    return supabase.channel(`score-room:${roomId}`);
  }, [roomId]);

  useEffect(() => {
    if (!channel) return;

    channel
      .on("broadcast", { event: "state" }, (payload) => {
        setState(payload.payload as ScoreboardState);
        setStatus("live");
      })
      .subscribe((channelStatus) => {
        console.log("board channel status:", channelStatus);

        if (channelStatus === "SUBSCRIBED") {
          setStatus("waiting");

          void channel.send({
            type: "broadcast",
            event: "request-sync",
            payload: {
              roomId,
              requestedAt: Date.now(),
            },
          });
        } else if (
          channelStatus === "CHANNEL_ERROR" ||
          channelStatus === "TIMED_OUT" ||
          channelStatus === "CLOSED"
        ) {
          setStatus("reconnecting");
        } else {
          setStatus("connecting");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channel, roomId]);

  return (
    <main className={styles.main}>
      {isSplit && (
        <div className={styles.splitBoard}>
          <section className={`${styles.panel} ${styles.home}`}>
            <div>
              <div className={styles.teamName}>{homeTeam}</div>
              <div className={styles.score}>{homeScore}</div>
            </div>
          </section>

          <section className={`${styles.panel} ${styles.away}`}>
            <div>
              <div className={styles.teamName}>{awayTeam}</div>
              <div className={styles.score}>{awayScore}</div>
            </div>
          </section>
        </div>
      )}

      {isHomeOnly && (
        <section className={`${styles.singleBoard} ${styles.homeSingle}`}>
          <div className={styles.singleTeamName}>{homeTeam}</div>
          <div className={styles.singleScore}>{homeScore}</div>
        </section>
      )}

      {isAwayOnly && (
        <section className={`${styles.singleBoard} ${styles.awaySingle}`}>
          <div className={styles.singleTeamName}>{awayTeam}</div>
          <div className={styles.singleScore}>{awayScore}</div>
        </section>
      )}

      <div className={styles.status}>
        {status === "live" && "Live"}
        {status === "waiting" && "Waiting for operator"}
        {status === "connecting" && "Connecting"}
        {status === "reconnecting" && "Reconnecting"}
      </div>
    </main>
  );
}
