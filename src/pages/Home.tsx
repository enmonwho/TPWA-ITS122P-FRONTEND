import { useEarthScroll } from '../hooks/useEarthScroll';
import earthImg from '../assets/earth.png';
import FeatureGrid from '../components/FeatureGrid';
import Testimonials from '../components/Testimonials';
import CTASection from '../components/CTASection';
import CloudDoodle from '../components/CloudDoodle';

/**
 * Home page — landing page of the LakBye travel planner application.
 *
 * Layout matches the Figma "Landing Page" frame (#17:87):
 * - Hero section with "Saan aabot ang LakBye mo?" heading
 * - Scroll-driven Earth globe animation (untouched)
 * - "LakBye has you covered" services section with feature cards
 * - Testimonials section
 * - CTA section
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

      <section
        className="earth-header-section"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          paddingTop: '15vh',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        {/* Clouds placed to match the reference image and float behind the Earth */}
        <CloudDoodle id={1} top="45%" left="5%" width="160px" opacity={0.8} />
        <CloudDoodle id={2} top="80%" left="8%" width="120px" opacity={0.7} />
        <CloudDoodle id={3} top="50%" right="12%" width="140px" opacity={0.8} />
        <CloudDoodle id={4} top="75%" right="5%" width="180px" opacity={0.7} />

        <h1 style={{ textAlign: 'center' }}>
          <span>Saan aabot ang </span>
          <span className="text-gradient-brand">LakBye</span>
          <span> mo?</span>
        </h1>
        <p className="subtitle" style={{ textAlign: 'center' }}>
          Plan your next adventure with ease. Create itineraries, discover exciting
          destinations, manage your budget, and keep all your travel plans in one place.
        </p>
      </section>

      <FeatureGrid />
      <Testimonials />
      <CTASection />
    </div>
  );
}
