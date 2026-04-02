import React, { useState } from 'react';

interface Props {
  rules: string[];
}

export function HowToPlay({ rules }: Props): React.ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <div className="how-to-play">
      <button className="how-to-play-toggle" onClick={() => setOpen(o => !o)}>
        <span className={`how-to-play-toggle-icon${open ? ' how-to-play-toggle-icon--open' : ''}`}>▶</span>
        How to play
      </button>
      {open && (
        <div className="how-to-play-body">
          <ol>
            {rules.map((rule, i) => <li key={i}>{rule}</li>)}
          </ol>
        </div>
      )}
    </div>
  );
}
