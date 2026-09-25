import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { generateGeodesicArc } from '../constants/coordinates';
import { getMapboxStaticThumb } from '../services/exploreService';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

export interface MarkerData {
  id: string;
  lng: number;
  lat: number;
  title: string;
  color?: string;
  tripName?: string;
  tripDates?: string;
  status?: string;
  category?: string;
  thumbnailUrl?: string;
}

export interface GlobeMapProps {
  markers?: MarkerData[];
  activeMarkerId?: string | null;
  focusView?: [number, number] | null;
  onMarkerClick?: (markerId: string) => void;
  showRouteLines?: boolean;
  className?: string;
  style?: React.CSSProperties;
  searchMode?: boolean;
}

export default function GlobeMap({
  markers = [],
  activeMarkerId = null,
  focusView = null,
  onMarkerClick,
  showRouteLines = false,
  className = '',
  style,
  searchMode = false,
}: GlobeMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    if (!mapboxgl.accessToken) return;

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-v9',
      projection: 'globe',
      zoom: 1.5,
      center: [0, 20],
    });

    mapInstance.on('style.load', () => {
      mapInstance.setFog({
        color: 'rgb(186, 210, 235)',
        'high-color': 'rgb(36, 92, 223)',
        'horizon-blend': 0.02,
        'space-color': 'rgb(11, 11, 25)',
        'star-intensity': 0.6,
      });

      if (!mapInstance.getSource('route-lines')) {
        mapInstance.addSource('route-lines', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        mapInstance.addLayer({
          id: 'route-lines-glow',
          type: 'line',
          source: 'route-lines',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#E9724C', 'line-width': 4, 'line-opacity': 0.4 },
        });

        mapInstance.addLayer({
          id: 'route-lines-layer',
          type: 'line',
          source: 'route-lines',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
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

  useEffect(() => {
    if (!map.current) return;

    // Clean up existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Dismiss any active hover popups
    const existingHoverPopups = document.querySelectorAll('.lakbye-hover-popup');
    existingHoverPopups.forEach((popupEl) => popupEl.remove());

    markers.forEach((marker) => {
      const isActive = activeMarkerId === marker.id;
      const markerColor = marker.color || (isActive ? '#C5283D' : '#E9724C');
      const thumbUrl =
        marker.thumbnailUrl ||
        getMapboxStaticThumb(marker.lng, marker.lat, 200, 160, 9, 'outdoors-v12');

      // Create Custom DOM Marker: Circular thumbnail badge + anchor pin
      const markerEl = document.createElement('div');
      markerEl.className = `lakbye-map-marker-container ${isActive ? 'active' : ''}`;
      markerEl.setAttribute('data-id', marker.id);
      markerEl.setAttribute('role', 'button');
      markerEl.setAttribute('aria-label', marker.title);

      markerEl.innerHTML = `
        <div class="lakbye-map-marker-head" style="border-color: ${markerColor};">
          <img
            src="${thumbUrl}"
            alt="${marker.title}"
            class="lakbye-map-marker-img"
          />
          <div class="lakbye-map-marker-fallback" style="background-color: ${markerColor}; display: none;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
        </div>
        <div class="lakbye-map-marker-pin" style="border-top-color: ${markerColor};"></div>
      `;

      const imgEl = markerEl.querySelector(
        '.lakbye-map-marker-img',
      ) as HTMLImageElement | null;
      const fallbackEl = markerEl.querySelector(
        '.lakbye-map-marker-fallback',
      ) as HTMLDivElement | null;

      if (imgEl && fallbackEl) {
        imgEl.onerror = () => {
          imgEl.style.display = 'none';
          fallbackEl.style.display = 'flex';
        };
      }

      // Hover Tooltip: Location title, Thumbnail, Coordinates
      const popupHtml = `
        <div class="lakbye-hover-popup-card">
          <div class="lakbye-hover-popup-header">
            <img src="${thumbUrl}" alt="${marker.title}" class="lakbye-hover-popup-img" />
            <span class="lakbye-hover-popup-status ${marker.status === 'completed' ? 'visited' : 'upcoming'}">
              ${marker.status === 'completed' ? 'Visited' : 'Upcoming'}
            </span>
          </div>
          <div class="lakbye-hover-popup-body">
            <div class="lakbye-hover-popup-title">${marker.title}</div>
            ${marker.tripName ? `<div class="lakbye-hover-popup-trip">${marker.tripName}${marker.tripDates ? ` • ${marker.tripDates}` : ''}</div>` : ''}
            <div class="lakbye-hover-popup-coords">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <span>${Number(marker.lat).toFixed(4)}°, ${Number(marker.lng).toFixed(4)}°</span>
            </div>
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({
        offset: [0, -44],
        closeButton: false,
        closeOnClick: false,
        className: 'lakbye-hover-popup',
        maxWidth: '240px',
      }).setHTML(popupHtml);

      // Interactivity: Hover
      markerEl.addEventListener('mouseenter', () => {
        popup.setLngLat([marker.lng, marker.lat]).addTo(map.current!);
      });

      markerEl.addEventListener('mouseleave', () => {
        popup.remove();
      });

      // Interactivity: Click -> Smooth pan to coordinates & trigger selection
      markerEl.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.remove();

        map.current?.flyTo({
          center: [marker.lng, marker.lat],
          zoom: Math.max(map.current.getZoom(), 4.2),
          duration: 1200,
          essential: true,
        });

        if (onMarkerClick) {
          onMarkerClick(marker.id);
        }
      });

      const m = new mapboxgl.Marker({ element: markerEl, anchor: 'bottom' })
        .setLngLat([marker.lng, marker.lat])
        .addTo(map.current!);

      markersRef.current.push(m);
    });
  }, [markers, activeMarkerId, onMarkerClick]);

  useEffect(() => {
    if (!map.current) return;
    const updateRouteLines = () => {
      const source = map.current?.getSource('route-lines') as
        mapboxgl.GeoJSONSource | undefined;
      if (!source) return;
      if (!showRouteLines || markers.length < 2) {
        source.setData({ type: 'FeatureCollection', features: [] });
        return;
      }
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
          geometry: { type: 'LineString', coordinates: coords },
        })),
      });
    };
    if (map.current.isStyleLoaded()) updateRouteLines();
    else map.current.once('style.load', updateRouteLines);
  }, [markers, showRouteLines]);

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

  const focusLng = focusView ? focusView[0] : null;
  const focusLat = focusView ? focusView[1] : null;

  // Focus view for smooth Continent Map Navigation (BUG-06)
  useEffect(() => {
    if (!map.current || focusLng === null || focusLat === null) return;
    // Dismiss any active marker popups when panning to a continent
    markersRef.current.forEach((m) => m.getPopup()?.remove());
    map.current.flyTo({
      center: [focusLng, focusLat],
      zoom: 2.5,
      duration: 1800,
      essential: true,
    });
  }, [focusLng, focusLat]);

  const hasFittedBoundsRef = useRef(false);
  const prevSearchModeRef = useRef(false);

  useEffect(() => {
    if (!map.current) return;

    if (searchMode) {
      if (markers.length === 1) {
        map.current.flyTo({
          center: [markers[0].lng, markers[0].lat],
          zoom: 4,
          duration: 1300,
          essential: true,
        });
      } else if (markers.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        markers.forEach((m) => bounds.extend([m.lng, m.lat]));
        map.current.fitBounds(bounds, { padding: 60, maxZoom: 4.5, duration: 1500 });
      }
    } else if (prevSearchModeRef.current && !searchMode) {
      // Return to default camera position when search mode is cleared
      map.current.flyTo({
        center: [0, 20],
        zoom: 1.5,
        duration: 1400,
        essential: true,
      });
    }

    prevSearchModeRef.current = Boolean(searchMode);
  }, [searchMode, markers]);

  useEffect(() => {
    if (
      !map.current ||
      markers.length === 0 ||
      activeMarkerId ||
      hasFittedBoundsRef.current ||
      searchMode
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
      map.current.fitBounds(bounds, { padding: 60, maxZoom: 4, duration: 1600 });
    }
  }, [markers, activeMarkerId, searchMode]);

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
