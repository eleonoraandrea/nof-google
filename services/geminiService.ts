
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AssetName, MarketData, NewsItem, Trade, TradeSide, AIAnalysisResult, TradeConfig } from "../types";

// --- Configuration & Clients ---
const defaultApiKey = process.env.API_KEY || '';

// --- Schemas ---
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

const sentimentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    sentiment: {
      type: Type.STRING,
      enum: ['BULLISH', 'BEARISH', 'NEUTRAL']
    },
    score: {
      type: Type.NUMBER,
      description: "Precise sentiment score between -1.0 (Catastrophic/Bearish) and 1.0 (Euphoric/Bullish)."
    },
    reasoning: {
        type: Type.STRING,
        description: "Short analytic reasoning for the assigned score."
    }
  },
  required: ["sentiment", "score", "reasoning"]
};

// --- Local NLP Fallback ---
const SENTIMENT_DICTIONARY: Record<string, number> = {
    'surge': 0.6, 'jump': 0.5, 'soar': 0.7, 'rally': 0.6, 'record': 0.5, 'high': 0.4, 'gain': 0.4, 'green': 0.3,
    'bull': 0.5, 'bullish': 0.6, 'adoption': 0.6, 'approve': 0.8, 'approval': 0.8, 'etf': 0.5,
    'launch': 0.4, 'mainnet': 0.5, 'partnership': 0.4, 'growth': 0.3, 'accumulate': 0.4,
    'buy': 0.3, 'long': 0.2, 'support': 0.3, 'upgrade': 0.4, 'breakthrough': 0.7, 'influx': 0.5,
    'cut': 0.4, 'burn': 0.5, 'halving': 0.6, 'stimulus': 0.5, 'legal': 0.2, 'win': 0.5,
    'crash': -0.8, 'dump': -0.7, 'drop': -0.5, 'fall': -0.4, 'bear': -0.5, 'bearish': -0.6,
    'ban': -0.9, 'regulation': -0.4, 'sue': -0.7, 'lawsuit': -0.6, 'sec': -0.3, 'delay': -0.4,
    'hack': -0.95, 'exploit': -0.95, 'risk': -0.3, 'warn': -0.4, 'sell': -0.5, 'short': -0.3,
    'down': -0.3, 'resistance': -0.3, 'liquidate': -0.6, 'insolvent': -0.95, 'fail': -0.8,
    'hike': -0.5, 'inflation': -0.4, 'investigation': -0.6, 'fraud': -0.9, 'delist': -0.8
};

const localSentimentAnalysis = (headline: string): { sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL', score: number } => {
    const tokens = headline.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    let totalScore = 0;
    let negationActive = false;
    tokens.forEach((word) => {
        if (['not', 'no', 'never', "don't", "won't", "prevent"].includes(word)) {
            negationActive = true;
            return;
        }
        if (SENTIMENT_DICTIONARY[word] !== undefined) {
            let val = SENTIMENT_DICTIONARY[word];
            if (negationActive) {
                val = -val * 0.6;
                negationActive = false;
            }
            totalScore += val;
        } else {
            if (negationActive) negationActive = false; 
        }
    });
    if (headline.includes('!')) totalScore *= 1.1;
    let finalScore = Math.max(-1.0, Math.min(1.0, totalScore));
    let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (finalScore >= 0.15) sentiment = 'BULLISH';
    else if (finalScore <= -0.15) sentiment = 'BEARISH';
    return { sentiment, score: finalScore };
};

// --- Generic API Helper for OpenRouter / Ollama ---
const fetchOpenAICompatible = async (
    url: string, 
    model: string, 
    apiKey: string, 
    systemPrompt: string, 
    userPrompt: string,
    jsonMode: boolean = true
): Promise<any> => {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                // OpenRouter specific headers
                'HTTP-Referer': 'https://neuroliquid.app', 
                'X-Title': 'NeuroLiquid AI Trader'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.2,
                // Some local models (Ollama) or specific providers might not support response_format strict JSON
                response_format: jsonMode ? { type: "json_object" } : undefined 
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`API Error: ${response.status} ${err}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (!content) throw new Error("Empty response from model");
        
        // Clean markdown code blocks if present (common in deepseek/llama)
        const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(jsonStr);

    } catch (e) {
        console.error("Fetch OpenAI-compatible failed", e);
        throw e;
    }
};

// --- Public Methods ---

export const analyzeNewsSentiment = async (headline: string, config?: TradeConfig): Promise<{ sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL', score: number, reasoning?: string }> => {
    // If no config provided, fallback to local
    if (!config) return localSentimentAnalysis(headline);

    const systemPrompt = `Role: Expert Crypto Sentiment Analyst. 
    Task: Analyze the headline and assign a sentiment score.
    Output: JSON with keys "sentiment" (BULLISH/BEARISH/NEUTRAL), "score" (-1.0 to 1.0), and "reasoning".`;
    
    const userPrompt = `Headline: "${headline}"`;

    // 1. OpenRouter
    if (config.aiProvider === 'OPENROUTER') {
        if (!config.openRouterApiKey) return localSentimentAnalysis(headline);
        try {
            return await fetchOpenAICompatible(
                'https://openrouter.ai/api/v1/chat/completions',
                config.openRouterModel || 'deepseek/deepseek-r1',
                config.openRouterApiKey,
                systemPrompt,
                userPrompt
            );
        } catch (e) {
            return localSentimentAnalysis(headline);
        }
    }

    // 2. Ollama
    if (config.aiProvider === 'OLLAMA') {
         const baseUrl = config.ollamaBaseUrl || 'http://localhost:11434';
         const url = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
         try {
            return await fetchOpenAICompatible(
                url,
                config.ollamaModel || 'llama3',
                'ollama',
                systemPrompt,
                userPrompt
            );
         } catch (e) {
             return localSentimentAnalysis(headline);
         }
    }

    // 3. Gemini
    if (config.aiProvider === 'GEMINI') {
        const apiKey = config.geminiApiKey || defaultApiKey;
        if (!apiKey) return localSentimentAnalysis(headline);

        const genAI = new GoogleGenAI({ apiKey });
        try {
            const response = await genAI.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: userPrompt,
                config: {
                    systemInstruction: systemPrompt,
                    responseMimeType: 'application/json',
                    responseSchema: sentimentSchema,
                    temperature: 0.1
                }
            });
            const text = response.text;
            if (!text) return localSentimentAnalysis(headline);
            return JSON.parse(text);
        } catch (error) {
            return localSentimentAnalysis(headline);
        }
    }

    return localSentimentAnalysis(headline);
};

export const analyzeMarket = async (
  market: MarketData,
  news: NewsItem[],
  fearIndex: number,
  recentTrades: Trade[],
  equity: number,
  config: TradeConfig
): Promise<AIAnalysisResult> => {

  // Reinforcement Learning Context
  const last3Trades = recentTrades.slice(0, 3).map(t => 
    `${t.side} on ${t.asset} resulted in ${t.pnl && t.pnl > 0 ? 'WIN' : 'LOSS'} (${t.pnl?.toFixed(2)})`
  ).join("; ");

  const systemPrompt = `Role: Senior Crypto Quantitative Trader. 
  Task: Analyze market data and output strictly valid JSON.
  Response Schema: { "decision": "LONG"|"SHORT"|"WAIT", "leverage": int(1-5), "confidence": int(0-100), "reasoning": string, "suggestedStopLoss": number, "suggestedTakeProfit": number }`;

  const userPrompt = `
    Analyze data for ${market.asset}.
    Price: $${market.price.toFixed(2)} | 24h: ${market.change24h.toFixed(2)}%
    RSI: ${market.rsi.toFixed(2)} | Fear&Greed: ${fearIndex}
    Equity: $${equity.toFixed(2)}
    
    News:
    ${news.slice(0, 3).map(n => `- ${n.headline} (${n.score})`).join('\n')}

    Recent Trades: ${last3Trades || "None"}

    Constraints:
    - MAX Leverage: 5x.
    - Risk Averse.
    - RSI > 75 Overbought, < 25 Oversold.
  `;

  // --- OPENROUTER PROVIDER ---
  if (config.aiProvider === 'OPENROUTER') {
      if (!config.openRouterApiKey) return { decision: TradeSide.WAIT, leverage: 1, confidence: 0, reasoning: "OpenRouter Key Missing" };
      return fetchOpenAICompatible(
          'https://openrouter.ai/api/v1/chat/completions',
          config.openRouterModel || 'deepseek/deepseek-r1',
          config.openRouterApiKey,
          systemPrompt,
          userPrompt
      );
  }

  // --- OLLAMA PROVIDER ---
  if (config.aiProvider === 'OLLAMA') {
      const baseUrl = config.ollamaBaseUrl || 'http://localhost:11434';
      const url = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
      return fetchOpenAICompatible(
          url,
          config.ollamaModel || 'llama3',
          'ollama',
          systemPrompt,
          userPrompt
      );
  }

  // --- GEMINI PROVIDER (Default) ---
  // Only executed if provider is GEMINI
  if (config.aiProvider === 'GEMINI') {
      const apiKey = config.geminiApiKey || defaultApiKey;
      if (!apiKey) {
          return { decision: TradeSide.WAIT, leverage: 1, confidence: 0, reasoning: "Gemini API Key Missing" };
      }
      
      const genAI = new GoogleGenAI({ apiKey });

      try {
        const response = await genAI.models.generateContent({
            model: config.aiModel || 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: 'application/json',
                responseSchema: analysisSchema,
                temperature: 0.2
            }
        });
        const text = response.text;
        if(!text) throw new Error("Empty response");
        return JSON.parse(text) as AIAnalysisResult;
      } catch (e: any) {
         console.error("Gemini Error:", e);
         // Fallback
         if (e.status === 429) return { decision: TradeSide.WAIT, leverage: 1, confidence: 0, reasoning: "Gemini Quota Exceeded" };
         throw e;
      }
  }

  return { decision: TradeSide.WAIT, leverage: 1, confidence: 0, reasoning: "Unknown Provider" };
};
