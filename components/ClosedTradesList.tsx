import React from 'react';
import { Trade } from '../types';
import { TrendingUp, TrendingDown, Clock, Hash } from 'lucide-react';

interface Props {
  trades: Trade[];
}

const ClosedTradesList: React.FC<Props> = ({ trades }) => {
  const closedTrades = trades.filter(t => t.status === 'CLOSED').sort((a, b) => b.timestamp - a.timestamp);

  if (closedTrades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-hyper-muted opacity-50 text-xs">
        No closed trades history found.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-hyper-bg/20 rounded-lg border border-hyper-border/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-hyper-border/50 bg-hyper-card/50">
        <h3 className="text-xs font-bold text-hyper-muted uppercase tracking-wider flex items-center gap-2">
           <Hash size={12} /> Recent Executions
        </h3>
        <span className="text-[10px] font-mono text-slate-500">{closedTrades.length} Records</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-hyper-card z-10 text-[10px] text-hyper-muted uppercase tracking-wider font-bold">
            <tr>
              <th className="px-4 py-2 border-b border-hyper-border/50">Time</th>
              <th className="px-4 py-2 border-b border-hyper-border/50">Pair</th>
              <th className="px-4 py-2 border-b border-hyper-border/50">Side</th>
              <th className="px-4 py-2 border-b border-hyper-border/50 text-right">Entry</th>
              <th className="px-4 py-2 border-b border-hyper-border/50 text-right">Exit</th>
              <th className="px-4 py-2 border-b border-hyper-border/50 text-right">PnL</th>
              <th className="px-4 py-2 border-b border-hyper-border/50">Reason</th>
            </tr>
          </thead>
          <tbody className="text-xs font-mono">
            {closedTrades.map((trade) => {
              const pnl = trade.pnl || 0;
              const isWin = pnl >= 0;
              
              return (
                <tr key={trade.id} className="border-b border-hyper-border/30 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-2 text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(trade.timestamp).toLocaleString([], { month: 'numeric', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                    </div>
                  </td>
                  <td className="px-4 py-2 font-bold text-white">{trade.asset}</td>
                  <td className="px-4 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      trade.side === 'LONG' ? 'bg-hyper-accent/10 text-hyper-accent' : 'bg-hyper-danger/10 text-hyper-danger'
                    }`}>
                      {trade.side} {trade.leverage}x
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-slate-300">${trade.entryPrice.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right text-slate-300">${trade.exitPrice?.toFixed(2) || '-'}</td>
                  <td className={`px-4 py-2 text-right font-bold ${isWin ? 'text-hyper-accent' : 'text-hyper-danger'}`}>
                    <div className="flex items-center justify-end gap-1">
                      {isWin ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {isWin ? '+' : ''}{pnl.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-4 py-2 max-w-[200px] truncate text-[10px] text-slate-500 italic" title={trade.reasoning}>
                    {trade.reasoning}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClosedTradesList;