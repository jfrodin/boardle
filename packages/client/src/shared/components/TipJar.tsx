import React, { useState } from 'react';

const KOFI_URL = 'https://ko-fi.com/boardle';

export function TipJar(): React.ReactElement {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`tipjar${expanded ? ' tipjar--expanded' : ''}`}>
      {expanded ? (
        <>
          <span className="tipjar-text">Enjoying the games?</span>
          <a
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="tipjar-link"
            onClick={() => setExpanded(false)}
          >
            ☕ Buy me a coffee
          </a>
          <button className="tipjar-close" onClick={() => setExpanded(false)} aria-label="Close">✕</button>
        </>
      ) : (
        <div className="tipjar-collapsed">
          <span className="tipjar-nudge">kept alive by coffee →</span>
          <button
            className="tipjar-toggle"
            onClick={() => setExpanded(true)}
            aria-label="Tip jar"
            title="Support the developer"
          >
            ☕
          </button>
        </div>
      )}
    </div>
  );
}
