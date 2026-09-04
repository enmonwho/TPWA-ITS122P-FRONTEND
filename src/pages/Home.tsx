import { useEarthScroll } from '../hooks/useEarthScroll';
import earthImg from '../assets/earth.png';

/**
 * Home page — landing page of the LakBye travel planner application.
 *
 * Layout matches the Figma "Landing Page" frame (#17:87):
 * - Hero section with "Saan aabot ang LakBye mo?" heading
 * - Scroll-driven Earth globe animation (untouched)
 * - "LakBye has you covered" services section with feature cards
 * - Gradient footer bar
 */
export default function Home() {
  const { earthRef, earthWrapRef } = useEarthScroll();

  return (
    <div className="earth-home-page">
      <div className="earth-wrap" ref={earthWrapRef}>
        <img
          className="earth-img"
          ref={earthRef}
          src={earthImg}
          alt="Earth with world landmarks"
        />
      </div>

      <section className="earth-header-section">
        <h1>
          <span>Saan aabot ang </span>
          <span className="text-gradient-brand">LakBye</span>
          <span> mo?</span>
        </h1>
        <p className="subtitle">
          Plan your next adventure with ease. Create itineraries, discover exciting
          destinations, manage your budget, and keep all your travel plans in one place.
        </p>
      </section>

      <section className="earth-section">
        <h1>.</h1>
      </section>

      <section className="earth-section">
        <h4>LakBye has you covered</h4>
        <p>
          From planning your next destination to organizing your activities, LakBye helps
          turn your travel ideas into unforgettable adventures.
        </p>
      </section>

      <section className="earth-section">
        <h1>.</h1>
        <p></p>
      </section>

      <section className="earth-section">
        <h1>.</h1>
        <p></p>
      </section>

      {/* Services / Feature cards section — from Figma */}
      <section className="landing-services">
        <div className="landing-services-header">
          <h2>
            <span className="text-gradient-brand">LakBye </span>
            has you covered
          </h2>
          <p>
            From planning your next destination to organizing your activities, LakBye
            helps turn your travel ideas into unforgettable adventures.
          </p>
        </div>

        <div className="landing-cards">
          <div className="landing-card landing-card--gold">
            <h3>Budget Tracking</h3>
          </div>
          <div className="landing-card landing-card--coral">
            <h3>
              Itinerary
              <br />
              Builder
            </h3>
          </div>
          <div className="landing-card landing-card--teal">
            <h3>
              Other
              <br />
              Services
            </h3>
          </div>
          <div className="landing-card landing-card--rose">
            <h3>
              Other
              <br />
              Services
            </h3>
          </div>
        </div>
      </section>

      {/* Gradient footer bar — from Figma */}
      <div className="landing-footer-bar" />
    </div>
  );
}
