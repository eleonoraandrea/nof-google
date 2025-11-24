import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AssetName, MarketData, NewsItem, Trade, TradeSide, AIAnalysisResult } from "../types";

// Safety check for API Key
const apiKey = process.env.API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Schema for structured JSON output for Market Analysis
const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    decision: {
      type: Type.STRING,
      enum: [TradeSide.LONG, TradeSide.SHORT, TradeSide.WAIT],
      description: "The trading decision based on analysis."
    },
    leverage: {
      type: Type.INTEGER,
      description: "Recommended leverage, strictly between 1 and 5.",
    },
    confidence: {
      type: Type.INTEGER,
      description: "Confidence score between 0 and 100."
    },
    reasoning: {
      type: Type.STRING,
      description: "Brief explanation of the decision (< 50 words)."
    },
    suggestedStopLoss: {
      type: Type.NUMBER,
      description: "Suggested stop loss price."
    },
    suggestedTakeProfit: {
      type: Type.NUMBER,
      description: "Suggested take profit price."
    }
  },
  required: ["decision", "leverage", "confidence", "reasoning"],
};

// Schema for News Sentiment Analysis
const sentimentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    sentiment: {
      type: Type.STRING,
      enum: ['BULLISH', 'BEARISH', 'NEUTRAL']
    },
    score: {
      type: Type.NUMBER,
      description: "Precise sentiment score between -1.0 (Catastrophic/Bearish) and 1.0 (Euphoric/Bullish). Use decimals for nuance (e.g., 0.65)."
    },
    reasoning: {
        type: Type.STRING,
        description: "Short analytic reasoning for the assigned score."
    }
  },
  required: ["sentiment", "score", "reasoning"]
};

// Expanded Sentiment Dictionary for Local NLP Fallback
// Values represent impact weight (-1.0 to 1.0)
const SENTIMENT_DICTIONARY: Record<string, number> = {
    // Bullish Terms
    'surge': 0.6, 'jump': 0.5, 'soar': 0.7, 'rally': 0.6, 'record': 0.5, 'high': 0.4, 'gain': 0.4, 'green': 0.3,
    'bull': 0.5, 'bullish': 0.6, 'adoption': 0.6, 'approve': 0.8, 'approval': 0.8, 'etf': 0.5,
    'launch': 0.4, 'mainnet': 0.5, 'partnership': 0.4, 'growth': 0.3, 'accumulate': 0.4,
    'buy': 0.3, 'long': 0.2, 'support': 0.3, 'upgrade': 0.4, 'breakthrough': 0.7, 'influx': 0.5,
    'cut': 0.4, // rate cut
    'burn': 0.5, 'halving': 0.6, 'stimulus': 0.5, 'legal': 0.2, 'win': 0.5,

    // Bearish Terms
    'crash': -0.8, 'dump': -0.7, 'drop': -0.5, 'fall': -0.4, 'bear': -0.5, 'bearish': -0.6,
    'ban': -0.9, 'regulation': -0.4, 'sue': -0.7, 'lawsuit': -0.6, 'sec': -0.3, 'delay': -0.4,
    'hack': -0.95, 'exploit': -0.95, 'risk': -0.3, 'warn': -0.4, 'sell': -0.5, 'short': -0.3,
    'down': -0.3, 'resistance': -0.3, 'liquidate': -0.6, 'insolvent': -0.95, 'fail': -0.8,
    'hike': -0.5, // rate hike
    'inflation': -0.4, 'investigation': -0.6, 'fraud': -0.9, 'delist': -0.8
};

/**
 * Enhanced Local Fallback for Sentiment Analysis
 * Used when API quota is exhausted (429) or offline.
 * Implements a weighted "Bag of Words" approach with negation handling.
 */
const localSentimentAnalysis = (headline: string): { sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL', score: number } => {
    // Tokenize: remove punctuation, split by whitespace, lowercase
    const tokens = headline.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    
    let totalScore = 0;
    let wordCount = 0;
    
    // Simple negation context (e.g., "not banning")
    let negationActive = false;

    tokens.forEach((word) => {
        // Check for negations
        if (['not', 'no', 'never', "don't", "won't", "prevent"].includes(word)) {
            negationActive = true;
            return;
        }

        if (SENTIMENT_DICTIONARY[word] !== undefined) {
            let val = SENTIMENT_DICTIONARY[word];
            
            // Apply negation logic
            if (negationActive) {
                val = -val * 0.6; // Flip polarity and reduce impact (e.g. "not bad" != "good", it's just mildly positive)
                negationActive = false; // Reset after application
            }
            
            totalScore += val;
            wordCount++;
        } else {
            // Reset negation if we hit a non-sentiment word? 
            // For simplicity in this heuristic, we let negation persist for one non-sentiment word then reset
            // but effectively, we just reset it here to avoid "not" applying to a word 5 tokens away.
            if (negationActive) negationActive = false; 
        }
    });

    // Intensifiers
    if (headline.includes('!')) totalScore *= 1.1;
    if (headline.toUpperCase() === headline) totalScore *= 1.1; // All caps

    // Clamp score to -1 to 1
    let finalScore = Math.max(-1.0, Math.min(1.0, totalScore));

    // Thresholds for classification
    let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (finalScore >= 0.15) sentiment = 'BULLISH';
    else if (finalScore <= -0.15) sentiment = 'BEARISH';

    return { sentiment, score: finalScore };
};

export const analyzeNewsSentiment = async (headline: string): Promise<{ sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL', score: number }> => {
    if (!ai) return localSentimentAnalysis(headline);
    
    try {
        const prompt = `
            Role: Expert Crypto Sentiment Analyst.
            Task: Analyze the provided news headline and assign a sentiment score.
            
            Headline: "${headline}"
            
            Instructions:
            1. Analyze the semantic meaning, considering crypto market context (e.g., 'burn' is good, 'fork' depends, 'hack' is bad).
            2. Determine the potential impact on price action.
            3. Assign a score from -1.0 (Maximum Negative Impact / Bearish) to 1.0 (Maximum Positive Impact / Bullish).
            4. 0 is perfectly neutral.
            5. Be precise with decimals (e.g., 0.15, -0.85).
            
            Return JSON matching the schema.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: sentimentSchema,
                temperature: 0.1 // Low temperature for consistent scoring
            }
        });
        const text = response.text;
        if (!text) return localSentimentAnalysis(headline);
        return JSON.parse(text);
    } catch (error: any) {
        // Handle Rate Limits gracefully
        if (error.status === 429 || error.message?.includes('429') || error.toString().includes('Quota')) {
            console.warn("Gemini API Quota Exceeded (Sentiment) - Using Local NLP Fallback");
            return localSentimentAnalysis(headline);
        }
        console.error("Sentiment analysis failed", error);
        return localSentimentAnalysis(headline);
    }
};

export const analyzeMarket = async (
  market: MarketData,
  news: NewsItem[],
  fearIndex: number,
  recentTrades: Trade[],
  equity: number,
  modelName: string = 'gemini-2.5-flash'
): Promise<AIAnalysisResult> => {
  if (!ai) {
    // Mock response if no API key
    return {
      decision: TradeSide.WAIT,
      leverage: 1,
      confidence: 0,
      reasoning: "API Key missing. Simulation paused."
    };
  }

  // Reinforcement Learning Context: Feed past performance
  const last3Trades = recentTrades.slice(0, 3).map(t => 
    `${t.side} on ${t.asset} resulted in ${t.pnl && t.pnl > 0 ? 'WIN' : 'LOSS'} (${t.pnl?.toFixed(2)})`
  ).join("; ");

  const prompt = `
    Role: Senior Crypto Quantitative Trader on Hyperliquid.
    Task: Analyze the following data for ${market.asset} and decide on a trade.
    
    Current State:
    - Price: $${market.price.toFixed(2)}
    - 24h Change: ${market.change24h.toFixed(2)}%
    - RSI (14): ${market.rsi.toFixed(2)}
    - Fear & Greed Index: ${fearIndex}/100
    - Portfolio Equity: $${equity.toFixed(2)}

    Recent News:
    ${news.slice(0, 3).map(n => `- ${n.headline} (${n.sentiment} / Score: ${n.score})`).join('\n')}

    Learning Context (Your recent history):
    ${last3Trades || "No recent trades."}

    Constraints:
    - MAX Leverage: 5x (Strict limit).
    - Risk Management: Prioritize capital preservation.
    - If RSI > 75, consider overbought. If RSI < 25, consider oversold.
    - If Fear Index < 20 (Extreme Fear), look for value buys. If > 80 (Extreme Greed), be cautious.

    Output pure JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: analysisSchema,
        temperature: 0.2 // Low temperature for more analytical/determistic results
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    return JSON.parse(text) as AIAnalysisResult;

  } catch (e: any) {
    if (e.status === 429 || e.message?.includes('429') || e.toString().includes('Quota')) {
        console.warn("Gemini API Quota Exceeded (Market Analysis) - Pausing");
        return {
            decision: TradeSide.WAIT,
            leverage: 1,
            confidence: 0,
            reasoning: "API Rate Limit Hit. Waiting for quota reset."
        };
    }
    console.error("Gemini Analysis Failed:", e);
    return {
      decision: TradeSide.WAIT,
      leverage: 1,
      confidence: 0,
      reasoning: "Analysis failed due to API error."
    };
  }
};