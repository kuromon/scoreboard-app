"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { loadScoreboard, saveScoreboard } from "@/lib/scoreboard";
import { supabase } from "@/lib/supabase";
import { clampScore } from "@/lib/room";
import type { ConnectionStatus, ScoreboardState } from "@/lib/types";
import styles from "./operator.module.css";
import { QRCodeSVG } from "qrcode.react";

type Props = {
  params: Promise<{ roomId: string }>;
};

export default function OperatorPage({ params }: Props) {
  const pathname = usePathname();
  const [roomId, setRoomId] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [showResetModal, setShowResetModal] = useState(false);

  const [state, setState] = useState<ScoreboardState>({
    roomId: "",
    homeTeam: "Home",
    awayTeam: "Away",
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
    if (!roomId) return;

    let cancelled = false;

    async function hydrateRoom() {
      try {
        const saved = await loadScoreboard(roomId);
        if (!saved || cancelled) return;

        setState(saved);
      } catch (error) {
        console.error("Failed to load scoreboard:", error);
      }
    }

    void hydrateRoom();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    if (!channel) return;

    channel
      .on("broadcast", { event: "request-sync" }, () => {
        void sendCurrentState();
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
    try {
      const saved = await saveScoreboard(nextState);

      setState(saved);
      latestStateRef.current = saved;

      if (!channel) return;

      await channel.send({
        type: "broadcast",
        event: "state",
        payload: saved,
      });
    } catch (error) {
      console.error("Failed to save scoreboard:", error);
    }
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

  const splitBoardUrl = useMemo(() => {
    if (!roomId || typeof window === "undefined") return "";
    return `${window.location.origin}/board/${roomId}`;
  }, [roomId]);

  const homeBoardUrl = useMemo(() => {
    if (!roomId || typeof window === "undefined") return "";
    return `${window.location.origin}/board/${roomId}?view=home`;
  }, [roomId]);

  const awayBoardUrl = useMemo(() => {
    if (!roomId || typeof window === "undefined") return "";
    return `${window.location.origin}/board/${roomId}?view=away`;
  }, [roomId]);

  const operatorUrl = useMemo(() => {
    if (!roomId || typeof window === "undefined") return "";
    return `${window.location.origin}${pathname}`;
  }, [pathname, roomId]);

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

        <details className={styles.card}>
          <summary className={styles.disclosureSummary}>
            <div>
              <h2>Display screens</h2>
              <p className={styles.sectionHint}>
                Open these on TVs or external displays.
              </p>
            </div>
            <span className={styles.chevron} aria-hidden="true">
              ▾
            </span>
          </summary>

          <div className={styles.disclosureBody}>
            <div className={styles.qrDisplayGrid}>
              <article className={styles.qrItem}>
                <div className={styles.qrItemHeader}>
                  <h3>Split display</h3>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => copyText(splitBoardUrl)}
                    disabled={!splitBoardUrl}
                  >
                    Copy link
                  </button>
                </div>

                <div className={styles.qrCard}>
                  {splitBoardUrl ? (
                    <>
                      <QRCodeSVG
                        value={splitBoardUrl}
                        size={180}
                        bgColor="#ffffff"
                        fgColor="#111111"
                        level="M"
                        includeMargin
                      />
                      <p className={styles.qrLabel}>Scan to open split board</p>
                      <p className={styles.qrUrl}>{splitBoardUrl}</p>
                    </>
                  ) : (
                    <p className={styles.qrLabel}>
                      Preparing split display QR...
                    </p>
                  )}
                </div>
              </article>

              <article className={styles.qrItem}>
                <div className={styles.qrItemHeader}>
                  <h3>Home display</h3>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => copyText(homeBoardUrl)}
                    disabled={!homeBoardUrl}
                  >
                    Copy link
                  </button>
                </div>

                <div className={styles.qrCard}>
                  {homeBoardUrl ? (
                    <>
                      <QRCodeSVG
                        value={homeBoardUrl}
                        size={180}
                        bgColor="#ffffff"
                        fgColor="#111111"
                        level="M"
                        includeMargin
                      />
                      <p className={styles.qrLabel}>
                        Scan to open home-only board
                      </p>
                      <p className={styles.qrUrl}>{homeBoardUrl}</p>
                    </>
                  ) : (
                    <p className={styles.qrLabel}>
                      Preparing home display QR...
                    </p>
                  )}
                </div>
              </article>

              <article className={styles.qrItem}>
                <div className={styles.qrItemHeader}>
                  <h3>Away display</h3>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => copyText(awayBoardUrl)}
                    disabled={!awayBoardUrl}
                  >
                    Copy link
                  </button>
                </div>

                <div className={styles.qrCard}>
                  {awayBoardUrl ? (
                    <>
                      <QRCodeSVG
                        value={awayBoardUrl}
                        size={180}
                        bgColor="#ffffff"
                        fgColor="#111111"
                        level="M"
                        includeMargin
                      />
                      <p className={styles.qrLabel}>
                        Scan to open away-only board
                      </p>
                      <p className={styles.qrUrl}>{awayBoardUrl}</p>
                    </>
                  ) : (
                    <p className={styles.qrLabel}>
                      Preparing away display QR...
                    </p>
                  )}
                </div>
              </article>
            </div>
          </div>
        </details>

        <details className={styles.card}>
          <summary className={styles.disclosureSummary}>
            <div>
              <h2>Operator access</h2>
              <p className={styles.sectionHint}>
                Open this on the scoring device.
              </p>
            </div>
            <span className={styles.chevron} aria-hidden="true">
              ▾
            </span>
          </summary>

          <div className={styles.disclosureBody}>
            <div className={styles.qrSingleWrap}>
              <article className={styles.qrItem}>
                <div className={styles.qrItemHeader}>
                  <h3>Operator control</h3>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => copyText(operatorUrl)}
                    disabled={!operatorUrl}
                  >
                    Copy link
                  </button>
                </div>

                <div className={styles.qrCard}>
                  {operatorUrl ? (
                    <>
                      <QRCodeSVG
                        value={operatorUrl}
                        size={180}
                        bgColor="#ffffff"
                        fgColor="#111111"
                        level="M"
                        includeMargin
                      />
                      <p className={styles.qrLabel}>
                        Scan to open operator page
                      </p>
                      <p className={styles.qrUrl}>{operatorUrl}</p>
                    </>
                  ) : (
                    <p className={styles.qrLabel}>Preparing operator QR...</p>
                  )}
                </div>
              </article>
            </div>
          </div>
        </details>

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
