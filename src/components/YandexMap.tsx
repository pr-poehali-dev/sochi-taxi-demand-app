import { useEffect, useRef, useState } from "react";

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
  center: [number, number]; // [lat, lng]
  radiusM: number;
}

interface Props {
  zones: MapZone[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const DEMAND_COLOR: Record<DemandLevel, string> = {
  airport: "#3b82f6",
  high: "#ef4444",
  mid: "#facc15",
  low: "#22c55e",
};

function makeCircleCoords(lat: number, lng: number, radiusM: number, points = 60): [number, number][] {
  const earthR = 6371000;
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dLat = (radiusM / earthR) * (180 / Math.PI);
    const dLng = (radiusM / (earthR * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI);
    coords.push([lng + dLng * Math.cos(angle), lat + dLat * Math.sin(angle)]);
  }
  return coords;
}

export default function YandexMap({ zones, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layersRef = useRef<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Wait until ymaps3 global is available
        await new Promise<void>((resolve, reject) => {
          let tries = 0;
          const check = () => {
            if (window.ymaps3) { resolve(); return; }
            if (tries++ > 100) { reject(new Error("ymaps3 not loaded")); return; }
            setTimeout(check, 100);
          };
          check();
        });

        if (cancelled) return;

        // ymaps3 v3: wait for the API to be ready
        await window.ymaps3.ready;
        if (cancelled) return;

        const ymaps3 = window.ymaps3;

        const {
          YMap,
          YMapDefaultSchemeLayer,
          YMapDefaultFeaturesLayer,
          YMapFeature,
          YMapMarker,
          YMapControls,
          YMapZoomControl,
          YMapGeolocationControl,
        } = ymaps3;

        if (!containerRef.current) return;

        // Create map centered on Sochi [lng, lat]
        const map = new YMap(containerRef.current, {
          location: {
            center: [39.7257, 43.585],
            zoom: 11,
          },
        });

        // Dark tile layer
        map.addChild(new YMapDefaultSchemeLayer({
          customization: [
            { tags: { any: ["landscape", "admin", "water", "road"] }, elements: "geometry", stylers: [{ color: "#0d1117" }] },
          ],
          theme: "dark",
        }));

        map.addChild(new YMapDefaultFeaturesLayer());

        // Controls
        try {
          const controls = new YMapControls({ position: "right" });
          controls.addChild(new YMapZoomControl({}));
          map.addChild(controls);
        } catch (_) { /* optional */ }

        try {
          const geoControls = new YMapControls({ position: "right bottom" });
          geoControls.addChild(new YMapGeolocationControl({}));
          map.addChild(geoControls);
        } catch (_) { /* optional */ }

        mapRef.current = map;

        // Draw all zones
        zones.forEach((zone) => {
          const color = DEMAND_COLOR[zone.demand];
          const [lat, lng] = zone.center;
          const isSelected = zone.id === selectedId;

          // Polygon circle
          try {
            const feature = new YMapFeature({
              geometry: {
                type: "Polygon",
                coordinates: [makeCircleCoords(lat, lng, zone.radiusM)],
              },
              style: {
                stroke: [{ color, width: isSelected ? 3 : 1.5 }],
                fill: color,
                fillOpacity: isSelected ? 0.45 : 0.22,
              },
            });
            map.addChild(feature);
            layersRef.current.push(feature);
          } catch (_) { /* ignore */ }

          // Marker
          const el = document.createElement("div");
          el.style.cssText = `
            background: rgba(10,14,20,0.92);
            border: ${isSelected ? "2px" : "1.5px"} solid ${color};
            border-radius: 10px;
            padding: 5px 9px;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            box-shadow: 0 0 ${isSelected ? 20 : 10}px ${color}${isSelected ? "99" : "55"};
            user-select: none;
          `;
          el.innerHTML = `
            <span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:${color};line-height:1">×${zone.coef}</span>
            <span style="font-family:'Golos Text',sans-serif;font-size:9px;color:rgba(255,255,255,0.55);line-height:1">${zone.orders} зак.</span>
          `;
          el.addEventListener("click", () => onSelect(zone.id));

          try {
            const marker = new YMapMarker({ coordinates: [lng, lat] }, el);
            map.addChild(marker);
            layersRef.current.push(marker);
          } catch (_) { /* ignore */ }
        });

        if (!cancelled) setLoading(false);

      } catch (e) {
        if (!cancelled) {
          console.error("YandexMap init error:", e);
          setError("Не удалось загрузить карту");
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        try { mapRef.current.destroy(); } catch (_) { /* ignore */ }
        mapRef.current = null;
      }
      layersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update zones when selectedId changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.ymaps3) return;

    const ymaps3 = window.ymaps3;
    const { YMapFeature, YMapMarker } = ymaps3;

    // Remove old layers
    layersRef.current.forEach((obj) => {
      try { map.removeChild(obj); } catch (_) { /* ignore */ }
    });
    layersRef.current = [];

    zones.forEach((zone) => {
      const color = DEMAND_COLOR[zone.demand];
      const [lat, lng] = zone.center;
      const isSelected = zone.id === selectedId;

      try {
        const feature = new YMapFeature({
          geometry: {
            type: "Polygon",
            coordinates: [makeCircleCoords(lat, lng, zone.radiusM)],
          },
          style: {
            stroke: [{ color, width: isSelected ? 3 : 1.5 }],
            fill: color,
            fillOpacity: isSelected ? 0.45 : 0.22,
          },
        });
        map.addChild(feature);
        layersRef.current.push(feature);
      } catch (_) { /* ignore */ }

      const el = document.createElement("div");
      el.style.cssText = `
        background: rgba(10,14,20,0.92);
        border: ${isSelected ? "2px" : "1.5px"} solid ${color};
        border-radius: 10px;
        padding: 5px 9px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        box-shadow: 0 0 ${isSelected ? 20 : 10}px ${color}${isSelected ? "99" : "55"};
        user-select: none;
      `;
      el.innerHTML = `
        <span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:${color};line-height:1">×${zone.coef}</span>
        <span style="font-family:'Golos Text',sans-serif;font-size:9px;color:rgba(255,255,255,0.55);line-height:1">${zone.orders} зак.</span>
      `;
      el.addEventListener("click", () => onSelect(zone.id));

      try {
        const marker = new YMapMarker({ coordinates: [lng, lat] }, el);
        map.addChild(marker);
        layersRef.current.push(marker);
      } catch (_) { /* ignore */ }
    });

    // Pan to selected
    const sel = zones.find((z) => z.id === selectedId);
    if (sel) {
      try {
        map.setLocation({
          center: [sel.center[1], sel.center[0]],
          zoom: 13,
          duration: 500,
        });
      } catch (_) { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  if (error) {
    return (
      <div
        className="w-full rounded-2xl flex items-center justify-center bg-secondary border border-border"
        style={{ height: 260 }}
      >
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height: 300 }}>
      <div ref={containerRef} style={{ width: "100%", height: "300px" }} />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Загружаем карту...</p>
          </div>
        </div>
      )}
    </div>
  );
}