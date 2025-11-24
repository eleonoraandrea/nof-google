import { NewsItem } from "../types";

const NEWS_SOURCES = ["CoinDesk", "The Block", "CryptoTwitter", "Bloomberg", "Hyperliquid Blog"];
const HEADLINES = [
  "SEC delays ETF decision again, markets jittery.",
  "Hyperliquid volume surpasses Uniswap for the first time.",
  "Whale moves 5000 BTC to exchange, dump incoming?",
  "Fed signals rate cuts in next quarter.",
  "Solana network experiences brief congestion.",
  "New AI token rallies 400% overnight.",
  "Bitcoin miner reserves hit 3-year low.",
  "HYPE token listing brings massive liquidity influx."
];

export const getMockNews = (): NewsItem => {
  const headline = HEADLINES[Math.floor(Math.random() * HEADLINES.length)];
  const isGood = Math.random() > 0.5;
  return {
    id: Math.random().toString(36).substring(2, 11),
    headline,
    sentiment: isGood ? 'BULLISH' : 'BEARISH',
    timestamp: Date.now(),
    source: NEWS_SOURCES[Math.floor(Math.random() * NEWS_SOURCES.length)]
  };
};

export const getFearAndGreed = (): number => {
  // Simulating a drifting value around 50
  const base = 50;
  return Math.floor(base + (Math.random() * 20 - 10));
};

// Simulate RSI movement based on price action since we don't have full history
export const simulateRsi = (currentRsi: number, currentPrice: number, prevPrice: number): number => {
    const change = (currentPrice - prevPrice) / prevPrice;
    // If price up, RSI up. If price down, RSI down.
    // Damping factor to prevent it from swinging too wild
    const delta = change * 1000; 
    let newRsi = currentRsi + delta;
    
    // Mean reversion drift
    if (newRsi > 60) newRsi -= 0.1;
    if (newRsi < 40) newRsi += 0.1;

    return Math.max(10, Math.min(90, newRsi));
};