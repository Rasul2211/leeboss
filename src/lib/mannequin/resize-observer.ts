/**
 * A measuring fallback for the fitting-room canvas.
 *
 * react-three-fiber will not create its renderer until it has measured a
 * non-zero container, and it measures through `react-use-measure`, which relies
 * on ResizeObserver.
 *
 * A hidden or backgrounded page gets no animation frames, and browsers hold
 * back ResizeObserver delivery there too. A canvas first mounted in that state
 * stays at its default 300x150 and never recovers once the page is shown.
 * Timers do keep running, so measuring on an interval means the canvas is
 * already the right size the moment it becomes visible. Polling one element a
 * few times a second costs nothing measurable.
 */

type Entry = { target: Element; contentRect: DOMRectReadOnly };
// react-use-measure types the callback with an observer argument, so it has to
// be accepted even though nothing here reads it
type Callback = (entries: Entry[], observer: PollingResizeObserver) => void;

const INTERVAL_MS = 150;

export class PollingResizeObserver {
  private readonly sizes = new Map<Element, { width: number; height: number }>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly callback: Callback) {}

  observe(target: Element): void {
    if (!this.sizes.has(target)) {
      this.sizes.set(target, { width: -1, height: -1 });
    }
    this.measure(); // report the initial size straight away
    this.start();
  }

  unobserve(target: Element): void {
    this.sizes.delete(target);
    if (this.sizes.size === 0) this.stop();
  }

  disconnect(): void {
    this.sizes.clear();
    this.stop();
  }

  private start(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(this.measure, INTERVAL_MS);
  }

  private stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  private readonly measure = (): void => {
    const changed: Entry[] = [];

    for (const [target, previous] of this.sizes) {
      const rect = target.getBoundingClientRect();
      // sub-pixel jitter is not a resize; ignore anything under half a pixel
      if (
        Math.abs(rect.width - previous.width) > 0.5 ||
        Math.abs(rect.height - previous.height) > 0.5
      ) {
        this.sizes.set(target, { width: rect.width, height: rect.height });
        changed.push({ target, contentRect: rect });
      }
    }

    if (changed.length > 0) this.callback(changed, this);
  };
}
