export const MAX_DEMO_RIDE_DISTANCE_KM = 15;
export const DEMO_DISTANCE_ERROR = 'That trip is outside the current RYDA demo area. Choose locations within 15 km of each other.';

export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const a = Math.sin(radians(lat2 - lat1) / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(radians(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}

export function isNigeriaFeature(feature) {
  return ['NG', 'NGA'].includes(String(feature?.properties?.country_a || '').toUpperCase());
}
