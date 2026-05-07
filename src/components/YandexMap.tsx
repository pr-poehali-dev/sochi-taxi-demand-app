import { useEffect, useRef } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ymaps3: any;
  }
}

export type DemandLevel = "high" | "mid" | "low" | "airport";

export interface MapZone {
  id: string;
  name: string;
  demand: DemandLevel;
  coef: number;
  orders: number;
  waitMin: number;
  // center [lat, lng]
  center: [number, number];
  radiusM: number;
}

interface Props {
  zones: MapZone[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const DEMAND_COLOR: Record<DemandLevel, string> = {
  airport: "#3b82f6",
  high:    "#ef4444",
  mid:     "#facc15",
  low:     "#22c55e",
};

// GeoJSON circle polygon (approx) around [lat, lng] with radius in metres
function makeCircleGeoJson(lat: number, lng: number, radiusM: number, points = 64) {
  const coords: [number, number][] = [];
  const earthR = 6371000;
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dLat = (radiusM / earthR) * (180 / Math.PI);
    const dLng = (radiusM / (earthR * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI);
    coords.push([lng + dLng * Math.cos(angle), lat + dLat * Math.sin(angle)]);
  }
  return {
    type: "Feature" as const,
    geometry: { type: "Polygon" as const, coordinates: [coords] },
    properties: {},
  };
}

export default function YandexMap({ zones, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const objectsRef = useRef<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;

      // Wait for ymaps3 to be ready
      const waitForYmaps = () =>
        new Promise<void>((resolve) => {
          const check = () => {
            if (window.ymaps3 && window.ymaps3.ready) resolve();
            else setTimeout(check, 100);
          };
          check();
        });

      await waitForYmaps();
      if (cancelled) return;

      await window.ymaps3.ready;
      if (cancelled) return;

      const ymaps3 = window.ymaps3;
      const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapFeature, YMapMarker, YMapControls, YMapZoomControl } =
        ymaps3;

      const map = new YMap(containerRef.current, {
        location: {
          center: [39.7257, 43.585],
          zoom: 11,
        },
        theme: "dark",
      });

      map.addChild(new YMapDefaultSchemeLayer({ theme: "dark" }));
      map.addChild(new YMapDefaultFeaturesLayer());

      // Add zoom control
      const controls = new YMapControls({ position: "right" });
      controls.addChild(new YMapZoomControl());
      map.addChild(controls);

      mapRef.current = map;

      // Render zones
      zones.forEach((zone) => {
        const color = DEMAND_COLOR[zone.demand];
        const isSelected = zone.id === selectedId;
        const [lat, lng] = zone.center;

        // Circle fill
        const circleFeature = new YMapFeature({
          geometry: makeCircleGeoJson(lat, lng, zone.radiusM),
          style: {
            stroke: [{ color, width: isSelected ? 3 : 1.5 }],
            fill: color,
            fillOpacity: isSelected ? 0.45 : 0.25,
          },
        });
        map.addChild(circleFeature);
        objectsRef.current.push(circleFeature);

        // Marker with coef
        const markerEl = document.createElement("div");
        markerEl.style.cssText = `
          background: rgba(13,17,23,0.88);
          border: 1.5px solid ${color};
          border-radius: 10px;
          padding: 4px 8px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1px;
          box-shadow: 0 0 12px ${color}55;
          transform: translateY(-50%);
          min-width: 52px;
        `;
        markerEl.innerHTML = `
          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:${color}">×${zone.coef}</span>
          <span style="font-family:'Golos Text',sans-serif;font-size:9px;color:rgba(255,255,255,0.6)">${zone.orders} зак.</span>
        `;
        markerEl.addEventListener("click", () => onSelect(zone.id));

        const marker = new YMapMarker(
          { coordinates: [lng, lat], draggable: false },
          markerEl
        );
        map.addChild(marker);
        objectsRef.current.push(marker);
      });
    }

    init();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        try { mapRef.current.destroy(); } catch (_) { /* ignore */ }
        mapRef.current = null;
      }
      objectsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render when selection changes — just update opacity by rebuilding
  useEffect(() => {
    if (!mapRef.current) return;
    const ymaps3 = window.ymaps3;
    if (!ymaps3) return;

    // Remove old zone objects
    objectsRef.current.forEach((obj) => {
      try { mapRef.current.removeChild(obj); } catch (_) { /* ignore */ }
    });
    objectsRef.current = [];

    const { YMapFeature, YMapMarker } = ymaps3;

    zones.forEach((zone) => {
      const color = DEMAND_COLOR[zone.demand];
      const isSelected = zone.id === selectedId;
      const [lat, lng] = zone.center;

      const circleFeature = new YMapFeature({
        geometry: makeCircleGeoJson(lat, lng, zone.radiusM),
        style: {
          stroke: [{ color, width: isSelected ? 3 : 1.5 }],
          fill: color,
          fillOpacity: isSelected ? 0.45 : 0.22,
        },
      });
      mapRef.current.addChild(circleFeature);
      objectsRef.current.push(circleFeature);

      const markerEl = document.createElement("div");
      markerEl.style.cssText = `
        background: rgba(13,17,23,${isSelected ? "0.96" : "0.82"});
        border: ${isSelected ? "2px" : "1.5px"} solid ${color};
        border-radius: 10px;
        padding: 4px 8px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1px;
        box-shadow: 0 0 ${isSelected ? "18px" : "8px"} ${color}${isSelected ? "88" : "44"};
        transform: translateY(-50%);
        min-width: 52px;
      `;
      markerEl.innerHTML = `
        <span style="font-family:'JetBrains Mono',monospace;font-size:${isSelected ? "14" : "13"}px;font-weight:700;color:${color}">×${zone.coef}</span>
        <span style="font-family:'Golos Text',sans-serif;font-size:9px;color:rgba(255,255,255,0.6)">${zone.orders} зак.</span>
      `;
      markerEl.addEventListener("click", () => onSelect(zone.id));

      const marker = new YMapMarker(
        { coordinates: [lng, lat], draggable: false },
        markerEl
      );
      mapRef.current.addChild(marker);
      objectsRef.current.push(marker);
    });

    // Pan to selected zone
    const sel = zones.find((z) => z.id === selectedId);
    if (sel) {
      mapRef.current.setLocation({
        center: [sel.center[1], sel.center[0]],
        zoom: 13,
        duration: 400,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl overflow-hidden"
      style={{ height: "260px" }}
    />
  );
}
