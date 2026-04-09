import React, { useState } from 'react';

const KOFI_URL = 'https://ko-fi.com/boardle';

export function TipJar(): React.ReactElement {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`tipjar${expanded ? ' tipjar--expanded' : ''}`}>
      {expanded ? (
        <>
          <a
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="tipjar-link"
            onClick={() => setExpanded(false)}
          >
            Click here ❤️
          </a>
          <button className="tipjar-close" onClick={() => setExpanded(false)} aria-label="Close">✕</button>
        </>
      ) : (
        <div className="tipjar-collapsed">
          <span className="tipjar-nudge">Want to support the project?</span>
          <button
            className="tipjar-toggle"
            onClick={() => setExpanded(true)}
            aria-label="Support the project"
            title="Support the project"
          >
            ❤️
          </button>
        </div>
      )}
    </div>
  );
}
