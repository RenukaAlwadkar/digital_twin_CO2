import React from 'react';

const getHeatmapColor = (co2Level, maxExpected = 20) => {
  // Intensity from 0 to 1
  const intensity = Math.min(1, Math.max(0, co2Level / maxExpected));
  
  // Color scale from green to yellow to red/purple
  // Low: Green (120 hue) -> High: Red (0 hue)
  const hue = (1.0 - intensity) * 120;
  return `hsl(${hue}, 100%, 50%)`;
};

const Heatmap = ({ grid }) => {
  if (!grid || grid.length === 0) return null;

  const height = grid.length;
  const width = grid[0].length;

  return (
    <div className="glass-panel p-8 flex flex-col items-center justify-center h-full">
      <h2 className="text-2xl font-black mb-6 text-slate-800">Live CO₂ Dispersion</h2>
      <div 
        className="grid gap-1 bg-slate-100 p-3 rounded-xl border border-slate-200 shadow-inner"
        style={{
          gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`
        }}
      >
        {grid.flat().map((cell, index) => (
          <div 
            key={index}
            className="w-10 h-10 rounded-md relative group transition-colors duration-500 ease-in-out shadow-sm"
            style={{
              backgroundColor: getHeatmapColor(cell.co2Level)
            }}
          >
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 w-max px-3 py-2 bg-slate-900 text-xs text-white rounded-lg shadow-xl border border-slate-700 pointer-events-none">
              <span className="font-bold capitalize">{cell.zone.type}</span><br />
              CO₂: {cell.co2Level.toFixed(1)}
            </div>
            
            {/* Overlay slightly if it's a road or park to give it texture */}
            {cell.zone.type === 'transport' && (
              <div className="absolute inset-0 bg-black/20" />
            )}
            {cell.zone.type === 'park' && (
              <div className="absolute inset-0 bg-green-500/20" />
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-8 w-full flex flex-col md:flex-row items-center justify-between text-sm font-semibold text-slate-600 bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
        <span className="font-black text-slate-800 uppercase tracking-wider text-xs">Pollution Density</span>
        <div className="flex gap-6">
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[hsl(120,100%,50%)] shadow-inner"></div> Low (Healthy)
          </span>
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[hsl(60,100%,50%)] shadow-inner"></div> Medium (Warning)
          </span>
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[hsl(0,100%,50%)] shadow-inner"></div> High (Dangerous)
          </span>
        </div>
      </div>
    </div>
  );
};

export default Heatmap;
