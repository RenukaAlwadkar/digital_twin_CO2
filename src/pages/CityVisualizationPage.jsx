import React, { useMemo, useState } from 'react';
import { Activity, Factory, ThermometerSun, Droplets, Wind, Gauge, ChevronDown, MapPin } from 'lucide-react';
import CarbonConcentrationMap from '../components/CarbonConcentrationMap';
import { getCityKpiSummary } from '../utils/delhiNodes';
import CITIES from '../data/cities';

const StatCard = ({ label, value, icon: Icon, meta, color = 'slate' }) => {
  const colorMap = {
    slate: 'text-slate-700', rose: 'text-rose-600', amber: 'text-amber-600',
    sky: 'text-sky-600', emerald: 'text-emerald-600', violet: 'text-violet-600',
  };
  return (
    <div className="glass-panel p-4 flex flex-col gap-1">
      <p className="text-[11px] uppercase tracking-[0.2em] font-black text-slate-500">{label}</p>
      <div className={`flex items-center gap-2 ${colorMap[color]}`}>
        <Icon size={17} />
        <p className="text-2xl font-black">{value}</p>
      </div>
      {meta ? <p className="text-xs text-slate-400">{meta}</p> : null}
    </div>
  );
};

const cityOptions = [
  { value: 'all', label: '🌏 All Cities (India)' },
  ...CITIES.map(c => ({ value: c.id, label: `📍 ${c.name}` })),
];

const CityVisualizationPage = ({ nodes, selectedNode, onSelectNode, weather }) => {
  const [focusCity, setFocusCity] = useState('wardha');

  // Filter nodes by selected city for KPI stats
  const visibleNodes = useMemo(() => {
    if (focusCity === 'all') return nodes;
    return nodes.filter(n =>
      n.id === `city-${focusCity}` ||
      n.location?.toLowerCase().includes(focusCity.toLowerCase())
    );
  }, [nodes, focusCity]);

  const kpi = useMemo(() => getCityKpiSummary(visibleNodes.length ? visibleNodes : nodes), [visibleNodes, nodes]);

  // Find the focused city node for its weather data
  const focusedCityNode = useMemo(() => {
    if (focusCity === 'all') return null;
    return nodes.find(n => n.id === `city-${focusCity}`);
  }, [focusCity, nodes]);

  // Use focused city weather or fallback to Delhi weather prop
  const displayWeather = focusedCityNode
    ? {
        temperature: focusedCityNode.temperatureC,
        humidity:    focusedCityNode.humidityPct,
        wind_speed:  focusedCityNode.wind_speed,
        aqi:         focusedCityNode.aqiRaw,
        pm2_5:       focusedCityNode.pm25,
        no2:         focusedCityNode.no2,
        so2:         focusedCityNode.so2,
        o3:          focusedCityNode.o3,
        co:          focusedCityNode.co,
        pm10:        focusedCityNode.pm10,
        weatherDesc: focusedCityNode.weatherDesc,
        pressure:    focusedCityNode.pressure,
      }
    : weather;

  const focusCityConfig = CITIES.find(c => c.id === focusCity) ?? null;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-5 pb-6">

      {/* ── Top bar: City selector + KPI stats ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* City selector */}
        <div className="relative">
          <select
            value={focusCity}
            onChange={e => setFocusCity(e.target.value)}
            className="appearance-none glass-panel px-4 py-2.5 pr-10 text-sm font-black text-slate-800 cursor-pointer outline-none rounded-xl border border-slate-200 bg-white min-w-[200px]"
          >
            {cityOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
        </div>

        {focusCityConfig && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <MapPin size={13} className="text-rose-400" />
            {focusCityConfig.lat.toFixed(4)}°N, {focusCityConfig.lng.toFixed(4)}°E — {focusCityConfig.state}
          </div>
        )}
      </div>

      {/* KPI Row */}
      <section className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Avg AQI"      value={kpi.avgAqi.toFixed(0)}              icon={Activity}      meta={focusCity === 'all' ? 'All nodes' : focusCityConfig?.name} color="rose" />
        <StatCard label="Temperature"  value={`${kpi.avgTemp.toFixed(1)} °C`}      icon={ThermometerSun} meta="Air nodes"   color="amber" />
        <StatCard label="Humidity"     value={`${kpi.avgHumidity.toFixed(1)}%`}    icon={Droplets}      meta="Air nodes"   color="sky" />
        <StatCard label="Avg CO₂"      value={`${kpi.avgCo2.toFixed(0)} ppm`}      icon={Wind}          meta="All nodes"   color="violet" />
        <StatCard label="CO₂ Emission" value={`${kpi.dayEmissionKg.toFixed(1)} kg`} icon={Factory}      meta="Est. per day" color="slate" />
        <StatCard label="Live Nodes"   value={nodes.filter(n => n.sourceState === 'live').length} icon={Gauge} meta={`of ${nodes.length} total`} color="emerald" />
      </section>

      {/* Map */}
      <section className="flex-1 min-h-[500px]">
        <CarbonConcentrationMap
          nodes={nodes}
          selectedNode={selectedNode}
          onSelectNode={onSelectNode}
          focusCityId={focusCity !== 'all' ? focusCity : null}
        />
      </section>

      {/* Live API details for selected city */}
      {displayWeather && (
        <section className="glass-panel p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-1">
            ☁️ Live OpenWeather API — {focusCityConfig?.name ?? 'New Delhi'}
          </p>
          {displayWeather.weatherDesc && (
            <p className="text-xs text-slate-400 capitalize mb-3">{displayWeather.weatherDesc}</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
            {[
              { label: 'Temperature', value: displayWeather.temperature != null ? `${Number(displayWeather.temperature).toFixed(1)} °C` : '—' },
              { label: 'Humidity',    value: displayWeather.humidity    != null ? `${displayWeather.humidity}%` : '—' },
              { label: 'Wind',        value: displayWeather.wind_speed  != null ? `${Number(displayWeather.wind_speed).toFixed(1)} m/s` : '—' },
              { label: 'AQI (1–5)',   value: displayWeather.aqi ?? '—' },
              { label: 'PM2.5',       value: displayWeather.pm2_5  != null ? `${Number(displayWeather.pm2_5).toFixed(1)}` : '—' },
              { label: 'PM10',        value: displayWeather.pm10   != null ? `${Number(displayWeather.pm10).toFixed(1)}` : '—' },
              { label: 'NO₂',        value: displayWeather.no2    != null ? `${Number(displayWeather.no2).toFixed(1)}` : '—' },
              { label: 'SO₂',        value: displayWeather.so2    != null ? `${Number(displayWeather.so2).toFixed(1)}` : '—' },
            ].map(item => (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">{item.label}</p>
                <p className="text-base font-black text-slate-900 mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default CityVisualizationPage;
