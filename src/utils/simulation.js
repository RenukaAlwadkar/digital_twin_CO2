import { applyDispersionStep } from './physicsEngine';

// Zone types and their baseline emissions (arbitrary units)
export const ZONES = {
  INDUSTRIAL: { type: 'industrial', emissionRate: 15, color: '#f87171' }, // Red-ish
  TRANSPORT: { type: 'transport', emissionRate: 10, color: '#fb923c' },   // Orange-ish
  COMMERCIAL: { type: 'commercial', emissionRate: 5, color: '#fbbf24' },  // Yellow-ish
  RESIDENTIAL: { type: 'residential', emissionRate: 2, color: '#a3e635' },// Green-ish
  PARK: { type: 'park', emissionRate: -2, color: '#4ade80' },             // Green
};

export const INTERVENTIONS = {
  VERTICAL_GARDENS: { id: 'vertical_gardens', label: 'Vertical Gardens', description: 'Reduces residential and commercial CO2 by 15%.' },
  ROADSIDE_CAPTURE: { id: 'roadside_capture', label: 'Roadside Capture Units', description: 'Reduces transport CO2 by 40%.' },
  BIOFILTERS: { id: 'biofilters', label: 'Industrial Biofilters', description: 'Reduces industrial emissions by 50%.' },
  TRAFFIC_REDUCTION: { id: 'traffic_reduction', label: 'Traffic Reduction Policies', description: 'Lowers baseline transport emissions by 30%.' },
};

// Generate a static 10x10 city grid layout
export const generateCityGrid = (width = 10, height = 10) => {
  const grid = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      let zone = ZONES.RESIDENTIAL;
      // Define some regions
      if (x >= 7 && y >= 7) zone = ZONES.INDUSTRIAL;
      else if (x === 4 || x === 5 || y === 4) zone = ZONES.TRANSPORT; // roads
      else if (x >= 2 && x
         <= 4 && y >= 6) zone = ZONES.COMMERCIAL;
      else if (x <= 2 && y <= 2) zone = ZONES.PARK;
      
      row.push({
        x, y,
        zone,
        co2Level: zone.emissionRate > 0 ? zone.emissionRate : 0,
      });
    }
    grid.push(row);
  }
  return grid;
};

// Simulate one step of CO2 generation and diffusion
export const simulateStep = (grid, activeInterventions, customInterventions = [], globalMultiplier = 1.0) => {
  const height = grid.length;
  const width = grid[0].length;
  const newGrid = JSON.parse(JSON.stringify(grid)); // Deep copy

  // 1. Generate new CO2 based on zones and interventions
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = newGrid[y][x];
      let rate = cell.zone.emissionRate * globalMultiplier;

      // Apply built-in interventions
      if (activeInterventions.includes(INTERVENTIONS.TRAFFIC_REDUCTION.id) && cell.zone.type === 'transport') {
        rate *= 0.7; 
      }
      
      let generation = rate;
      if (activeInterventions.includes(INTERVENTIONS.VERTICAL_GARDENS.id) && (cell.zone.type === 'residential' || cell.zone.type === 'commercial')) {
        generation -= 1; 
      }
      if (activeInterventions.includes(INTERVENTIONS.ROADSIDE_CAPTURE.id) && cell.zone.type === 'transport') {
        generation *= 0.6; 
      }
      if (activeInterventions.includes(INTERVENTIONS.BIOFILTERS.id) && cell.zone.type === 'industrial') {
        generation *= 0.5; 
      }

      customInterventions.forEach(ci => {
        if (ci.isActive && (ci.targetZone === 'all' || cell.zone.type === ci.targetZone)) {
          if (ci.type === 'reduction') {
            generation *= (1 - (ci.factor / 100));
          } else if (ci.type === 'increase') {
            generation *= (1 + (ci.factor / 100));
          }
        }
      });

      // Natural dissipation 2% (realistic for large air masses)
      cell.co2Level = (cell.co2Level * 0.98) + generation;
      if (cell.co2Level < 0) cell.co2Level = 0;
    }
  }

  // 2. Diffusion (Cheng et al. 2014 Finite Difference Stencil)
  return applyDispersionStep(newGrid, 2.5, 3, 100); 
};

// Calculate overall metrics
export const calculateMetrics = (grid) => {
  let totalCo2 = 0;
  let maxCo2 = 0;
  let industrialAvg = 0;
  let indCount = 0;

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const level = grid[y][x].co2Level;
      totalCo2 += level;
      if (level > maxCo2) maxCo2 = level;
      if (grid[y][x].zone.type === 'industrial') {
        industrialAvg += level;
        indCount++;
      }
    }
  }

  return {
    totalCo2: Math.round(totalCo2),
    maxCo2: Math.round(maxCo2),
    avgCo2: Math.round(totalCo2 / (grid.length * grid[0].length)),
    airQualityIndex: Math.min(500, Math.round((totalCo2 / 200) * 100)), // arbitrary scaling for AQI
  };
};
