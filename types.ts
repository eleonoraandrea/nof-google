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
  asset: string; // Changed from AssetName to string
  price: number;
  change24h: number;
  rsi: number; // Mock technical indicator
  volume: number;
  high24h: number;
  low24h: number;
  depth?: OrderBook;
}

export interface TradeConfig {
  assets: string[]; // Changed from AssetName[] to string[]
  maxLeverage: number; // Max 5x
  riskPerTrade: number; // % of portfolio
  stopLossPct: number;
  takeProfitPct: number;
  aiModel: string;
}

export interface Trade {
  id: string;
  asset: string; // Changed from AssetName to string
  entryPrice: number;
  exitPrice?: number;
  side: TradeSide;
  size: number; // In USD (Margin)
  leverage: number;
  pnl?: number; // Net PnL (after fees)
  fees?: number; // Total fees paid/estimated
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
  score?: number; // -1 (Bearish) to 1 (Bullish)
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
    time: number; // Unix timestamp in seconds for lightweight-charts
    open: number;
    high: number;
    low: number;
    close: number;
}