
export enum TradeSide {
  LONG = 'LONG',
  SHORT = 'SHORT',
  WAIT = 'WAIT'
}

export enum AssetName {
  BTC = 'BTC',
  ETH = 'ETH',
  SOL = 'SOL',
  HYPE = 'HYPE',
  ARB = 'ARB'
}

export interface OrderBook {
  bids: { px: number; sz: number }[];
  asks: { px: number; sz: number }[];
}

export interface MarketData {
  asset: string;
  price: number;
  change24h: number;
  rsi: number;
  volume: number;
  high24h: number;
  low24h: number;
  depth?: OrderBook;
}

export interface TradeConfig {
  assets: string[];
  maxLeverage: number;
  riskPerTrade: number;
  stopLossPct: number;
  takeProfitPct: number;
  aiModel: string;
  analysisIntervalMins: number; // New setting
  
  // Telegram Configuration
  telegramBotToken?: string;
  telegramChatId?: string;
  notificationsEnabled: boolean;

  // Real Trading Configuration
  executionMode: 'SIMULATION' | 'REAL';
  walletPrivateKey?: string;
  walletAddress?: string;
}

export interface Trade {
  id: string;
  asset: string;
  entryPrice: number;
  exitPrice?: number;
  side: TradeSide;
  size: number;
  leverage: number;
  pnl?: number;
  fees?: number;
  timestamp: number;
  status: 'OPEN' | 'CLOSED';
  reasoning: string;
  aiConfidence: number;
  marketSnapshot?: {
    rsi: number;
    fearIndex: number;
    newsScore: number;
  };
}

export interface NewsItem {
  id: string;
  headline: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  score?: number;
  timestamp: number;
  source: string;
}

export interface Portfolio {
  balance: number;
  equity: number;
  availableMargin: number;
}

export interface AIAnalysisResult {
  decision: TradeSide;
  leverage: number;
  confidence: number;
  reasoning: string;
  suggestedStopLoss?: number;
  suggestedTakeProfit?: number;
}

export interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}
