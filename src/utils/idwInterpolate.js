/**
 * Inverse Distance Weighting (IDW) Interpolation
 * Source: Shepard (1968), Li & Heap (2014)
 */

/**
 * Performs IDW interpolation at a point (x, y) given a set of known points.
 * @param {number} x Target X (latitude or longitude normalized)
 * @param {number} y Target Y
 * @param {Array} points Known data points [{ x, y, value }]
 * @param {number} p Power parameter (typically 2)
 * @returns {number} Interpolated value
 */
export const interpolatePoint = (x, y, points, p = 2) => {
  if (!points || points.length === 0) return 0;

  let numerator = 0;
  let denominator = 0;

  for (const point of points) {
    const dx = x - point.x;
    const dy = y - point.y;
    const distSq = dx * dx + dy * dy;

    if (distSq === 0) return point.value; // Exact match

    const weight = 1 / Math.pow(distSq, p / 2);
    numerator += weight * point.value;
    denominator += weight;
  }

  return denominator === 0 ? 0 : numerator / denominator;
};

/**
 * Generates a grid of interpolated values for a heatmap.
 * @param {Array} nodes List of node objects with lat, lng, and a value
 * @param {number} columns Grid columns
 * @param {number} rows Grid rows
 * @param {Object} bounds { latMin, latMax, lngMin, lngMax }
 * @param {string} metricKey Node key to interpolate (e.g., 'co2ppm')
 * @returns {Array} Array of [lat, lng, intensity] for leaflet.heat
 */
export const generateIdwHeatmapPoints = (nodes, columns = 20, rows = 20, bounds, metricKey = 'co2ppm') => {
  if (!nodes || nodes.length === 0 || !bounds) return [];

  const points = nodes
    .filter(n => n.lat != null && n.lng != null && n[metricKey] != null)
    .map(n => ({
      x: n.lng,
      y: n.lat,
      value: Number(n[metricKey])
    }));

  if (points.length === 0) return [];

  // Find range for normalization of intensity (e.g. for CO2, 400-2000 ppm)
  const values = points.map(p => p.value);
  const minVal = Math.min(...values, 400);
  const maxVal = Math.max(...values, 1000);
  const range = maxVal - minVal || 1;

  const result = [];
  const latStep = (bounds.latMax - bounds.latMin) / rows;
  const lngStep = (bounds.lngMax - bounds.lngMin) / columns;

  for (let r = 0; r <= rows; r++) {
    const lat = bounds.latMin + r * latStep;
    for (let c = 0; c <= columns; c++) {
      const lng = bounds.lngMin + c * lngStep;
      const interpolated = interpolatePoint(lng, lat, points, 2);
      
      // Normalize intensity to 0-1 for heatmap
      const intensity = Math.max(0.05, Math.min(1, (interpolated - minVal) / range));
      result.push([lat, lng, intensity]);
    }
  }

  return result;
};
