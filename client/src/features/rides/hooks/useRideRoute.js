import { useEffect, useMemo, useState } from 'react';

function toLatLng(location) {
  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);

  return Number.isFinite(latitude) && Number.isFinite(longitude) ? [latitude, longitude] : null;
}

export function useRideRoute(pickup, destination) {
  const pickupPosition = useMemo(() => toLatLng(pickup), [pickup?.latitude, pickup?.longitude]);
  const destinationPosition = useMemo(
    () => toLatLng(destination),
    [destination?.latitude, destination?.longitude]
  );
  const fallbackRoute = useMemo(
    () => (pickupPosition && destinationPosition ? [pickupPosition, destinationPosition] : []),
    [pickupPosition, destinationPosition]
  );
  const [route, setRoute] = useState(fallbackRoute);
  const [routeNotice, setRouteNotice] = useState('');

  useEffect(() => {
    const apiKey = import.meta.env.VITE_OPENROUTESERVICE_API_KEY;

    if (!pickupPosition || !destinationPosition) {
      setRoute([]);
      setRouteNotice('Add valid pickup and destination coordinates to display the route.');
      return undefined;
    }

    if (!apiKey) {
      setRoute(fallbackRoute);
      setRouteNotice('Showing a direct route line. Add VITE_OPENROUTESERVICE_API_KEY to use road routes.');
      return undefined;
    }

    const controller = new AbortController();

    async function loadRoute() {
      try {
        const response = await fetch('https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson', {
          method: 'POST',
          headers: {
            Authorization: apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            coordinates: [
              [pickupPosition[1], pickupPosition[0]],
              [destinationPosition[1], destinationPosition[0]]
            ]
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error('OpenRouteService could not calculate a route.');
        }

        const data = await response.json();
        const coordinates = data.features?.[0]?.geometry?.coordinates;

        if (!Array.isArray(coordinates) || coordinates.length < 2) {
          throw new Error('OpenRouteService returned no route geometry.');
        }

        setRoute(coordinates.map(([longitude, latitude]) => [latitude, longitude]));
        setRouteNotice('');
      } catch (error) {
        if (error.name !== 'AbortError') {
          setRoute(fallbackRoute);
          setRouteNotice('Road route unavailable. Showing a direct route line.');
        }
      }
    }

    loadRoute();
    return () => controller.abort();
  }, [destinationPosition, fallbackRoute, pickupPosition]);

  return { route, routeNotice };
}
