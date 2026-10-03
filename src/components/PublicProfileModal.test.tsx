import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import PublicProfileModal from './PublicProfileModal';
import type { PublicProfileResponse } from '../services/api';

const mockProfile: PublicProfileResponse = {
  id: 42,
  full_name: 'Ady Max',
  username: 'adiee',
  bio: 'Sharing public journeys across LakBye.',
  avatar_url: 'https://example.com/ady.jpg',
  trips: [
    {
      id: 101,
      name: 'Japan Autumn Trip',
      startDate: '2026-10-01',
      endDate: '2026-10-10',
      totalBudget: 2000,
      status: 'planning',
      countries: ['Tokyo', 'Kyoto', 'Osaka'],
      countryRoute: [],
      travelType: 'Solo',
      nights: 9,
      visibility: 'public',
    },
    {
      id: 102,
      name: 'Secret Private Getaway',
      startDate: '2026-11-01',
      endDate: '2026-11-05',
      totalBudget: 500,
      status: 'planning',
      countries: ['Secret Island'],
      countryRoute: [],
      travelType: 'Private',
      nights: 4,
      visibility: 'private',
    },
  ],
  journals: [
    {
      id: 'j-1',
      title: 'Kyoto in the Rain',
      content: 'A short public journal entry about temples in Kyoto.',
      createdAt: '2026-09-30T10:00:00Z',
      country: 'Japan',
      travel_type: 'Solo',
      visibility: 'public',
    },
    {
      id: 'j-2',
      title: 'Confidential Journal',
      content: 'Private thoughts about life.',
      createdAt: '2026-10-01T10:00:00Z',
      visibility: 'private',
    },
  ],
};

describe('PublicProfileModal component', () => {
  beforeEach(() => {
    (globalThis as unknown as { window: unknown }).window = {
      innerWidth: 1024,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      setTimeout: (fn: () => void) => {
        fn();
        return 1;
      },
      clearTimeout: vi.fn(),
    };
    (globalThis as unknown as { document: unknown }).document = {
      body: { style: { overflow: '', paddingRight: '' } },
      documentElement: { clientWidth: 1024 },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const html = renderToString(
      <PublicProfileModal
        username="adiee"
        isOpen={false}
        onClose={vi.fn()}
        initialProfile={mockProfile}
      />,
    );
    expect(html).toBe('');
  });

  it('renders modal shell and profile header card when open', () => {
    const html = renderToString(
      <PublicProfileModal
        username="adiee"
        isOpen={true}
        onClose={vi.fn()}
        initialProfile={mockProfile}
      />,
    );

    expect(html).toContain('public-profile-modal-shell');
    expect(html).toContain('Ady Max');
    expect(html).toContain('@adiee');
    expect(html).toContain('Sharing public journeys across LakBye.');
    expect(html).toContain('×'); // close button
  });

  it('displays accurate counts for public trips and public journals only', () => {
    const html = renderToString(
      <PublicProfileModal
        username="adiee"
        isOpen={true}
        onClose={vi.fn()}
        initialProfile={mockProfile}
      />,
    );

    // mockProfile has 1 public trip and 1 private trip -> Public Trips count should be 1
    // mockProfile has 1 public journal and 1 private journal -> Journal Entries count should be 1
    expect(html).toContain('Public Trips');
    expect(html).toContain('Journal Entries');
    expect(html).toContain('<span class="public-profile-stat-count">1</span>');
  });

  it('exposes only public journals and never renders private journals or sensitive data in Journal tab', () => {
    const html = renderToString(
      <PublicProfileModal
        username="adiee"
        isOpen={true}
        onClose={vi.fn()}
        initialProfile={mockProfile}
        initialTab="journal"
      />,
    );

    // Public journal must be rendered
    expect(html).toContain('Kyoto in the Rain');
    expect(html).toContain('A short public journal entry about temples in Kyoto.');
    expect(html).toContain('Japan');
    expect(html).toContain('Solo');

    // Private journal must NOT be rendered
    expect(html).not.toContain('Confidential Journal');
    expect(html).not.toContain('Private thoughts about life.');
    // Private trip must NOT be rendered
    expect(html).not.toContain('Secret Private Getaway');
    expect(html).not.toContain('Secret Island');
  });

  it('renders Journey & Map tab with only public trips and public places', () => {
    const html = renderToString(
      <PublicProfileModal
        username="adiee"
        isOpen={true}
        onClose={vi.fn()}
        initialProfile={mockProfile}
        initialTab="journey-map"
      />,
    );

    expect(html).toContain('Public Journeys');
    expect(html).toContain('Trips this traveler chose to share publicly.');
    expect(html).toContain('Japan Autumn Trip');
    expect(html).toContain('Tokyo · Kyoto · Osaka · 9 days');

    // Public travel map assertions
    expect(html).toContain('Public Travel Map');
    expect(html).toContain('@adiee&#x27;s Map · 3 public places');
    expect(html).toContain('Tokyo · Kyoto · Osaka');

    // Private data must NOT be present
    expect(html).not.toContain('Secret Private Getaway');
    expect(html).not.toContain('Secret Island');
  });

  it('renders empty states cleanly when no public content exists', () => {
    const emptyProfile: PublicProfileResponse = {
      id: 99,
      full_name: 'New Traveler',
      username: 'newbie',
      trips: [],
      journals: [],
    };

    const htmlJournal = renderToString(
      <PublicProfileModal
        username="newbie"
        isOpen={true}
        onClose={vi.fn()}
        initialProfile={emptyProfile}
        initialTab="journal"
      />,
    );

    expect(htmlJournal).toContain('New Traveler');
    expect(htmlJournal).toContain('@newbie');
    expect(htmlJournal).toContain('No public journal entries shared yet.');

    const htmlMap = renderToString(
      <PublicProfileModal
        username="newbie"
        isOpen={true}
        onClose={vi.fn()}
        initialProfile={emptyProfile}
        initialTab="journey-map"
      />,
    );

    expect(htmlMap).toContain('No public trips shared yet.');
    expect(htmlMap).toContain('No public places mapped yet.');
    expect(htmlMap).toContain('@newbie&#x27;s Map · 0 public places');
  });

  it('does not leak stale profile data when rendering a different traveler', () => {
    const secondProfile: PublicProfileResponse = {
      id: 200,
      full_name: 'Second Traveler',
      username: 'second',
      trips: [],
      journals: [],
    };

    const firstHtml = renderToString(
      <PublicProfileModal
        username="adiee"
        isOpen={true}
        onClose={vi.fn()}
        initialProfile={mockProfile}
      />,
    );
    expect(firstHtml).toContain('Ady Max');
    expect(firstHtml).not.toContain('Second Traveler');

    const secondHtml = renderToString(
      <PublicProfileModal
        username="second"
        isOpen={true}
        onClose={vi.fn()}
        initialProfile={secondProfile}
      />,
    );
    expect(secondHtml).toContain('Second Traveler');
    expect(secondHtml).not.toContain('Ady Max');
  });

  it('renders a single sliding pill indicator for the segmented control that moves between tabs', () => {
    const journalHtml = renderToString(
      <PublicProfileModal
        username="adiee"
        isOpen={true}
        onClose={vi.fn()}
        initialProfile={mockProfile}
        initialTab="journal"
      />,
    );

    // Single slider pill with slide-left
    expect(journalHtml).toContain('public-profile-slider-pill slide-left');
    expect(journalHtml).not.toContain('public-profile-slider-pill slide-right');
    // Journal button has active class, Journey & Map does not
    expect(journalHtml).toContain('id="public-profile-tab-journal" aria-selected="true"');
    expect(journalHtml).toContain(
      'id="public-profile-tab-journey-map" aria-selected="false"',
    );

    const journeyMapHtml = renderToString(
      <PublicProfileModal
        username="adiee"
        isOpen={true}
        onClose={vi.fn()}
        initialProfile={mockProfile}
        initialTab="journey-map"
      />,
    );

    // Single slider pill with slide-right
    expect(journeyMapHtml).toContain('public-profile-slider-pill slide-right');
    expect(journeyMapHtml).not.toContain('public-profile-slider-pill slide-left');
    // Journey & Map button has active class, Journal does not
    expect(journeyMapHtml).toContain(
      'id="public-profile-tab-journal" aria-selected="false"',
    );
    expect(journeyMapHtml).toContain(
      'id="public-profile-tab-journey-map" aria-selected="true"',
    );
  });
});
