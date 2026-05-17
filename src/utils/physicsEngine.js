/**
 * EcoTwin Physics Engine
 * 
 * Implements research-backed environmental and emission formulas.
 */

// ── 1. US EPA AQI Interpolation (2018) ──────────────────────────────────
// Source: US EPA Technical Assistance Document for the Reporting of Daily Air Quality
// Breakpoints for PM2.5 (ug/m3)
// Breakpoints for PM2.5 (ug/m3) - Indian National AQI (IND-AQI)
// Source: CPCB (Central Pollution Control Board) 2014
const PM25_BREAKPOINTS = [
  { cLo: 0,   cHi: 30,  aLo: 0,   aHi: 50 },
  { cLo: 31,  cHi: 60,  aLo: 51,  aHi: 100 },
  { cLo: 61,  cHi: 90,  aLo: 101, aHi: 200 },
  { cLo: 91,  cHi: 120, aLo: 201, aHi: 300 },
  { cLo: 121, cHi: 250, aLo: 301, aHi: 400 },
  { cLo: 250, cHi: 500, aLo: 401, aHi: 500 },
];

/**
 * Calculates AQI based on PM2.5 concentration using linear interpolation.
 * @param {number} concentration PM2.5 concentration in ug/m3
 * @returns {number} AQI (0-500)
 */
export const calculateAqiFromPm25 = (concentration) => {
  if (concentration == null || concentration < 0) return 0;
  const conc = Math.min(concentration, 500.4);
  const bp = PM25_BREAKPOINTS.find(b => conc >= b.cLo && conc <= b.cHi) || PM25_BREAKPOINTS[PM25_BREAKPOINTS.length - 1];
  
  const aqi = ((bp.aHi - bp.aLo) / (bp.cHi - bp.cLo)) * (conc - bp.cLo) + bp.aLo;
  return Math.round(aqi);
};


// ── 2. CO2 Emission Factor (COPERT/EMEP Speed-Dependent) ──────────────
// Source: EMEP/EEA Air Pollutant Emission Inventory Guidebook 2019
// α = 187.4, β = 720.0, γ = -0.35, δ = 0.00285
/**
 * Calculates CO2 emission factor for a mixed urban fleet based on speed.
 * @param {number} speedKph Average speed in km/h
 * @returns {number} Emission factor in g CO2 / km / vehicle
 */
export const getCo2EmissionFactor = (speedKph) => {
  const v = Math.max(speedKph, 5); // Avoid division by zero, min 5km/h for urban crawl
  return 187.4 + (720.0 / v) - (0.35 * v) + (0.00285 * v * v);
};

/**
 * Calculates daily CO2 emissions for a traffic node.
 * @param {number} speed Average speed (km/h)
 * @param {number} density Traffic density (0-100)
 * @param {number} laneKm Length of monitored corridor in km
 * @returns {number} Daily CO2 emissions in kg
 */
export const calculateTrafficEmissionsKg = (speed, density, laneKm = 1) => {
  const ef = getCo2EmissionFactor(speed);
  // Estimate vehicle count: density 100% ≈ 200 vehicles per lane-km (jammed)
  const vehicleCount = (density / 100) * 200 * laneKm;
  // Assume daily flow is vehicleCount averaged over 24 hours (simplified VKT)
  const dailyVkt = vehicleCount * 24 * laneKm; 
  return (ef * dailyVkt) / 1000; // g -> kg
};

// ── 3. Pollution Dispersion (Finite Difference Stencil) ────────────────
// Source: Cheng et al. (2014)
/**
 * Applies a single diffusion step to a grid using a 3D finite difference stencil (flattened to 2D).
 * @param {number[][]} grid 2D array of CO2 levels
 * @param {number} Dd Turbulent diffusivity (m2/s)
 * @param {number} dt Time step (s)
 * @param {number} dx Grid cell size (m)
 * @returns {number[][]} Updated grid
 */
export const applyDispersionStep = (grid, Dd = 2.5, dt = 3, dx = 100) => {
  const height = grid.length;
  const width = grid[0].length;
  const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
  
  const alpha = (Dd * dt) / (dx * dx);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let laplacian = 0;
      let count = 0;

      const neighbors = [
        [y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]
      ];

      for (const [ny, nx] of neighbors) {
        if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
          laplacian += grid[ny][nx].co2Level - grid[y][x].co2Level;
          count++;
        }
      }

      // Finite difference: C_new = C_old + alpha * Laplacian
      newGrid[y][x].co2Level = grid[y][x].co2Level + alpha * laplacian;
      if (newGrid[y][x].co2Level < 0) newGrid[y][x].co2Level = 0;
    }
  }

  return newGrid;
};
