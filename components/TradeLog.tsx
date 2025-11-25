
import React, { useState, useMemo } from 'react';
import { Trade, TradeSide, TradeConfig, AssetName } from '../types';
import { Clock, BrainCircuit, AlertTriangle, Crosshair, Filter, ChevronDown, Ban, Info } from 'lucide-react';

interface Props {
  trades: Trade[];
  config: TradeConfig;
  onCloseTrade: (trade: Trade, reason: string) => void;
}

const TradeLog: React.FC<Props> = ({ trades, config, onCloseTrade }) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [assetFilter, setAssetFilter] = useState<string>('ALL');
  const [sideFilter, setSideFilter] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
      // Status Filter
      if (statusFilter === 'OPEN' && t.status !== 'OPEN') return false;
      if (statusFilter === 'CLOSED' && t.status !== 'CLOSED') return false;

      // Asset Filter
      if (assetFilter !== 'ALL' && t.asset !== assetFilter) return false;

      // Side Filter
      if (sideFilter === 'LONG' && t.side !== TradeSide.LONG) return false;
      if (sideFilter === 'SHORT' && t.side !== TradeSide.SHORT) return false;

      return true;
    });
  }, [trades, statusFilter, assetFilter, sideFilter]);

  // Extract unique assets from trades for the dropdown + ensure defaults
  const availableAssets = useMemo(() => {
      const assets = new Set<string>();
      Object.values(AssetName).forEach(a => assets.add(a)); // Add all possible assets from enum
      trades.forEach(t => assets.add(t.asset));
      return Array.from(assets);
  }, [trades]);

  // Helper to highlight keywords in reasoning text
  const renderHighlightedReasoning = (text: string) => {
    const keywords = [
        { word: 'RSI', color: 'text-blue-400 font-bold' },
        { word: 'Fear', color: 'text-orange-400 font-bold' },
        { word: 'Greed', color: 'text-green-400 font-bold' },
        { word: 'News', color: 'text-yellow-400 font-bold' },
        { word: 'Bullish', color: 'text-green-400 font-bold' },
        { word: 'Bearish', color: 'text-red-400 font-bold' },
        { word: 'Overbought', color: 'text-red-400 font-bold' },
        { word: 'Oversold', color: 'text-green-400 font-bold' },
        { word: 'Volume', color: 'text-blue-300' },
        { word: 'Momentum', color: 'text-purple-300' },
        { word: 'Support', color: 'text-green-300' },
        { word: 'Resistance', color: 'text-red-300' }
    ];

    const parts = text.split(/(\b(?:RSI|Fear|Greed|News|Bullish|Bearish|Overbought|Oversold|Volume|Momentum|Support|Resistance)\b)/gi);

    return (
        <span>
            {parts.map((part, i) => {
                const match = keywords.find(k => k.word.toLowerCase() === part.toLowerCase());
                if (match) {
                    return <span key={i} className={`${match.color}`}>{part}</span>;
                }
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
  };

  const getRsiTooltip = (rsi: number) => {
      if (rsi > 70) return "High RSI (>70): Asset is potentially Overbought. Reversal risk high.";
      if (rsi < 30) return "Low RSI (<30): Asset is potentially Oversold. Bounce opportunity.";
      return "Neutral RSI (30-70): Market is in equilibrium.";
  };

  const getFearTooltip = (fear: number) => {
      if (fear < 25) return "Extreme Fear (<25): Market is panicked. Potential buying opportunity.";
      if (fear > 75) return "Extreme Greed (>75): Market is euphoric. Correction risk high.";
      return "Neutral Sentiment: No strong emotional bias in the market.";
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-hyper-muted font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            <Clock size={14} /> Trade Log
        </h3>
        <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`p-1.5 rounded-md transition-colors ${isFilterOpen ? 'bg-hyper-accent text-black' : 'bg-hyper-bg border border-hyper-border text-hyper-muted hover:text-white'}`}
            title="Filter Trades"
        >
            <Filter size={14} />
        </button>
      </div>

      {/* Filter Controls */}
      {isFilterOpen && (
          <div className="bg-hyper-bg/50 border border-hyper-border rounded-lg p-3 mb-3 text-xs space-y-3 animate-in slide-in-from-top-2 duration-200">
              {/* Status & Side Row */}
              <div className="flex gap-4">
                  <div className="flex-1">
                      <label className="text-[10px] text-hyper-muted uppercase font-bold mb-1 block">Status</label>
                      <div className="flex bg-black/40 p-0.5 rounded border border-hyper-border">
                          {(['ALL', 'OPEN', 'CLOSED'] as const).map(s => (
                              <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${
                                    statusFilter === s ? 'bg-hyper-card text-white shadow-sm' : 'text-hyper-muted hover:text-slate-300'
                                }`}
                              >
                                  {s}
                              </button>
                          ))}
                      </div>
                  </div>
                  <div className="flex-1">
                       <label className="text-[10px] text-hyper-muted uppercase font-bold mb-1 block">Side</label>
                       <div className="flex bg-black/40 p-0.5 rounded border border-hyper-border">
                          {(['ALL', 'LONG', 'SHORT'] as const).map(s => (
                              <button
                                key={s}
                                onClick={() => setSideFilter(s)}
                                className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${
                                    sideFilter === s ? 'bg-hyper-card text-white shadow-sm' : 'text-hyper-muted hover:text-slate-300'
                                }`}
                              >
                                  {s}
                              </button>
                          ))}
                      </div>
                  </div>
              </div>

              {/* Asset Dropdown */}
              <div>
                   <label className="text-[10px] text-hyper-muted uppercase font-bold mb-1 block">Asset</label>
                   <div className="relative">
                       <select 
                        value={assetFilter}
                        onChange={(e) => setAssetFilter(e.target.value)}
                        className="w-full bg-black/40 border border-hyper-border rounded px-2 py-1.5 text-white appearance-none outline-none focus:border-hyper-accent cursor-pointer"
                       >
                           <option value="ALL">All Assets</option>
                           {availableAssets.map(a => (
                               <option key={a} value={a}>{a}</option>
                           ))}
                       </select>
                       <ChevronDown size={12} className="absolute right-2 top-2 pointer-events-none text-hyper-muted" />
                   </div>
              </div>
          </div>
      )}
      
      <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
        {filteredTrades.length === 0 && (
            <div className="text-center text-hyper-muted text-sm py-10 italic">
                {trades.length === 0 ? 'No trades executed yet. Waiting for AI signal...' : 'No trades match filter criteria.'}
            </div>
        )}
        {filteredTrades.map((trade) => {
          const isClosed = trade.status === 'CLOSED';
          const pnl = trade.pnl ?? 0;
          const isPnlPositive = pnl >= 0;
          const fees = trade.fees ?? 0;
          const snapshot = trade.marketSnapshot;
          
          // Defensive Defaults
          const entryPrice = trade.entryPrice ?? 0;
          const snapshotRsi = snapshot?.rsi ?? 50;
          const snapshotFear = snapshot?.fearIndex ?? 50;
          const snapshotNewsScore = snapshot?.newsScore ?? 0;

          // --- SL/TP Calculations for Open Trades ---
          let slProgress = 0;
          let tpProgress = 0;
          let isNearSl = false;
          let isNearTp = false;

          if (!isClosed) {
              const positionValue = (trade.size ?? 0) * (trade.leverage ?? 1);
              // PnL Ratio relative to Notional (matching App.tsx logic)
              const currentPnlRatio = positionValue > 0 ? pnl / positionValue : 0;

              // Calculate progress towards thresholds (0 to 1 scale)
              // SL is negative ratio, so we divide negative by negative
              if (currentPnlRatio < 0 && config.stopLossPct > 0) {
                  slProgress = Math.min(1, currentPnlRatio / -config.stopLossPct);
              }
              
              if (currentPnlRatio > 0 && config.takeProfitPct > 0) {
                  tpProgress = Math.min(1, currentPnlRatio / config.takeProfitPct);
              }

              isNearSl = slProgress > 0.75; // Warning at 75%
              isNearTp = tpProgress > 0.75; // Alert at 75%
          }

          return (
            <div key={trade.id} className={`border rounded-lg p-3 text-xs transition-colors ${
                isClosed 
                ? 'bg-hyper-bg border-hyper-border opacity-80 hover:opacity-100' 
                : 'bg-hyper-card border-hyper-accent/30 shadow-[0_0_10px_rgba(0,229,153,0.05)]'
            }`}>
                {/* Header: Side/Lev + Time + Status Badge */}
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <span className={`font-bold px-2 py-0.5 rounded ${
                            trade.side === TradeSide.LONG ? 'bg-hyper-accent/10 text-hyper-accent' : 'bg-hyper-danger/10 text-hyper-danger'
                        }`}>
                            {trade.side} {trade.leverage}x
                        </span>
                        {!isClosed && (
                            <span className="flex h-2 w-2 relative">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                    isNearSl ? 'bg-red-500' : isNearTp ? 'bg-green-500' : 'bg-green-400'
                                }`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                                    isNearSl ? 'bg-red-500' : isNearTp ? 'bg-green-500' : 'bg-green-500'
                                }`}></span>
                            </span>
                        )}
                    </div>
                    <span className="text-hyper-muted font-mono text-[10px]">
                        {new Date(trade.timestamp).toLocaleTimeString()}
                    </span>
                </div>
                
                {/* Asset & Entry */}
                <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-bold text-sm">{trade.asset}</span>
                    <span className="font-mono text-hyper-muted">@ ${entryPrice.toFixed(2)}</span>
                </div>

                {/* PnL Section */}
                {(isClosed || pnl !== 0) && (
                   <div className={`flex flex-col p-2 rounded mb-2 ${
                       isClosed ? 'bg-black/20' : 'bg-hyper-bg/50 border border-white/5'
                   }`}>
                        <div className="flex justify-between items-center">
                            <span className="text-hyper-muted">{isClosed ? 'Realized PnL' : 'Net PnL'}</span>
                            <span className={`font-mono font-bold ${
                                isPnlPositive ? 'text-hyper-accent' : 'text-hyper-danger'
                            }`}>
                                {isPnlPositive ? '+' : ''}{pnl.toFixed(2)} USD
                            </span>
                        </div>
                        {fees > 0 && (
                            <div className="flex justify-between items-center mt-1 border-t border-white/5 pt-1">
                                <span className="text-[10px] text-hyper-muted opacity-70">Fees</span>
                                <span className="text-[10px] font-mono text-hyper-muted">-${fees.toFixed(2)}</span>
                            </div>
                        )}
                   </div> 
                )}

                {/* Active Trade Management Indicators */}
                {!isClosed && (
                    <div className="mb-2 space-y-2">
                        {/* Status Badges */}
                        {isNearSl && (
                            <div className="flex items-center gap-1 text-hyper-danger text-[10px] font-bold animate-pulse">
                                <AlertTriangle size={12} />
                                <span>Risk: Approaching Stop Loss ({(slProgress * 100).toFixed(0)}%)</span>
                            </div>
                        )}
                        {isNearTp && (
                            <div className="flex items-center gap-1 text-hyper-accent text-[10px] font-bold animate-pulse">
                                <Crosshair size={12} />
                                <span>Target: Approaching Take Profit ({(tpProgress * 100).toFixed(0)}%)</span>
                            </div>
                        )}

                        {/* Visualization Bar */}
                        <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden w-full flex border border-slate-700/50">
                            {/* Stop Loss Zone (Left) */}
                            <div className="w-1/2 bg-slate-800/50 relative">
                                {slProgress > 0 && (
                                    <div 
                                        className="absolute right-0 top-0 h-full bg-hyper-danger transition-all duration-500"
                                        style={{ width: `${Math.min(slProgress * 100, 100)}%` }}
                                    />
                                )}
                            </div>
                            {/* Take Profit Zone (Right) */}
                            <div className="w-1/2 bg-slate-800/50 relative">
                                {tpProgress > 0 && (
                                    <div 
                                        className="absolute left-0 top-0 h-full bg-hyper-accent transition-all duration-500"
                                        style={{ width: `${Math.min(tpProgress * 100, 100)}%` }}
                                    />
                                )}
                            </div>
                            
                            {/* Limit Markers (Ends) */}
                            <div className="absolute top-0 left-0 h-full w-0.5 bg-red-500/50" title="Stop Loss Level" />
                            <div className="absolute top-0 right-0 h-full w-0.5 bg-green-500/50" title="Take Profit Level" />
                            
                            {/* Entry Price Marker (Center) */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-0.5 bg-white shadow-[0_0_6px_rgba(255,255,255,1)] z-10" title="Entry Price"></div>
                        </div>
                        <div className="flex justify-between text-[9px] text-hyper-muted font-mono px-0.5">
                            <span className="text-hyper-danger">SL -{(config.stopLossPct * 100).toFixed(1)}%</span>
                            <span className="text-white font-bold opacity-70">ENTRY</span>
                            <span className="text-hyper-accent">TP +{(config.takeProfitPct * 100).toFixed(1)}%</span>
                        </div>

                        {/* Manual Close Button */}
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onCloseTrade(trade, 'Manual Override');
                            }}
                            className="w-full mt-3 py-1.5 rounded bg-hyper-danger/10 border border-hyper-danger/30 hover:bg-hyper-danger/20 hover:border-hyper-danger text-hyper-danger font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all group"
                        >
                            <Ban size={12} className="group-hover:rotate-90 transition-transform" />
                            Close {trade.side}
                        </button>
                    </div>
                )}

                {/* AI Reasoning - HIGHLIGHTED */}
                <div className="mt-3 pt-3 border-t border-hyper-border">
                    <div className="p-3 bg-gradient-to-br from-purple-500/10 to-blue-500/5 rounded-lg border-l-2 border-purple-500/50 relative overflow-hidden group">
                        {/* Glow effect */}
                        <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 blur-xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
                        
                        <div className="flex items-center gap-2 mb-1">
                            <BrainCircuit size={12} className="text-purple-400" />
                            <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">AI Reasoning</span>
                        </div>
                        
                        <p className="text-xs text-slate-300 italic leading-relaxed relative z-10">
                            "{renderHighlightedReasoning(trade.reasoning)}"
                        </p>
                    </div>
                    
                    {/* Market Factors Snapshot with TOOLTIPS */}
                    {snapshot && (
                        <div className="flex items-center gap-2 mt-2 ml-1 overflow-x-auto no-scrollbar opacity-90">
                            <span className="text-[9px] text-hyper-muted uppercase tracking-wider shrink-0 flex items-center gap-1">
                                Context <Info size={8}/>:
                            </span>
                            
                            {/* RSI Badge */}
                            <div className="group relative">
                                <span className={`cursor-help px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
                                    snapshotRsi > 70 ? 'bg-hyper-danger/10 text-hyper-danger border-hyper-danger/20' : 
                                    snapshotRsi < 30 ? 'bg-hyper-accent/10 text-hyper-accent border-hyper-accent/20' : 
                                    'bg-slate-800 text-slate-400 border-slate-700'
                                }`}>
                                    RSI {snapshotRsi.toFixed(0)}
                                </span>
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-0 mb-2 w-40 bg-black border border-hyper-border p-2 rounded shadow-lg hidden group-hover:block z-50">
                                    <p className="text-[10px] text-white leading-tight">{getRsiTooltip(snapshotRsi)}</p>
                                </div>
                            </div>

                            {/* Fear Badge */}
                            <div className="group relative">
                                <span className={`cursor-help px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
                                    snapshotFear < 30 ? 'bg-hyper-accent/10 text-hyper-accent border-hyper-accent/20' : 
                                    snapshotFear > 70 ? 'bg-hyper-danger/10 text-hyper-danger border-hyper-danger/20' : 
                                    'bg-slate-800 text-slate-400 border-slate-700'
                                }`}>
                                    Fear {snapshotFear}
                                </span>
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-0 mb-2 w-40 bg-black border border-hyper-border p-2 rounded shadow-lg hidden group-hover:block z-50">
                                    <p className="text-[10px] text-white leading-tight">{getFearTooltip(snapshotFear)}</p>
                                </div>
                            </div>

                            {/* News Badge */}
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
                                snapshotNewsScore > 0.2 ? 'bg-hyper-accent/10 text-hyper-accent border-hyper-accent/20' : 
                                snapshotNewsScore < -0.2 ? 'bg-hyper-danger/10 text-hyper-danger border-hyper-danger/20' : 
                                'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                                News {snapshotNewsScore > 0 ? '+' : ''}{snapshotNewsScore.toFixed(2)}
                            </span>
                        </div>
                    )}
                </div>
          </div>
          );
        })}
      </div>
    </div>
  );
};

export default TradeLog;
