import { useEffect, useRef, useState } from "react";
import { GeocodingControl } from "@maptiler/geocoding-control/react";
import { createMapLibreGlMapController } from "@maptiler/geocoding-control/maplibregl-controller";
import type { Feature, MapController } from "@maptiler/geocoding-control/types";
import "@maptiler/geocoding-control/style.css";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useUncontrolled } from "@mantine/hooks";

interface CustomInputProps {
  value?: Feature | undefined;
  defaultValue?: Feature | undefined;
  onChange?: (value: Feature | undefined) => void;
}
const apiKey = import.meta.env.VITE_GEOMAP_API_KEY;

export default function InputMapComponent({ value, defaultValue, onChange }: CustomInputProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapController, setMapController] = useState<MapController>();
  const [_value, handleChange] = useUncontrolled({
    value,
    defaultValue,
    finalValue: undefined,
    onChange,
  });

  useEffect(() => {
    if (!mapContainerRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      style: `https://api.maptiler.com/maps/streets/style.json?key=${apiKey}`,
      container: mapContainerRef.current,
      center: [2.15, 41.38],
      zoom: 5,
    });

    setMapController(createMapLibreGlMapController(map, maplibregl));
  }, []);

  return (
    <>
      <div>
        <GeocodingControl
          debounceSearch={2}
          types={["poi", "address", "place"]}
          clearButtonTitle="clear"
          onPick={(e) => {
            // console.log(`pick ====> ${JSON.stringify(e)}`);
            if (e) {
              handleChange(e);
            }
          }}
          apiKey={apiKey}
          mapController={mapController}
        />
        <div ref={mapContainerRef} style={{ width: "400px", height: "400px", marginTop: "8px" }} />
      </div>
    </>
  );
}
