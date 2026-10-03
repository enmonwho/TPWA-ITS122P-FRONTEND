import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import FeedbackModal from './FeedbackModal';

// Mock auth context
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      username: 'johndoe',
      full_name: 'John Doe',
      email: 'john@example.com',
    },
  }),
}));

// Mock feedbackApi
vi.mock('../services/api', () => ({
  feedbackApi: {
    submit: vi.fn().mockResolvedValue({ message: 'Success', feedback: {} }),
  },
}));

describe('FeedbackModal component', () => {
  it('does not render when isOpen is false', () => {
    const html = renderToString(<FeedbackModal isOpen={false} onClose={vi.fn()} />);
    expect(html).toBe('');
  });

  it('renders all form fields in the exact specified order when isOpen is true', () => {
    const html = renderToString(<FeedbackModal isOpen={true} onClose={vi.fn()} />);

    // Modal shell and heading
    expect(html).toContain('Give Us');
    expect(html).toContain('Feedback');

    // 1. Your Name
    const nameIndex = html.indexOf('Your Name');
    expect(nameIndex).toBeGreaterThan(-1);

    // 2. Country / Place Visited
    const countryIndex = html.indexOf('Country / Place Visited');
    expect(countryIndex).toBeGreaterThan(nameIndex);

    // 3. Rating
    const ratingIndex = html.indexOf('Rating');
    expect(ratingIndex).toBeGreaterThan(countryIndex);

    // 4. Title
    const titleIndex = html.indexOf('Title');
    expect(titleIndex).toBeGreaterThan(ratingIndex);

    // 5. Comments
    const commentsIndex = html.indexOf('Comments');
    expect(commentsIndex).toBeGreaterThan(titleIndex);

    // 6. Actions (Cancel & Submit Feedback)
    const actionsIndex = html.indexOf('Submit Feedback');
    expect(actionsIndex).toBeGreaterThan(commentsIndex);
  });

  it('renders country input wrapper with floating combobox structure', () => {
    const html = renderToString(<FeedbackModal isOpen={true} onClose={vi.fn()} />);

    expect(html).toContain('feedback-country-input-wrapper');
    expect(html).toContain('id="feedback-country-input"');
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-controls="feedback-country-dropdown-list"');
  });
});
