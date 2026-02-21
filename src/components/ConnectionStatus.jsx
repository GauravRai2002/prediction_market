/**
 * ConnectionStatus.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays real-time connection status for each venue with enhanced visual
 * indicators. Shows staleness warnings when data hasn't updated recently.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useMemo } from 'react';

const STALE_THRESHOLD_MS = 10_000;

const LABEL_MAP = {
    polymarket: 'Polymarket',
    kalshi: 'Kalshi',
};

const STATUS_LABEL = {
    connected: 'Live',
    mock: 'Mock',
    reconnecting: 'Reconnecting…',
    disconnected: 'Disconnected',
};

const STATUS_ICON = {
    connected: '🟢',
    mock: '🟡',
    reconnecting: '🔄',
    disconnected: '🔴',
};

function timeAgo(timestamp) {
    if (!timestamp) return 'never';
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 2) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    return `${Math.floor(diff / 60)}m ago`;
}

export default function ConnectionStatus({ connectionStatus, lastUpdated, wsConnectionState }) {
    const venues = ['polymarket', 'kalshi'];

    const stale = useMemo(() => {
        const now = Date.now();
        return {
            polymarket: lastUpdated?.polymarket && (now - lastUpdated.polymarket) > STALE_THRESHOLD_MS,
            kalshi: lastUpdated?.kalshi && (now - lastUpdated.kalshi) > STALE_THRESHOLD_MS,
        };
    }, [lastUpdated]);

    return (
        <div className="status-bar">
            {/* Backend connection */}
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
                        <span style={{ fontWeight: 700 }}>{LABEL_MAP[venue]}</span>
                        <span style={{ opacity: 0.8 }}>{STATUS_LABEL[status] ?? status}</span>

                        {lastUpdated?.[venue] && (
                            <span className="status-stale" style={{ marginLeft: 2 }}>
                                {stale[venue] ? '⚠ Stale · ' : '· '}
                                {timeAgo(lastUpdated[venue])}
                            </span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
