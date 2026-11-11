import HomeCards from "@/components/HomeCards";

export default function Home() {
  return (
    <main id="main-content" className="home">
      <section className="home-hero">
        <h1>משחקי גיאוגרפיה לצוות</h1>
        <p className="muted">
          ארבעה אתגרים חדשים בכל יום — אותו אתגר לכל הצוות. שחקו, העתיקו את התוצאה והדביקו בקבוצה.
        </p>
      </section>
      <HomeCards />
    </main>
  );
}
