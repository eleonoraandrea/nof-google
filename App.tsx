
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    AssetName, 
    MarketData, 
    Trade, 
    Portfolio, 
    TradeSide, 
    NewsItem, 
    TradeConfig,
    Candle
} from './types';
import { analyzeMarket, analyzeNewsSentiment } from './services/geminiService';
import { getMockNews, getFearAndGreed } from './services/mockDataService';
import { 
    fetchHLSnapshot, 
    fetchHLCandles,
    HyperliquidStream, 
    HLDataSnapshot, 
    fetchL2Book 
} from './services/hyperliquidService';
import { calculateRSI } from './services/technicalAnalysis';
import { logTrade, fetchTradeHistory, saveConfig, saveSystemStatus } from './services/supabaseService';
import { sendTelegramMessage, formatTradeMessage, formatPerformanceReport } from './services/telegramService';
import AssetCard from './components/AssetCard';
import TradeLog from './components/TradeLog';
import PerformanceChart from './components/PerformanceChart';
import PnLDistributionChart from './components/PnLDistributionChart';
import ClosedTradesList from './components/ClosedTradesList';
import NewsFeed from './components/NewsFeed';
import ConfigModal from './components/ConfigModal';
import TVChart from './components/TVChart';
import { 
    Brain, 
    Zap, 
    Settings, 
    Wallet, 
    PauseCircle, 
    PlayCircle,
    Activity,
    BrainCircuit,
    Cpu,
    ShieldAlert,
    Network,
    Server
} from 'lucide-react';

// --- Constants ---
const CANDLE_INTERVAL = 1000; // Check for candle closure/update frequently
const TRADING_FEE_RATE = 0.001; // 0.1% fee per side

const INITIAL_PORTFOLIO: Portfolio = {
    balance: 10000,
    equity: 10000,
    availableMargin: 10000
};

const INITIAL_CONFIG: TradeConfig = {
    assets: [AssetName.BTC, AssetName.ETH, AssetName.SOL, AssetName.HYPE, AssetName.ARB],
    maxLeverage: 5,
    riskPerTrade: 0.1, // 10% of portfolio size
    stopLossPct: 0.02, // 2% SL
    takeProfitPct: 0.04, // 4% TP
    
    // AI Settings
    aiProvider: 'GEMINI',
    aiModel: 'gemini-2.5-flash',
    analysisIntervalMins: 15,
    openRouterModel: 'deepseek/deepseek-r1',
    ollamaBaseUrl: 'http://localhost:11434',
    ollamaModel: 'llama3',

    notificationsEnabled: false,
    executionMode: 'SIMULATION'
};

const AI_MODELS = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro' },
];

const App: React.FC = () => {
    // State
    const [portfolio, setPortfolio] = useState<Portfolio>(INITIAL_PORTFOLIO);
    const [config, setConfig] = useState<TradeConfig>(INITIAL_CONFIG);
    const [activeTrades, setActiveTrades] = useState<Trade[]>([]);
    const [tradeHistory, setTradeHistory] = useState<Trade[]>([]);
    const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
    // SelectedAsset is string now, default to BTC
    const [selectedAsset, setSelectedAsset] = useState<string>(AssetName.BTC);
    const [news, setNews] = useState<NewsItem[]>([]);
    const [fearIndex, setFearIndex] = useState<number>(50);
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [lastAnalysis, setLastAnalysis] = useState<string>("Waiting to start...");
    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
    
    // UI State
    const [chartView, setChartView] = useState<'PRICE' | 'PERFORMANCE' | 'DISTRIBUTION'>('PRICE');
    
    // Chart Data (Candlesticks)
    const [candleHistory, setCandleHistory] = useState<Candle[]>([]);
    const [currentCandle, setCurrentCandle] = useState<Candle | null>(null);

    // Refs for stable access in intervals/callbacks
    const hlStream = useRef<HyperliquidStream | null>(null);
    const baseStats = useRef<Record<string, { prevDayPx: number }>>({});
    const aiInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    
    // Candle Building Refs
    const candleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const buildingCandleRef = useRef<Candle | null>(null);
    const selectedAssetRef = useRef(selectedAsset);

    const marketDataRef = useRef(marketData);
    const activeTradesRef = useRef(activeTrades);
    const portfolioRef = useRef(portfolio);
    const configRef = useRef(config);
    const newsRef = useRef(news);
    const fearIndexRef = useRef(fearIndex);
    const tradeHistoryRef = useRef(tradeHistory);
    const candleHistoryRef = useRef(candleHistory);

    // Sync refs with state
    useEffect(() => { marketDataRef.current = marketData; }, [marketData]);
    useEffect(() => { activeTradesRef.current = activeTrades; }, [activeTrades]);
    useEffect(() => { portfolioRef.current = portfolio; }, [portfolio]);
    useEffect(() => { configRef.current = config; }, [config]);
    useEffect(() => { newsRef.current = news; }, [news]);
    useEffect(() => { fearIndexRef.current = fearIndex; }, [fearIndex]);
    useEffect(() => { tradeHistoryRef.current = tradeHistory; }, [tradeHistory]);
    useEffect(() => { selectedAssetRef.current = selectedAsset; }, [selectedAsset]);
    useEffect(() => { candleHistoryRef.current = candleHistory; }, [candleHistory]);

    // --- Load History ---
    useEffect(() => {
        const loadHistory = async () => {
            const history = await fetchTradeHistory();
            if (history && history.length > 0) {
                setTradeHistory(history);
            }
        };
        loadHistory();
    }, []);

    // --- Data Initialization & Websocket ---
    useEffect(() => {
        const init = async () => {
            // 1. Fetch Snapshot for Metadata of ALL assets
            const snapshot = await fetchHLSnapshot();
            const initialData: Record<string, MarketData> = {};
            
            if (snapshot) {
                Object.keys(snapshot).forEach(asset => {
                    const s = snapshot[asset];
                    const price = s?.price || 0;
                    const prevDayPx = s?.prevDayPx || 0;
                    let change24h = 0;
                    
                    if (price > 0 && prevDayPx > 0) {
                        change24h = ((price - prevDayPx) / prevDayPx) * 100;
                    }

                    if (s && s.prevDayPx) {
                        baseStats.current[asset] = { prevDayPx: s.prevDayPx };
                    }

                    initialData[asset] = {
                        asset,
                        price: price,
                        change24h: change24h,
                        volume: s?.volume || 0,
                        rsi: 50, // Initial default
                        high24h: price * 1.05,
                        low24h: price * 0.95
                    };
                });
            }
            
            setMarketData(initialData);

            // 2. Connect WS
            hlStream.current = new HyperliquidStream();
            hlStream.current.connect();
            
            const unsubscribe = hlStream.current.subscribe((mids) => {
                setMarketData(prev => {
                    const next = { ...prev };
                    let hasUpdate = false;
                    
                    // CRITICAL FIX: Ensure we subscribe to updates for Configured Assets, Selected Asset, AND Active Trades
                    // This guarantees manual close PnL is accurate even if asset isn't selected
                    const assetsToUpdate = new Set([
                        ...configRef.current.assets, 
                        selectedAssetRef.current,
                        ...activeTradesRef.current.map(t => t.asset)
                    ]);

                    assetsToUpdate.forEach(asset => {
                        const newPrice = mids[asset];
                        if (newPrice !== undefined) {
                            const current = prev[asset];
                            
                            if (current && current.price !== newPrice) {
                                hasUpdate = true;
                                const prevDayPx = baseStats.current[asset]?.prevDayPx || current.price;
                                
                                let change24h = 0;
                                if (prevDayPx > 0) {
                                    change24h = ((newPrice - prevDayPx) / prevDayPx) * 100;
                                }

                                // Update Candle State if it's the selected asset
                                if (asset === selectedAssetRef.current && buildingCandleRef.current) {
                                    const bc = buildingCandleRef.current;
                                    bc.close = newPrice;
                                    if (newPrice > bc.high) bc.high = newPrice;
                                    if (newPrice < bc.low) bc.low = newPrice;
                                    // Trigger chart update
                                    setCurrentCandle({...bc});
                                }

                                // Recalculate RSI if we have history and it's selected
                                const currentAssetRsi = asset === selectedAssetRef.current 
                                    ? calculateRSI([...candleHistoryRef.current, buildingCandleRef.current!].filter(Boolean)) 
                                    : current.rsi;

                                next[asset] = {
                                    ...current,
                                    price: newPrice,
                                    change24h,
                                    rsi: currentAssetRsi
                                };
                            } else if (!current) {
                                hasUpdate = true;
                                next[asset] = {
                                    asset,
                                    price: newPrice,
                                    change24h: 0,
                                    rsi: 50,
                                    volume: 0,
                                    high24h: newPrice,
                                    low24h: newPrice
                                };
                            }
                        }
                    });

                    // Update PnL for active trades
                    if (hasUpdate) {
                         setActiveTrades(trades => trades.map(t => {
                             const currPrice = next[t.asset]?.price || t.entryPrice;
                             const positionNotional = t.size * t.leverage; 
                             const quantity = t.entryPrice > 0 ? positionNotional / t.entryPrice : 0;
                             
                             const rawDiff = currPrice - t.entryPrice;
                             const grossPnl = t.side === TradeSide.LONG 
                                ? rawDiff * quantity 
                                : -rawDiff * quantity;

                             const entryFee = positionNotional * TRADING_FEE_RATE;
                             const exitFee = (quantity * currPrice) * TRADING_FEE_RATE;
                             const totalFees = entryFee + exitFee;
                             const netPnl = grossPnl - totalFees;

                             return { ...t, pnl: netPnl, fees: totalFees };
                         }));
                    }

                    return hasUpdate ? next : prev;
                });
            });

            return unsubscribe;
        };

        const cleanupPromise = init();

        return () => {
            cleanupPromise.then(unsub => unsub && unsub());
            hlStream.current?.disconnect();
        };
    }, []);

    // --- Fetch Historical Candles on Asset Change ---
    useEffect(() => {
        const loadCandles = async () => {
             // 1. Fetch real history (15m interval to match analysis loop)
             const candles = await fetchHLCandles(selectedAsset, '15m');
             
             if (candles.length > 0) {
                 setCandleHistory(candles);
                 
                 // Initialize building candle from the last closed one or start fresh
                 const lastCandle = candles[candles.length - 1];
                 const nextTime = lastCandle.time + (15 * 60); 
                 
                 buildingCandleRef.current = {
                     time: nextTime,
                     open: lastCandle.close,
                     high: lastCandle.close,
                     low: lastCandle.close,
                     close: lastCandle.close
                 };
                 setCurrentCandle(buildingCandleRef.current);

                 // Update RSI immediately based on fetched history
                 const rsi = calculateRSI(candles);
                 setMarketData(prev => ({
                     ...prev,
                     [selectedAsset]: {
                         ...prev[selectedAsset] || { asset: selectedAsset, price: 0, change24h: 0, rsi: 50, volume: 0, high24h: 0, low24h: 0 },
                         rsi: rsi
                     }
                 }));
             }
        };

        loadCandles();
        // Clear chart while loading
        setCandleHistory([]);
    }, [selectedAsset]);

    // --- Candle Management Loop ---
    useEffect(() => {
        candleIntervalRef.current = setInterval(() => {
            const now = Date.now() / 1000;
            if (buildingCandleRef.current) {
                // If 15 mins passed since candle start (15m * 60s = 900s)
                if (now >= buildingCandleRef.current.time + 900) {
                    const finalized = { ...buildingCandleRef.current };
                    setCandleHistory(prev => [...prev, finalized]);
                    
                    // Start next
                    buildingCandleRef.current = {
                        time: finalized.time + 900,
                        open: finalized.close,
                        high: finalized.close,
                        low: finalized.close,
                        close: finalized.close
                    };
                    setCurrentCandle(buildingCandleRef.current);
                }
            }
        }, CANDLE_INTERVAL);

        return () => { if (candleIntervalRef.current) clearInterval(candleIntervalRef.current); };
    }, []);


    // --- Environment Updates ---
    useEffect(() => {
        const envInterval = setInterval(() => {
            // News
            if (Math.random() < 0.05) { 
                const rawNews = getMockNews();
                // Pass current config to ensure correct AI provider is used
                analyzeNewsSentiment(rawNews.headline, configRef.current).then(analysis => {
                    const enrichedNews: NewsItem = { 
                        ...rawNews, 
                        sentiment: analysis.sentiment,
                        score: analysis.score
                    };
                    setNews(prev => [enrichedNews, ...prev].slice(0, 30)); 
                }).catch(e => setNews(prev => [rawNews, ...prev].slice(0, 30)));
            }
            
            // Fear Index
            if (Math.random() < 0.02) setFearIndex(getFearAndGreed());

            // L2 Book
            const currentAsset = selectedAssetRef.current;
            if (currentAsset) {
                fetchL2Book(currentAsset).then(book => {
                    if (book) {
                        setMarketData(prev => {
                            const current = prev[currentAsset];
                            if (!current) return prev; 
                            
                            return {
                                ...prev,
                                [currentAsset]: { ...current, depth: book }
                            };
                        });
                    }
                });
            }
        }, 1000);

        return () => clearInterval(envInterval);
    }, []);

    // --- Trading Logic ---
    const closeTrade = useCallback((trade: Trade, reason: string) => {
        // Ensure we have latest data
        const currentData = marketDataRef.current[trade.asset];
        const currentPrice = currentData?.price || trade.entryPrice;
        
        // Log warning if closing with potentially stale data (price shouldn't be 0 if WS is working)
        if (!currentData || currentData.price === 0) {
            console.warn(`Closing trade for ${trade.asset} with potentially stale price data.`);
        }

        const positionNotional = trade.size * trade.leverage;
        const quantity = trade.entryPrice > 0 ? positionNotional / trade.entryPrice : 0;
        
        const rawDiff = currentPrice - trade.entryPrice;
        const grossPnl = trade.side === TradeSide.LONG ? rawDiff * quantity : -rawDiff * quantity;
        
        const entryFee = positionNotional * TRADING_FEE_RATE;
        const exitFee = (quantity * currentPrice) * TRADING_FEE_RATE;
        const totalFees = entryFee + exitFee;
        const finalNetPnl = grossPnl - totalFees;

        const closed: Trade = {
            ...trade,
            status: 'CLOSED',
            exitPrice: currentPrice,
            pnl: finalNetPnl,
            fees: totalFees,
            reasoning: `${trade.reasoning} | ${reason}`
        };

        setTradeHistory(prev => [closed, ...prev]);
        setActiveTrades(prev => prev.filter(t => t.id !== trade.id));
        setPortfolio(prev => ({
            ...prev,
            balance: prev.balance + finalNetPnl, 
            equity: prev.equity + finalNetPnl,
            availableMargin: prev.availableMargin + trade.size + finalNetPnl
        }));
        
        logTrade(closed); // Save to Supabase
        
        // Notify Telegram
        const msg = formatTradeMessage(closed, true);
        sendTelegramMessage(msg, configRef.current);

    }, []);

    const executeAiLoop = useCallback(async () => {
        if (!isRunning || isAnalyzing) return;
        
        const currentActiveTrades = activeTradesRef.current;
        const currentMarketData = marketDataRef.current;
        const currentPortfolio = portfolioRef.current;
        const currentConfig = configRef.current;
        
        try {
            // 1. Save System Status to DB every cycle
            await saveSystemStatus(
                currentPortfolio, 
                currentActiveTrades.length, 
                fearIndexRef.current, 
                currentConfig
            );

            // Daily (or periodic) Performance Report to Telegram
            if (Math.random() < 0.005) { // Occasional report
                const report = formatPerformanceReport(currentPortfolio, tradeHistoryRef.current);
                sendTelegramMessage(report, currentConfig);
            }

            const candidateAssets = currentConfig.assets;
            if (candidateAssets.length === 0) return;
            
            // Analyze a random asset from the basket
            const assetToAnalyze = candidateAssets[Math.floor(Math.random() * candidateAssets.length)];
            const existingTrade = currentActiveTrades.find(t => t.asset === assetToAnalyze);
            
            // Manage Existing Trade
            if (existingTrade) {
                const netPnl = existingTrade.pnl || 0;
                const positionValue = existingTrade.size * existingTrade.leverage;
                const pnlRatio = positionValue > 0 ? netPnl / positionValue : 0;
                    
                if (pnlRatio <= -currentConfig.stopLossPct) {
                    closeTrade(existingTrade, "Stop Loss");
                } else if (pnlRatio >= currentConfig.takeProfitPct) {
                    closeTrade(existingTrade, "Take Profit");
                }
                return;
            }

            // Analyze New Entry
            setIsAnalyzing(true);
            setLastAnalysis(`Scanning ${assetToAnalyze}...`);

            const data = currentMarketData[assetToAnalyze];
            if (!data || data.price === 0) {
                return;
            }

            const result = await analyzeMarket(
                data, 
                newsRef.current, 
                fearIndexRef.current, 
                tradeHistoryRef.current, 
                currentPortfolio.equity,
                currentConfig
            );

            setLastAnalysis(`${result.decision} ${assetToAnalyze} (${result.confidence}%)`);

            if (result.decision !== TradeSide.WAIT && result.confidence > 75) {
                const size = currentPortfolio.balance * currentConfig.riskPerTrade;
                
                // Re-check existing trades to prevent race condition double-entry
                if (activeTradesRef.current.some(t => t.asset === assetToAnalyze)) {
                    return;
                }

                if (currentPortfolio.availableMargin < size) {
                    setLastAnalysis("Insufficient Margin");
                    return;
                }

                const recentNews = newsRef.current.slice(0, 3);
                const avgNewsScore = recentNews.length > 0 
                    ? recentNews.reduce((acc, n) => acc + (n.score || 0), 0) / recentNews.length 
                    : 0;

                const newTrade: Trade = {
                    id: Math.random().toString(36).substring(2, 11),
                    asset: assetToAnalyze,
                    entryPrice: data.price,
                    side: result.decision,
                    size: size,
                    leverage: Math.min(result.leverage, 5),
                    timestamp: Date.now(),
                    status: 'OPEN',
                    reasoning: result.reasoning,
                    aiConfidence: result.confidence,
                    pnl: -(size * result.leverage * TRADING_FEE_RATE), 
                    fees: size * result.leverage * TRADING_FEE_RATE, 
                    marketSnapshot: {
                        rsi: data.rsi,
                        fearIndex: fearIndexRef.current,
                        newsScore: avgNewsScore
                    }
                };

                // REAL EXECUTION LOGIC PLACEHOLDER
                if (currentConfig.executionMode === 'REAL') {
                    if (!currentConfig.walletPrivateKey) {
                        setLastAnalysis("ABORTED: Real mode requires private key");
                        return;
                    }
                    console.log("!!! REAL ORDER EXECUTION TRIGGERED !!!");
                    console.log(`Payload: ${newTrade.side} ${newTrade.size} USD on ${newTrade.asset}`);
                }

                setActiveTrades(prev => [...prev, newTrade]);
                setPortfolio(prev => ({
                    ...prev,
                    availableMargin: prev.availableMargin - size
                }));
                
                // Save Reasoning and Trade to DB
                logTrade(newTrade);
                
                // Notify Telegram
                const msg = formatTradeMessage(newTrade);
                sendTelegramMessage(msg, currentConfig);
            }
        } catch (e: any) {
            console.error("AI Loop Error:", e);
            setLastAnalysis(`AI Error: ${e.message || 'Unknown'}`);
        } finally {
            setIsAnalyzing(false);
        }
    }, [isRunning, isAnalyzing, closeTrade]);

    // Setup AI Interval with Dynamic Configuration
    useEffect(() => {
        if (isRunning) {
            // Convert Minutes to Milliseconds
            const intervalMs = (config.analysisIntervalMins || 15) * 60 * 1000;
            aiInterval.current = setInterval(executeAiLoop, intervalMs);
        } else {
            if (aiInterval.current) clearInterval(aiInterval.current);
        }
        return () => { if (aiInterval.current) clearInterval(aiInterval.current); };
    }, [isRunning, executeAiLoop, config.analysisIntervalMins]);

    const handleSaveConfig = (newConfig: TradeConfig) => {
        setConfig(newConfig);
        saveConfig(newConfig); 
    };

    // Filter market data for display based on config
    const displayedAssets = config.assets.filter(a => marketData[a]);

    return (
        <div className="min-h-screen bg-hyper-bg text-hyper-text font-sans selection:bg-hyper-accent selection:text-black">
            
            <ConfigModal 
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                config={config}
                onSave={handleSaveConfig}
            />

            {/* Header */}
            <header className="h-16 border-b border-hyper-border flex items-center justify-between px-6 sticky top-0 bg-hyper-bg/90 backdrop-blur-md z-50">
                <div className="flex items-center gap-3">
                    <div className="bg-hyper-accent/20 p-2 rounded-lg">
                        <Brain className="text-hyper-accent" size={24} />
                    </div>
                    <div>
                        <h1 className="font-bold text-xl tracking-tight">NEURO<span className="text-hyper-accent">LIQUID</span></h1>
                        <div className="text-[10px] text-hyper-muted font-mono flex items-center gap-2">
                             HYPERLIQUID FEED <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Execution Mode Badge */}
                    {config.executionMode === 'REAL' && (
                        <div className="hidden md:flex items-center gap-2 bg-hyper-danger/10 text-hyper-danger border border-hyper-danger/30 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                            <ShieldAlert size={12} /> REAL EXECUTION ACTIVE
                        </div>
                    )}

                    {/* Model Provider Info */}
                    <div className="flex items-center gap-2 bg-hyper-card border border-hyper-border rounded-lg px-3 py-1.5 text-xs">
                        {config.aiProvider === 'GEMINI' && <Cpu size={14} className="text-hyper-accent" />}
                        {config.aiProvider === 'OPENROUTER' && <Network size={14} className="text-blue-400" />}
                        {config.aiProvider === 'OLLAMA' && <Server size={14} className="text-orange-400" />}
                        <span className="text-white font-bold">{config.aiProvider}</span>
                    </div>

                    <div className="flex flex-col items-end hidden md:flex">
                        <span className="text-xs text-hyper-muted uppercase">Total Equity</span>
                        <span className="font-mono font-bold text-lg">${portfolio.equity.toFixed(2)}</span>
                    </div>
                    <button 
                        onClick={() => setIsRunning(!isRunning)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                            isRunning 
                            ? 'bg-hyper-danger/10 text-hyper-danger border border-hyper-danger/50 hover:bg-hyper-danger/20' 
                            : 'bg-hyper-accent text-black hover:bg-hyper-accent/90 shadow-[0_0_20px_rgba(0,229,153,0.4)]'
                        }`}
                    >
                        {isRunning ? <PauseCircle size={18}/> : <PlayCircle size={18}/>}
                        {isRunning ? 'HALT AGENT' : 'START AGENT'}
                    </button>
                    <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="w-8 h-8 rounded-full bg-hyper-card border border-hyper-border flex items-center justify-center cursor-pointer hover:border-hyper-accent transition-colors"
                    >
                        <Settings size={16} className="text-hyper-muted hover:text-white" />
                    </button>
                </div>
            </header>

            {/* Main Layout */}
            <main className="p-6 grid grid-cols-12 gap-6 h-[calc(100vh-64px)]">
                
                {/* Left Col: Market & Intelligence (3 cols) */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 overflow-hidden">
                    {/* Market Watch (40% height) */}
                    <div className="bg-hyper-card border border-hyper-border rounded-xl p-4 h-[40%] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-hyper-muted text-xs font-bold uppercase flex items-center gap-2">
                                <Activity size={14} /> Market Watch
                            </h2>
                            <span className="text-[10px] text-hyper-muted font-mono opacity-60">
                                {config.assets.length} Assets Active
                            </span>
                        </div>
                        <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                            {displayedAssets.map(asset => (
                                <AssetCard 
                                    key={asset} 
                                    data={marketData[asset] || { asset, price: 0, change24h: 0, rsi: 0, volume: 0, high24h: 0, low24h: 0}} 
                                    isSelected={selectedAsset === asset}
                                    onClick={() => setSelectedAsset(asset)}
                                />
                            ))}
                            {displayedAssets.length === 0 && (
                                <div className="text-center text-xs text-hyper-muted py-4 italic">
                                    No active assets configured. Check settings.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Market Intelligence (60% height) */}
                    <div className="bg-hyper-card border border-hyper-border rounded-xl p-4 flex-1 flex flex-col min-h-0">
                         <h2 className="text-hyper-muted text-xs font-bold uppercase mb-3 flex items-center gap-2">
                            <Zap size={14} /> Market Intelligence
                        </h2>
                        
                        {/* Fear Index */}
                        <div className="mb-4 bg-hyper-bg/50 p-3 rounded-lg border border-hyper-border/50">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] uppercase text-hyper-muted tracking-wider">Fear & Greed</span>
                                <div className={`text-sm font-bold ${fearIndex > 70 ? 'text-hyper-accent' : fearIndex < 30 ? 'text-hyper-danger' : 'text-yellow-500'}`}>
                                    {fearIndex}/100
                                </div>
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-hyper-danger via-yellow-500 to-hyper-accent transition-all duration-1000"
                                    style={{ width: `${fearIndex}%` }}
                                />
                            </div>
                        </div>

                        {/* News Feed */}
                        <div className="flex-1 min-h-0 border-t border-hyper-border/50 pt-3">
                            <NewsFeed news={news} />
                        </div>
                    </div>
                </div>

                {/* Center Col: Charts & AI (6 cols) */}
                <div className="col-span-12 lg:col-span-6 flex flex-col gap-6">
                    {/* Chart Area */}
                    <div className="bg-hyper-card border border-hyper-border rounded-xl p-6 h-[60%] flex flex-col relative">
                        <div className="flex justify-between items-center mb-4">
                            {/* Dynamic Header based on View */}
                            {chartView === 'PRICE' && (
                                <div>
                                    <h2 className="text-2xl font-bold font-mono text-white flex items-center gap-2">
                                        {selectedAsset} <span className="text-sm text-hyper-muted font-normal">USD</span>
                                    </h2>
                                    <span className={`font-mono text-sm ${
                                        (marketData[selectedAsset]?.change24h || 0) >= 0 ? 'text-hyper-accent' : 'text-hyper-danger'
                                    }`}>
                                        ${marketData[selectedAsset]?.price?.toFixed(2)}
                                        <span className="ml-2 text-xs opacity-70">
                                            {(marketData[selectedAsset]?.change24h || 0) > 0 ? '+' : ''}
                                            {marketData[selectedAsset]?.change24h?.toFixed(2)}%
                                        </span>
                                    </span>
                                </div>
                            )}
                            
                            {chartView === 'PERFORMANCE' && (
                                <div>
                                    <h2 className="text-2xl font-bold font-mono text-white">Performance Analytics</h2>
                                    <span className="text-sm text-hyper-muted">Historical Trade Analysis</span>
                                </div>
                            )}

                            {chartView === 'DISTRIBUTION' && (
                                <div>
                                    <h2 className="text-2xl font-bold font-mono text-white">PnL Distribution</h2>
                                    <span className="text-sm text-hyper-muted">Profit/Loss Frequency Histogram</span>
                                </div>
                            )}

                            {/* Right Side Toggle */}
                            <div className="flex gap-2">
                                <div className="flex bg-black/40 p-1 rounded-lg border border-hyper-border">
                                    <button 
                                        onClick={() => setChartView('PRICE')}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                                            chartView === 'PRICE' 
                                            ? 'bg-hyper-card text-hyper-accent shadow-sm border border-hyper-accent/20' 
                                            : 'text-hyper-muted hover:text-white'
                                        }`}
                                    >
                                        CHART
                                    </button>
                                    <button 
                                        onClick={() => setChartView('PERFORMANCE')}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                                            chartView === 'PERFORMANCE' 
                                            ? 'bg-hyper-card text-hyper-accent shadow-sm border border-hyper-accent/20' 
                                            : 'text-hyper-muted hover:text-white'
                                        }`}
                                    >
                                        PERF
                                    </button>
                                     <button 
                                        onClick={() => setChartView('DISTRIBUTION')}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                                            chartView === 'DISTRIBUTION' 
                                            ? 'bg-hyper-card text-hyper-accent shadow-sm border border-hyper-accent/20' 
                                            : 'text-hyper-muted hover:text-white'
                                        }`}
                                    >
                                        DIST
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex-1 w-full min-h-0 relative">
                            {chartView === 'PRICE' && (
                                <TVChart 
                                    data={candleHistory} 
                                    currentCandle={currentCandle}
                                />
                            )}
                            
                            {/* Combined Performance Dashboard: Chart + Closed Trades List */}
                            {chartView === 'PERFORMANCE' && (
                                <div className="flex flex-col h-full gap-4">
                                    <div className="h-1/2 min-h-[200px]">
                                        <PerformanceChart trades={[...activeTrades, ...tradeHistory]} />
                                    </div>
                                    <div className="flex-1 min-h-[200px] overflow-hidden">
                                        <ClosedTradesList trades={tradeHistory} />
                                    </div>
                                </div>
                            )}
                            
                            {chartView === 'DISTRIBUTION' && (
                                <PnLDistributionChart trades={[...activeTrades, ...tradeHistory]} />
                            )}
                        </div>
                    </div>

                    {/* AI Console */}
                    <div className="bg-hyper-card border border-hyper-border rounded-xl p-6 flex-1 flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-50"></div>
                        <h2 className="text-hyper-muted text-xs font-bold uppercase mb-4 flex items-center gap-2">
                            <BrainCircuit size={14} className="text-purple-400" /> Neural Engine Output
                        </h2>
                        
                        <div className="flex-1 font-mono text-sm space-y-2 overflow-y-auto">
                            {!process.env.API_KEY && config.aiProvider === 'GEMINI' && (
                                <div className="text-yellow-500 mb-2 border border-yellow-500/30 bg-yellow-500/10 p-2 rounded">
                                    WARNING: No API_KEY detected. AI is running in simulation mode.
                                </div>
                            )}
                            <div className="text-hyper-muted">
                                {`> System: ${isRunning ? 'Online' : 'Standby'}`}
                            </div>
                            <div className="text-hyper-muted">
                                {`> Interval: ${config.analysisIntervalMins} Minutes`}
                            </div>
                            <div className="text-hyper-muted">
                                {`> Provider: ${config.aiProvider}`}
                            </div>
                            <div className="text-hyper-muted">
                                {`> Model: ${config.aiProvider === 'GEMINI' ? config.aiModel : config.aiProvider === 'OPENROUTER' ? config.openRouterModel : config.ollamaModel}`}
                            </div>
                            <div className="text-hyper-muted">
                                {`> Strategy: Max Lev ${config.maxLeverage}x | Risk ${(config.riskPerTrade * 100).toFixed(0)}% | Est. Fees ${(TRADING_FEE_RATE * 100).toFixed(1)}%`}
                            </div>
                            <div className="text-hyper-muted">
                                {`> SL: ${(config.stopLossPct * 100).toFixed(1)}% | TP: ${(config.takeProfitPct * 100).toFixed(1)}%`}
                            </div>
                            <div className="my-2 border-b border-dashed border-slate-700"></div>
                            {isAnalyzing && (
                                <div className="text-blue-400 animate-pulse">
                                    {`> Thinking... processing data tensors...`}
                                </div>
                            )}
                            <div className="text-white">
                                {`> ${lastAnalysis}`}
                            </div>
                            {activeTrades.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-800">
                                    <div className="text-xs text-hyper-muted mb-1 uppercase">Active Positions</div>
                                    {activeTrades.map(t => (
                                        <div key={t.id} className="text-hyper-accent text-xs">
                                            {`> ${t.asset} ${t.side}: Net PnL ${t.pnl?.toFixed(2)}`}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Col: Trades & Wallet (3 cols) */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
                     <div className="bg-hyper-card border border-hyper-border rounded-xl p-4 h-1/3">
                        <h2 className="text-hyper-muted text-xs font-bold uppercase mb-4 flex items-center gap-2">
                            <Wallet size={14} /> Account Overview
                        </h2>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                <span className="text-sm text-slate-400">Balance</span>
                                <span className="font-mono">${portfolio.balance.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                <span className="text-sm text-slate-400">Used Margin</span>
                                <span className="font-mono text-orange-400">${(portfolio.equity - portfolio.availableMargin).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-400">Available</span>
                                <span className="font-mono text-hyper-accent">${portfolio.availableMargin.toFixed(2)}</span>
                            </div>
                        </div>
                     </div>

                     <div className="bg-hyper-card border border-hyper-border rounded-xl p-4 flex-1 overflow-hidden">
                        <TradeLog 
                            trades={[...activeTrades, ...tradeHistory]} 
                            config={config} 
                            onCloseTrade={closeTrade}
                        />
                     </div>
                </div>

            </main>
        </div>
    );
};

export default App;
