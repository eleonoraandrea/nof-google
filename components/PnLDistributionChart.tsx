import React, { useMemo } from 'react';
import { Trade } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { BarChart3 } from 'lucide-react';

interface Props {
  trades: Trade[];
}

const PnLDistributionChart: React.FC<Props> = ({ trades }) => {
  const data = useMemo(() => {
    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    if (closedTrades.length === 0) return [];

    const pnls = closedTrades.map(t => t.pnl || 0);
    const minPnl = Math.min(...pnls);
    const maxPnl = Math.max(...pnls);
    
    // Calculate Bin Size (aim for ~10 bins)
    const range = maxPnl - minPnl;
    const binCount = 10;
    // Ensure binSize is at least 1, and handle case where range is 0
    const rawBinSize = range === 0 ? 10 : range / binCount;
    // Round to nicer numbers for readability (approx)
    const binSize = Math.max(1, Math.ceil(rawBinSize));
    
    // Determine Start (rounded down to nearest binSize)
    const start = Math.floor(minPnl / binSize) * binSize;
    // Determine End
    const end = Math.ceil(maxPnl / binSize) * binSize;
    
    // Initialize buckets
    const bins: Record<number, { range: string, count: number, mid: number }> = {};
    
    // Pre-fill bins to ensure continuous x-axis
    // We iterate by index to avoid floating point loop issues
    const numSteps = Math.floor((end - start) / binSize);
    
    for (let i = 0; i <= numSteps; i++) {
        const binStart = start + (i * binSize);
        const binEnd = binStart + binSize;
        const binLabel = `${binStart >= 0 ? '+' : ''}${binStart.toFixed(0)} to ${binEnd >= 0 ? '+' : ''}${binEnd.toFixed(0)}`;
        // Use binStart as key
        bins[binStart] = { 
            range: binLabel, 
            count: 0, 
            mid: (binStart + binEnd) / 2 
        };
    }

    // Populate buckets
    pnls.forEach(pnl => {
        // Find which bin this PnL belongs to
        // If pnl is maxPnl, it might fall into the last bucket or start a new one depending on rounding.
        // We use floor relative to start.
        const offset = pnl - start;
        const binIndex = Math.floor(offset / binSize);
        const binStart = start + (binIndex * binSize);
        
        if (bins[binStart]) {
            bins[binStart].count += 1;
        } else {
             // Edge case handling (e.g. max value exactly on boundary)
             // Try to put in previous bin if valid, or just ignore (shouldn't happen with correct logic)
             const lastKey = start + (numSteps * binSize);
             if (pnl >= lastKey && bins[lastKey]) {
                 bins[lastKey].count += 1;
             }
        }
    });

    return Object.values(bins).map(b => ({
        name: b.range,
        count: b.count,
        mid: b.mid
    }));

  }, [trades]);

  if (data.length === 0) {
    return (
       <div className="flex flex-col items-center justify-center h-full text-hyper-muted">
        <BarChart3 size={48} className="mb-4 opacity-20" />
        <p className="font-mono text-sm">No closed trade data available.</p>
        <p className="text-xs opacity-50 mt-1">Execute trades to generate distribution analytics.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
        {/* Header Stats */}
        <div className="grid grid-cols-1">
             <div className="bg-hyper-bg/40 rounded-lg p-3 border border-hyper-border flex items-center gap-4">
                <div className="p-2 rounded-full bg-slate-700/50 text-slate-300">
                    <BarChart3 size={16} />
                </div>
                <div>
                    <h4 className="text-[10px] text-hyper-muted uppercase tracking-wider font-bold">PnL Distribution</h4>
                    <p className="text-xs text-slate-400">Frequency of profit/loss outcomes across all closed trades.</p>
                </div>
            </div>
        </div>

        {/* Chart */}
        <div className="flex-1 w-full min-h-0 bg-hyper-bg/20 rounded-lg border border-hyper-border/50 p-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2e37" vertical={false} />
                    <XAxis 
                        dataKey="name" 
                        stroke="#555" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                    />
                    <YAxis 
                        stroke="#555" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        allowDecimals={false}
                    />
                    <Tooltip 
                        cursor={{fill: '#2a2e37', opacity: 0.4}}
                        contentStyle={{ backgroundColor: '#15171e', borderColor: '#2a2e37', color: '#f0f0f0' }}
                        itemStyle={{ color: '#00e599' }}
                        labelStyle={{ color: '#888', marginBottom: '0.25rem', fontSize: '10px' }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={entry.mid >= 0 ? '#00e599' : '#ff4d4d'} 
                                fillOpacity={0.8}
                                stroke={entry.mid >= 0 ? '#00e599' : '#ff4d4d'}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
};

export default PnLDistributionChart;