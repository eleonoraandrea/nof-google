import React, { useMemo } from 'react';
import { Trade } from '../types';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Activity, DollarSign, Target, TrendingDown, Divide } from 'lucide-react';

interface Props {
  trades: Trade[];
}

const PerformanceChart: React.FC<Props> = ({ trades }) => {
  const { data, stats } = useMemo(() => {
    // Filter only closed trades for historical performance
    const closedTrades = trades
      .filter(t => t.status === 'CLOSED')
      .sort((a, b) => a.timestamp - b.timestamp);

    let cumulative = 0;
    let wins = 0;
    let totalPnl = 0;
    let peakEquity = 0;
    let maxDrawdown = 0;
    let grossProfit = 0;
    let grossLoss = 0;

    const chartData = closedTrades.map(t => {
      const pnl = t.pnl || 0;
      cumulative += pnl;
      totalPnl += pnl;
      
      if (pnl > 0) {
          wins++;
          grossProfit += pnl;
      } else {
          grossLoss += Math.abs(pnl);
      }

      // Drawdown calc
      if (cumulative > peakEquity) peakEquity = cumulative;
      const drawdown = peakEquity - cumulative;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;

      return {
        id: t.id,
        date: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pnl,
        equity: cumulative,
        asset: t.asset,
        side: t.side
      };
    });

    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;

    return {
      data: chartData,
      stats: {
        totalPnl,
        winRate: closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0,
        count: closedTrades.length,
        maxDrawdown,
        profitFactor
      }
    };
  }, [trades]);

  if (stats.count === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-hyper-muted">
        <Activity size={48} className="mb-4 opacity-20" />
        <p className="font-mono text-sm">No closed trades history available.</p>
        <p className="text-xs opacity-50 mt-1">Activate the agent to generate performance data.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Mini Stats Row 1 */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <div className="bg-hyper-bg/40 rounded-lg p-2 md:p-3 border border-hyper-border flex items-center justify-between">
            <div>
                <p className="text-[8px] md:text-[10px] text-hyper-muted uppercase tracking-wider">Net PnL</p>
                <p className={`font-mono font-bold text-sm md:text-lg ${stats.totalPnl >= 0 ? 'text-hyper-accent' : 'text-hyper-danger'}`}>
                    {stats.totalPnl >= 0 ? '+' : ''}{stats.totalPnl.toFixed(2)}
                </p>
            </div>
            <div className={`p-1.5 md:p-2 rounded-full ${stats.totalPnl >= 0 ? 'bg-hyper-accent/10 text-hyper-accent' : 'bg-hyper-danger/10 text-hyper-danger'}`}>
                <DollarSign size={14} />
            </div>
        </div>
        <div className="bg-hyper-bg/40 rounded-lg p-2 md:p-3 border border-hyper-border flex items-center justify-between">
            <div>
                <p className="text-[8px] md:text-[10px] text-hyper-muted uppercase tracking-wider">Win Rate</p>
                <p className="font-mono font-bold text-sm md:text-lg text-white">
                    {stats.winRate.toFixed(1)}%
                </p>
            </div>
            <div className="p-1.5 md:p-2 rounded-full bg-blue-500/10 text-blue-500">
                <Target size={14} />
            </div>
        </div>
        <div className="bg-hyper-bg/40 rounded-lg p-2 md:p-3 border border-hyper-border flex items-center justify-between">
            <div>
                <p className="text-[8px] md:text-[10px] text-hyper-muted uppercase tracking-wider">Profit Factor</p>
                <p className="font-mono font-bold text-sm md:text-lg text-white">
                    {stats.profitFactor.toFixed(2)}
                </p>
            </div>
             <div className="p-1.5 md:p-2 rounded-full bg-purple-500/10 text-purple-500">
                <Divide size={14} />
            </div>
        </div>
      </div>

       {/* Mini Stats Row 2 */}
       <div className="flex gap-4">
           <div className="flex-1 bg-hyper-bg/20 rounded border border-hyper-border/50 px-3 py-1 flex items-center gap-2">
               <TrendingDown size={12} className="text-hyper-danger" />
               <span className="text-[10px] text-hyper-muted uppercase">Max Drawdown:</span>
               <span className="text-xs font-mono text-hyper-danger font-bold">-${stats.maxDrawdown.toFixed(2)}</span>
           </div>
           <div className="flex-1 bg-hyper-bg/20 rounded border border-hyper-border/50 px-3 py-1 flex items-center gap-2">
               <Activity size={12} className="text-white" />
               <span className="text-[10px] text-hyper-muted uppercase">Total Trades:</span>
               <span className="text-xs font-mono text-white font-bold">{stats.count}</span>
           </div>
       </div>

      {/* Chart */}
      <div className="flex-1 min-h-0 w-full bg-hyper-bg/20 rounded-lg border border-hyper-border/50 p-2">
         <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00e599" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00e599" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2e37" vertical={false} />
                <XAxis 
                    dataKey="date" 
                    stroke="#555" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={false}
                    minTickGap={30}
                />
                <YAxis 
                    stroke="#555" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    domain={['auto', 'auto']}
                />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#15171e', borderColor: '#2a2e37', color: '#f0f0f0' }}
                    itemStyle={{ color: '#00e599' }}
                    labelStyle={{ color: '#888', marginBottom: '0.5rem', fontSize: '10px' }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cumulative PnL']}
                />
                <Area 
                    type="monotone" 
                    dataKey="equity" 
                    stroke="#00e599" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorEquity)" 
                    isAnimationActive={false}
                />
            </AreaChart>
         </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PerformanceChart;