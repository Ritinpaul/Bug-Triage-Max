import { useEffect } from "react";
import { trpc } from "@/providers/trpc";

export function useLiveStream() {
  const utils = trpc.useUtils();

  useEffect(() => {
    const eventSource = new EventSource("/api/events");

    eventSource.addEventListener("update", () => {
      // Invalidate queries so TRPC automatically refetches
      utils.bugs.invalidate();
      utils.messages.invalidate();
      utils.agents.invalidate();
    });

    eventSource.addEventListener("ping", () => {
      // Keep-alive, nothing to do
    });

    eventSource.onerror = () => {
      // Reconnect handled automatically by browser EventSource
    };

    return () => {
      eventSource.close();
    };
  }, [utils]);
}
