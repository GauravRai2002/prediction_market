/**
 * QuoteCalculator.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Allows the user to enter a dollar amount and select YES or NO, then shows:
 *   - How many total shares they would receive
 *   - The effective average fill price
 *   - A split showing how many dollars/shares would be filled at each venue
 *   - A visual bar showing the Polymarket vs Kalshi proportion of the order
 *
 * The quote request is sent to the backend as a WebSocket message.
 * The backend sweeps the merged order book and returns the fill breakdown.
 *
 * We debounce the input by 300 ms so we don't fire a request on every keystroke.
 *
 * Props:
 *  @param {Function} onRequestQuote - `(dollarAmount, outcome) => void`
 *    Call to send a quote request to the backend.
 *  @param {object|null} quoteResult - The latest `quote_result` payload from server.
 *  @param {boolean}     isConnected - Whether the backend WebSocket is up.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from 'react';

const DEBOUNCE_MS = 300;

/**
 * Formats a dollar value.
 * @param {number} n
 * @returns {string}
 */
const fmtUSD = (n) =>
    n !== undefined && n !== null ? `$${parseFloat(n).toFixed(2)}` : '—';

/**
 * Formats a share count to 2 decimal places.
 * @param {number} n
 * @returns {string}
 */
const fmtShares = (n) =>
    n !== undefined && n !== null ? parseFloat(n).toFixed(2) : '—';

/**
 * @param {{
 *   onRequestQuote: (dollarAmount: number, outcome: string) => void,
 *   quoteResult: object|null,
 *   isConnected: boolean
 * }} props
 */
export default function QuoteCalculator({ onRequestQuote, quoteResult, isConnected }) {
    const [amount, setAmount] = useState('');
    const [outcome, setOutcome] = useState('YES');

    // Debounce timer reference.
    const debounceRef = useRef(null);

    // Fire a quote request whenever amount or outcome changes (debounced).
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

    // ── Derived display values from the quote result ───────────────────────────

    const pmDollars = quoteResult?.fillsByVenue?.polymarket?.dollars ?? 0;
    const ksDollars = quoteResult?.fillsByVenue?.kalshi?.dollars ?? 0;
    const totalFilled = pmDollars + ksDollars;

    // Proportion of the fill handled by each venue (for the bar chart).
    const pmPct = totalFilled > 0 ? (pmDollars / totalFilled) * 100 : 50;
    const ksPct = totalFilled > 0 ? (ksDollars / totalFilled) * 100 : 50;

    const hasResult = quoteResult && quoteResult.totalShares > 0;

    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">Quote Calculator</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Simulation only</span>
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
                            YES
                        </button>
                        <button
                            className={`toggle-btn ${outcome === 'NO' ? 'active-no' : ''}`}
                            onClick={() => setOutcome('NO')}
                        >
                            NO
                        </button>
                    </div>
                </div>

                {/* ── Connection warning ── */}
                {!isConnected && (
                    <div className="warning-banner">
                        ⚠ Not connected to backend — quotes unavailable.
                    </div>
                )}

                {/* ── Quote result ── */}
                {hasResult && isConnected && (
                    <div className="quote-result">
                        <div className="quote-metric">
                            <span className="quote-metric-label">Total shares received</span>
                            <span className="quote-metric-value">{fmtShares(quoteResult.totalShares)}</span>
                        </div>
                        <div className="quote-metric">
                            <span className="quote-metric-label">Effective avg. price</span>
                            <span className="quote-metric-value">
                                {quoteResult.effectiveAvgPrice
                                    ? `${(quoteResult.effectiveAvgPrice * 100).toFixed(2)}¢`
                                    : '—'}
                            </span>
                        </div>
                        <div className="quote-metric">
                            <span className="quote-metric-label">Amount spent</span>
                            <span className="quote-metric-value">
                                {fmtUSD(parseFloat(amount) - (quoteResult.unfilled ?? 0))}
                            </span>
                        </div>
                        {quoteResult.unfilled > 0 && (
                            <div className="quote-metric">
                                <span className="quote-metric-label" style={{ color: 'var(--warn-color)' }}>
                                    ⚠ Unfilled (insufficient depth)
                                </span>
                                <span className="quote-metric-value" style={{ color: 'var(--warn-color)' }}>
                                    {fmtUSD(quoteResult.unfilled)}
                                </span>
                            </div>
                        )}

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
                                        Polymarket — {fmtUSD(pmDollars)} / {fmtShares(quoteResult.fillsByVenue.polymarket.shares)} sh
                                    </span>
                                </div>
                                <div className="fill-label">
                                    <div className="fill-dot kalshi" />
                                    <span style={{ color: 'var(--kalshi-primary)' }}>
                                        Kalshi — {fmtUSD(ksDollars)} / {fmtShares(quoteResult.fillsByVenue.kalshi.shares)} sh
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Empty state ── */}
                {!hasResult && isConnected && parseFloat(amount) > 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                        Calculating…
                    </p>
                )}

                {!amount && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        Enter a dollar amount to see how your order would be filled across both venues.
                    </p>
                )}
            </div>
        </div>
    );
}
