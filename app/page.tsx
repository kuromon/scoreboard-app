"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateRoomId } from "@/lib/room";

export default function HomePage() {
  const router = useRouter();
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");

  function handleCreateRoom() {
    const roomId = generateRoomId();

    const params = new URLSearchParams({
      home: homeTeam.trim() || "Home",
      away: awayTeam.trim() || "Away",
    });

    router.push(`/operator/${roomId}?${params.toString()}`);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 24,
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          border: "1px solid #d9e2ef",
          borderRadius: 16,
          padding: 24,
        }}
      >
        <h1>Create scoreboard room</h1>
        <p>Enter team names and generate a random room ID.</p>

        <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
          <input
            placeholder="Home team"
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid #cbd5e1",
            }}
          />

          <input
            placeholder="Away team"
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid #cbd5e1",
            }}
          />

          <button
            onClick={handleCreateRoom}
            style={{
              padding: 14,
              borderRadius: 12,
              border: "none",
              background: "#2563eb",
              color: "white",
              fontWeight: 700,
            }}
          >
            Create room
          </button>
        </div>
      </div>
    </main>
  );
}
