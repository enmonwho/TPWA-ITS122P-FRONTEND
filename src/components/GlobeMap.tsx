// src/components/GlobeMap.tsx
// Replace line 1:
import { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface MarkerData {
  id: string;
  lng: number;
  lat: number;
  title: string;
}

interface GlobeMapProps {
  markers?: MarkerData[];
}

export default function GlobeMap({ markers = [] }: GlobeMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-v9', // Or your preferred Mapbox style
      projection: 'globe', // Enables the 3D globe view
      zoom: 1.5,
      center: [0, 20],
    });

    map.current.on('style.load', () => {
      map.current?.setFog({
        color: 'rgb(186, 210, 235)', // Lower atmosphere
        'high-color': 'rgb(36, 92, 223)', // Upper atmosphere
        'horizon-blend': 0.02,
        'space-color': 'rgb(11, 11, 25)', // Background color
        'star-intensity': 0.6,
      });
    });
  }, []);

  useEffect(() => {
    if (!map.current) return;

    // Add markers dynamically based on the props passed from Explore/Map pages
    markers.forEach((marker) => {
      new mapboxgl.Marker({ color: '#E9724C' }) // Use your Figma palette orange
        .setLngLat([marker.lng, marker.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`<h3>${marker.title}</h3>`))
        .addTo(map.current!);
    });
  }, [markers]);

  return (
    <div
      ref={mapContainer}
      style={{ width: '100%', height: '100%', borderRadius: '15px' }}
    />
  );
}
