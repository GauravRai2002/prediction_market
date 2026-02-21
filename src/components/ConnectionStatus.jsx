/**
 * ConnectionStatus.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays the real-time connection status for each venue (Polymarket, Kalshi)
 * and warns the user if a venue has been stale for more than STALE_THRESHOLD_MS.
 *
 * States:
 *   connected    — live WebSocket feed is active
 *   mock         — no API key; using simulated data
 *   reconnecting — connection dropped; trying to reconnect
 *   disconnected — connection lost with no active retry
 *
 * The dot next to each badge pulses when the feed is live/mock (to show
 * that the data is actively updating).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useMemo } from 'react';

// How long without an update before we show a "stale data" warning.
const STALE_THRESHOLD_MS = 10_000;

const LABEL_MAP = {
    polymarket: 'Polymarket',
    kalshi: 'Kalshi',
};

const STATUS_LABEL = {
    connected: 'Live',
    mock: 'Mock Data',
    reconnecting: 'Reconnecting…',
    disconnected: 'Disconnected',
};

/**
 * Returns a human-readable "X seconds ago" string.
 *
 * @param {number|null} timestamp
 * @returns {string}
 */
function timeAgo(timestamp) {
    if (!timestamp) return 'never';
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 2) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    return `${Math.floor(diff / 60)}m ago`;
}

/**
 * @param {{
 *   connectionStatus: { polymarket: string, kalshi: string },
 *   lastUpdated: { polymarket: number|null, kalshi: number|null },
 *   wsConnectionState: string
 * }} props
 */
export default function ConnectionStatus({ connectionStatus, lastUpdated, wsConnectionState }) {
    const venues = ['polymarket', 'kalshi'];

    // Check staleness once per render (time-based, not expensive).
    const stale = useMemo(() => {
        const now = Date.now();
        return {
            polymarket: lastUpdated?.polymarket && (now - lastUpdated.polymarket) > STALE_THRESHOLD_MS,
            kalshi: lastUpdated?.kalshi && (now - lastUpdated.kalshi) > STALE_THRESHOLD_MS,
        };
    }, [lastUpdated]);

    return (
        <div className="status-bar">
            {/* Backend WebSocket connection indicator */}
            <div className={`status-badge ${wsConnectionState === 'connected' ? 'connected' : 'reconnecting'}`}>
                <span className={`status-dot ${wsConnectionState === 'connected' ? 'pulse' : ''}`} />
                Backend {wsConnectionState === 'connected' ? 'Connected' : 'Connecting…'}
            </div>

            {/* Per-venue badges */}
            {venues.map((venue) => {
                const status = connectionStatus?.[venue] ?? 'disconnected';
                const isActive = status === 'connected' || status === 'mock';

                return (
                    <div key={venue} className={`status-badge ${status}`}>
                        <span className={`status-dot ${isActive ? 'pulse' : ''}`} />
                        <span>{LABEL_MAP[venue]}: {STATUS_LABEL[status] ?? status}</span>

                        {/* Last-updated timestamp shown as a subtle suffix */}
                        {lastUpdated?.[venue] && (
                            <span className="status-stale">
                                {stale[venue] ? '⚠ Stale · ' : ''}
                                {timeAgo(lastUpdated[venue])}
                            </span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
