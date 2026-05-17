import React, { useEffect, useState } from 'react';
import { Activity, Database, Zap, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const SystemStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('http://localhost:8000/health');
        if (!response.ok) throw new Error('Health check failed');
        const data = await response.json();
        setStatus(data);
        setError(null);
      } catch (err) {
        setError(err.message);
        setStatus(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="glass-panel p-4 bg-slate-50">
        <div className="flex items-center gap-2 text-slate-500">
          <Zap size={16} className="animate-spin" />
          <span className="text-sm font-medium">Checking backend status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel p-4 bg-rose-50 border border-rose-200">
        <div className="flex items-center gap-3">
          <XCircle size={16} className="text-rose-600" />
          <div>
            <p className="text-sm font-bold text-rose-600">Backend Offline</p>
            <p className="text-xs text-rose-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const overallHealth = status?.model_loaded && status?.database_connected ? 'healthy' : 'degraded';
  const healthColor = overallHealth === 'healthy' ? 'emerald' : 'amber';
  const HealthIcon = overallHealth === 'healthy' ? CheckCircle : AlertCircle;

  return (
    <div className="glass-panel p-4 border-2 border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <HealthIcon size={18} className={`text-${healthColor}-600`} />
          <h3 className="font-bold text-slate-900">System Status</h3>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full bg-${healthColor}-100 text-${healthColor}-700 capitalize`}>
          {overallHealth}
        </span>
      </div>

      <div className="space-y-2">
        {/* Model Status */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Zap size={14} className={status?.model_loaded ? 'text-emerald-600' : 'text-rose-600'} />
            <span className="text-slate-600 font-medium">ML Model</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">
              {status?.model_type || 'unknown'}
            </span>
            <span className={`text-xs font-bold ${status?.model_loaded ? 'text-emerald-600' : 'text-rose-600'}`}>
              {status?.model_loaded ? '✓ Loaded' : '✗ Failed'}
            </span>
          </div>
        </div>

        {/* Database Status */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Database size={14} className={status?.database_connected ? 'text-emerald-600' : 'text-rose-600'} />
            <span className="text-slate-600 font-medium">Database</span>
          </div>
          <span className={`text-xs font-bold ${status?.database_connected ? 'text-emerald-600' : 'text-rose-600'}`}>
            {status?.database_connected ? '✓ Connected' : '✗ Offline'}
          </span>
        </div>

        {/* API Status */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Activity size={14} className={status?.status === 'healthy' ? 'text-emerald-600' : 'text-amber-600'} />
            <span className="text-slate-600 font-medium">API</span>
          </div>
          <span className={`text-xs font-bold ${status?.status === 'healthy' ? 'text-emerald-600' : 'text-amber-600'}`}>
            ✓ Online
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
        Last update: {status?.timestamp ? new Date(status.timestamp).toLocaleTimeString() : '—'}
      </p>
    </div>
  );
};

export default SystemStatus;
