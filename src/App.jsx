/**
 * App.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Root application component.
 *
 * State management:
 *   - `orderBook`     — the latest merged book received from the backend.
 *   - `quoteResult`   — the latest quote calculation result from the backend.
 *   - `pendingQuoteId`— correlation ID for the in-flight quote request,
 *                       used to match responses to requests.
 *
 * Data flow:
 *   useWebSocket → dispatches incoming messages → App state → child components
 *   QuoteCalculator → onRequestQuote → sendMessage(get_quote) → backend
 *   backend → quote_result → App state → QuoteCalculator
 *
 * The market information is hardcoded here (question text, market metadata).
 * In a production app this would be fetched from an API.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useCallback, useId } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import ConnectionStatus from './components/ConnectionStatus';
import OrderBook from './components/OrderBook';
import VenueComparison from './components/VenueComparison';
import QuoteCalculator from './components/QuoteCalculator';

// ── Market metadata (configurable) ───────────────────────────────────────────
const MARKET = {
  title: '2028 US Presidential Prediction Market',
  question: 'Will Gina Raimondo win the 2028 Democratic Presidential Nomination?',
  outcomes: ['YES', 'NO'],
};

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  // The most recent merged order book from the backend.
  const [orderBook, setOrderBook] = useState(null);

  // The most recent quote calculation result.
  const [quoteResult, setQuoteResult] = useState(null);

  // Pending quote request ID — used to correlate responses to requests.
  const [pendingQuoteId, setPendingQuoteId] = useState(null);

  // Stable ID prefix for quote request correlation.
  const idPrefix = useId();
  let quoteSeq = 0;

  /**
   * Handles all incoming server messages.
   *
   * book_update  → update global order book state
   * quote_result → update quote result (matched by ID)
   * quote_error  → cleared quote result, log error
   */
  const handleServerMessage = useCallback((msg) => {
    if (msg.type === 'book_update') {
      setOrderBook(msg.payload);
    } else if (msg.type === 'quote_result') {
      // Only accept results for the most recently issued request.
      setQuoteResult(msg.payload);
      setPendingQuoteId(null);
    } else if (msg.type === 'quote_error') {
      console.warn('[App] Quote error from server:', msg.error);
      setQuoteResult(null);
      setPendingQuoteId(null);
    }
  }, []);

  const { isConnected, connectionState, sendMessage } = useWebSocket(handleServerMessage);

  /**
   * Sends a quote request to the backend.
   * Each request gets a unique ID so stale responses can be ignored.
   *
   * @param {number} dollarAmount
   * @param {string} outcome - 'YES' | 'NO'
   */
  const requestQuote = useCallback((dollarAmount, outcome) => {
    const id = `${idPrefix}-${++quoteSeq}`;
    setPendingQuoteId(id);
    sendMessage({ type: 'get_quote', id, payload: { dollarAmount, outcome } });
  }, [sendMessage, idPrefix]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="app-shell">
      {/* ── Page Header ── */}
      <header className="app-header">
        <div>
          <h1>{MARKET.title}</h1>
          <p className="market-question">{MARKET.question}</p>
        </div>

        <div className="market-stats">
          {orderBook?.midPrice != null && (
            <div className="stat-item">
              <div className="stat-label">YES Mid</div>
              <div className="stat-value positive">
                {(orderBook.midPrice * 100).toFixed(1)}¢
              </div>
            </div>
          )}
          {orderBook?.midPrice != null && (
            <div className="stat-item">
              <div className="stat-label">NO Mid</div>
              <div className="stat-value negative">
                {((1 - orderBook.midPrice) * 100).toFixed(1)}¢
              </div>
            </div>
          )}
          {orderBook?.spread != null && (
            <div className="stat-item">
              <div className="stat-label">Spread</div>
              <div className="stat-value">
                {(orderBook.spread * 100).toFixed(2)}¢
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Connection Status Bar ── */}
      <ConnectionStatus
        connectionStatus={orderBook?.connectionStatus}
        lastUpdated={orderBook?.lastUpdated}
        wsConnectionState={connectionState}
      />

      <div className="divider" style={{ marginTop: 16 }} />

      {/* ── Main Content Grid ── */}
      <div className="grid-main" style={{ marginTop: 24 }}>
        {/* Left column: main order book + venue comparison */}
        <div className="grid-left">
          <OrderBook book={orderBook} maxLevels={12} />
          <VenueComparison byVenue={orderBook?.byVenue} />
        </div>

        {/* Right column: quote calculator */}
        <div className="grid-right">
          <QuoteCalculator
            onRequestQuote={requestQuote}
            quoteResult={quoteResult}
            isConnected={isConnected}
          />

          {/* ── Legend card ── */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Legend</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="venue-tag polymarket">PM</span>
                Liquidity sourced from Polymarket only
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="venue-tag kalshi">KS</span>
                Liquidity sourced from Kalshi only
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="venue-tag both">Both</span>
                Liquidity present on both venues at this price
              </div>
              <div className="divider" />
              <div style={{ color: 'var(--bid-color)' }}>Green prices = Bids (buyers)</div>
              <div style={{ color: 'var(--ask-color)' }}>Red prices = Asks (sellers)</div>
              <div className="divider" />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Prices shown in cents (¢) on a 0–100 scale.<br />
                55¢ = 55% implied probability of YES.<br />
                Quote Calculator sweeps the merged order book using price-time priority.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
