import React from 'react';
import { NewsItem } from '../types';
import { Newspaper, ExternalLink } from 'lucide-react';

interface Props {
  news: NewsItem[];
}

const NewsFeed: React.FC<Props> = ({ news }) => {
  return (
    <div className="flex flex-col h-full overflow-hidden">
        <h3 className="text-hyper-muted font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
            <Newspaper size={14} /> Live News Wire
        </h3>
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
             {news.length === 0 && (
                 <div className="text-center text-hyper-muted text-xs py-10 opacity-50">
                    Waiting for market news...
                 </div>
             )}
             {news.map(item => {
                 const isBullish = item.sentiment === 'BULLISH';
                 const isBearish = item.sentiment === 'BEARISH';
                 const scoreColor = item.score && item.score > 0 ? 'text-hyper-accent' : item.score && item.score < 0 ? 'text-hyper-danger' : 'text-slate-400';
                 
                 return (
                     <div key={item.id} className="border-b border-hyper-border/40 pb-3 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start mb-1">
                             <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                    isBullish ? 'bg-hyper-accent/5 text-hyper-accent border-hyper-accent/20' :
                                    isBearish ? 'bg-hyper-danger/5 text-hyper-danger border-hyper-danger/20' :
                                    'bg-slate-700/20 text-slate-400 border-slate-600/30'
                                }`}>
                                    {item.sentiment}
                                </span>
                             </div>
                             <span className="text-[10px] text-hyper-muted font-mono opacity-70">
                                 {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                             </span>
                        </div>
                        
                        <p className="text-xs text-slate-200 leading-relaxed mb-2 hover:text-white transition-colors cursor-default">
                            {item.headline}
                        </p>
                        
                        <div className="flex justify-between items-center text-[10px]">
                            <span className="text-hyper-muted flex items-center gap-1">
                                {item.source} <ExternalLink size={8} className="opacity-50" />
                            </span>
                            {item.score !== undefined && (
                                <span className={`font-mono font-bold ${scoreColor}`}>
                                    Score: {item.score > 0 ? '+' : ''}{item.score.toFixed(2)}
                                </span>
                            )}
                        </div>
                     </div>
                 )
             })}
        </div>
    </div>
  );
};

export default NewsFeed;