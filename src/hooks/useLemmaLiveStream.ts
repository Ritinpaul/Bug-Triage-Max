/**
 * useLemmaLiveStream
 * Opens a Lemma datastore WebSocket stream for the bug_reports table.
 * Fires onChange on every insert/update/delete and tracks connection status.
 *
 * Uses the LemmaClient from lemma-sdk directly in the browser.
 * The client reads podId from the VITE_ env vars (passed at build time).
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { LemmaClient } from "lemma-sdk";

type StreamStatus = "idle" | "connecting" | "open" | "reconnecting" | "closed";

interface ChangeFrame {
  operation: "insert" | "update" | "delete";
  table_name: string;
  record_id: string;
  payload: Record<string, unknown>;
}

interface UseLemmaLiveStreamOptions {
  table?: string;
  onChange?: (frame: ChangeFrame) => void;
  enabled?: boolean;
}

interface UseLemmaLiveStreamResult {
  status: StreamStatus;
  lastChange: ChangeFrame | null;
  disconnect: () => void;
}

const LEMMA_POD_ID = import.meta.env.VITE_LEMMA_POD_ID as string | undefined;

export function useLemmaLiveStream({
  table = "bug_reports",
  onChange,
  enabled = true,
}: UseLemmaLiveStreamOptions = {}): UseLemmaLiveStreamResult {
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [lastChange, setLastChange] = useState<ChangeFrame | null>(null);
  const handleRef = useRef<{ close: () => void } | null>(null);
  const clientRef = useRef<LemmaClient | null>(null);

  const disconnect = useCallback(() => {
    handleRef.current?.close();
    handleRef.current = null;
    setStatus("closed");
  }, []);

  useEffect(() => {
    // Lemma is only usable if a pod ID is configured and streaming is enabled
    if (!LEMMA_POD_ID || !enabled) return;

    let cancelled = false;

    async function connect() {
      try {
        setStatus("connecting");

        if (!clientRef.current) {
          clientRef.current = new LemmaClient({ podId: LEMMA_POD_ID! });
          await clientRef.current.initialize();
        }

        if (cancelled) return;

        handleRef.current = clientRef.current.datastore.watchChanges({
          table,
          onChange: (frame) => {
            const cf = frame as ChangeFrame;
            setLastChange(cf);
            onChange?.(cf);
          },
          onStatus: (s) => {
            if (!cancelled) setStatus(s as StreamStatus);
          },
          onReady: () => {
            if (!cancelled) setStatus("open");
          },
          onError: (err) => {
            console.warn("[Lemma stream] error:", err);
            if (!cancelled) setStatus("reconnecting");
          },
        });
      } catch (err) {
        console.warn("[Lemma stream] connect failed:", err);
        if (!cancelled) setStatus("closed");
      }
    }

    connect();

    return () => {
      cancelled = true;
      handleRef.current?.close();
      handleRef.current = null;
    };
  }, [table, enabled, onChange]);

  return { status, lastChange, disconnect };
}
