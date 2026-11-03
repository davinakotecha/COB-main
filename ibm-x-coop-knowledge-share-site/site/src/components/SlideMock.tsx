// A mock of a two-column "built this iteration / planned next iteration" slide.
// Bullets use the change vocabulary: a gutter bar and label for the category, and a dashed outline
// plus the word Unconfirmed for anything written from a note instead of a checked export.
import type { Slide } from '../lib/demo-types';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function SlideMock({ slide }: { slide: Slide }) {
  return (
    <div class="slidebox demo-slide" role="group" aria-label="Mock slide with made-up data">
      <div>
        <h4>{slide.title}</h4>
        {slide.groups.map((g) => (
          <div key={g.name}>
            <div class="grp">{g.name}</div>
            <ul>
              {g.items.map((item) => (
                <li key={item.text} class={`bul k-${item.category}${item.unconfirmed ? ' unc' : ''}`}>
                  <span class="tag">
                    {cap(item.category)}
                    {item.unconfirmed ? '. Unconfirmed' : ''}
                  </span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div class="next">
        <h4>{slide.next.title}</h4>
        <p>{slide.next.body}</p>
      </div>
    </div>
  );
}
