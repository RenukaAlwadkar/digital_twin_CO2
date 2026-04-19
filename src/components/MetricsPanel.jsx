import React from 'react';
import { Activity, Wind, AlertTriangle, TrendingDown } from 'lucide-react';

const MetricCard = ({ title, value, unit, icon: Icon, trend }) => (
  <div className="glass-panel p-6 flex items-center justify-between">
    <div>
      <p className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-1">{title}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-4xl font-black text-slate-800">{value}</h3>
        {unit && <span className="text-sm font-semibold text-slate-400">{unit}</span>}
      </div>
      {trend !== undefined && trend !== null && (
        <p className={`text-sm font-bold mt-2 flex items-center gap-1 ${trend > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from baseline
        </p>
      )}
    </div>
    <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
      <Icon size={28} />
    </div>
  </div>
);

const MetricsPanel = ({ metrics, baselineTotal }) => {
  if (!metrics) return null;

  const reduction = baselineTotal > 0 
    ? Math.round(((metrics.totalCo2 - baselineTotal) / baselineTotal) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <MetricCard 
        title="Total Emissions" 
        value={metrics.totalCo2} 
        unit="tons/day" 
        icon={Activity} 
        trend={reduction}
      />
      <MetricCard 
        title="Avg Air Quality Index" 
        value={metrics.airQualityIndex} 
        unit="AQI" 
        icon={Wind} 
      />
      <MetricCard 
        title="Peak Concentration" 
        value={metrics.maxCo2} 
        unit="ppm limit" 
        icon={AlertTriangle} 
      />
      <MetricCard 
        title="Carbon Reduction" 
        value={Math.abs(reduction)} 
        unit="%" 
        icon={TrendingDown} 
      />
    </div>
  );
};

export default MetricsPanel;
