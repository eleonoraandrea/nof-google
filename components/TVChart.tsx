import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries } from 'lightweight-charts';
import { Candle } from '../types';

interface Props {
  data: Candle[];
  currentCandle: Candle | null;
  colors?: {
    backgroundColor?: string;
    lineColor?: string;
    textColor?: string;
    areaTopColor?: string;
    areaBottomColor?: string;
  };
}

const TVChart: React.FC<Props> = ({ 
    data, 
    currentCandle,
    colors 
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const backgroundColor = colors?.backgroundColor || '#15171e'; // matching hyper-card
  const textColor = colors?.textColor || '#888888';

  // Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    chartRef.current = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      grid: {
        vertLines: { color: '#2a2e37' },
        horzLines: { color: '#2a2e37' },
      },
      timeScale: {
        borderColor: '#2a2e37',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#2a2e37',
      },
      crosshair: {
          mode: 1 // Magnet
      }
    });

    // V5 API: Use addSeries with the Series Class
    seriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
      upColor: '#00e599',
      downColor: '#ff4d4d',
      borderVisible: false,
      wickUpColor: '#00e599',
      wickDownColor: '#ff4d4d',
    });

    // Set Initial Data
    if (data.length > 0) {
        seriesRef.current.setData(data);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [backgroundColor, textColor]); 

  // Update Data when 'data' prop changes significantly (e.g. asset switch)
  useEffect(() => {
      if (seriesRef.current && data.length > 0) {
          seriesRef.current.setData(data);
          chartRef.current?.timeScale().fitContent();
      }
  }, [data]);

  // Update Real-time Candle
  useEffect(() => {
      if (seriesRef.current && currentCandle) {
          seriesRef.current.update(currentCandle);
      }
  }, [currentCandle]);

  return (
    <div ref={chartContainerRef} className="w-full h-full" />
  );
};

export default TVChart;