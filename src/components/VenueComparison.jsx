/**
 * VenueComparison.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Side-by-side mini order books showing the individual Polymarket and Kalshi
 * books (before merging), so the user can compare prices across venues.
 *
 * This panel helps answer:
 *   - "At this price level, is the liquidity coming from Polymarket or Kalshi?"
 *   - "Which venue has tighter spreads right now?"
 *
 * Props:
 *  @param {{ polymarket: {bids, asks}, kalshi: {bids, asks} }} byVenue
 *    The per-venue books from the aggregator's `getMergedBook().byVenue`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const LEVELS_TO_SHOW = 5;

/**
 * Formats a price (0–1) as cents string.
 * @param {number} p
 * @returns {string}
 */
const fmtP = (p) => `${(p * 100).toFixed(1)}¢`;

/**
 * Formats size with locale separator.
 * @param {number} s
 * @returns {string}
 */
const fmtS = (s) => s.toLocaleString();

/**
 * Mini order book table for a single venue.
 *
 * @param {{ bids: Array, asks: Array }} book
 * @param {string} venueClass - 'polymarket' | 'kalshi' (used for CSS colour class)
 */
function MiniBook({ book, venueClass }) {
    const asks = (book?.asks || []).slice(0, LEVELS_TO_SHOW).slice().reverse();
    const bids = (book?.bids || []).slice(0, LEVELS_TO_SHOW);

    if (!book || (asks.length === 0 && bids.length === 0)) {
        return <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No data</p>;
    }

    return (
        <table className="order-book-table" style={{ fontSize: 12 }}>
            <thead>
                <tr>
                    <th style={{ textAlign: 'left' }}>Price</th>
                    <th>Size</th>
                </tr>
            </thead>
            <tbody>
                {asks.map((lvl) => (
                    <tr key={`ask-${lvl.price}`} className="ob-row ask">
                        <td><span className="price-ask">{fmtP(lvl.price)}</span></td>
                        <td>{fmtS(lvl.size)}</td>
                    </tr>
                ))}
                {/* Spread row */}
                <tr className="ob-spread-row">
                    <td colSpan={2} style={{ textAlign: 'center', padding: '3px' }}>
                        {(() => {
                            const ba = book?.asks?.[0]?.price ?? null;
                            const bb = book?.bids?.[0]?.price ?? null;
                            const spread = ba !== null && bb !== null ? ((ba - bb) * 100).toFixed(1) : null;
                            return spread ? `${spread}¢ spread` : '—';
                        })()}
                    </td>
                </tr>
                {bids.map((lvl) => (
                    <tr key={`bid-${lvl.price}`} className="ob-row bid">
                        <td><span className="price-bid">{fmtP(lvl.price)}</span></td>
                        <td>{fmtS(lvl.size)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/**
 * @param {{
 *   byVenue: { polymarket: {bids, asks}, kalshi: {bids, asks} }
 * }} props
 */
export default function VenueComparison({ byVenue }) {
    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">Venue Comparison</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Top {LEVELS_TO_SHOW} levels each</span>
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
