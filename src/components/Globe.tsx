"use client";

import { Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { inShape } from "@/lib/geo";
import { projectLonLat, projectRing, ringToVectors, rotationOf, unproject, type View } from "@/lib/projection";
import type { Country, World } from "@/lib/world";

export interface Focus {
  lon: number;
  lat: number;
  zoom?: number;
}

interface Props {
  world: World;
  /** Fill colour per country id; everything else is plain land. */
  fills: Record<string, string>;
  /** Country ids drawn with a heavy outline (e.g. start and end of a route). */
  outlined?: string[];
  /** Where to turn the globe; a new object animates there. */
  focus?: Focus | null;
  /** Which countries say their name when tapped. Default: the coloured ones. */
  nameable?: (c: Country) => boolean;
  /** Slow idle spin until the player touches the globe or a focus arrives. */
  spin?: boolean;
  label: string;
}

type Prepared = { country: Country; polys: { v: Float64Array; ring: number[] }[][] }[];
const prepared = new WeakMap<World, Prepared>();
function prepare(world: World): Prepared {
  let p = prepared.get(world);
  if (!p) {
    p = world.mapped.map((country) => ({
      country,
      polys: country.shape!.map((poly) => poly.map((ring) => ({ v: ringToVectors(ring), ring }))),
    }));
    prepared.set(world, p);
  }
  return p;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 12;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const wrap = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180;
const reducedMotion = () =>
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function readPalette(el: HTMLElement) {
  const s = getComputedStyle(el);
  const v = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback;
  return {
    ocean: v("--globe-ocean", "#dbe9f6"),
    land: v("--globe-land", "#f4f1ea"),
    border: v("--globe-border", "#b9b4a8"),
    rim: v("--globe-rim", "#9fb6cc"),
    grid: v("--globe-grid", "rgba(0,0,0,0.06)"),
    outline: v("--globe-outline", "#1d1d1f"),
    // Fills may name a CSS variable ("var(--found)"); the canvas needs the value.
    resolve: (colour: string) => {
      const m = /^var\((--[\w-]+)\)$/.exec(colour);
      return m ? v(m[1], "#888") : colour;
    },
  };
}

export default function Globe({ world, fills, outlined = [], focus, nameable, spin = false, label }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const view = useRef<View & { zoom: number }>({ lon: 35, lat: 25, zoom: 1 });
  const size = useRef({ w: 0, h: 0, dpr: 1 });
  const palette = useRef<ReturnType<typeof readPalette> | null>(null);
  const frame = useRef(0);
  const anim = useRef<{ from: View & { zoom: number }; to: View & { zoom: number }; t0: number } | null>(null);
  const spinning = useRef(spin && !reducedMotion());
  const props = useRef({ fills, outlined });
  const tickRef = useRef<(now: number) => void>(() => {});
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);

  const draw = useCallback(() => {
    frame.current = 0;
    const canvas = canvasRef.current;
    if (!canvas || !size.current.w) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h, dpr } = size.current;
    const pal = (palette.current ??= readPalette(canvas));
    const v = view.current;
    const R = (Math.min(w, h) / 2) * 0.94 * v.zoom;
    const cx = w / 2;
    const cy = h / 2;
    const r = rotationOf(v);
    const { fills: colours, outlined: heavy } = props.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = pal.ocean;
    ctx.fill();

    // Graticule every 30°.
    ctx.beginPath();
    for (let lon = -180; lon < 180; lon += 30) {
      let pen = false;
      for (let lat = -90; lat <= 90; lat += 3) {
        const [x, y, z] = projectLonLat(v, lon, lat);
        if (z < 0) {
          pen = false;
          continue;
        }
        if (pen) ctx.lineTo(cx + R * x, cy - R * y);
        else ctx.moveTo(cx + R * x, cy - R * y);
        pen = true;
      }
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      let pen = false;
      for (let lon = -180; lon <= 180; lon += 3) {
        const [x, y, z] = projectLonLat(v, lon, lat);
        if (z < 0) {
          pen = false;
          continue;
        }
        if (pen) ctx.lineTo(cx + R * x, cy - R * y);
        else ctx.moveTo(cx + R * x, cy - R * y);
        pen = true;
      }
    }
    ctx.strokeStyle = pal.grid;
    ctx.lineWidth = 1;
    ctx.stroke();

    const heavyPaths: Path2D[] = [];
    ctx.lineJoin = "round";
    for (const { country, polys } of prepare(world)) {
      const path = new Path2D();
      let any = false;
      for (const poly of polys) {
        for (const { v: vectors, ring } of poly) {
          const parts = projectRing(vectors, r, ring);
          if (!parts) continue;
          any = true;
          for (const pts of parts) {
            path.moveTo(cx + R * pts[0], cy - R * pts[1]);
            for (let i = 2; i < pts.length; i += 2) path.lineTo(cx + R * pts[i], cy - R * pts[i + 1]);
            path.closePath();
          }
        }
      }
      if (!any) continue;
      ctx.fillStyle = country.id in colours ? pal.resolve(colours[country.id]) : pal.land;
      ctx.fill(path, "evenodd");
      ctx.strokeStyle = pal.border;
      ctx.lineWidth = 0.6;
      ctx.stroke(path);
      if (heavy.includes(country.id)) heavyPaths.push(path);
    }
    ctx.strokeStyle = pal.outline;
    ctx.lineWidth = 2;
    for (const p of heavyPaths) ctx.stroke(p);

    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = pal.rim;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }, [world]);

  const schedule = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame((now) => tickRef.current(now));
  }, []);

  // Animation and idle spin advance here, then draw.
  const tick = useCallback(
    (now: number) => {
      const a = anim.current;
      if (a) {
        const t = clamp((now - a.t0) / 750, 0, 1);
        const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        const dLon = wrap(a.to.lon - a.from.lon);
        view.current = {
          lon: wrap(a.from.lon + dLon * e),
          lat: a.from.lat + (a.to.lat - a.from.lat) * e,
          zoom: a.from.zoom + (a.to.zoom - a.from.zoom) * e,
        };
        if (t >= 1) anim.current = null;
      } else if (spinning.current) {
        view.current = { ...view.current, lon: wrap(view.current.lon + 0.12) };
      }
      draw();
      if (anim.current || spinning.current) schedule();
    },
    [draw, schedule],
  );

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  // Size the canvas to its box.
  useEffect(() => {
    const el = wrapRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size.current = { w, h, dpr };
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      schedule();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [schedule]);

  // Re-read colours when the theme flips.
  useEffect(() => {
    const mo = new MutationObserver(() => {
      palette.current = null;
      schedule();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, [schedule]);

  useEffect(() => {
    props.current = { fills, outlined };
    schedule();
  }, [fills, outlined, schedule]);

  useEffect(() => {
    if (!focus) return;
    spinning.current = false;
    const to = { lon: focus.lon, lat: clamp(focus.lat, -70, 70), zoom: clamp(focus.zoom ?? view.current.zoom, MIN_ZOOM, MAX_ZOOM) };
    if (reducedMotion()) {
      view.current = to;
      anim.current = null;
    } else {
      anim.current = { from: { ...view.current }, to, t0: performance.now() };
    }
    schedule();
  }, [focus, schedule]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // ---- Pointer: drag rotates, two fingers pinch, a tap names a country ----
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ moved: 0, pinch: 0 });

  const radius = () => (Math.min(size.current.w, size.current.h) / 2) * 0.94 * view.current.zoom;

  const zoomBy = useCallback(
    (factor: number) => {
      anim.current = null;
      view.current = { ...view.current, zoom: clamp(view.current.zoom * factor, MIN_ZOOM, MAX_ZOOM) };
      schedule();
    },
    [schedule],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current.moved = 0;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
    spinning.current = false;
    anim.current = null;
    setTip(null);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (gesture.current.pinch) zoomBy(d / gesture.current.pinch);
      gesture.current.pinch = d;
      gesture.current.moved += 10;
      return;
    }
    const dx = cur.x - prev.x;
    const dy = cur.y - prev.y;
    gesture.current.moved += Math.abs(dx) + Math.abs(dy);
    const degPerPx = 180 / (Math.PI * radius());
    view.current = {
      ...view.current,
      lon: wrap(view.current.lon - dx * degPerPx),
      lat: clamp(view.current.lat + dy * degPerPx, -85, 85),
    };
    schedule();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current.pinch = 0;
    if (gesture.current.moved > 6 || pointers.current.size) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const R = radius();
    const ll = unproject(view.current, (px - size.current.w / 2) / R, -(py - size.current.h / 2) / R);
    if (!ll) return;
    const can = nameable ?? ((c: Country) => c.id in props.current.fills);
    const hit = world.mapped.find((c) => inShape(ll[0], ll[1], c.shape!));
    if (hit && can(hit)) setTip({ x: px, y: py, text: hit.he });
  };

  const onWheel = (e: React.WheelEvent) => {
    zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15);
  };

  return (
    <div className="globe" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      />
      {tip && (
        <div className="globe-tip" style={{ left: tip.x, top: tip.y }} role="status">
          {tip.text}
        </div>
      )}
      <div className="globe-zoom">
        <button type="button" className="icon-button" onClick={() => zoomBy(1.4)} aria-label="התקרבות">
          <Plus size={18} aria-hidden />
        </button>
        <button type="button" className="icon-button" onClick={() => zoomBy(1 / 1.4)} aria-label="התרחקות">
          <Minus size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** A view that frames one country. */
export function focusOn(c: Country, zoom?: number): Focus | null {
  if (!c.center) return null;
  const z = zoom ?? clamp(Math.sqrt(1_500_000 / Math.max(c.area, 20_000)), 1, 5);
  return { lon: c.center[0], lat: c.center[1], zoom: z };
}
