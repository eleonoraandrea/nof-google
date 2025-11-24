import { AssetName, OrderBook, Candle } from '../types';

const API_URL = 'https://api.hyperliquid.xyz/info';
const WS_URL = 'wss://api.hyperliquid.xyz/ws';

export interface HLDataSnapshot {
  asset: string;
  price: number;
  prevDayPx: number;
  volume: number;
}

export const fetchHLSnapshot = async (): Promise<Record<string, HLDataSnapshot> | null> => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: "metaAndAssetCtxs" })
    });
    
    if (!response.ok) {
        throw new Error(`HL API Error: ${response.statusText}`);
    }

    const data = await response.json();

    let universe: any[] | undefined;
    let ctxs: any[] | undefined;

    // 1. Try Standard Array Format
    if (Array.isArray(data) && data.length >= 2) {
        universe = data[0];
        ctxs = data[1];
    } 
    // 2. Try Object Format
    else if (typeof data === 'object' && data !== null) {
        universe = (data as any).universe;
        ctxs = (data as any).assetCtxs;
    }

    // 3. Handle Nested Wrapper in Array (e.g. data[0] is { universe: [...] })
    if (!Array.isArray(universe) && typeof universe === 'object' && universe !== null && 'universe' in universe) {
         universe = (universe as any).universe;
    }

    // 4. Validation
    if (!Array.isArray(universe) || !Array.isArray(ctxs)) {
        console.warn("HL Snapshot: Parsing failed. Structure unrecognized.", { 
            isArray: Array.isArray(data), 
            uType: typeof universe, 
            cType: typeof ctxs 
        });
        return null;
    }

    const result: Record<string, HLDataSnapshot> = {};
    
    // 5. Map Data
    universe.forEach((asset: any, index: number) => {
      const ctx = ctxs ? ctxs[index] : null;
      if (asset && asset.name) {
        const price = ctx && ctx.midPx ? parseFloat(ctx.midPx) : 0;
        const prevDayPx = ctx && ctx.prevDayPx ? parseFloat(ctx.prevDayPx) : 0;
        const volume = ctx && ctx.dayNtlVlm ? parseFloat(ctx.dayNtlVlm) : 0;
        
        result[asset.name] = {
          asset: asset.name,
          price: isNaN(price) ? 0 : price,
          prevDayPx: isNaN(prevDayPx) ? 0 : prevDayPx,
          volume: isNaN(volume) ? 0 : volume
        };
      }
    });

    return result;
  } catch (e) {
    console.error("Error fetching HL snapshot:", e);
    return null;
  }
};

export const fetchHLCandles = async (coin: string, interval: string = '15m'): Promise<Candle[]> => {
  try {
    // Calculate start time (e.g., last 2 days)
    const endTime = Date.now();
    const startTime = endTime - (2 * 24 * 60 * 60 * 1000); 

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        type: "candleSnapshot", 
        req: { 
            coin, 
            interval, 
            startTime, 
            endTime 
        } 
      })
    });

    if (!response.ok) return [];
    
    const data = await response.json();
    if (!Array.isArray(data)) return [];

    // HL Candle Format: { t, T, s, i, o, c, h, l, v, n }
    // We map to our Candle interface: { time, open, high, low, close }
    // Lightweight charts expects seconds for time
    return data.map((c: any) => ({
        time: c.t / 1000, 
        open: parseFloat(c.o),
        high: parseFloat(c.h),
        low: parseFloat(c.l),
        close: parseFloat(c.c)
    })).sort((a, b) => a.time - b.time);

  } catch (e) {
    console.error("Error fetching candles:", e);
    return [];
  }
};

export const fetchL2Book = async (coin: string): Promise<OrderBook | null> => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: "l2Book", coin })
    });

    if (!response.ok) return null;
    const data = await response.json();
    const levels = data.levels;

    if (!Array.isArray(levels)) return null;

    const bids: { px: number; sz: number }[] = [];
    const asks: { px: number; sz: number }[] = [];
    
    levels.forEach((l: any) => {
        const px = parseFloat(l.px);
        const sz = parseFloat(l.sz);
        if (l.side === 'B') {
            bids.push({ px, sz });
        } else if (l.side === 'A') {
            asks.push({ px, sz });
        }
    });

    // Sort Bids Descending, Asks Ascending
    bids.sort((a, b) => b.px - a.px);
    asks.sort((a, b) => a.px - b.px);

    return { bids: bids.slice(0, 20), asks: asks.slice(0, 20) };
  } catch (e) {
    console.warn("Failed to fetch L2 Book", e);
    return null;
  }
};

export class HyperliquidStream {
  private ws: WebSocket | null = null;
  private subscribers: ((mids: Record<string, number>) => void)[] = [];
  private shouldReconnect = true;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  connect() {
    this.shouldReconnect = true;
    try {
        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
          console.log('Hyperliquid WS Connected');
          this.ws?.send(JSON.stringify({
            method: "subscribe",
            subscription: { type: "allMids" }
          }));
        };
    
        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.channel === 'allMids') {
              const mids = msg.data.mids;
              const numericMids: Record<string, number> = {};
              for (const key in mids) {
                numericMids[key] = parseFloat(mids[key]);
              }
              this.subscribers.forEach(cb => cb(numericMids));
            }
          } catch (e) {
            console.error("WS Parse error", e);
          }
        };
    
        this.ws.onclose = () => {
          console.log('Hyperliquid WS Closed');
          if (this.shouldReconnect) {
            this.reconnectTimer = setTimeout(() => this.connect(), 2000);
          }
        };

        this.ws.onerror = (err) => {
            console.error("Hyperliquid WS Error:", err);
            this.ws?.close();
        };

    } catch (e) {
        console.error("Failed to connect WS", e);
        if (this.shouldReconnect) {
            this.reconnectTimer = setTimeout(() => this.connect(), 5000);
        }
    }
  }

  subscribe(cb: (mids: Record<string, number>) => void) {
    this.subscribers.push(cb);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== cb);
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }
}