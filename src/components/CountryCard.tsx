"use client";

import { flagUrl, type Country, type World } from "@/lib/world";

const number = new Intl.NumberFormat("he-IL");
const compact = new Intl.NumberFormat("he-IL", { notation: "compact", maximumFractionDigits: 1 });

/** A short "what to know" card about a country, shown when a game ends. */
export default function CountryCard({ country, world }: { country: Country; world: World }) {
  const neighbours = country.borders.map((id) => world.byId.get(id)?.he).filter(Boolean) as string[];
  return (
    <article className="country-card" aria-label={`על ${country.he}`}>
      <header>
        {country.flag && <img src={flagUrl(country)} alt="" className="flag-md" />}
        <div>
          <h3>{country.he}</h3>
          <span className="muted" dir="ltr">
            {country.en}
          </span>
        </div>
      </header>
      <dl>
        <div>
          <dt>יבשת</dt>
          <dd>{country.continent}</dd>
        </div>
        {country.capital && (
          <div>
            <dt>בירה</dt>
            <dd>{country.capital}</dd>
          </div>
        )}
        <div>
          <dt>שטח</dt>
          <dd>{number.format(country.area)} קמ״ר</dd>
        </div>
        {country.pop > 0 && (
          <div>
            <dt>אוכלוסייה</dt>
            <dd>{compact.format(country.pop)}</dd>
          </div>
        )}
        <div className="wide">
          <dt>שכנות ביבשה</dt>
          <dd>{neighbours.length ? neighbours.join(" · ") : "אין — אי או מוקפת ים"}</dd>
        </div>
      </dl>
    </article>
  );
}
