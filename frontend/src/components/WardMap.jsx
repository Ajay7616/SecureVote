import React, { useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';

const WardMap = ({ onPolygonChange, existingPolygon }) => {
  const defaultCenter = [20.5937, 78.9629]; 

  const handleCreated = (e) => {
    const layer = e.layer;
    const geoJson = layer.toGeoJSON();
    onPolygonChange(geoJson.geometry);
  };

  const handleEdited = (e) => {
    e.layers.eachLayer((layer) => {
      const geoJson = layer.toGeoJSON();
      onPolygonChange(geoJson.geometry);
    });
  };

  return (
    <MapContainer center={defaultCenter} zoom={5} style={{ height: 400 }}>
      <TileLayer
        attribution="© OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FeatureGroup>
        <EditControl
          position="topright"
          onCreated={handleCreated}
          onEdited={handleEdited}
          draw={{
            rectangle: false,
            circle: false,
            circlemarker: false,
            marker: false,
            polyline: false,
          }}
        />
      </FeatureGroup>
    </MapContainer>
  );
};

export default WardMap;
