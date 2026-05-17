import React, { useMemo } from 'react';
import {
  Cpu, Wifi, WifiOff, Thermometer, Droplets, Wind,
  Activity, AlertTriangle, CheckCircle, Clock, CloudSun, Zap,
} from 'lucide-react';

// ── CO₂ level thresholds ─────────────────────────────
const getCo2Status = (ppm) => {
  if (ppm == null) return { label: 'No Data',  color: 'slate',   icon: null };
  if (ppm < 600)   return { label: 'Normal',   color: 'emerald', icon: CheckCircle };
  if (ppm < 1000)  return { label: 'Elevated', color: 'amber',   icon: AlertTriangle };
  return               { label: 'High',     color: 'rose',    icon: AlertTriangle };
};

// ── Tiny SVG sparkline ────────────────────────────────
const Sparkline = ({ data, color = '#6366f1', width = 180, height = 44 }) => {
  if (!data || data.length < 2) {
    return (
      <svg width={width} height={height} className="opacity-30">
        <line x1="0" y1={height / 2} x2={width} y2={height / 2}
          stroke={color} strokeWidth="1.5" strokeDasharray="4 4" />
      </svg>
    );
  }

  const vals = data.map(d => d.co2_ppm ?? 420);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals) || minV + 1;
  const pad  = 4;
  const W    = width  - pad * 2;
  const H    = height - pad * 2;

  const pts = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * W;
    const y = pad + H - ((v - minV) / (maxV - minV)) * H;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height}>
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polyline
        fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        points={pts}
      />
    </svg>
  );
};

// ── Gauge arc ─────────────────────────────────────────
const Co2Gauge = ({ ppm }) => {
  const max   = 2000;
  const pct   = Math.min((ppm ?? 0) / max, 1);
  const deg   = pct * 180;
  const r     = 52;
  const cx    = 70;
  const cy    = 70;

  const arcPath = (startDeg, endDeg, radius, colour) => {
    const toRad = d => ((d - 90) * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(toRad(startDeg - 90));
    const y1 = cy + radius * Math.sin(toRad(startDeg - 90));
    const x2 = cx + radius * Math.cos(toRad(endDeg   - 90));
    const y2 = cy + radius * Math.sin(toRad(endDeg   - 90));
    const lg = endDeg - startDeg > 180 ? 1 : 0;
    return (
      <path
        d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${lg} 1 ${x2} ${y2}`}
        fill="none" stroke={colour} strokeWidth="10" strokeLinecap="round"
      />
    );
  };

  const gaugeColor = ppm == null ? '#cbd5e1'
    : ppm < 600   ? '#10b981'
    : ppm < 1000  ? '#f59e0b'
    : '#ef4444';

  const needleRad = ((deg - 90) * Math.PI) / 180;
  const nx = cx + (r - 8) * Math.cos(needleRad);
  const ny = cy + (r - 8) * Math.sin(needleRad);

  return (
    <svg width="140" height="80" viewBox="0 0 140 80">
      {arcPath(0, 180, r, '#e2e8f0')}
      {ppm != null && arcPath(0, deg, r, gaugeColor)}
      <line x1={cx} y1={cy} x2={nx} y2={ny}
        stroke={gaugeColor} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="4" fill={gaugeColor} />
      <text x="12" y="78" fontSize="9" fill="#94a3b8" fontWeight="700">400</text>
      <text x="112" y="78" fontSize="9" fill="#94a3b8" fontWeight="700">2k</text>
    </svg>
  );
};

// ── Source comparison row ─────────────────────────────
const CompareRow = ({ label, wokwiVal, apiVal, unit = '', icon: Icon, isWokwiActive }) => (
  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2 border-b border-slate-100 last:border-0">
    <div className={`text-right text-sm font-black transition-all ${isWokwiActive ? 'text-indigo-700' : 'text-slate-400'}`}>
      {wokwiVal != null ? `${wokwiVal}${unit}` : '—'}
    </div>
    <div className="flex flex-col items-center gap-0.5 px-2">
      {Icon && <Icon size={12} className="text-slate-400" />}
      <p className="text-[9px] uppercase tracking-widest text-slate-400 font-black whitespace-nowrap">{label}</p>
    </div>
    <div className={`text-left text-sm font-black transition-all ${!isWokwiActive ? 'text-sky-700' : 'text-slate-400'}`}>
      {apiVal != null ? `${apiVal}${unit}` : '—'}
    </div>
  </div>
);

// ── Main component ────────────────────────────────────
const WokwiLiveFeed = ({ reading, history, connectionStatus, isLive, rawWeather, weather }) => {
  const status = useMemo(() => getCo2Status(reading?.co2_ppm), [reading]);

  const colorMap = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
    amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700'   },
    rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700'     },
    slate:   { bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-600'   },
  };
  const c = colorMap[status.color];
  const StatusIcon = status.icon;

  const lastUpdated = reading?.receivedAt
    ? new Date(reading.receivedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  return (
    <section className={`glass-panel p-5 flex flex-col gap-4 transition-all duration-500 ${
      weather?.mode === 'wokwi' ? 'ring-2 ring-indigo-500/50' : 
      weather?.mode === 'api' ? 'opacity-75 grayscale-[0.5]' : ''
    }`}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
            <Cpu size={18} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Wokwi Live Prototype</p>
            <p className="text-sm font-black text-slate-800">
              ESP32 Sensor Node — New Delhi 
              {weather?.mode !== 'auto' && (
                <span className="ml-2 text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">
                  Forced {weather.mode}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Active source badge */}
        <div className="flex items-center gap-2">
          {/* Wokwi pill */}
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black border transition-all
            ${weather?.source === 'wokwi'
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'bg-white border-slate-200 text-slate-400'
            }`}>
            <Zap size={11} /> Wokwi
          </span>
          <span className="text-slate-300 text-xs font-black">OR</span>
          {/* API pill */}
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black border transition-all
            ${weather?.source === 'api'
              ? 'bg-sky-600 border-sky-600 text-white shadow-md shadow-sky-200'
              : 'bg-white border-slate-200 text-slate-400'
            }`}>
            <CloudSun size={11} /> OpenWeather API
          </span>
        </div>

        {/* Connection status */}
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black
          ${isLive
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            : 'bg-slate-100 border border-slate-200 text-slate-500'
          }`}>
          {isLive ? <><Wifi size={12} /> Link Established</> : <><WifiOff size={12} /> {connectionStatus ?? 'Disconnected'}</>}
        </span>
      </div>

      {/* ── Gauge + CO₂ (only Wokwi gives this) ── */}
      {isLive && (
        <div className={`rounded-2xl border ${c.border} ${c.bg} p-4 flex items-center gap-5 flex-wrap`}>
          <Co2Gauge ppm={reading?.co2_ppm} />

          <div className="flex flex-col gap-1">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">CO₂ Concentration</p>
            <div className="flex items-baseline gap-2">
              <p className={`text-4xl font-black ${c.text}`}>
                {reading?.co2_ppm != null ? reading.co2_ppm.toFixed(0) : '—'}
              </p>
              <p className="text-sm font-semibold text-slate-400">ppm</p>
            </div>
            <div className={`flex items-center gap-1.5 mt-1 ${c.text}`}>
              {StatusIcon && <StatusIcon size={13} />}
              <span className="text-xs font-black">{status.label}</span>
            </div>
          </div>

          {/* Sparkline */}
          <div className="ml-auto flex flex-col items-end gap-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Last {history.length} readings</p>
            <Sparkline data={history} color={
              status.color === 'emerald' ? '#10b981'
              : status.color === 'amber' ? '#f59e0b'
              : status.color === 'rose'  ? '#ef4444'
              : '#94a3b8'
            } />
          </div>
        </div>
      )}

      {/* ── Source comparison table ── */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto_1fr] text-center bg-slate-50 border-b border-slate-200 px-4 py-2">
          <div className={`flex items-center justify-end gap-1.5 text-xs font-black
            ${isLive ? 'text-indigo-600' : 'text-slate-400'}`}>
            <Zap size={12} /> Wokwi {isLive ? '(Active)' : '(Offline)'}
          </div>
          <div className="w-24 text-center text-[9px] font-black uppercase tracking-widest text-slate-400">Parameter</div>
          <div className={`flex items-center gap-1.5 text-xs font-black
            ${!isLive ? 'text-sky-600' : 'text-slate-400'}`}>
            <CloudSun size={12} /> API {!isLive ? '(Active)' : '(Fallback)'}
          </div>
        </div>

        <div className="px-4">
          <CompareRow
            label="Temperature"
            wokwiVal={reading?.temperature != null ? reading.temperature.toFixed(1) : null}
            apiVal={rawWeather?.temperature != null ? Number(rawWeather.temperature).toFixed(1) : null}
            unit=" °C" icon={Thermometer} isWokwiActive={isLive}
          />
          <CompareRow
            label="Humidity"
            wokwiVal={reading?.humidity != null ? reading.humidity.toFixed(0) : null}
            apiVal={rawWeather?.humidity != null ? `${rawWeather.humidity}` : null}
            unit="%" icon={Droplets} isWokwiActive={isLive}
          />
          <CompareRow
            label="CO₂"
            wokwiVal={reading?.co2_ppm != null ? reading.co2_ppm.toFixed(0) : null}
            apiVal="—"
            unit=" ppm" icon={Activity} isWokwiActive={isLive}
          />
          <CompareRow
            label="CO (MQ-7)"
            wokwiVal={reading?.co_ppm != null ? reading.co_ppm.toFixed(1) : null}
            apiVal={rawWeather?.co != null ? Number(rawWeather.co).toFixed(1) : null}
            unit=" ppm" icon={Wind} isWokwiActive={isLive}
          />
        </div>
      </div>

      {/* ── API-only metrics (always shown) ── */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-2">
          <CloudSun size={10} className="inline mr-1" />
          API-only parameters (PM, NO₂, AQI…)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'AQI (1–5)',  value: rawWeather?.aqi    ?? '—' },
            { label: 'PM2.5',      value: rawWeather?.pm2_5  != null ? Number(rawWeather.pm2_5).toFixed(1) : '—' },
            { label: 'PM10',       value: rawWeather?.pm10   != null ? Number(rawWeather.pm10).toFixed(1)  : '—' },
            { label: 'NO₂',        value: rawWeather?.no2    != null ? Number(rawWeather.no2).toFixed(1)   : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-[9px] uppercase tracking-widest text-slate-400 font-black">{label}</p>
              <p className="text-sm font-black text-sky-700 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Hardware Specifications (User Integrated) ── */}
      <div className="mt-2 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-4 items-start">
        <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-600">
          <Cpu size={18} />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">Hardware Specification</p>
          <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
            ESP32 Node with <strong>DHT22</strong> digital sensing and 12-bit ADC gas simulation. 
            Raw ADC (0-4095) mapped to <strong>400-2000 ppm (CO₂)</strong> and <strong>0-50 ppm (CO)</strong>. 
            Published via MQTT @ 2000ms.
          </p>
        </div>
      </div>

      {/* ── Last updated + tip ── */}
      <div className="flex items-center justify-between flex-wrap gap-2 mt-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
          <Clock size={12} />
          Last Wokwi reading: {lastUpdated}
        </div>

        {!isLive && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2 text-xs text-indigo-700 font-semibold">
            💡 Start Wokwi to switch from API to real sensor data.{' '}
            <a
              href="https://wokwi.com/projects/new/esp32"
              target="_blank"
              rel="noreferrer"
              className="underline font-black"
            >
              Open Wokwi →
            </a>
          </div>
        )}
      </div>
    </section>
  );
};

export default WokwiLiveFeed;
