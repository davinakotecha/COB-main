// The worked example: follow one change from its source, through the skill's summary, to a slide.
// Everything shown is real script output captured at build time (or a labelled illustration).
// The component knows only the Example shape in lib/demo-types.ts, never a particular skill.
import { useState } from 'preact/hooks';
import type { Example, Format, Scenario } from '../lib/demo-types';
import { onTabKey } from '../lib/tabs';
import SlideMock from './SlideMock';

interface Props {
  example: Example;
}

const FORMATS: { id: Format; label: string }[] = [
  { id: 'human', label: 'Human' },
  { id: 'terse', label: 'Terse' },
  { id: 'json', label: 'JSON' },
];

function ChangeColumn({ s }: { s: Scenario }) {
  if (s.change.kind === 'note') {
    return (
      <blockquote class="quote swap">
        {s.change.text}
        <small>Note from a flow builder. Unconfirmed until someone checks it against a real export.</small>
      </blockquote>
    );
  }
  return (
    <pre class="code swap" aria-label={s.change.fileLabel}>
      {s.change.rows.map((r, i) => (
        <span key={i} class={`ln${r.category ? ` g-${r.category}` : ''}${r.sign === '-' ? ' del' : ''}${r.gap ? ' gap' : ''}`}>
          <span class="bar" aria-hidden="true" />
          <span class="sg" aria-hidden="true">
            {r.sign === ' ' ? '' : r.sign}
          </span>
          <span class="lt">{r.text}</span>
          {r.category && r.sign !== '-' && <span class="gl">{r.category}</span>}
        </span>
      ))}
    </pre>
  );
}

export default function WorkedExample({ example }: Props) {
  const hasScenarios = example.scenarios.length > 0;
  const [sid, setSid] = useState(example.scenarios[0]?.id ?? '');
  const [fmt, setFmt] = useState<Format>('human');

  const s = example.scenarios.find((x) => x.id === sid) ?? example.scenarios[0];
  const ids = example.scenarios.map((x) => x.id);
  const fmtIds = FORMATS.map((f) => f.id);
  // Keyed wrappers remount when the scenario or format changes, which replays the .swap slide-in.
  const pick = setSid;

  return (
    <div class="example">
      <p class="body">{example.intro}</p>

      {hasScenarios && s && (
        <>
          <div class="tabs" role="tablist" aria-label="Kind of change">
            {example.scenarios.map((x) => (
              <button
                key={x.id}
                type="button"
                role="tab"
                id={`sc-${x.id}`}
                data-tab={x.id}
                aria-selected={x.id === sid}
                aria-controls="sc-panel"
                tabIndex={x.id === sid ? 0 : -1}
                onClick={() => pick(x.id)}
                onKeyDown={(e) => onTabKey(e, ids, sid, pick)}
              >
                {x.label}
              </button>
            ))}
          </div>

          <div class="demo-grid" id="sc-panel" role="tabpanel" aria-labelledby={`sc-${s.id}`}>
            <div class="step">
              <h3>
                <b>1</b>The change
              </h3>
              <p class="sub">{s.changeNote}</p>
              <div key={`c-${s.id}`}>
                <ChangeColumn s={s} />
              </div>
            </div>

            <div class="step">
              <h3>
                <b>2</b>The summary
              </h3>
              <p class="sub">{s.summaryNote}</p>
              <div class="mini-tabs" role="tablist" aria-label="Output format">
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    id={`fm-${f.id}`}
                    data-tab={f.id}
                    aria-selected={f.id === fmt}
                    aria-controls="fm-panel"
                    tabIndex={f.id === fmt ? 0 : -1}
                    onClick={() => setFmt(f.id)}
                    onKeyDown={(e) => onTabKey(e, fmtIds, fmt, (id) => setFmt(id as Format))}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <pre key={`o-${s.id}-${fmt}`} class="code plain swap" id="fm-panel" role="tabpanel" aria-labelledby={`fm-${fmt}`} tabIndex={0}>
                {s.outputs[fmt].trimEnd()}
              </pre>
            </div>

            <div class="step">
              <h3>
                <b>3</b>On the slide
              </h3>
              <p class="sub">The slide groups changes by journey.</p>
              <div key="slide">
                <SlideMock slide={example.slide} />
              </div>
            </div>
          </div>
          <p class="note">{example.slide.caption}</p>
        </>
      )}

      {!hasScenarios && (
        <>
          <SlideMock slide={example.slide} />
          <p class="note">{example.illustrationNote ?? example.slide.caption}</p>
        </>
      )}
    </div>
  );
}
