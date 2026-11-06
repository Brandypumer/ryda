import AppError from '../../../shared/utils/AppError.js';

export const MAX_DEMO_RIDE_DISTANCE_KM = 15;
export const DEMO_DISTANCE_ERROR = 'That trip is outside the current RYDA demo area. Choose locations within 15 km of each other.';

export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const a = Math.sin(radians(lat2 - lat1) / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(radians(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}

export function assertRideWithinDemoArea(pickup, destination) {
  for (const location of [pickup, destination]) {
    if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number'
      || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)
      || Math.abs(location.latitude) > 90 || Math.abs(location.longitude) > 180) {
      throw new AppError('Choose a valid pickup and destination from location search.', 400);
    }
  }
  const distance = calculateDistanceKm(pickup.latitude, pickup.longitude, destination.latitude, destination.longitude);
  // Allow only numerical noise at the exact 15 km boundary.
  if (distance > MAX_DEMO_RIDE_DISTANCE_KM + 1e-9) throw new AppError(DEMO_DISTANCE_ERROR, 400);
}
