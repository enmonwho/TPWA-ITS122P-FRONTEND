import React from 'react';
import cloud1 from '../assets/cloud-1.svg';
import cloud2 from '../assets/cloud-2.svg';
import cloud3 from '../assets/cloud-3.svg';
import cloud4 from '../assets/cloud-4.svg';
import cloud5 from '../assets/cloud-5.svg';

const clouds = {
  1: cloud1,
  2: cloud2,
  3: cloud3,
  4: cloud4,
  5: cloud5,
};

interface CloudDoodleProps {
  id: 1 | 2 | 3 | 4 | 5;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  width?: string;
  opacity?: number;
  rotation?: number;
}

const CloudDoodle: React.FC<CloudDoodleProps> = ({
  id,
  top,
  left,
  right,
  bottom,
  width = '150px',
  opacity = 0.5,
  rotation = 0,
}) => {
  return (
    <img
      src={clouds[id]}
      alt=""
      className="cloud-doodle"
      style={{
        top,
        left,
        right,
        bottom,
        width,
        opacity,
        transform: `rotate(${rotation}deg)`,
      }}
    />
  );
};

export default CloudDoodle;
