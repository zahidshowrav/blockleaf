import { BlockleafEditor, SCHEMA_VERSION, createEmptyDocument } from '@blockleaf/editor';
import { useState } from 'react';

import type { BlockleafDocument } from '@blockleaf/editor';

import '@blockleaf/editor/styles.css';

/**
 * Not a demo — a workbench. It exists so extension work has a fast reload loop
 * without booting the docs site. The polished demo lives in apps/docs (M4).
 */
export const App = () => {
  const [doc, setDoc] = useState<BlockleafDocument>(createEmptyDocument());
  const [dirty, setDirty] = useState(false);

  return (
    <main className="sandbox">
      <header className="sandbox__bar">
        <h1>Blockleaf sandbox</h1>
        <span className="sandbox__status">
          schema v{SCHEMA_VERSION} · {dirty ? 'typing…' : 'settled'}
        </span>
      </header>

      <section className="sandbox__panes">
        <div className="sandbox__pane">
          <BlockleafEditor
            defaultValue={doc}
            autofocus
            onChangeImmediate={() => setDirty(true)}
            onChange={(next) => {
              setDoc(next);
              setDirty(false);
            }}
          />
        </div>

        <pre className="sandbox__pane sandbox__json">{JSON.stringify(doc, null, 2)}</pre>
      </section>
    </main>
  );
};
