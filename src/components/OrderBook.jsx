/**
 * OrderBook.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders the combined order book table (asks on top, bids on bottom),
 * colour-coded by venue with depth-visualisation bars and cumulative size.
 *
 * Features:
 *  - Industry-standard layout (best ask nearest spread, best bid below)
 *  - Depth bars proportional to level size
 *  - Cumulative depth column
 *  - Flash animation on updates
 *  - Shimmer loading skeleton when waiting for data
 *  - Venue colour coding: polymarket=blue, kalshi=emerald, both=purple
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useRef, useEffect, useState } from 'react';

const DEFAULT_MAX_LEVELS = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtPrice = (price) => `${(price * 100).toFixed(1)}¢`;
const fmtSize = (size) => size.toLocaleString();
const levelKey = (level) => `${level.price.toFixed(4)}-${level.size}`;

// ── Row Component ─────────────────────────────────────────────────────────────

function OrderBookRow({ level, side, maxSize, cumulativeSize, maxCumulative }) {
    const prevKeyRef = useRef(null);
    const [isFlashing, setIsFlashing] = useState(false);

    const currentKey = levelKey(level);

    useEffect(() => {
        if (prevKeyRef.current !== null && prevKeyRef.current !== currentKey) {
            setIsFlashing(true);
            const t = setTimeout(() => setIsFlashing(false), 700);
            return () => clearTimeout(t);
        }
        prevKeyRef.current = currentKey;
    }, [currentKey]);

    const depthPct = maxSize > 0 ? Math.min(100, (level.size / maxSize) * 100) : 0;
    const cumPct = maxCumulative > 0 ? Math.min(100, (cumulativeSize / maxCumulative) * 100) : 0;

    return (
        <tr className={`ob-row ${side} ${isFlashing ? 'flash-update' : ''}`}>
            <td style={{ position: 'relative' }}>
                <div className="ob-depth-bar" style={{ width: `${depthPct}%` }} />
                <span className={`price-${side}`}>{fmtPrice(level.price)}</span>
            </td>
            <td>{fmtSize(level.size)}</td>
            <td className="cumulative-size" style={{ opacity: 0.4 + (cumPct / 100) * 0.6 }}>
                {fmtSize(cumulativeSize)}
            </td>
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

// ── Shimmer Skeleton ──────────────────────────────────────────────────────────

function OrderBookSkeleton() {
    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">Combined Order Book</span>
            </div>
            <div className="shimmer-container">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="shimmer-row" style={{ width: `${60 + Math.random() * 40}%` }} />
                ))}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
                Waiting for market data…
            </p>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function OrderBook({ book, maxLevels = DEFAULT_MAX_LEVELS }) {
    if (!book) {
        return <OrderBookSkeleton />;
    }

    // Asks: ascending price, reversed so highest is at top, best ask near spread
    const asks = (book.asks || []).slice(0, maxLevels).slice().reverse();
    const bids = (book.bids || []).slice(0, maxLevels);

    // Max sizes for depth bar scaling
    const maxAskSize = Math.max(...(book.asks || []).slice(0, maxLevels).map((l) => l.size), 1);
    const maxBidSize = Math.max(...bids.map((l) => l.size), 1);

    // Cumulative sizes (from best to worst for each side)
    const asksCumulative = [];
    let cumAsk = 0;
    // asks are reversed, so cumulative goes from near-spread outward
    for (let i = asks.length - 1; i >= 0; i--) {
        cumAsk += asks[i].size;
        asksCumulative[i] = cumAsk;
    }

    const bidsCumulative = [];
    let cumBid = 0;
    for (let i = 0; i < bids.length; i++) {
        cumBid += bids[i].size;
        bidsCumulative[i] = cumBid;
    }

    const maxAskCumulative = cumAsk;
    const maxBidCumulative = cumBid;

    // Total depth summary
    const totalBidDepth = bids.reduce((acc, l) => acc + l.size, 0);
    const totalAskDepth = asks.reduce((acc, l) => acc + l.size, 0);
    const totalDepth = totalBidDepth + totalAskDepth;
    const bidPct = totalDepth > 0 ? ((totalBidDepth / totalDepth) * 100).toFixed(0) : 50;

    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">Combined Order Book</span>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)', alignItems: 'center' }}>
                    {book.midPrice != null && (
                        <span>Mid: <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{fmtPrice(book.midPrice)}</span></span>
                    )}
                    {book.spread != null && (
                        <span>Spread: <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{(book.spread * 100).toFixed(1)}¢</span></span>
                    )}
                </div>
            </div>

            {/* Depth imbalance bar */}
            <div style={{ marginBottom: 16 }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    marginBottom: 4,
                    fontWeight: 600,
                    letterSpacing: '0.04em'
                }}>
                    <span style={{ color: 'var(--bid-color)' }}>Bids {bidPct}%</span>
                    <span style={{ color: 'var(--ask-color)' }}>Asks {100 - bidPct}%</span>
                </div>
                <div style={{
                    height: 4,
                    borderRadius: 2,
                    display: 'flex',
                    overflow: 'hidden',
                    background: 'var(--bg-surface)',
                }}>
                    <div style={{
                        width: `${bidPct}%`,
                        background: 'var(--bid-color)',
                        transition: 'width 500ms cubic-bezier(0.4,0,0.2,1)',
                        opacity: 0.6,
                    }} />
                    <div style={{
                        flex: 1,
                        background: 'var(--ask-color)',
                        transition: 'width 500ms cubic-bezier(0.4,0,0.2,1)',
                        opacity: 0.6,
                    }} />
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table className="order-book-table">
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left' }}>Price</th>
                            <th>Size</th>
                            <th>Cumulative</th>
                            <th style={{ color: 'var(--poly-primary)' }}>PM</th>
                            <th style={{ color: 'var(--kalshi-primary)' }}>KS</th>
                            <th>Source</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* ── Asks ── */}
                        {asks.map((level, i) => (
                            <OrderBookRow
                                key={level.price.toFixed(4)}
                                level={level}
                                side="ask"
                                maxSize={maxAskSize}
                                cumulativeSize={asksCumulative[i]}
                                maxCumulative={maxAskCumulative}
                            />
                        ))}

                        {/* ── Spread divider ── */}
                        <tr className="ob-spread-row">
                            <td colSpan={6}>
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

                        {/* ── Bids ── */}
                        {bids.map((level, i) => (
                            <OrderBookRow
                                key={level.price.toFixed(4)}
                                level={level}
                                side="bid"
                                maxSize={maxBidSize}
                                cumulativeSize={bidsCumulative[i]}
                                maxCumulative={maxBidCumulative}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
