/**
 * OrderBook.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders the combined order book table (asks on top, bids on bottom),
 * colour-coded by venue with a depth-visualisation bar behind each row.
 *
 * Key design decisions:
 *  - Asks are shown descending from the top (closest ask at the bottom of
 *    the asks section, adjacent to the spread row) — matching industry-standard
 *    order book layout.
 *  - Bids are shown descending from just below the spread (best bid first).
 *  - Each row has an absolute-positioned depth bar whose width is proportional
 *    to the level's size relative to the maximum size in that side.
 *  - Rows flash briefly (CSS animation) when their price or size changes,
 *    giving instant visual feedback without being distracting.
 *  - The `venue` field on each level drives colour coding:
 *      polymarket → blue, kalshi → emerald, both → purple
 *
 * Props:
 *  @param {object}  book         - Full merged order book from the aggregator.
 *  @param {number}  maxLevels    - How many levels to show per side (default 10).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useRef, useEffect, useState } from 'react';

const DEFAULT_MAX_LEVELS = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Formats a price (0–1) as a percentage string (e.g. 0.55 → "55.0¢")
 *
 * @param {number} price
 * @returns {string}
 */
const fmtPrice = (price) => `${(price * 100).toFixed(1)}¢`;

/**
 * Formats a share size with comma separators.
 *
 * @param {number} size
 * @returns {string}
 */
const fmtSize = (size) => size.toLocaleString();

/**
 * Computes a stable key string for a level (used as React key + change detection).
 *
 * @param {{price: number, size: number}} level
 * @returns {string}
 */
const levelKey = (level) => `${level.price.toFixed(4)}-${level.size}`;

// ── Sub-components ────────────────────────────────────────────────────────────

/**
 * A single order book row.
 * Handles its own flash animation when the level changes.
 */
function OrderBookRow({ level, side, maxSize }) {
    const prevKeyRef = useRef(null);
    const [isFlashing, setIsFlashing] = useState(false);

    const currentKey = levelKey(level);

    useEffect(() => {
        // Flash only when the level has actually changed (not on first render).
        if (prevKeyRef.current !== null && prevKeyRef.current !== currentKey) {
            setIsFlashing(true);
            const t = setTimeout(() => setIsFlashing(false), 600);
            return () => clearTimeout(t);
        }
        prevKeyRef.current = currentKey;
    }, [currentKey]);

    // Depth bar width as a percentage of the largest level on this side.
    const depthPct = maxSize > 0 ? Math.min(100, (level.size / maxSize) * 100) : 0;

    return (
        <tr className={`ob-row ${side} ${isFlashing ? 'flash-update' : ''}`}>
            {/* Depth bar is a pseudo-element because CSS alone can't do percentage
          width in a table cell — we use an absolutely-positioned div instead. */}
            <td style={{ position: 'relative' }}>
                <div
                    className="ob-depth-bar"
                    style={{ width: `${depthPct}%` }}
                />
                <span className={`price-${side}`}>{fmtPrice(level.price)}</span>
            </td>
            <td>{fmtSize(level.size)}</td>
            <td>{fmtSize(level.polymarketSize || 0)}</td>
            <td>{fmtSize(level.kalshiSize || 0)}</td>
            <td>
                <span className={`venue-tag ${level.venue}`}>
                    {level.venue === 'both' ? 'Both' : level.venue === 'polymarket' ? 'PM' : 'KS'}
                </span>
            </td>
        </tr>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

/**
 * @param {{
 *   book: { bids, asks, spread, midPrice },
 *   maxLevels: number
 * }} props
 */
export default function OrderBook({ book, maxLevels = DEFAULT_MAX_LEVELS }) {
    if (!book) {
        return (
            <div className="card">
                <div className="card-header"><span className="card-title">Combined Order Book</span></div>
                <p style={{ color: 'var(--text-muted)', padding: '16px 0', textAlign: 'center' }}>
                    Waiting for data…
                </p>
            </div>
        );
    }

    // Asks display: ascending price, but we want to show them reversed
    // (highest ask at top, best ask just above the spread row).
    const asks = (book.asks || []).slice(0, maxLevels).slice().reverse();
    const bids = (book.bids || []).slice(0, maxLevels);

    // Max sizes for depth bar scaling (computed per side independently).
    const maxAskSize = Math.max(...(book.asks || []).slice(0, maxLevels).map((l) => l.size), 1);
    const maxBidSize = Math.max(...bids.map((l) => l.size), 1);

    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">Combined Order Book</span>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {book.midPrice != null && (
                        <span>Mid: <span className="mono" style={{ color: 'var(--text-primary)' }}>{fmtPrice(book.midPrice)}</span></span>
                    )}
                    {book.spread != null && (
                        <span>Spread: <span className="mono" style={{ color: 'var(--text-primary)' }}>{(book.spread * 100).toFixed(1)}¢</span></span>
                    )}
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table className="order-book-table">
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left' }}>Price</th>
                            <th>Total Size</th>
                            <th style={{ color: 'var(--poly-primary)' }}>PM Size</th>
                            <th style={{ color: 'var(--kalshi-primary)' }}>KS Size</th>
                            <th>Venue</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* ── Asks (sellers) — shown in reverse so best ask is nearest spread ── */}
                        {asks.map((level) => (
                            <OrderBookRow
                                key={level.price.toFixed(4)}
                                level={level}
                                side="ask"
                                maxSize={maxAskSize}
                            />
                        ))}

                        {/* ── Spread divider ── */}
                        <tr className="ob-spread-row">
                            <td colSpan={5}>
                                Spread
                                <span className="spread-value">
                                    {book.spread != null ? `${(book.spread * 100).toFixed(2)}¢` : '—'}
                                </span>
                                {book.midPrice != null && (
                                    <span className="spread-value" style={{ marginLeft: 16 }}>
                                        Mid: {fmtPrice(book.midPrice)}
                                    </span>
                                )}
                            </td>
                        </tr>

                        {/* ── Bids (buyers) — best bid first ── */}
                        {bids.map((level) => (
                            <OrderBookRow
                                key={level.price.toFixed(4)}
                                level={level}
                                side="bid"
                                maxSize={maxBidSize}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
