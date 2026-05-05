import {
  Component, Input, OnChanges, SimpleChanges,
  ElementRef, ViewChild, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Pie3DSlice {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-pie3d',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pie3d-wrap">
      <canvas #canvas [width]="size" [height]="size * 0.72"></canvas>
      <div class="pie3d-legend">
        <div class="pie3d-legend-item" *ngFor="let s of slices">
          <span class="pie3d-dot" [style.background]="s.color"></span>
          <span class="pie3d-label">{{ s.label }}</span>
          <span class="pie3d-val">₹{{ s.value }}</span>
        </div>
      </div>
      <div class="pie3d-total" *ngIf="total > 0">
        <div class="pie3d-total-label">Total Spend</div>
        <div class="pie3d-total-val">₹{{ total }}</div>
      </div>
    </div>
  `,
  styles: [`
    .pie3d-wrap {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    canvas { display: block; max-width: 100%; }
    .pie3d-legend {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px 16px;
    }
    .pie3d-legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.82rem;
      font-weight: 500;
      color: #2D3A5E;
    }
    .pie3d-dot {
      width: 10px; height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .pie3d-label { color: #2D3A5E; }
    .pie3d-val   { color: #8FA3C8; font-size: 0.78rem; }
    .pie3d-total {
      text-align: center;
      margin-top: 4px;
    }
    .pie3d-total-label { font-size: 0.75rem; color: #8FA3C8; }
    .pie3d-total-val   { font-size: 1.4rem; font-weight: 700; color: #1A2340; }
  `]
})
export class Pie3DComponent implements OnChanges, AfterViewInit {
  @Input() slices: Pie3DSlice[] = [];
  @Input() size = 320;

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  total = 0;
  private ready = false;

  ngAfterViewInit() {
    this.ready = true;
    this.draw();
  }

  ngOnChanges(_: SimpleChanges) {
    this.total = this.slices.reduce((s, x) => s + x.value, 0);
    if (this.ready) this.draw();
  }

  private draw() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const active = this.slices.filter(s => s.value > 0);
    if (active.length === 0 || this.total === 0) {
      // Empty state
      ctx.save();
      ctx.font = '14px Outfit, sans-serif';
      ctx.fillStyle = '#8FA3C8';
      ctx.textAlign = 'center';
      ctx.fillText('Add expenses to see chart', W / 2, H / 2);
      ctx.restore();
      return;
    }

    // ── 3D pie parameters ──
    const cx = W / 2;
    const cy = H * 0.42;          // center Y (slightly above mid for depth room)
    const rx = W * 0.38;          // horizontal radius
    const ry = rx * 0.42;         // vertical radius (ellipse squish = perspective)
    const depth = H * 0.18;       // extrusion depth
    const tilt = 0;               // start angle offset

    // Pre-compute angles
    const angles: { start: number; end: number; mid: number }[] = [];
    let cur = tilt - Math.PI / 2;
    for (const s of active) {
      const sweep = (s.value / this.total) * 2 * Math.PI;
      angles.push({ start: cur, end: cur + sweep, mid: cur + sweep / 2 });
      cur += sweep;
    }

    // ── Draw bottom (extruded sides) — back-to-front ──
    // Only draw sides for slices whose midpoint is in the bottom half (sin > 0)
    for (let i = 0; i < active.length; i++) {
      const { start, end, mid } = angles[i];
      if (Math.sin(mid) <= 0) continue; // skip top-half slices' sides

      const s = active[i];
      const sideColor = this.darken(s.color, 0.55);

      ctx.beginPath();
      // Left edge
      ctx.moveTo(cx + rx * Math.cos(start), cy + ry * Math.sin(start));
      ctx.lineTo(cx + rx * Math.cos(start), cy + ry * Math.sin(start) + depth);
      // Bottom arc
      ctx.ellipse(cx, cy + depth, rx, ry, 0, start, end, false);
      // Right edge back up
      ctx.lineTo(cx + rx * Math.cos(end), cy + ry * Math.sin(end));
      // Top arc back
      ctx.ellipse(cx, cy, rx, ry, 0, end, start, true);
      ctx.closePath();

      ctx.fillStyle = sideColor;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // ── Draw top faces ──
    for (let i = 0; i < active.length; i++) {
      const { start, end } = angles[i];
      const s = active[i];

      // Gradient for 3D sheen
      const gx = cx + rx * 0.3 * Math.cos((start + end) / 2);
      const gy = cy + ry * 0.3 * Math.sin((start + end) / 2);
      const grad = ctx.createRadialGradient(gx, gy, 0, cx, cy, rx);
      grad.addColorStop(0, this.lighten(s.color, 0.35));
      grad.addColorStop(0.6, s.color);
      grad.addColorStop(1, this.darken(s.color, 0.2));

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.ellipse(cx, cy, rx, ry, 0, start, end, false);
      ctx.closePath();

      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // ── Drop shadow under chart ──
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.beginPath();
    ctx.ellipse(cx, cy + depth + 6, rx * 0.9, ry * 0.5, 0, 0, 2 * Math.PI);
    ctx.fillStyle = '#1A2340';
    ctx.fill();
    ctx.restore();

    // ── Labels on top faces ──
    ctx.save();
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < active.length; i++) {
      const { start, end } = angles[i];
      const mid = (start + end) / 2;
      const pct = Math.round((active[i].value / this.total) * 100);
      if (pct < 8) continue; // skip tiny slices

      const lx = cx + rx * 0.62 * Math.cos(mid);
      const ly = cy + ry * 0.62 * Math.sin(mid);

      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fillText(`${pct}%`, lx, ly);
    }
    ctx.restore();
  }

  private lighten(hex: string, amt: number): string {
    const [r, g, b] = this.parseHex(hex);
    return `rgb(${Math.min(255, r + 255 * amt)},${Math.min(255, g + 255 * amt)},${Math.min(255, b + 255 * amt)})`;
  }

  private darken(hex: string, amt: number): string {
    const [r, g, b] = this.parseHex(hex);
    return `rgb(${Math.max(0, r * (1 - amt))},${Math.max(0, g * (1 - amt))},${Math.max(0, b * (1 - amt))})`;
  }

  private parseHex(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [
      parseInt(h.substring(0, 2), 16),
      parseInt(h.substring(2, 4), 16),
      parseInt(h.substring(4, 6), 16)
    ];
  }
}
