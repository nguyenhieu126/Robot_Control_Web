import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRobotApi } from '../hooks/useRobotApi';
import { useRobotWS } from '../hooks/useRobotWS';
import './MapTracking.css';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    if (!apiKey) {
      reject(new Error('Missing REACT_APP_GOOGLE_MAPS_API_KEY'));
      return;
    }

    if (window.google && window.google.maps) {
      resolve(window.google);
      return;
    }

    const existing = document.getElementById('google-maps-sdk');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps SDK')));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-sdk';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Failed to load Google Maps SDK'));
    document.head.appendChild(script);
  });
}

export default function MapTracking({ onBack, darkMode = true }) {
  const { getGpsHistory } = useRobotApi();
  const { robotStatus } = useRobotWS();

  const [error, setError] = useState('');
  const [followRobot, setFollowRobot] = useState(true);
  const [historyCount, setHistoryCount] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const markerRef = useRef(null);
  const trailRef = useRef(null);
  const localTrailRef = useRef([]);

  const gps = robotStatus?.gps || null;
  const hasFix = Boolean(gps?.fix && Number.isFinite(gps?.lat) && Number.isFinite(gps?.lng));

  const currentPoint = useMemo(() => {
    if (!hasFix) return null;
    return { lat: Number(gps.lat), lng: Number(gps.lng) };
  }, [hasFix, gps]);

  const drawTrail = useCallback(() => {
    if (!window.google || !trailRef.current) return;
    trailRef.current.setPath(localTrailRef.current);
  }, []);

  const centerToRobot = useCallback(() => {
    if (!mapRef.current || !currentPoint) return;
    mapRef.current.panTo(currentPoint);
  }, [currentPoint]);

  const clearTrail = useCallback(() => {
    localTrailRef.current = currentPoint ? [currentPoint] : [];
    drawTrail();
    setHistoryCount(localTrailRef.current.length);
  }, [currentPoint, drawTrail]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await loadGoogleMaps(GOOGLE_MAPS_API_KEY);
        if (!mounted) return;

        const initialCenter = currentPoint || { lat: 10.7769, lng: 106.7009 };
        mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
          center: initialCenter,
          zoom: currentPoint ? 17 : 14,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });

        markerRef.current = new window.google.maps.Marker({
          map: mapRef.current,
          position: initialCenter,
          title: 'Robot position',
        });

        trailRef.current = new window.google.maps.Polyline({
          map: mapRef.current,
          path: [],
          geodesic: true,
          strokeColor: '#0077cc',
          strokeOpacity: 0.9,
          strokeWeight: 4,
        });

        const historyRes = await getGpsHistory({ limit: 300 });
        if (!mounted || !historyRes?.success) return;

        const rows = [...historyRes.data].reverse();
        localTrailRef.current = rows
          .filter((row) => Number.isFinite(Number(row.lat)) && Number.isFinite(Number(row.lng)))
          .map((row) => ({ lat: Number(row.lat), lng: Number(row.lng) }));

        if (localTrailRef.current.length > 0) {
          markerRef.current.setPosition(localTrailRef.current[localTrailRef.current.length - 1]);
          mapRef.current.panTo(localTrailRef.current[localTrailRef.current.length - 1]);
        }

        drawTrail();
        setHistoryCount(localTrailRef.current.length);
      } catch (e) {
        if (!mounted) return;
        setError(e.message || 'Map initialization failed');
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [currentPoint, drawTrail, getGpsHistory]);

  useEffect(() => {
    if (!currentPoint || !markerRef.current) return;

    markerRef.current.setPosition(currentPoint);

    const trail = localTrailRef.current;
    const last = trail.length > 0 ? trail[trail.length - 1] : null;
    if (!last || last.lat !== currentPoint.lat || last.lng !== currentPoint.lng) {
      trail.push(currentPoint);
      if (trail.length > 1000) trail.shift();
      drawTrail();
      setHistoryCount(trail.length);
    }

    if (followRobot && mapRef.current) {
      mapRef.current.panTo(currentPoint);
    }

    setLastUpdatedAt(new Date().toISOString());
  }, [currentPoint, followRobot, drawTrail]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className={`map-page ${darkMode ? 'map-page--dark' : 'map-page--light'}`}>
        <header className="map-header">
          <button className="map-btn" onClick={onBack}>Back</button>
          <h1>Map Tracking</h1>
        </header>
        <div className="map-error">
          Missing REACT_APP_GOOGLE_MAPS_API_KEY. Add it to frontend .env before running the app.
        </div>
      </div>
    );
  }

  return (
    <div className={`map-page ${darkMode ? 'map-page--dark' : 'map-page--light'}`}>
      <header className="map-header">
        <button className="map-btn" onClick={onBack}>Back</button>
        <h1>Map Tracking</h1>
        <div className="map-actions">
          <button className="map-btn" onClick={centerToRobot} disabled={!currentPoint}>Center to robot</button>
          <button className="map-btn" onClick={() => setFollowRobot((v) => !v)}>{followRobot ? 'Follow: ON' : 'Follow: OFF'}</button>
          <button className="map-btn" onClick={clearTrail}>Clear local trail</button>
        </div>
      </header>

      {error ? <div className="map-error">{error}</div> : null}

      <section className="map-stats">
        <div><strong>GPS Fix:</strong> {hasFix ? 'YES' : 'NO'}</div>
        <div><strong>Lat/Lng:</strong> {hasFix ? `${gps.lat}, ${gps.lng}` : '--'}</div>
        <div><strong>Speed:</strong> {gps?.speed_kmh ?? '--'} km/h</div>
        <div><strong>Satellites:</strong> {gps?.satellites ?? '--'}</div>
        <div><strong>HDOP:</strong> {gps?.hdop ?? '--'}</div>
        <div><strong>Trail points:</strong> {historyCount}</div>
        <div><strong>Last update:</strong> {lastUpdatedAt || '--'}</div>
      </section>

      <div ref={mapContainerRef} className="map-canvas" />
    </div>
  );
}
