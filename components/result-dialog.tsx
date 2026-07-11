"use client";

import { formatTimestamp } from "@/lib/format";
import type { DeckSubmissionResult } from "@/lib/types";

type ResultDialogProps = {
  result: DeckSubmissionResult;
  onClose: () => void;
  onViewRecords: () => void;
};

export function ResultDialog({ result, onClose, onViewRecords }: ResultDialogProps) {
  return (
    <div className="result-overlay" role="dialog" aria-modal="true" aria-label="Shuffle result">
      <section className={`result-panel ${result.isNew ? "result-new" : "result-repeat"}`}>
        <button className="secondary-button result-close" onClick={onClose} type="button">
          Close
        </button>
        <p className="eyebrow">Result</p>
        <h2>
          {result.isNew
            ? "This exact order has likely never existed before in human history."
            : "This exact order has already appeared on this platform."}
        </h2>
        <div className="result-grid">
          <div>
            <span>Platform truth</span>
            <strong>{result.isNew ? "First time seen here" : "Seen before here"}</strong>
          </div>
          <div>
            <span>First seen</span>
            <strong>{formatTimestamp(result.firstSeenAt)}</strong>
          </div>
          <div>
            <span>Seen count</span>
            <strong>{result.seenCount}</strong>
          </div>
          <div>
            <span>Deck hash</span>
            <strong>{result.hash.slice(0, 16)}</strong>
          </div>
          {result.uniqueDeckNumber ? (
            <div>
              <span>Unique deck number</span>
              <strong>#{result.uniqueDeckNumber.toLocaleString()}</strong>
            </div>
          ) : null}
        </div>
        <div className="result-actions">
          <button className="primary-button" onClick={onViewRecords} type="button">
            View Records
          </button>
        </div>
        <p className="result-note">
          Platform certainty comes from the stored hash lookup. The human-history claim is probabilistic,
          and that tension is the whole point.
        </p>
      </section>
    </div>
  );
}
