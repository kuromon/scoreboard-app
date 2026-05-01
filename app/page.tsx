"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateRoomId } from "@/lib/room";

export default function HomePage() {
  const router = useRouter();

  function handleCreateRoom() {
    const roomId = generateRoomId();

    router.push(`/operator/${roomId}`);
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
        <h1 style={{ textAlign: "center" }}>ONLINE SCOREBOARD</h1>

        <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
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
