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

      // Max depth size for normalization
      const maxBid = Math.max(...bids.map(b => b.sz));
      const maxAsk = Math.max(...asks.map(a => a.sz));
      const overallMax = Math.max(maxBid, maxAsk);
      
      // Take top 5 levels for compact view
      const topBids = bids.slice(0, 5);
      const topAsks = asks.slice(0, 5);

      return (
          <div className="mt-3 pt-2 border-t border-hyper-border/50 animate-in fade-in">
              <div className="flex items-center gap-1 text-[10px] text-hyper-muted mb-1 uppercase tracking-wider">
                  <Layers size={10} /> Order Book Depth
              </div>
              <div className="flex gap-1 h-8">
                   {/* Bids (Green) - Right Aligned graphically */}
                   <div className="flex-1 flex flex-col justify-end items-end gap-[1px]">
                       {topBids.map((b, i) => (
                           <div key={`bid-${i}`} className="h-full bg-hyper-accent/30 rounded-sm" style={{ width: `${(b.sz / overallMax) * 100}%` }}></div>
                       ))}
                   </div>
                   
                   {/* Divider */}
                   <div className="w-[1px] bg-slate-700 h-full"></div>

                   {/* Asks (Red) - Left Aligned graphically */}
                   <div className="flex-1 flex flex-col justify-end items-start gap-[1px]">
                       {topAsks.map((a, i) => (
                           <div key={`ask-${i}`} className="h-full bg-hyper-danger/30 rounded-sm" style={{ width: `${(a.sz / overallMax) * 100}%` }}></div>
                       ))}
                   </div>
              </div>
              <div className="flex justify-between text-[9px] text-hyper-muted font-mono mt-1">
                  <span>Bid Vol</span>
                  <span>Ask Vol</span>
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