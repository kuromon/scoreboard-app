"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { clampScore } from "@/lib/room";
import type { ConnectionStatus, ScoreboardState } from "@/lib/types";
import styles from "./operator.module.css";

type Props = {
  params: Promise<{ roomId: string }>;
};

export default function OperatorPage({ params }: Props) {
  const searchParams = useSearchParams();
  const [roomId, setRoomId] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const initialStateSentRef = useRef(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const [state, setState] = useState<ScoreboardState>({
    roomId: "",
    homeTeam: searchParams.get("home") || "Home",
    awayTeam: searchParams.get("away") || "Away",
    homeScore: 0,
    awayScore: 0,
    updatedAt: Date.now(),
  });

  const latestStateRef = useRef(state);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  useEffect(() => {
    params.then(({ roomId }) => {
      setRoomId(roomId);
      setState((prev) => ({ ...prev, roomId }));
    });
  }, [params]);

  const channel = useMemo(() => {
    if (!roomId) return null;

    return supabase.channel(`score-room:${roomId}`, {
      config: {
        broadcast: { self: true },
      },
    });
  }, [roomId]);

  useEffect(() => {
    initialStateSentRef.current = false;
  }, [roomId]);

  useEffect(() => {
    if (!channel) return;

    channel
      .on("broadcast", { event: "state" }, (payload) => {
        console.log("state event:", payload);
      })
      .on("broadcast", { event: "request-sync" }, () => {
        void sendCurrentState();
      })
      .subscribe((channelStatus) => {
        console.log("channel status:", channelStatus);

        if (channelStatus === "SUBSCRIBED") {
          setStatus("live");
        } else {
          setStatus("connecting");
        }
      })
      .subscribe((channelStatus) => {
        console.log("channel status:", channelStatus);

        if (channelStatus === "SUBSCRIBED") {
          setStatus("live");
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
  }, [channel]);

  async function broadcastState(nextState: ScoreboardState) {
    if (!channel) return;

    setState(nextState);

    await channel.send({
      type: "broadcast",
      event: "state",
      payload: nextState,
    });
  }

  function updateScore(team: "home" | "away", delta: number) {
    const nextState: ScoreboardState = {
      ...state,
      homeScore:
        team === "home" ? clampScore(state.homeScore + delta) : state.homeScore,
      awayScore:
        team === "away" ? clampScore(state.awayScore + delta) : state.awayScore,
      updatedAt: Date.now(),
    };

    void broadcastState(nextState);
  }

  function saveNames() {
    void broadcastState({
      ...state,
      updatedAt: Date.now(),
    });
  }

  function resetScores() {
    setShowResetModal(true);
  }

  function confirmReset() {
    setShowResetModal(false);

    void broadcastState({
      ...state,
      homeScore: 0,
      awayScore: 0,
      updatedAt: Date.now(),
    });
  }

  function cancelReset() {
    setShowResetModal(false);
  }

  const boardUrl = useMemo(() => {
    if (!roomId || typeof window === "undefined") return "";
    return `${window.location.origin}/board/${roomId}`;
  }, [roomId]);

  const operatorUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }, [roomId]);

  async function copyText(value: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      alert("Copied to clipboard");
    } catch {
      alert("Copy failed");
    }
  }

  async function sendCurrentState() {
    if (!channel || !roomId) return;

    await channel.send({
      type: "broadcast",
      event: "state",
      payload: {
        ...latestStateRef.current,
        roomId,
        updatedAt: Date.now(),
      },
    });
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <div>
            <h1>Operator page</h1>
            <p>Room ID: {roomId}</p>
          </div>

          <div className={styles.status}>
            <span className={styles.dot} />
            {status === "live" && "Live"}
            {status === "waiting" && "Waiting"}
            {status === "connecting" && "Connecting"}
            {status === "reconnecting" && "Reconnecting"}
          </div>
        </div>

        <div className={styles.links}>
          <Link
            href={`/board/${roomId}`}
            target="_blank"
            className={styles.linkButton}
          >
            Open board page
          </Link>

          <button
            className={styles.secondaryButton}
            onClick={() => copyText(boardUrl)}
          >
            Copy board URL
          </button>

          <button
            className={styles.secondaryButton}
            onClick={() => copyText(operatorUrl)}
          >
            Copy operator URL
          </button>

          <button
            className={styles.secondaryButton}
            onClick={() => void sendCurrentState()}
          >
            Sync board
          </button>
        </div>

        <div className={styles.cardGrid}>
          <section className={styles.card}>
            <h2>Team names</h2>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Home team</label>
              <input
                className={styles.input}
                value={state.homeTeam}
                onChange={(e) =>
                  setState({ ...state, homeTeam: e.target.value })
                }
                placeholder="Home team"
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Away team</label>
              <input
                className={styles.input}
                value={state.awayTeam}
                onChange={(e) =>
                  setState({ ...state, awayTeam: e.target.value })
                }
                placeholder="Away team"
              />
            </div>

            <button className={styles.primaryButton} onClick={saveNames}>
              Save names
            </button>
          </section>

          <section className={styles.card}>
            <div className={styles.scoreBox}>
              <div className={styles.teamHeader}>
                <div className={styles.teamTitle}>{state.homeTeam}</div>
                <div className={styles.scoreValue}>{state.homeScore}</div>
              </div>

              <div className={styles.scoreActions}>
                <button
                  className={`${styles.scoreButton} ${styles.homeButton}`}
                  onClick={() => updateScore("home", 1)}
                >
                  +1
                </button>

                <button
                  className={`${styles.scoreButton} ${styles.secondaryButton}`}
                  onClick={() => updateScore("home", -1)}
                >
                  -1
                </button>
              </div>

              <div className={styles.teamHeader}>
                <div className={styles.teamTitle}>{state.awayTeam}</div>
                <div className={styles.scoreValue}>{state.awayScore}</div>
              </div>

              <div className={styles.scoreActions}>
                <button
                  className={`${styles.scoreButton} ${styles.awayButton}`}
                  onClick={() => updateScore("away", 1)}
                >
                  +1
                </button>

                <button
                  className={`${styles.scoreButton} ${styles.secondaryButton}`}
                  onClick={() => updateScore("away", -1)}
                >
                  -1
                </button>
              </div>

              <button className={styles.dangerButton} onClick={resetScores}>
                Reset scores
              </button>
            </div>
          </section>
        </div>
      </div>

      {showResetModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Reset scores?</h3>
            <p>This will set both home and away back to 0.</p>

            <div className={styles.modalActions}>
              <button className={styles.secondaryButton} onClick={cancelReset}>
                Cancel
              </button>

              <button className={styles.dangerButton} onClick={confirmReset}>
                Confirm reset
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
