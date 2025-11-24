import React, { useState, useEffect } from 'react';
import { TradeConfig, AssetName } from '../types';
import { X, Save, AlertTriangle, Plus, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: TradeConfig;
  onSave: (newConfig: TradeConfig) => void;
}

const ConfigModal: React.FC<Props> = ({ isOpen, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = useState<TradeConfig>(config);
  const [newAssetInput, setNewAssetInput] = useState('');

  useEffect(() => {
    setLocalConfig(config);
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof TradeConfig, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addAsset = () => {
      const asset = newAssetInput.toUpperCase().trim();
      if (!asset) return;
      
      setLocalConfig(prev => {
          if (prev.assets.includes(asset)) return prev;
          return { ...prev, assets: [...prev.assets, asset] };
      });
      setNewAssetInput('');
  };

  const removeAsset = (asset: string) => {
    setLocalConfig(prev => {
        if (prev.assets.length <= 1) return prev; // Prevent empty basket
        return { ...prev, assets: prev.assets.filter(a => a !== asset) };
    });
  };

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  const commonAssets = Object.values(AssetName);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-hyper-card border border-hyper-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-hyper-border bg-hyper-bg/50 shrink-0">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2 h-6 bg-hyper-accent rounded-sm"></span>
            Strategy Configuration
          </h2>
          <button 
            onClick={onClose}
            className="text-hyper-muted hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Asset Basket Selection */}
          <div>
             <div className="flex justify-between items-center mb-3">
                 <label className="text-sm text-hyper-muted uppercase font-bold tracking-wider block">
                     Trading Basket ({localConfig.assets.length})
                 </label>
             </div>

             {/* Add New Asset Input */}
             <div className="flex gap-2 mb-4">
                 <input 
                    type="text" 
                    value={newAssetInput}
                    onChange={(e) => setNewAssetInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addAsset()}
                    placeholder="Add Asset (e.g. DOGE)"
                    className="flex-1 bg-black/20 border border-hyper-border rounded px-3 py-2 text-sm font-mono focus:border-hyper-accent outline-none text-white placeholder:text-slate-600 uppercase"
                 />
                 <button 
                    onClick={addAsset}
                    disabled={!newAssetInput}
                    className="bg-hyper-accent/10 border border-hyper-accent/50 text-hyper-accent hover:bg-hyper-accent hover:text-black rounded px-3 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                     <Plus size={16} />
                 </button>
             </div>

             {/* Selected Assets Tags */}
             <div className="flex flex-wrap gap-2 mb-4 bg-black/20 p-3 rounded-lg border border-hyper-border/50 min-h-[60px]">
                 {localConfig.assets.map(asset => (
                     <div key={asset} className="flex items-center gap-1 bg-hyper-card border border-hyper-border rounded px-2 py-1 text-xs text-white group hover:border-hyper-danger/50 transition-colors">
                         <span className="font-bold">{asset}</span>
                         <button 
                            onClick={() => removeAsset(asset)}
                            className="text-hyper-muted hover:text-hyper-danger ml-1"
                         >
                             <X size={12} />
                         </button>
                     </div>
                 ))}
             </div>

             {/* Common Suggestions */}
             <div>
                 <span className="text-[10px] text-hyper-muted uppercase mb-2 block">Quick Add Common:</span>
                 <div className="flex flex-wrap gap-2">
                     {commonAssets.map(asset => {
                         const isSelected = localConfig.assets.includes(asset);
                         if (isSelected) return null; // Only show unselected common assets
                         return (
                             <button
                                key={asset}
                                onClick={() => setLocalConfig(prev => ({ ...prev, assets: [...prev.assets, asset] }))}
                                className="px-2 py-1 rounded border border-dashed border-hyper-muted/50 text-[10px] text-hyper-muted hover:text-white hover:border-hyper-accent hover:bg-hyper-accent/5 transition-all"
                             >
                                 + {asset}
                             </button>
                         );
                     })}
                 </div>
             </div>
          </div>

          <div className="border-b border-hyper-border/50"></div>

          {/* Leverage */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm text-hyper-muted uppercase font-bold tracking-wider">Max Leverage</label>
              <span className="font-mono text-hyper-accent font-bold">{localConfig.maxLeverage}x</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="5" 
              step="1"
              value={localConfig.maxLeverage}
              onChange={(e) => handleChange('maxLeverage', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-hyper-accent"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
              <span>1x</span>
              <span>5x</span>
            </div>
          </div>

          {/* Risk Per Trade */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm text-hyper-muted uppercase font-bold tracking-wider">Risk Per Trade</label>
              <span className="font-mono text-hyper-accent font-bold">{(localConfig.riskPerTrade * 100).toFixed(0)}%</span>
            </div>
            <input 
              type="range" 
              min="0.01" 
              max="0.2" 
              step="0.01"
              value={localConfig.riskPerTrade}
              onChange={(e) => handleChange('riskPerTrade', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-hyper-accent"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Percentage of total balance used for initial margin per trade.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Stop Loss */}
            <div>
               <div className="flex justify-between mb-2">
                <label className="text-sm text-hyper-muted uppercase font-bold tracking-wider">Stop Loss</label>
                <span className="font-mono text-hyper-danger font-bold">{(localConfig.stopLossPct * 100).toFixed(1)}%</span>
              </div>
              <div className="relative">
                <input 
                  type="number" 
                  step="0.1"
                  min="0.1"
                  max="50"
                  value={(localConfig.stopLossPct * 100).toFixed(1)}
                  onChange={(e) => handleChange('stopLossPct', parseFloat(e.target.value) / 100)}
                  className="w-full bg-black/20 border border-hyper-border rounded px-3 py-2 text-sm font-mono focus:border-hyper-danger outline-none transition-colors"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-500">%</span>
              </div>
            </div>

            {/* Take Profit */}
            <div>
               <div className="flex justify-between mb-2">
                <label className="text-sm text-hyper-muted uppercase font-bold tracking-wider">Take Profit</label>
                <span className="font-mono text-hyper-accent font-bold">{(localConfig.takeProfitPct * 100).toFixed(1)}%</span>
              </div>
              <div className="relative">
                <input 
                  type="number" 
                  step="0.1"
                  min="0.1"
                  max="100"
                  value={(localConfig.takeProfitPct * 100).toFixed(1)}
                  onChange={(e) => handleChange('takeProfitPct', parseFloat(e.target.value) / 100)}
                  className="w-full bg-black/20 border border-hyper-border rounded px-3 py-2 text-sm font-mono focus:border-hyper-accent outline-none transition-colors"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-500">%</span>
              </div>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3 flex items-start gap-3">
             <AlertTriangle size={16} className="text-yellow-500 mt-0.5 shrink-0" />
             <p className="text-[10px] text-yellow-200/80 leading-relaxed">
               Changes apply to new trades only. Existing open positions will maintain their original strategy parameters until closed.
             </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-hyper-border bg-hyper-bg/50 flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-bold text-hyper-muted hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 rounded-lg bg-hyper-accent text-black text-sm font-bold hover:bg-hyper-accent/90 shadow-[0_0_15px_rgba(0,229,153,0.3)] flex items-center gap-2 transition-all"
          >
            <Save size={16} />
            Save Configuration
          </button>
        </div>

      </div>
    </div>
  );
};

export default ConfigModal;