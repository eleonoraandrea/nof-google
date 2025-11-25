
import React, { useState, useEffect } from 'react';
import { TradeConfig, AssetName } from '../types';
import { X, Save, AlertTriangle, Plus, Trash2, Wallet, Send, Settings, ShieldAlert, CheckCircle, BellRing } from 'lucide-react';
import { sendTelegramMessage } from '../services/telegramService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: TradeConfig;
  onSave: (newConfig: TradeConfig) => void;
}

const ConfigModal: React.FC<Props> = ({ isOpen, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = useState<TradeConfig>(config);
  const [newAssetInput, setNewAssetInput] = useState('');
  const [activeTab, setActiveTab] = useState<'STRATEGY' | 'WALLET' | 'NOTIFICATIONS'>('STRATEGY');
  const [testSent, setTestSent] = useState(false);

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

  const handleTestAlert = async () => {
    if (!localConfig.telegramBotToken || !localConfig.telegramChatId) return;
    
    // Temporarily enable notifications to allow sending test even if disabled in UI state
    const testConfig = { ...localConfig, notificationsEnabled: true };
    await sendTelegramMessage("🔔 *NeuroLiquid Test Alert*\n\nIf you are reading this, your Telegram integration is successfully configured!", testConfig);
    
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const commonAssets = Object.values(AssetName);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-hyper-card border border-hyper-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-hyper-border bg-hyper-bg/50 shrink-0">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2 h-6 bg-hyper-accent rounded-sm"></span>
            Configuration
          </h2>
          <button 
            onClick={onClose}
            className="text-hyper-muted hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-hyper-border bg-black/20">
            <button 
                onClick={() => setActiveTab('STRATEGY')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                    activeTab === 'STRATEGY' ? 'text-hyper-accent border-b-2 border-hyper-accent bg-hyper-accent/5' : 'text-hyper-muted hover:text-white'
                }`}
            >
                <Settings size={14} /> Strategy
            </button>
            <button 
                onClick={() => setActiveTab('WALLET')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                    activeTab === 'WALLET' ? 'text-hyper-accent border-b-2 border-hyper-accent bg-hyper-accent/5' : 'text-hyper-muted hover:text-white'
                }`}
            >
                <Wallet size={14} /> Wallet
            </button>
             <button 
                onClick={() => setActiveTab('NOTIFICATIONS')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                    activeTab === 'NOTIFICATIONS' ? 'text-hyper-accent border-b-2 border-hyper-accent bg-hyper-accent/5' : 'text-hyper-muted hover:text-white'
                }`}
            >
                <Send size={14} /> Alerts
            </button>
        </div>

        {/* Body - Scrollable */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          
          {activeTab === 'STRATEGY' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
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

                {/* AI Analysis Interval */}
                <div>
                    <div className="flex justify-between mb-2">
                    <label className="text-sm text-hyper-muted uppercase font-bold tracking-wider">AI Analysis Interval</label>
                    <span className="font-mono text-white font-bold">{localConfig.analysisIntervalMins || 15} Mins</span>
                    </div>
                    <input 
                    type="range" 
                    min="1" 
                    max="60" 
                    step="1"
                    value={localConfig.analysisIntervalMins || 15}
                    onChange={(e) => handleChange('analysisIntervalMins', parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                    <span>1m (Turbo)</span>
                    <span>15m (Normal)</span>
                    <span>60m (Slow)</span>
                    </div>
                </div>

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
              </div>
          )}

          {activeTab === 'WALLET' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="bg-hyper-danger/5 border border-hyper-danger/20 rounded-lg p-3 flex gap-3 items-start">
                      <ShieldAlert className="text-hyper-danger shrink-0" size={18} />
                      <div className="text-xs text-hyper-muted">
                          <strong className="text-hyper-danger block mb-1">SECURITY WARNING</strong>
                          Private keys are stored in your browser's local memory. Use a dedicated trading wallet with limited funds. Do not use your main cold storage.
                      </div>
                  </div>

                  <div>
                      <label className="text-sm text-hyper-muted uppercase font-bold tracking-wider block mb-3">Execution Mode</label>
                      <div className="flex bg-black/40 p-1 rounded-lg border border-hyper-border">
                          <button 
                            onClick={() => handleChange('executionMode', 'SIMULATION')}
                            className={`flex-1 py-2 rounded text-xs font-bold transition-all ${localConfig.executionMode === 'SIMULATION' ? 'bg-hyper-card text-white shadow-sm border border-hyper-border' : 'text-hyper-muted hover:text-white'}`}
                          >
                              SIMULATION
                          </button>
                          <button 
                            onClick={() => handleChange('executionMode', 'REAL')}
                            className={`flex-1 py-2 rounded text-xs font-bold transition-all ${localConfig.executionMode === 'REAL' ? 'bg-hyper-danger text-black shadow-[0_0_10px_rgba(255,77,77,0.4)]' : 'text-hyper-muted hover:text-white'}`}
                          >
                              REAL EXECUTION
                          </button>
                      </div>
                  </div>

                  <div>
                      <label className="text-sm text-hyper-muted uppercase font-bold tracking-wider block mb-2">Wallet Address (Arbitrum)</label>
                      <input 
                          type="text" 
                          value={localConfig.walletAddress || ''}
                          onChange={(e) => handleChange('walletAddress', e.target.value)}
                          placeholder="0x..."
                          className="w-full bg-black/20 border border-hyper-border rounded px-3 py-2 text-sm font-mono focus:border-hyper-accent outline-none transition-colors text-white"
                      />
                  </div>

                  <div>
                      <label className="text-sm text-hyper-muted uppercase font-bold tracking-wider block mb-2">Private Key</label>
                      <input 
                          type="password" 
                          value={localConfig.walletPrivateKey || ''}
                          onChange={(e) => handleChange('walletPrivateKey', e.target.value)}
                          placeholder="0x..."
                          className="w-full bg-black/20 border border-hyper-border rounded px-3 py-2 text-sm font-mono focus:border-hyper-accent outline-none transition-colors text-white"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Required for signing transactions in REAL mode.</p>
                  </div>
              </div>
          )}

          {activeTab === 'NOTIFICATIONS' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between">
                      <label className="text-sm text-hyper-muted uppercase font-bold tracking-wider">Enable Telegram Alerts</label>
                      <button 
                        onClick={() => handleChange('notificationsEnabled', !localConfig.notificationsEnabled)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${localConfig.notificationsEnabled ? 'bg-hyper-accent' : 'bg-slate-700'}`}
                      >
                          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${localConfig.notificationsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                  </div>

                  <div>
                      <label className="text-sm text-hyper-muted uppercase font-bold tracking-wider block mb-2">Bot Token</label>
                      <input 
                          type="password" 
                          value={localConfig.telegramBotToken || ''}
                          onChange={(e) => handleChange('telegramBotToken', e.target.value)}
                          placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                          className="w-full bg-black/20 border border-hyper-border rounded px-3 py-2 text-sm font-mono focus:border-hyper-accent outline-none transition-colors text-white"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">From @BotFather</p>
                  </div>

                  <div>
                      <label className="text-sm text-hyper-muted uppercase font-bold tracking-wider block mb-2">Chat ID</label>
                      <input 
                          type="text" 
                          value={localConfig.telegramChatId || ''}
                          onChange={(e) => handleChange('telegramChatId', e.target.value)}
                          placeholder="-100123456789"
                          className="w-full bg-black/20 border border-hyper-border rounded px-3 py-2 text-sm font-mono focus:border-hyper-accent outline-none transition-colors text-white"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">From @userinfobot or your group ID</p>
                  </div>

                  <div className="pt-2">
                       <button 
                            onClick={handleTestAlert}
                            disabled={!localConfig.telegramBotToken || !localConfig.telegramChatId || testSent}
                            className={`w-full py-2 rounded-lg border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                testSent 
                                ? 'bg-green-500/20 text-green-500 border-green-500/50' 
                                : 'bg-blue-500/10 text-blue-500 border-blue-500/30 hover:bg-blue-500/20'
                            }`}
                       >
                           {testSent ? <CheckCircle size={14} /> : <BellRing size={14} />}
                           {testSent ? 'Test Alert Sent!' : 'Send Test Alert'}
                       </button>
                  </div>

                  <div className="bg-blue-500/5 border border-blue-500/10 rounded p-3 flex gap-3">
                      <Send className="text-blue-500 shrink-0" size={16} />
                      <p className="text-[10px] text-blue-200/60">
                          The bot will send notifications for: Trade Open (Buy/Sell), Trade Close, and Daily Performance Summaries.
                      </p>
                  </div>
              </div>
          )}

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
