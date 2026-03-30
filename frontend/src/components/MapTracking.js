import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useRobotApi } from '../hooks/useRobotApi';
import { useRobotWS } from '../hooks/useRobotWS';
import './MapTracking.css';

const DEFAULT_CENTER = [10.7769, 106.7009];

const robotIcon = new L.Icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

function MapController({ currentPoint, followRobot, centerSignal }) {
  const map = useMap();

  useEffect(() => {
    if (followRobot && currentPoint) {
      map.panTo([currentPoint.lat, currentPoint.lng]);
    }
  }, [map, followRobot, currentPoint]);

  useEffect(() => {
    if (centerSignal > 0 && currentPoint) {
      map.panTo([currentPoint.lat, currentPoint.lng]);
    }
  }, [map, centerSignal, currentPoint]);

  return null;
}

export default function MapTracking({ onBack, darkMode = true }) {
  const { getGpsHistory } = useRobotApi();
  const { robotStatus } = useRobotWS();

  const [error, setError] = useState('');
  const [followRobot, setFollowRobot] = useState(true);
  const [historyCount, setHistoryCount] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [centerSignal, setCenterSignal] = useState(0);

  const localTrailRef = useRef([]);
  const [trail, setTrail] = useState([]);

  const gps = robotStatus?.gps || null;
  const hasFix = Boolean(gps?.fix && Number.isFinite(gps?.lat) && Number.isFinite(gps?.lng));

  const currentPoint = useMemo(() => {
    if (!hasFix) return null;
    return { lat: Number(gps.lat), lng: Number(gps.lng) };
  }, [hasFix, gps]);

  const locationText = useMemo(() => {
    if (!currentPoint) return '';
    return `${currentPoint.lat.toFixed(6)}, ${currentPoint.lng.toFixed(6)}`;
  }, [currentPoint]);

  const centerToRobot = useCallback(() => {
    if (!currentPoint) return;
    setCenterSignal((v) => v + 1);
  }, [currentPoint]);

  const clearTrail = useCallback(() => {
    localTrailRef.current = currentPoint ? [currentPoint] : [];
    setTrail([...localTrailRef.current]);
    setHistoryCount(localTrailRef.current.length);
  }, [currentPoint]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const historyRes = await getGpsHistory({ limit: 300 });
        if (!mounted || !historyRes?.success) return;

        const rows = [...historyRes.data].reverse();
        localTrailRef.current = rows
          .filter((row) => Number.isFinite(Number(row.lat)) && Number.isFinite(Number(row.lng)))
          .map((row) => ({ lat: Number(row.lat), lng: Number(row.lng) }));

        setTrail([...localTrailRef.current]);
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
  }, [getGpsHistory]);

  useEffect(() => {
    if (!currentPoint) return;

    const trail = localTrailRef.current;
    const last = trail.length > 0 ? trail[trail.length - 1] : null;
    if (!last || last.lat !== currentPoint.lat || last.lng !== currentPoint.lng) {
      trail.push(currentPoint);
      if (trail.length > 1000) trail.shift();
      setTrail([...trail]);
      setHistoryCount(trail.length);
    }

    setLastUpdatedAt(new Date().toISOString());
  }, [currentPoint]);

  const initialCenter = currentPoint ? [currentPoint.lat, currentPoint.lng] : DEFAULT_CENTER;
  const markerPosition = currentPoint
    ? [currentPoint.lat, currentPoint.lng]
    : (trail.length > 0 ? [trail[trail.length - 1].lat, trail[trail.length - 1].lng] : DEFAULT_CENTER);
  const polylinePoints = trail.map((p) => [p.lat, p.lng]);

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

      {!hasFix ? (
        <div className="map-warning">
         The robot does not have a GPS fix. Please ensure the robot is outdoors and has a clear view of the sky.
        </div>
      ) : null}

      <section className="map-stats">
        <div><strong>GPS Fix:</strong> {hasFix ? 'YES' : 'NO'}</div>
        {hasFix ? <div><strong>Location:</strong> {locationText}</div> : null}
        <div><strong>Speed:</strong> {gps?.speed_kmh ?? '--'} km/h</div>
        <div><strong>Satellites:</strong> {gps?.satellites ?? '--'}</div>
        <div><strong>HDOP:</strong> {gps?.hdop ?? '--'}</div>
        <div><strong>Trail points:</strong> {historyCount}</div>
        <div><strong>Last update:</strong> {lastUpdatedAt || '--'}</div>
      </section>

      <div className="map-canvas">
        <MapContainer center={initialCenter} zoom={currentPoint ? 17 : 14} className="map-leaflet" scrollWheelZoom>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={markerPosition} icon={robotIcon} />
          {polylinePoints.length > 1 ? <Polyline positions={polylinePoints} pathOptions={{ color: '#0077cc', weight: 4 }} /> : null}
          <MapController currentPoint={currentPoint} followRobot={followRobot} centerSignal={centerSignal} />
        </MapContainer>
      </div>
    </div>
  );
}
