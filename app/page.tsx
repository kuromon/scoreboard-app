"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateRoomId } from "@/lib/room";

export default function HomePage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  function handleCreateRoom() {
    if (isCreating) return;

    setIsCreating(true);
    const roomId = generateRoomId();
    router.push(`/operator/${roomId}`);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background:
          "radial-gradient(circle at top, rgba(37, 99, 235, 0.18), transparent 32%), linear-gradient(180deg, #07111f 0%, #0b1728 100%)",
        color: "#f8fafc",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 560,
          borderRadius: 28,
          padding: 32,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(15, 23, 42, 0.72)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.34)",
          backdropFilter: "blur(12px)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(circle at 20% 20%, rgba(34,197,94,0.14), transparent 24%), radial-gradient(circle at 80% 0%, rgba(59,130,246,0.18), transparent 28%)",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              color: "rgba(248,250,252,0.92)",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: "#22c55e",
                boxShadow: "0 0 0 6px rgba(34,197,94,0.14)",
              }}
            />
            Live
          </div>

          <h1
            style={{
              margin: "20px 0 12px",
              fontSize: "clamp(38px, 6vw, 64px)",
              lineHeight: 1,
              letterSpacing: "-0.04em",
            }}
          >
            ONLINE
            <br />
            SCOREBOARD
          </h1>

          <button
            onClick={handleCreateRoom}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            disabled={isCreating}
            style={{
              marginTop: 28,
              width: "100%",
              minHeight: 58,
              borderRadius: 16,
              border: "none",
              background: isCreating
                ? "#1d4ed8"
                : isHovered
                  ? "#1d4ed8"
                  : "#2563eb",
              color: "white",
              fontWeight: 800,
              fontSize: 17,
              letterSpacing: "-0.01em",
              cursor: isCreating ? "not-allowed" : "pointer",
              transform: isHovered && !isCreating ? "translateY(-1px)" : "none",
              boxShadow:
                isHovered && !isCreating
                  ? "0 18px 36px rgba(37,99,235,0.34)"
                  : "0 10px 24px rgba(37,99,235,0.22)",
              transition:
                "transform 160ms ease, box-shadow 160ms ease, background 160ms ease",
            }}
          >
            {isCreating ? "Creating room..." : "Create room"}
          </button>

          <p
            style={{
              margin: "14px 0 0",
              textAlign: "center",
              color: "rgba(226,232,240,0.58)",
              fontSize: 14,
            }}
          >
            {isHovered && !isCreating
              ? "Create a new live room and jump into operator view."
              : "One room, multiple screens, real-time sync."}
          </p>
        </div>
      </div>
    </main>
  );
}
