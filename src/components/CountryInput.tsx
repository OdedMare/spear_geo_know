"use client";

import { Search } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { exactMatch, search } from "@/lib/names";
import type { Country } from "@/lib/world";

interface Props {
  countries: Country[];
  /** Ids already used; offered last and refused with a message. */
  used?: Set<string>;
  onPick: (c: Country) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function CountryInput({ countries, used, onPick, disabled, placeholder = "הקלידו שם של מדינה…" }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const listId = useId();

  const results = useMemo(() => search(query, countries, 8), [query, countries]);

  const choose = (c: Country | undefined | null) => {
    if (!c) {
      setNote(query.trim() ? "לא מצאנו מדינה בשם הזה" : null);
      return;
    }
    if (used?.has(c.id)) {
      setNote(`כבר ניחשתם את ${c.he}`);
      return;
    }
    setNote(null);
    setQuery("");
    setActive(0);
    setOpen(false);
    onPick(c);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(open && results[active] ? results[active] : exactMatch(query, countries) ?? results[0]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && results.length > 0 && !disabled;

  return (
    <div className="country-input">
      <div className="country-input-field">
        <Search size={18} aria-hidden className="country-input-icon" />
        <input
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${listId}-${active}` : undefined}
          aria-label="שם המדינה"
          autoComplete="off"
          spellCheck={false}
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
            setNote(null);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
        />
        <button type="button" className="button primary" disabled={disabled || !query.trim()} onClick={() => choose(results[active] ?? exactMatch(query, countries))}>
          נחש
        </button>
      </div>
      {showList && (
        <ul className="country-input-list" role="listbox" id={listId}>
          {results.map((c, i) => (
            <li
              key={c.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={used?.has(c.id) ? "is-used" : undefined}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(c);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span>{c.he}</span>
              <span className="muted" dir="ltr">
                {c.en}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="country-input-note" role="status">
        {note}
      </p>
    </div>
  );
}
