import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
}

const StarRating: React.FC<StarRatingProps> = ({ rating }) => {
  return (
    <div className="testimonial-stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={20}
          fill={star <= rating ? 'currentColor' : 'none'}
          strokeWidth={star <= rating ? 0 : 1.5}
        />
      ))}
    </div>
  );
};

export default StarRating;
