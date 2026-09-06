const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const haversineDistanceKm = (longitude1, latitude1, longitude2, latitude2) => {
  if (
    !Number.isFinite(longitude1) ||
    !Number.isFinite(latitude1) ||
    !Number.isFinite(longitude2) ||
    !Number.isFinite(latitude2)
  ) {
    return null;
  }

  const deltaLatitude = toRadians(latitude2 - latitude1);
  const deltaLongitude = toRadians(longitude2 - longitude1);
  const lat1Rad = toRadians(latitude1);
  const lat2Rad = toRadians(latitude2);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLongitude / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 10) / 10;
};

module.exports = {
  haversineDistanceKm,
};
