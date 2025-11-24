import { Candle } from '../types';

export const calculateRSI = (candles: Candle[], period: number = 14): number => {
  if (candles.length < period + 1) return 50;

  // Extract closing prices
  const closes = candles.map(c => c.close);
  
  let gains = 0;
  let losses = 0;

  // Calculate initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Smooth the following values (Wilder's Smoothing)
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    let gain = 0;
    let loss = 0;

    if (change >= 0) gain = change;
    else loss = Math.abs(change);

    avgGain = ((avgGain * (period - 1)) + gain) / period;
    avgLoss = ((avgLoss * (period - 1)) + loss) / period;
  }

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};