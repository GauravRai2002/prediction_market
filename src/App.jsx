/**
 * App.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Root application component.
 *
 * State management:
 *   - `orderBook`     — the latest merged book received from the backend.
 *   - `quoteResult`   — the latest quote calculation result from the backend.
 *   - `pendingQuoteId`— correlation ID for the in-flight quote request.
 *
 * Data flow:
 *   useWebSocket → dispatches incoming messages → App state → child components
 *   QuoteCalculator → onRequestQuote → sendMessage(get_quote) → backend
 *   backend → quote_result → App state → QuoteCalculator
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useCallback, useId } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import ConnectionStatus from './components/ConnectionStatus';
import OrderBook from './components/OrderBook';
import VenueComparison from './components/VenueComparison';
import QuoteCalculator from './components/QuoteCalculator';

// ── Market metadata ──────────────────────────────────────────────────────────
const MARKET = {
  title: 'Prediction Market Aggregator',
  question: 'Will Gina Raimondo win the 2028 Democratic Presidential Nomination?',
  outcomes: ['YES', 'NO'],
};

// ── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [orderBook, setOrderBook] = useState(null);
  const [quoteResult, setQuoteResult] = useState(null);
  const [pendingQuoteId, setPendingQuoteId] = useState(null);
  const idPrefix = useId();
  let quoteSeq = 0;

  const handleServerMessage = useCallback((msg) => {
    if (msg.type === 'book_update') {
      setOrderBook(msg.payload);
    } else if (msg.type === 'quote_result') {
      setQuoteResult(msg.payload);
      setPendingQuoteId(null);
    } else if (msg.type === 'quote_error') {
      console.warn('[App] Quote error from server:', msg.error);
      setQuoteResult(null);
      setPendingQuoteId(null);
    }
  }, []);

  const { isConnected, connectionState, sendMessage } = useWebSocket(handleServerMessage);

  const requestQuote = useCallback((dollarAmount, outcome) => {
    const id = `${idPrefix}-${++quoteSeq}`;
    setPendingQuoteId(id);
    sendMessage({ type: 'get_quote', id, payload: { dollarAmount, outcome } });
  }, [sendMessage, idPrefix]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const yesProbability = orderBook?.midPrice != null
    ? (orderBook.midPrice * 100).toFixed(1)
    : null;
  const noProbability = orderBook?.midPrice != null
    ? ((1 - orderBook.midPrice) * 100).toFixed(1)
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="app-header">
        <div>
          <h1>{MARKET.title}</h1>
          <p className="market-question">{MARKET.question}</p>
          {yesProbability && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <span className="probability-badge yes">
                YES {yesProbability}%
              </span>
              <span className="probability-badge no">
                NO {noProbability}%
              </span>
            </div>
          )}
        </div>

        <div className="market-stats">
          {orderBook?.midPrice != null && (
            <div className="stat-item">
              <div className="stat-label">Yes Price</div>
              <div className="stat-value positive">
                {(orderBook.midPrice * 100).toFixed(1)}¢
              </div>
            </div>
          )}
          {orderBook?.midPrice != null && (
            <div className="stat-item">
              <div className="stat-label">No Price</div>
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

      {/* ── Connection Status ── */}
      <ConnectionStatus
        connectionStatus={orderBook?.connectionStatus}
        lastUpdated={orderBook?.lastUpdated}
        wsConnectionState={connectionState}
      />

      {/* ── Main Content ── */}
      <div className="grid-main" style={{ marginTop: 24 }}>
        {/* Left: order book + venue comparison */}
        <div className="grid-left">
          <OrderBook book={orderBook} maxLevels={12} />
          <VenueComparison byVenue={orderBook?.byVenue} />
        </div>

        {/* Right: quote calculator + legend */}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="venue-tag polymarket">PM</span>
                Polymarket liquidity
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="venue-tag kalshi">KS</span>
                Kalshi liquidity
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="venue-tag both">Both</span>
                Both venues at this price
              </div>
              <div className="divider" />
              <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                <span style={{ color: 'var(--bid-color)', fontWeight: 600 }}>● Bids (buyers)</span>
                <span style={{ color: 'var(--ask-color)', fontWeight: 600 }}>● Asks (sellers)</span>
              </div>
              <div className="divider" />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                Prices in cents (¢) on 0–100 scale.<br />
                55¢ = 55% implied probability.<br />
                Quotes sweep merged book, best price first.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="app-footer">
        <div>
          Real-time aggregation from{' '}
          <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer">Polymarket</a>
          {' '}&{' '}
          <a href="https://kalshi.com" target="_blank" rel="noopener noreferrer">Kalshi</a>
        </div>
        <div style={{ marginTop: 4 }}>
          Simulation only — no real orders placed
        </div>
      </footer>
    </div>
  );
}
