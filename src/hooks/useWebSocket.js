/**
 * useWebSocket.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom React hook that manages a persistent WebSocket connection to the
 * backend aggregator server.
 *
 * Features:
 *  - Connects automatically on mount.
 *  - Auto-reconnects with exponential back-off if the connection drops.
 *  - Tracks connection state so the UI can show banners / status badges.
 *  - Provides `sendMessage(msg)` for sending requests (e.g., get_quote).
 *  - Returns the latest order book snapshot and per-venue status.
 *
 * Back-off schedule: 1 s → 2 s → 4 s → … → 30 s max.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useCallback, useState } from 'react';

// ── Configuration ─────────────────────────────────────────────────────────────

const WS_URL = 'ws://localhost:3001';
const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

// ── Main Hook ─────────────────────────────────────────────────────────────────

/**
 * @param {Function} onMessage - Callback fired for every incoming server message.
 *   Receives the parsed message object: { type, payload?, id?, error? }
 * @returns {{
 *   isConnected: boolean,
 *   connectionState: 'connecting'|'connected'|'reconnecting'|'disconnected',
 *   sendMessage: (msg: object) => void,
 * }}
 */
export function useWebSocket(onMessage) {
    // WebSocket instance (not in state — changes should not trigger re-renders).
    const wsRef = useRef(null);

    // Reconnect timer handle.
    const reconnectTimerRef = useRef(null);

    // Current back-off delay (mutable, not in state).
    const backoffRef = useRef(INITIAL_BACKOFF_MS);

    // Whether the hook is intentionally unmounted (to stop reconnect attempts).
    const unmountedRef = useRef(false);

    // Stable reference to the caller's onMessage callback.
    const onMessageRef = useRef(onMessage);
    useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

    const [connectionState, setConnectionState] = useState('connecting');

    // ── Connect Helper ──────────────────────────────────────────────────────────

    const connect = useCallback(() => {
        if (unmountedRef.current) return;

        setConnectionState((prev) => (prev === 'connected' ? 'reconnecting' : 'connecting'));

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            if (unmountedRef.current) { ws.close(); return; }
            console.log('[WS] Connected to backend.');
            backoffRef.current = INITIAL_BACKOFF_MS; // reset back-off on success
            setConnectionState('connected');
        };

        ws.onmessage = (event) => {
            let msg;
            try {
                msg = JSON.parse(event.data);
            } catch {
                console.warn('[WS] Failed to parse message:', event.data);
                return;
            }
            onMessageRef.current?.(msg);
        };

        ws.onclose = (event) => {
            if (unmountedRef.current) return;
            console.warn(`[WS] Disconnected (${event.code}). Reconnecting in ${backoffRef.current}ms…`);
            setConnectionState('reconnecting');
            scheduleReconnect();
        };

        ws.onerror = () => {
            // 'error' fires before 'close', so we just log here.
            // The reconnect happens in the 'close' handler.
            setConnectionState('reconnecting');
        };
    }, []); // no deps — connect is a stable reference

    // ── Reconnect Scheduler ─────────────────────────────────────────────────────

    const scheduleReconnect = useCallback(() => {
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
            backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
            connect();
        }, backoffRef.current);
    }, [connect]);

    // ── Lifecycle ───────────────────────────────────────────────────────────────

    useEffect(() => {
        unmountedRef.current = false;
        connect();

        return () => {
            // Clean up on unmount — cancel timers and close the socket.
            unmountedRef.current = true;
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            if (wsRef.current) wsRef.current.close();
            setConnectionState('disconnected');
        };
    }, [connect]);

    // ── Send ────────────────────────────────────────────────────────────────────

    /**
     * Sends a JSON message to the backend.
     * Silently ignores the call if the socket is not open.
     *
     * @param {object} msg - The message to send.
     */
    const sendMessage = useCallback((msg) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(msg));
        }
    }, []);

    return {
        isConnected: connectionState === 'connected',
        connectionState,
        sendMessage,
    };
}
