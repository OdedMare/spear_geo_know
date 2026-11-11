"use client";

import { Check, Gift, KeyRound, PackageCheck, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { itemName, KINDS, RARITIES, REASONS, type Item, type Kind } from "@shared/merch.mjs";
import { useWorld } from "@/lib/world";
import { ItemArt } from "./Avatar";

type AdminItem = Item & { ownerName: string };
interface Prizes {
  items: AdminItem[];
  players: { id: string; nickname: string }[];
}

const KEY = "geo.adminKey";

function storedKey(): string {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

async function adminFetch<T>(key: string, method: string, url: string, body?: unknown): Promise<{ status: number; data: T | null }> {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json", "x-admin-key": key },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: res.ok ? ((await res.json()) as T) : null };
}

/** For whoever hands out the real prizes: who won what, what is delivered, and gifts. */
export default function Admin() {
  const { world } = useWorld();
  const [key, setKey] = useState(storedKey);
  const [draft, setDraft] = useState("");
  const [data, setData] = useState<Prizes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [grant, setGrant] = useState<{ player: string; kind: Kind; country: string }>({ player: "", kind: "cap", country: "" });
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!key) return;
    let live = true;
    adminFetch<Prizes>(key, "GET", "/api/admin/prizes").then(
      (r) => {
        if (!live) return;
        if (r.status === 200 && r.data) {
          setData(r.data);
          setError(null);
        } else {
          setData(null);
          setError(
            r.status === 503
              ? "הניהול כבוי בשרת. מפעילים אותו עם משתנה הסביבה GEO_ADMIN_KEY."
              : r.status === 403
                ? "המפתח שגוי."
                : "לא הצלחנו לטעון. האם האתר רץ דרך npm start?",
          );
        }
      },
      () => live && setError("לא הצלחנו להתחבר לשרת."),
    );
    return () => {
      live = false;
    };
  }, [key, reload]);

  const physical = data?.items.filter((i) => i.physical) ?? [];
  const pending = physical.filter((i) => !i.delivered);

  const deliver = async (item: AdminItem, delivered: boolean) => {
    await adminFetch(key, "POST", `/api/admin/prizes/${item.id}/delivered`, { delivered });
    setReload((n) => n + 1);
  };

  const give = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await adminFetch<AdminItem>(key, "POST", "/api/admin/grant", { ...grant, country: grant.country || null });
    setNote(r.status === 201 && r.data ? `ניתן: ${itemName(r.data)} ✓` : "לא הצלחנו לתת את הפריט.");
    setReload((n) => n + 1);
  };

  if (!key || error === "המפתח שגוי.") {
    return (
      <main id="main-content" className="game-page admin">
        <h1>ניהול פרסים</h1>
        <form
          className="team-form"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              sessionStorage.setItem(KEY, draft);
            } catch {
              /* kept for this page only */
            }
            setError(null);
            setKey(draft);
          }}
        >
          <label>
            <span className="field-label">מפתח ניהול (GEO_ADMIN_KEY)</span>
            <input type="password" value={draft} onChange={(e) => setDraft(e.target.value)} dir="ltr" autoFocus />
          </label>
          <button type="submit" className="button primary" disabled={!draft}>
            <KeyRound size={16} aria-hidden />
            כניסה
          </button>
        </form>
        {error && <p className="bad">{error}</p>}
      </main>
    );
  }

  return (
    <main id="main-content" className="game-page admin">
      <header className="game-head">
        <div>
          <h1>ניהול פרסים</h1>
          <p className="muted">פריט אגדי הוא גם פרס אמיתי: כאן רואים מי זכה, ומסמנים כשהפרס נמסר.</p>
        </div>
        <button type="button" className="icon-button" onClick={() => setReload((n) => n + 1)} aria-label="רענון">
          <RefreshCw size={18} aria-hidden />
        </button>
      </header>
      {error && <p className="error-box">{error}</p>}

      {data && (
        <>
          <section className="game-group">
            <h2>
              <PackageCheck size={18} aria-hidden /> פרסים אמיתיים ({pending.length} ממתינים)
            </h2>
            {physical.length === 0 ? (
              <p className="muted">עוד אין. אלוף/ת השבוע מקבל/ת פריט אגדי ביום ראשון שאחרי.</p>
            ) : (
              <ul className="closet">
                {physical.map((item) => (
                  <li key={item.id} className={item.delivered ? "closet-item" : "closet-item is-worn"} style={{ ["--rarity" as string]: RARITIES[item.rarity].colour }}>
                    <ItemArt item={item} size={80} />
                    <strong>{item.ownerName}</strong>
                    <span>{itemName(item)}</span>
                    <span className="muted small">
                      {REASONS[item.reason]} · {item.day.split("-").reverse().join("/")}
                    </span>
                    <button type="button" className={item.delivered ? "button small" : "button small primary"} onClick={() => deliver(item, !item.delivered)}>
                      {item.delivered ? (
                        <>
                          <Check size={14} aria-hidden /> נמסר — לבטל
                        </>
                      ) : (
                        "סימון כנמסר"
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="game-group">
            <h2>
              <Gift size={18} aria-hidden /> מתנה מהצוות
            </h2>
            <form className="team-form" onSubmit={give}>
              <label>
                <span className="field-label">למי</span>
                <select value={grant.player} onChange={(e) => setGrant({ ...grant, player: e.target.value })} required>
                  <option value="">בחרו שחקן/ית</option>
                  {data.players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nickname}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="field-label">פריט</span>
                <select value={grant.kind} onChange={(e) => setGrant({ ...grant, kind: e.target.value as Kind })}>
                  {(Object.keys(KINDS) as Kind[]).map((k) => (
                    <option key={k} value={k}>
                      {KINDS[k].he} ({RARITIES[KINDS[k].rarity].he})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="field-label">מדינה</span>
                <select value={grant.country} onChange={(e) => setGrant({ ...grant, country: e.target.value })}>
                  <option value="">אקראית</option>
                  {world?.countries
                    .filter((c) => c.sovereign && c.flag)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.he}
                      </option>
                    ))}
                </select>
              </label>
              <button type="submit" className="button primary" disabled={!grant.player}>
                נתינה
              </button>
              {note && <span role="status">{note}</span>}
            </form>
          </section>

          <section className="game-group">
            <h2>כל הפריטים ({data.items.length})</h2>
            <ol className="rank-table compact">
              {data.items.slice(0, 100).map((i) => (
                <li key={i.id}>
                  <span className="rank" style={{ color: RARITIES[i.rarity].colour }}>
                    ●
                  </span>
                  <span className="rank-name">
                    {i.ownerName} · {itemName(i)}
                  </span>
                  <span className="rank-detail muted">
                    {REASONS[i.reason]} · {RARITIES[i.rarity].he}
                  </span>
                  <span className="muted small">{i.day.split("-").reverse().join("/")}</span>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </main>
  );
}
