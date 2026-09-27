import React, { useEffect, useState } from 'react';
import StarRating from './StarRating';
import CloudDoodle from './CloudDoodle';
import { feedbackApi, type FeedbackItem } from '../services/api';

const DEFAULT_REVIEWS = [
  {
    id: 1,
    name: 'Marla',
    location: 'Philippines',
    rating: 5,
    title: 'Seamless Planning!',
    body: 'Our recent 5-day family trip to El Nido was an absolute dream, all thanks to the seamless planning!',
  },
  {
    id: 2,
    name: 'Peter Parker',
    location: 'Philippines',
    rating: 5,
    title: 'Goated Planner',
    body: 'Will be using this to plan our barkada trips from now on!',
  },
  {
    id: 3,
    name: 'Adyson',
    location: 'Philippines',
    rating: 5,
    title: 'An Unforgettable, Stress-Free Getaway!',
    body: 'From start to finish, LakBye made planning our dream vacation completely effortless. Every detail—from our flight transfers and hotel stays to the guided day tours—was organized flawlessly.',
  },
  {
    id: 4,
    name: 'Jacob',
    location: 'Philippines',
    rating: 5,
    title: 'Flawless from Start to Finish',
    body: 'LakBye handled all our bookings seamlessly. No flight delays, incredible hotels, and zero hassle. Truly the easiest!',
  },
  {
    id: 5,
    name: 'Andrei',
    location: 'Philippines',
    rating: 5,
    title: 'The perfect planner',
    body: 'This is my first time ever leaving a web review, but this is the BEST travel planner made. Every feature and the interface is just perfect.',
  },
  {
    id: 6,
    name: 'Vincent',
    location: 'Philippines',
    rating: 5,
    title: 'Solid travel planner',
    body: 'There is so much you can add and do and accomplish with this travel planner. The budget tracker and destination hierarchy are fantastic.',
  },
];

const Testimonials: React.FC = () => {
  const [reviews, setReviews] = useState<any[]>(DEFAULT_REVIEWS);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    feedbackApi
      .getApproved()
      .then((data) => {
        if (!isMounted) return;
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((item: FeedbackItem) => ({
            id: item.id,
            name: item.user_name || 'Traveler',
            location: item.country_name || 'Philippines',
            rating: item.rating || 5,
            title: item.title,
            body: item.comment,
          }));
          setReviews(mapped);
        }
      })
      .catch((err) => {
        console.warn('Could not load dynamic reviews, using defaults:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="testimonials-section">
      <CloudDoodle id={4} top="5%" left="5%" width="150px" opacity={0.6} />
      <CloudDoodle id={5} top="40%" left="-5%" width="120px" opacity={0.4} />
      <CloudDoodle id={2} bottom="15%" right="2%" width="220px" opacity={0.3} />
      <CloudDoodle id={1} top="25%" right="-3%" width="130px" opacity={0.5} />
      <CloudDoodle id={3} bottom="30%" left="10%" width="140px" opacity={0.4} />

      <div className="landing-services-header centered">
        <h2>
          See where <span className="text-gradient-brand"> LakBye </span> has taken them
        </h2>
        <p>
          Read real stories and feedback from travelers who explored new horizons with us.
        </p>
      </div>

      <div className="testimonials-grid">
        {reviews.map((review) => (
          <div key={review.id} className="testimonial-card hover-lift">
            <div className="testimonial-card-header">
              <div className="testimonial-customer">
                <span className="testimonial-name">{review.name}</span>
                <span className="testimonial-location">{review.location}</span>
              </div>
            </div>

            <StarRating rating={review.rating} />

            <div className="testimonial-title">“{review.title}”</div>
            <div className="testimonial-body">{review.body}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;
