import { DecimalPipe, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, PLATFORM_ID, computed, inject, input, signal, viewChild } from '@angular/core';
import { Icon } from './icon';

const MIN = 1;
const MAX = 8;

/**
 * Deep-zoom viewer for a single artwork: mouse-wheel / pinch / double-click zoom, drag to pan,
 * keyboard (+ − 0 arrows F) and fullscreen. Dependency-free replacement for iv-viewer / ng2-image-viewer.
 */
@Component({
  selector: 'app-zoom-viewer',
  imports: [Icon, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:fullscreenchange)': 'onFullscreenChange()' },
  template: `
    <div #box class="vw" tabindex="0" role="group" aria-label="Artwork viewer. Plus and minus zoom, arrow keys pan, zero resets, F toggles fullscreen."
         [class.zoomed]="scale() > 1" [class.dragging]="dragging()"
         (wheel)="onWheel($event)" (pointerdown)="onDown($event)" (pointermove)="onMove($event)"
         (pointerup)="onUp($event)" (pointercancel)="onUp($event)" (dblclick)="onDouble($event)" (keydown)="onKey($event)">
      <div class="stage" [style.transform]="transform()">
        <img [src]="src()" [alt]="alt()" draggable="false" decoding="async" fetchpriority="high" />
      </div>
      <div class="tools" (pointerdown)="$event.stopPropagation()" (dblclick)="$event.stopPropagation()">
        <button type="button" (click)="zoomBy(1.5)" aria-label="Zoom in"><app-icon name="plus" /></button>
        <button type="button" (click)="zoomBy(1 / 1.5)" aria-label="Zoom out"><app-icon name="minus" /></button>
        <button type="button" (click)="reset()" aria-label="Reset view" [disabled]="scale() === 1"><app-icon name="reset" /></button>
        <button type="button" (click)="toggleFullscreen()" [attr.aria-label]="fullscreen() ? 'Exit fullscreen' : 'Fullscreen'"><app-icon name="expand" /></button>
      </div>
      <span class="hint" aria-hidden="true">{{ scale() > 1 ? (scale() * 100 | number: '1.0-0') + '%' : 'Scroll or pinch to zoom' }}</span>
    </div>`,
  styles: `
    .vw { position: relative; height: min(78vh, 56rem); min-height: 20rem; overflow: hidden; touch-action: none; user-select: none; border-radius: var(--radius);
      background: radial-gradient(circle at 50% 40%, var(--viewer-bg-1), var(--viewer-bg-2)); cursor: zoom-in; outline-offset: 3px; }
    .vw.zoomed { cursor: grab; } .vw.dragging { cursor: grabbing; }
    .vw:fullscreen { height: 100vh; border-radius: 0; }
    .stage { position: absolute; inset: 0; display: grid; place-items: center; transform-origin: 50% 50%; will-change: transform; }
    .stage.animate { transition: transform .18s ease-out; }
    img { max-width: 100%; max-height: 100%; object-fit: contain; box-shadow: 0 10px 40px rgb(0 0 0 / .35); pointer-events: none; }
    .tools { position: absolute; right: .75rem; bottom: .75rem; display: flex; gap: .35rem; padding: .3rem; border-radius: 999px; background: rgb(0 0 0 / .55); backdrop-filter: blur(8px); }
    .tools button { display: grid; place-items: center; width: 2.4rem; height: 2.4rem; border: 0; border-radius: 50%; background: transparent; color: #fff; cursor: pointer; font-size: 1.05rem; }
    .tools button:hover:not(:disabled) { background: rgb(255 255 255 / .18); } .tools button:disabled { opacity: .4; cursor: default; }
    .hint { position: absolute; left: .85rem; bottom: .85rem; padding: .25rem .6rem; border-radius: 999px; font-size: .75rem; color: #fff; background: rgb(0 0 0 / .5); pointer-events: none; }`,
})
export class ZoomViewer {
  readonly src = input.required<string>();
  readonly alt = input('');

  protected readonly box = viewChild.required<ElementRef<HTMLElement>>('box');
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly scale = signal(1);
  private readonly x = signal(0);
  private readonly y = signal(0);
  protected readonly dragging = signal(false);
  protected readonly fullscreen = signal(false);
  protected readonly transform = computed(() => `translate(${this.x()}px, ${this.y()}px) scale(${this.scale()})`);

  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinchStart: { dist: number; scale: number } | null = null;

  protected onFullscreenChange(): void {
    this.fullscreen.set(document.fullscreenElement === this.box().nativeElement);
  }

  // ---- interaction ----------------------------------------------------------------------------

  protected onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.zoomAt(this.scale() * Math.exp(-e.deltaY * 0.0018), e.clientX, e.clientY);
  }

  protected onDouble(e: MouseEvent): void {
    if (this.scale() > 1) this.reset();
    else this.zoomAt(3, e.clientX, e.clientY);
  }

  protected onDown(e: PointerEvent): void {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 2) this.pinchStart = { dist: this.pinchDistance(), scale: this.scale() };
    else this.dragging.set(this.scale() > 1);
  }

  protected onMove(e: PointerEvent): void {
    const prev = this.pointers.get(e.pointerId);
    if (!prev) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 2 && this.pinchStart) {
      const [a, b] = [...this.pointers.values()];
      this.zoomAt((this.pinchStart.scale * this.pinchDistance()) / this.pinchStart.dist, (a.x + b.x) / 2, (a.y + b.y) / 2);
    } else if (this.scale() > 1) {
      this.panTo(this.x() + e.clientX - prev.x, this.y() + e.clientY - prev.y);
    }
  }

  protected onUp(e: PointerEvent): void {
    this.pointers.delete(e.pointerId);
    this.pinchStart = null;
    this.dragging.set(false);
  }

  protected onKey(e: KeyboardEvent): void {
    const step = 60;
    const handled = ((): boolean => {
      switch (e.key) {
        case '+': case '=': this.zoomBy(1.4); return true;
        case '-': case '_': this.zoomBy(1 / 1.4); return true;
        case '0': this.reset(); return true;
        case 'f': case 'F': this.toggleFullscreen(); return true;
        case 'ArrowLeft': this.panTo(this.x() + step, this.y()); return this.scale() > 1;
        case 'ArrowRight': this.panTo(this.x() - step, this.y()); return this.scale() > 1;
        case 'ArrowUp': this.panTo(this.x(), this.y() + step); return this.scale() > 1;
        case 'ArrowDown': this.panTo(this.x(), this.y() - step); return this.scale() > 1;
        default: return false;
      }
    })();
    if (handled) e.preventDefault();
  }

  // ---- actions --------------------------------------------------------------------------------

  protected zoomBy(factor: number): void {
    const r = this.box().nativeElement.getBoundingClientRect();
    this.zoomAt(this.scale() * factor, r.left + r.width / 2, r.top + r.height / 2);
  }

  protected reset(): void {
    this.scale.set(1);
    this.x.set(0);
    this.y.set(0);
  }

  protected toggleFullscreen(): void {
    if (!this.browser) return;
    const el = this.box().nativeElement;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }

  // ---- maths ----------------------------------------------------------------------------------

  /** Zoom keeping the content point under (clientX, clientY) fixed. */
  private zoomAt(target: number, clientX: number, clientY: number): void {
    const next = Math.min(MAX, Math.max(MIN, target));
    const r = this.box().nativeElement.getBoundingClientRect();
    const px = clientX - (r.left + r.width / 2);
    const py = clientY - (r.top + r.height / 2);
    const ratio = next / this.scale();
    this.scale.set(next);
    if (next === MIN) {
      this.x.set(0);
      this.y.set(0);
    } else {
      this.panTo(px - (px - this.x()) * ratio, py - (py - this.y()) * ratio);
    }
  }

  /** Keeps the artwork from being dragged completely out of view. */
  private panTo(x: number, y: number): void {
    const r = this.box().nativeElement.getBoundingClientRect();
    const maxX = ((this.scale() - 1) * r.width) / 2;
    const maxY = ((this.scale() - 1) * r.height) / 2;
    this.x.set(Math.min(maxX, Math.max(-maxX, x)));
    this.y.set(Math.min(maxY, Math.max(-maxY, y)));
  }

  private pinchDistance(): number {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  }
}
