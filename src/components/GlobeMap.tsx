import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { generateGeodesicArc } from '../constants/coordinates';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export interface MarkerData {
  id: string;
  lng: number;
  lat: number;
  title: string;
}

export interface GlobeMapProps {
  markers?: MarkerData[];
  activeMarkerId?: string | null;
  onMarkerClick?: (markerId: string) => void;
  showRouteLines?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function GlobeMap({
  markers = [],
  activeMarkerId = null,
  onMarkerClick,
  showRouteLines = false,
  className = '',
  style,
}: GlobeMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Initialize Mapbox 3D Globe
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-v9',
      projection: 'globe',
      zoom: 1.5,
      center: [0, 20],
    });

    mapInstance.on('style.load', () => {
      mapInstance.setFog({
        color: 'rgb(186, 210, 235)', // Lower atmosphere
        'high-color': 'rgb(36, 92, 223)', // Upper atmosphere
        'horizon-blend': 0.02,
        'space-color': 'rgb(11, 11, 25)', // Space background
        'star-intensity': 0.6,
      });

      // Add GeoJSON source & layers for flight route lines
      if (!mapInstance.getSource('route-lines')) {
        mapInstance.addSource('route-lines', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
        });

        // Glow layer underneath
        mapInstance.addLayer({
          id: 'route-lines-glow',
          type: 'line',
          source: 'route-lines',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#E9724C',
            'line-width': 4,
            'line-opacity': 0.4,
          },
        });

        // Crisp dashed route line
        mapInstance.addLayer({
          id: 'route-lines-layer',
          type: 'line',
          source: 'route-lines',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#FFFAF2',
            'line-width': 2,
            'line-opacity': 0.95,
            'line-dasharray': [2, 2],
          },
        });
      }
    });

    map.current = mapInstance;

    return () => {
      mapInstance.remove();
      map.current = null;
    };
  }, []);

  // Update markers on map
  useEffect(() => {
    if (!map.current) return;

    // Clear old markers to prevent duplicate pins
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    markers.forEach((marker) => {
      const isActive = activeMarkerId === marker.id;

      // Custom marker element
      const markerEl = document.createElement('div');
      markerEl.className = `mapbox-custom-marker ${isActive ? 'active' : ''}`;
      markerEl.style.width = '24px';
      markerEl.style.height = '24px';
      markerEl.style.borderRadius = '50%';
      markerEl.style.backgroundColor = isActive ? '#C5283D' : '#E9724C';
      markerEl.style.border = '2.5px solid #ffffff';
      markerEl.style.boxShadow = isActive
        ? '0 0 14px rgba(197, 40, 61, 0.9), 0 2px 4px rgba(0,0,0,0.3)'
        : '0 0 8px rgba(233, 114, 76, 0.6), 0 2px 4px rgba(0,0,0,0.3)';
      markerEl.style.cursor = 'pointer';
      markerEl.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
      markerEl.style.transform = isActive ? 'scale(1.25)' : 'scale(1)';

      if (onMarkerClick) {
        markerEl.addEventListener('click', (e) => {
          e.stopPropagation();
          onMarkerClick(marker.id);
        });
      }

      const popup = new mapboxgl.Popup({ offset: 15 }).setHTML(
        `<div style="font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 600; color: #1e293b; padding: 2px 4px;">${marker.title}</div>`,
      );

      const m = new mapboxgl.Marker({ element: markerEl })
        .setLngLat([marker.lng, marker.lat])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(m);
    });
  }, [markers, activeMarkerId, onMarkerClick]);

  // Update flight route lines when markers or showRouteLines change
  useEffect(() => {
    if (!map.current) return;

    const updateRouteLines = () => {
      const source = map.current?.getSource('route-lines') as
        mapboxgl.GeoJSONSource | undefined;
      if (!source) return;

      if (!showRouteLines || markers.length < 2) {
        source.setData({
          type: 'FeatureCollection',
          features: [],
        });
        return;
      }

      // Generate geodesic arcs between consecutive markers
      const arcCoordinates: [number, number][][] = [];
      for (let i = 0; i < markers.length - 1; i++) {
        const from = [markers[i].lng, markers[i].lat] as [number, number];
        const to = [markers[i + 1].lng, markers[i + 1].lat] as [number, number];
        const arc = generateGeodesicArc(from, to, 40);
        arcCoordinates.push(arc);
      }

      source.setData({
        type: 'FeatureCollection',
        features: arcCoordinates.map((coords) => ({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coords,
          },
        })),
      });
    };

    if (map.current.isStyleLoaded()) {
      updateRouteLines();
    } else {
      map.current.once('style.load', updateRouteLines);
    }
  }, [markers, showRouteLines]);

  // Fly to active marker when selected
  useEffect(() => {
    if (!map.current || !activeMarkerId) return;

    const active = markers.find((m) => m.id === activeMarkerId);
    if (active) {
      map.current.flyTo({
        center: [active.lng, active.lat],
        zoom: Math.max(map.current.getZoom(), 3.5),
        duration: 1600,
        essential: true,
      });
    }
  }, [activeMarkerId, markers]);

  const hasFittedBoundsRef = useRef(false);

  // Initial bounds fit for multiple markers if no active marker
  useEffect(() => {
    if (
      !map.current ||
      markers.length === 0 ||
      activeMarkerId ||
      hasFittedBoundsRef.current
    )
      return;

    hasFittedBoundsRef.current = true;

    if (markers.length === 1) {
      map.current.flyTo({
        center: [markers[0].lng, markers[0].lat],
        zoom: 3,
        duration: 1400,
        essential: true,
      });
    } else if (markers.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      markers.forEach((m) => bounds.extend([m.lng, m.lat]));
      map.current.fitBounds(bounds, {
        padding: 60,
        maxZoom: 4,
        duration: 1600,
      });
    }
  }, [markers, activeMarkerId]);

  return (
    <div
      ref={mapContainer}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '100%',
        borderRadius: '15px',
        overflow: 'hidden',
        ...style,
      }}
    />
  );
}
