
import React from 'react';
import { MarketData, AssetName } from '../types';
import { TrendingUp, TrendingDown, Activity, Layers } from 'lucide-react';

interface Props {
  data: MarketData;
  isSelected: boolean;
  onClick: () => void;
}

const AssetCard: React.FC<Props> = ({ data, isSelected, onClick }) => {
  // Defensive defaults for numerical values
  const price = data?.price ?? 0;
  const change24h = data?.change24h ?? 0;
  const rsi = data?.rsi ?? 50;
  
  const isPositive = change24h >= 0;

  // Simple Depth Visualization helper
  const renderDepth = () => {
      if (!data?.depth) return null;
      
      const { bids, asks } = data.depth;
      if (!bids || !asks || bids.length === 0 || asks.length === 0) return null;

      // Max depth size for normalization based on the visible range
      const depthViewSize = 5;
      const topBids = bids.slice(0, depthViewSize);
      const topAsks = asks.slice(0, depthViewSize);

      const maxBid = Math.max(...topBids.map(b => b.sz), 0);
      const maxAsk = Math.max(...topAsks.map(a => a.sz), 0);
      const overallMax = Math.max(maxBid, maxAsk) || 1; // Prevent div by zero
      
      const bestBid = topBids[0]?.px || 0;
      const bestAsk = topAsks[0]?.px || 0;
      const spread = Math.abs(bestAsk - bestBid);
      const spreadPct = bestBid > 0 ? (spread / bestBid) * 100 : 0;

      return (
          <div className="mt-3 pt-2 border-t border-hyper-border/50 animate-in fade-in">
              <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1 text-[10px] text-hyper-muted uppercase tracking-wider">
                      <Layers size={10} /> Order Book
                  </div>
                  <div className="text-[9px] font-mono text-slate-400">
                      Spread: <span className="text-white">{spread.toFixed(2)}</span> ({spreadPct.toFixed(3)}%)
                  </div>
              </div>

              <div className="flex gap-1 h-12 relative">
                   {/* Bids (Green) - Right Aligned graphically towards center */}
                   <div className="flex-1 flex flex-col gap-[1px]">
                       {topBids.map((b, i) => (
                           <div key={`bid-${i}`} className="flex-1 w-full flex justify-end group">
                                <div 
                                    className="bg-hyper-accent/30 rounded-sm transition-all duration-300 group-hover:bg-hyper-accent/50" 
                                    style={{ width: `${(b.sz / overallMax) * 100}%`, height: '100%' }}
                                    title={`Bid: ${b.sz.toFixed(2)} @ ${b.px}`}
                                ></div>
                           </div>
                       ))}
                   </div>
                   
                   {/* Divider / Spread Indicator */}
                   <div className="w-[1px] bg-slate-700/50 h-full mx-0.5"></div>

                   {/* Asks (Red) - Left Aligned graphically away from center */}
                   <div className="flex-1 flex flex-col gap-[1px]">
                       {topAsks.map((a, i) => (
                           <div key={`ask-${i}`} className="flex-1 w-full flex justify-start group">
                                <div 
                                    className="bg-hyper-danger/30 rounded-sm transition-all duration-300 group-hover:bg-hyper-danger/50" 
                                    style={{ width: `${(a.sz / overallMax) * 100}%`, height: '100%' }}
                                    title={`Ask: ${a.sz.toFixed(2)} @ ${a.px}`}
                                ></div>
                           </div>
                       ))}
                   </div>
              </div>
              <div className="flex justify-between text-[9px] text-hyper-muted font-mono mt-1 px-1">
                  <span className="text-hyper-accent/90">{bestBid.toFixed(2)}</span>
                  <span className="text-hyper-danger/90">{bestAsk.toFixed(2)}</span>
              </div>
          </div>
      )
  };

  // Defensive access for asset name
  const assetName = data?.asset || '?';
  const displayChar = assetName.substring(0, 1);

  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'bg-hyper-card border-hyper-accent shadow-[0_0_15px_rgba(0,229,153,0.1)] scale-[1.02]' 
          : 'bg-hyper-card/50 border-hyper-border hover:border-hyper-muted'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                data?.asset === AssetName.BTC ? 'bg-orange-500/20 text-orange-500' :
                data?.asset === AssetName.ETH ? 'bg-blue-500/20 text-blue-500' :
                'bg-slate-700/50 text-slate-300'
            }`}>
                {displayChar}
            </div>
            <span className="font-bold text-lg text-hyper-text">{assetName}</span>
        </div>
        {isPositive ? <TrendingUp size={16} className="text-hyper-accent" /> : <TrendingDown size={16} className="text-hyper-danger" />}
      </div>
      
      <div className="flex justify-between items-end">
        <div>
          <div className="text-2xl font-mono font-medium text-white">
            ${price.toFixed(price < 10 ? 4 : 2)}
          </div>
          <div className={`text-xs font-mono ${isPositive ? 'text-hyper-accent' : 'text-hyper-danger'}`}>
            {isPositive ? '+' : ''}{change24h.toFixed(2)}%
          </div>
        </div>
        
        <div className="text-right">
             <div className="flex items-center gap-1 justify-end text-hyper-muted text-xs mb-1">
                <Activity size={10} />
                <span>RSI</span>
             </div>
             <div className={`text-sm font-bold ${
                 rsi > 70 ? 'text-hyper-danger' : rsi < 30 ? 'text-hyper-accent' : 'text-yellow-500'
             }`}>
                 {rsi.toFixed(0)}
             </div>
        </div>
      </div>
      
      {isSelected && renderDepth()}
    </div>
  );
};

export default AssetCard;
