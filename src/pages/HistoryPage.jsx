import React, { useEffect, useState } from 'react';
import { Database, TrendingUp, History, AlertCircle } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const API_URL = 'http://localhost:8000';

const HistoryPage = () => {
  const [telemetry, setTelemetry] = useState([]);
  const [simulations, setSimulations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [telemetryRes, simulationsRes] = await Promise.all([
          fetch(`${API_URL}/history/telemetry?limit=50`),
          fetch(`${API_URL}/history/simulations?limit=20`)
        ]);
        
        if (telemetryRes.ok) {
          const tData = await telemetryRes.json();
          // reverse so oldest is first for chart
          setTelemetry(tData.reverse().map(d => ({
            ...d,
            timeLabel: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          })));
        }
        
        if (simulationsRes.ok) {
          const sData = await simulationsRes.json();
          setSimulations(sData);
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Database className="text-slate-700" size={24} />
        <h2 className="text-2xl font-black text-slate-800">Data Persistence & Audit Trail</h2>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-500 font-bold animate-pulse">Loading historical data...</p>
        </div>
      ) : (
        <div className="grid min-h-0 gap-6 xl:grid-cols-2 flex-1 pb-6 overflow-hidden">
          {/* Telemetry Chart */}
          <div className="glass-panel p-6 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-blue-500" size={20} />
              <h3 className="text-lg font-bold text-slate-800">Historical Telemetry Trends</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6">Real-time IoT data saved to SQLite database every 2 minutes.</p>
            
            <div className="flex-1 min-h-[300px]">
              {telemetry.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={telemetry}>
                    <defs>
                      <linearGradient id="colorCo2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="timeLabel" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area yAxisId="left" type="monotone" dataKey="co2ppm" name="CO2 (ppm)" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorCo2)" strokeWidth={2} />
                    <Area yAxisId="right" type="monotone" dataKey="pollution_index" name="AQI" stroke="#f97316" fillOpacity={1} fill="url(#colorAqi)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  No telemetry data found. Wait for the background process to save data.
                </div>
              )}
            </div>
          </div>

          {/* Simulation Audit Trail */}
          <div className="glass-panel p-6 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-4">
              <History className="text-emerald-500" size={20} />
              <h3 className="text-lg font-bold text-slate-800">Simulation Audit Logs</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6">History of "What-If" scenario executions.</p>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {simulations.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {simulations.map((sim) => (
                    <div key={sim.id} className="p-4 rounded-xl border border-slate-200 bg-white/50 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400">
                          {new Date(sim.timestamp).toLocaleString()}
                        </span>
                        <span className={`text-xs font-black uppercase px-2 py-1 rounded-full ${sim.impact === 'increase' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {sim.impact} ({sim.change_percent > 0 ? '+' : ''}{sim.change_percent.toFixed(1)}%)
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 text-sm mt-1">
                        <div><span className="text-slate-500">Base CO2:</span> <span className="font-bold">{sim.base_co2.toFixed(1)}</span></div>
                        <div><span className="text-slate-500">New CO2:</span> <span className="font-bold">{sim.new_co2.toFixed(1)}</span></div>
                      </div>
                      
                      <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-600 grid grid-cols-2 gap-1">
                        <div>Traffic: <span className="font-semibold uppercase">{sim.traffic_level}</span></div>
                        <div>Green Cover: <span className="font-semibold">+{sim.green_cover_increase}%</span></div>
                        <div>Wind Chg: <span className="font-semibold">{sim.wind_speed_change} m/s</span></div>
                        <div>Ind. Emiss: <span className="font-semibold">+{sim.industrial_emissions}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  No simulation logs found. Run a simulation to see it here.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
