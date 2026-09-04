import { Outlet } from 'react-router-dom';
import { Header, Footer } from '../components';

/**
 * BaseLayout — wraps every page with Header and Footer.
 * Uses semantic HTML5 elements for accessibility and SEO.
 */
export default function BaseLayout() {
  return (
    <div className="app-layout">
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
