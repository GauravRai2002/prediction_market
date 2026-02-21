/**
 * QuoteCalculator.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Allows the user to enter a dollar amount and select YES/NO, then shows:
 *   - Summary cards for shares, avg price, amount spent
 *   - Venue fill split with gradient bar
 *   - Unfilled amount warning
 *
 * Debounced input (300ms) so we don't fire a request on every keystroke.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from 'react';

const DEBOUNCE_MS = 300;

const fmtUSD = (n) =>
    n !== undefined && n !== null ? `$${parseFloat(n).toFixed(2)}` : '—';

const fmtShares = (n) =>
    n !== undefined && n !== null ? parseFloat(n).toFixed(2) : '—';

export default function QuoteCalculator({ onRequestQuote, quoteResult, isConnected }) {
    const [amount, setAmount] = useState('');
    const [outcome, setOutcome] = useState('YES');
    const debounceRef = useRef(null);

    useEffect(() => {
        const parsed = parseFloat(amount);
        if (!isConnected || isNaN(parsed) || parsed <= 0) return;

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            onRequestQuote(parsed, outcome);
        }, DEBOUNCE_MS);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [amount, outcome, isConnected, onRequestQuote]);

    const pmDollars = quoteResult?.fillsByVenue?.polymarket?.dollars ?? 0;
    const ksDollars = quoteResult?.fillsByVenue?.kalshi?.dollars ?? 0;
    const totalFilled = pmDollars + ksDollars;
    const pmPct = totalFilled > 0 ? (pmDollars / totalFilled) * 100 : 50;
    const ksPct = totalFilled > 0 ? (ksDollars / totalFilled) * 100 : 50;
    const hasResult = quoteResult && quoteResult.totalShares > 0;

    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">Quote Calculator</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Simulation only
                </span>
            </div>

            <div className="quote-form">
                {/* ── Dollar amount input ── */}
                <div className="form-group">
                    <label className="form-label" htmlFor="amount-input">
                        Amount to spend
                    </label>
                    <div className="input-wrapper">
                        <span className="input-prefix">$</span>
                        <input
                            id="amount-input"
                            className="form-input"
                            type="number"
                            min="1"
                            step="1"
                            placeholder="100"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                </div>

                {/* ── YES / NO toggle ── */}
                <div className="form-group">
                    <label className="form-label">Outcome</label>
                    <div className="toggle-group">
                        <button
                            className={`toggle-btn ${outcome === 'YES' ? 'active-yes' : ''}`}
                            onClick={() => setOutcome('YES')}
                        >
                            ▲ YES
                        </button>
                        <button
                            className={`toggle-btn ${outcome === 'NO' ? 'active-no' : ''}`}
                            onClick={() => setOutcome('NO')}
                        >
                            ▼ NO
                        </button>
                    </div>
                </div>

                {/* ── Connection warning ── */}
                {!isConnected && (
                    <div className="warning-banner">
                        ⚠ Not connected to backend — quotes unavailable.
                    </div>
                )}

                {/* ── Quote result with summary cards ── */}
                {hasResult && isConnected && (
                    <div className="quote-result">
                        {/* Summary grid */}
                        <div className="quote-summary-grid">
                            <div className="quote-summary-item highlight">
                                <div className="quote-summary-label">Shares</div>
                                <div className="quote-summary-value shares">
                                    {fmtShares(quoteResult.totalShares)}
                                </div>
                            </div>
                            <div className="quote-summary-item">
                                <div className="quote-summary-label">Avg. Price</div>
                                <div className="quote-summary-value price">
                                    {quoteResult.effectiveAvgPrice
                                        ? `${(quoteResult.effectiveAvgPrice * 100).toFixed(2)}¢`
                                        : '—'}
                                </div>
                            </div>
                            <div className="quote-summary-item">
                                <div className="quote-summary-label">Spent</div>
                                <div className="quote-summary-value spent">
                                    {fmtUSD(parseFloat(amount) - (quoteResult.unfilled ?? 0))}
                                </div>
                            </div>
                            {quoteResult.unfilled > 0 && (
                                <div className="quote-summary-item" style={{
                                    borderColor: 'rgba(245, 158, 11, 0.2)',
                                    background: 'rgba(245, 158, 11, 0.04)',
                                }}>
                                    <div className="quote-summary-label" style={{ color: 'var(--warn-color)' }}>
                                        ⚠ Unfilled
                                    </div>
                                    <div className="quote-summary-value warn">
                                        {fmtUSD(quoteResult.unfilled)}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Venue fill breakdown ── */}
                        <div className="quote-fill-breakdown">
                            <div className="form-label" style={{ marginBottom: 8 }}>Fill breakdown by venue</div>

                            <div className="fill-bar-container">
                                <div
                                    className="fill-bar-segment polymarket"
                                    style={{ width: `${pmPct}%` }}
                                />
                                <div
                                    className="fill-bar-segment kalshi"
                                    style={{ width: `${ksPct}%` }}
                                />
                            </div>

                            <div className="fill-breakdown-labels">
                                <div className="fill-label">
                                    <div className="fill-dot polymarket" />
                                    <span style={{ color: 'var(--poly-primary)' }}>
                                        PM — {fmtUSD(pmDollars)} / {fmtShares(quoteResult.fillsByVenue.polymarket.shares)} sh
                                    </span>
                                </div>
                                <div className="fill-label">
                                    <div className="fill-dot kalshi" />
                                    <span style={{ color: 'var(--kalshi-primary)' }}>
                                        KS — {fmtUSD(ksDollars)} / {fmtShares(quoteResult.fillsByVenue.kalshi.shares)} sh
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Loading state ── */}
                {!hasResult && isConnected && parseFloat(amount) > 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '16px 0',
                    }}>
                        <div className="shimmer-row" style={{ width: '80%', margin: '0 auto', height: 20 }} />
                        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
                            Calculating…
                        </p>
                    </div>
                )}

                {!amount && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.7 }}>
                        Enter a dollar amount to see how your order would be filled across both venues.
                    </p>
                )}
            </div>
        </div>
    );
}
