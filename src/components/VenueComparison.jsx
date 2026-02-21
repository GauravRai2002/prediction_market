/**
 * VenueComparison.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Side-by-side mini order books showing individual Polymarket and Kalshi
 * books (before merging) for direct venue comparison.
 *
 * Enhanced with:
 *  - Best bid/ask highlight
 *  - Per-venue spread display
 *  - Depth bar visualization in mini books
 * ─────────────────────────────────────────────────────────────────────────────
 */

const LEVELS_TO_SHOW = 5;

const fmtP = (p) => `${(p * 100).toFixed(1)}¢`;
const fmtS = (s) => s.toLocaleString();

/**
 * Mini order book table for a single venue.
 */
function MiniBook({ book, venueClass }) {
    const asks = (book?.asks || []).slice(0, LEVELS_TO_SHOW).slice().reverse();
    const bids = (book?.bids || []).slice(0, LEVELS_TO_SHOW);

    if (!book || (asks.length === 0 && bids.length === 0)) {
        return (
            <div style={{ padding: '16px 0', textAlign: 'center' }}>
                <div className="shimmer-row" style={{ width: '70%', margin: '0 auto 8px', height: 14 }} />
                <div className="shimmer-row" style={{ width: '55%', margin: '0 auto 8px', height: 14 }} />
                <div className="shimmer-row" style={{ width: '65%', margin: '0 auto', height: 14 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 8 }}>Waiting…</p>
            </div>
        );
    }

    // Max size for depth bar scaling
    const allSizes = [...asks, ...bids].map(l => l.size);
    const maxSize = Math.max(...allSizes, 1);

    // Compute spread
    const bestAsk = book?.asks?.[0]?.price ?? null;
    const bestBid = book?.bids?.[0]?.price ?? null;
    const spread = bestAsk !== null && bestBid !== null ? ((bestAsk - bestBid) * 100).toFixed(1) : null;

    return (
        <table className="order-book-table" style={{ fontSize: 12 }}>
            <thead>
                <tr>
                    <th style={{ textAlign: 'left' }}>Price</th>
                    <th>Size</th>
                </tr>
            </thead>
            <tbody>
                {asks.map((lvl, i) => {
                    const isBest = i === asks.length - 1; // best ask is last in reversed array
                    const depthPct = maxSize > 0 ? (lvl.size / maxSize) * 100 : 0;
                    return (
                        <tr key={`ask-${lvl.price}`} className="ob-row ask" style={isBest ? { background: 'var(--ask-dim)' } : {}}>
                            <td style={{ position: 'relative' }}>
                                <div className="ob-depth-bar" style={{ width: `${depthPct}%` }} />
                                <span className="price-ask">{fmtP(lvl.price)}</span>
                            </td>
                            <td>{fmtS(lvl.size)}</td>
                        </tr>
                    );
                })}
                {/* Spread row */}
                <tr className="ob-spread-row">
                    <td colSpan={2} style={{ textAlign: 'center', padding: '4px' }}>
                        {spread ? `${spread}¢ spread` : '—'}
                    </td>
                </tr>
                {bids.map((lvl, i) => {
                    const isBest = i === 0;
                    const depthPct = maxSize > 0 ? (lvl.size / maxSize) * 100 : 0;
                    return (
                        <tr key={`bid-${lvl.price}`} className="ob-row bid" style={isBest ? { background: 'var(--bid-dim)' } : {}}>
                            <td style={{ position: 'relative' }}>
                                <div className="ob-depth-bar" style={{ width: `${depthPct}%` }} />
                                <span className="price-bid">{fmtP(lvl.price)}</span>
                            </td>
                            <td>{fmtS(lvl.size)}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

export default function VenueComparison({ byVenue }) {
    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">Venue Comparison</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Top {LEVELS_TO_SHOW} levels
                </span>
            </div>

            <div className="venue-comparison">
                {/* ── Polymarket Panel ── */}
                <div className="venue-panel">
                    <div className="venue-panel-header polymarket">
                        <div className="venue-dot" />
                        Polymarket
                    </div>
                    <MiniBook book={byVenue?.polymarket} venueClass="polymarket" />
                </div>

                {/* ── Kalshi Panel ── */}
                <div className="venue-panel">
                    <div className="venue-panel-header kalshi">
                        <div className="venue-dot" />
                        Kalshi
                    </div>
                    <MiniBook book={byVenue?.kalshi} venueClass="kalshi" />
                </div>
            </div>
        </div>
    );
}
