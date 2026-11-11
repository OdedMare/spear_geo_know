import HomeCards from "@/components/HomeCards";
import HomeGlobe from "@/components/HomeGlobe";

export default function Home() {
  return (
    <main id="main-content" className="home">
      <section className="home-hero">
        <div className="home-hero-text">
          <h1>משחקי גיאוגרפיה לצוות</h1>
          <p className="muted">
            12 אתגרים חדשים בכל יום — אותו אתגר לכל הצוות. שחקו, צברו נקודות, ותראו מי מוביל השבוע.
          </p>
          <p className="muted small">סובבו את הגלובוס והקישו על מדינה כדי לראות את שמה.</p>
        </div>
        <HomeGlobe />
      </section>
      <HomeCards />
    </main>
  );
}
