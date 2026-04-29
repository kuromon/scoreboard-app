"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ConnectionStatus, ScoreboardState } from "@/lib/types";
import { loadScoreboard } from "@/lib/scoreboard";
import styles from "./board.module.css";

type Props = {
  params: Promise<{ roomId: string }>;
};

export default function BoardPage({ params }: Props) {
  const [roomId, setRoomId] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [state, setState] = useState<ScoreboardState | null>(null);

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
      <section className={`${styles.panel} ${styles.home}`}>
        <div>
          <div className={styles.teamName}>{state?.homeTeam || "Home"}</div>
          <div className={styles.score}>{state?.homeScore ?? 0}</div>
        </div>
      </section>

      <section className={`${styles.panel} ${styles.away}`}>
        <div>
          <div className={styles.teamName}>{state?.awayTeam || "Away"}</div>
          <div className={styles.score}>{state?.awayScore ?? 0}</div>
        </div>
      </section>

      <div className={styles.status}>
        {status === "live" && "Live"}
        {status === "waiting" && "Waiting for operator"}
        {status === "connecting" && "Connecting"}
        {status === "reconnecting" && "Reconnecting"}
      </div>
    </main>
  );
}
