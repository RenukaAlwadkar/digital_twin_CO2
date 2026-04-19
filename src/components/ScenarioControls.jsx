import React, { useState } from 'react';
import { INTERVENTIONS, ZONES } from '../utils/simulation';
import { Settings2, Plus, X } from 'lucide-react';

const ScenarioControls = ({ 
  activeInterventions, 
  toggleIntervention, 
  customInterventions, 
  setCustomInterventions 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newScenario, setNewScenario] = useState({
    name: '',
    targetZone: 'all',
    type: 'reduction',
    factor: 20
  });

  const handleAddCustom = (e) => {
    e.preventDefault();
    if (!newScenario.name) return;
    
    setCustomInterventions(prev => [
      ...prev,
      {
        id: `custom_${Date.now()}`,
        name: newScenario.name,
        targetZone: newScenario.targetZone,
        type: newScenario.type,
        factor: Number(newScenario.factor),
        isActive: true
      }
    ]);
    setIsModalOpen(false);
    setNewScenario({ name: '', targetZone: 'all', type: 'reduction', factor: 20 });
  };

  const toggleCustom = (id) => {
    setCustomInterventions(prev => 
      prev.map(ci => ci.id === id ? { ...ci, isActive: !ci.isActive } : ci)
    );
  };

  const deleteCustom = (id) => {
    setCustomInterventions(prev => prev.filter(ci => ci.id !== id));
  };

  return (
    <div className="glass-panel p-6 h-full flex flex-col relative overflow-hidden">
      <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Settings2 className="text-blue-600" />
          <h2 className="text-xl font-black text-slate-800">Interventions</h2>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition font-bold"
          title="Add Custom Scenario"
        >
          <Plus size={20} />
        </button>
      </div>
      
      <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {/* Built-in Scenarios */}
        <div>
          <h3 className="text-xs uppercase text-slate-400 font-bold mb-3 tracking-widest">Built-in</h3>
          <div className="space-y-3">
            {Object.values(INTERVENTIONS).map((intervention) => {
              const isActive = activeInterventions.includes(intervention.id);
              return (
                <label 
                  key={intervention.id}
                  className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                    isActive 
                      ? 'bg-blue-50 border-blue-200 shadow-sm' 
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="relative flex items-center justify-center mt-1">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={isActive}
                      onChange={() => toggleIntervention(intervention.id)}
                    />
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isActive ? 'bg-blue-500 border-blue-500' : 'border-slate-300 bg-white'
                    }`}>
                      {isActive && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>
                      {intervention.label}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                      {intervention.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Custom Scenarios */}
        {customInterventions.length > 0 && (
          <div className="pt-6 mt-2 border-t border-slate-200">
            <h3 className="text-xs uppercase text-slate-400 font-bold mb-3 tracking-widest">Custom What-Ifs</h3>
            <div className="space-y-3">
              {customInterventions.map((ci) => (
                <div key={ci.id} className={`flex items-center justify-between p-4 rounded-xl transition-all duration-200 border ${ci.isActive ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white border-slate-200'}`}>
                  <label className="flex items-start gap-3 cursor-pointer flex-1">
                    <div className="relative flex items-center justify-center mt-1">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={ci.isActive}
                        onChange={() => toggleCustom(ci.id)}
                      />
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        ci.isActive ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'
                      }`}>
                        {ci.isActive && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className={`text-sm font-bold ${ci.isActive ? 'text-emerald-700' : 'text-slate-700'}`}>
                        {ci.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 capitalize font-medium">
                        {ci.type}s {ci.targetZone} by {ci.factor}%
                      </p>
                    </div>
                  </label>
                  <button onClick={() => deleteCustom(ci.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors">
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Custom Scenario Modal */}
      {isModalOpen && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-md z-20 flex flex-col p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
            <h3 className="text-xl font-black text-slate-800">Create Scenario</h3>
            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800 p-2 hover:bg-slate-100 rounded-full">
              <X size={24} />
            </button>
          </div>
          
          <form onSubmit={handleAddCustom} className="flex flex-col gap-5 flex-1">
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">Scenario Name</label>
              <input 
                type="text" 
                required
                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
                placeholder="e.g. Electric Fleet"
                value={newScenario.name}
                onChange={e => setNewScenario({...newScenario, name: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">Target Zone</label>
              <select 
                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm capitalize"
                value={newScenario.targetZone}
                onChange={e => setNewScenario({...newScenario, targetZone: e.target.value})}
              >
                <option value="all">All Zones</option>
                {Object.values(ZONES).map(z => (
                  <option key={z.type} value={z.type}>{z.type}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">Impact Type</label>
                <select 
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
                  value={newScenario.type}
                  onChange={e => setNewScenario({...newScenario, type: e.target.value})}
                >
                  <option value="reduction">Reduction (-)</option>
                  <option value="increase">Increase (+)</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">Factor (%)</label>
                <input 
                  type="number" 
                  min="1" max="100" required
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
                  value={newScenario.factor}
                  onChange={e => setNewScenario({...newScenario, factor: e.target.value})}
                />
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-slate-200">
              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-blue-200 transition-all transform active:scale-[0.98]"
              >
                Save Scenario
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ScenarioControls;
