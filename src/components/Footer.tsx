/**
 * Footer — site-wide footer.
 * Placeholder: add links, copyright, socials, etc.
 */
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <p>&copy; {new Date().getFullYear()} Travel Planner. All rights reserved.</p>
      </div>
    </footer>
  );
}
