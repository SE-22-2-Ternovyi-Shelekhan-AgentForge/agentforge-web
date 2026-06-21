import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Small inline "?" help icon that reveals a tooltip on hover/focus.
 *
 * The bubble is rendered in a portal with fixed positioning so it can escape
 * containers that clip overflow (e.g. modals with `overflow: auto`).
 *
 * Props:
 *   text  — the explanatory text shown in the bubble.
 *   below — prefer rendering the bubble under the icon. By default it shows
 *           above, automatically flipping below when there isn't room.
 */
export default function InfoHint({ text, below = false }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null); // { left, top, placement } or null when hidden

  function show() {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 9;
    const halfWidth = 130; // half of the bubble's max-width, for edge clamping
    const placeBelow = below || r.top < 140; // not enough room above → flip down
    const left = Math.min(
      Math.max(r.left + r.width / 2, halfWidth + 8),
      window.innerWidth - halfWidth - 8,
    );
    setPos({
      left,
      top: placeBelow ? r.bottom + gap : r.top - gap,
      placement: placeBelow ? 'below' : 'top',
    });
  }

  function hide() {
    setPos(null);
  }

  return (
    <span
      ref={ref}
      className="info-hint"
      tabIndex={0}
      role="note"
      aria-label={text}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      ?
      {pos &&
        createPortal(
          <span
            className={`info-hint__bubble info-hint__bubble--${pos.placement}`}
            role="tooltip"
            style={{ left: pos.left, top: pos.top }}
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}
