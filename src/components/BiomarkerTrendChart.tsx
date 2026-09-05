"use client";

import React, { useState } from "react";
import { TrendingUp, FileText, Calendar, Filter, Sparkles, HelpCircle } from "lucide-react";
import type { LongitudinalTrend, LongitudinalDataPoint } from "@/lib/types";

interface BiomarkerTrendChartProps {
  trends: LongitudinalTrend[];
  onSelectPoint?: (point: LongitudinalDataPoint) => void;
}

type TimePeriod = "1m" | "6m" | "1y" | "all";

export function BiomarkerTrendChart({ trends, onSelectPoint }: BiomarkerTrendChartProps) {
  const [selectedKey, setSelectedKey] = useState<string>(
    trends.find((t) => t.hasSufficientData)?.biomarkerKey || trends[0]?.biomarkerKey || ""
  );
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all");

  const currentTrend = trends.find((t) => t.biomarkerKey === selectedKey) || trends[0];

  if (!currentTrend || trends.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
        <TrendingUp className="w-8 h-8 text-slate-300 mx-auto" />
        <h4 className="text-sm font-semibold text-slate-700">Longitudinal Biomarker Trends</h4>
        <p className="text-xs text-slate-500">
          Upload medical reports with laboratory tests to view chronological biomarker progression.
        </p>
      </div>
    );
  }

  // Filter points by selected time period
  const now = new Date().getTime();
  const filteredPoints = currentTrend.points.filter((pt) => {
    if (timePeriod === "all") return true;
    const ptTime = new Date(pt.date).getTime();
    if (isNaN(ptTime)) return true;
    const diffDays = (now - ptTime) / (1000 * 60 * 60 * 24);
    if (timePeriod === "1m") return diffDays <= 31;
    if (timePeriod === "6m") return diffDays <= 183;
    if (timePeriod === "1y") return diffDays <= 366;
    return true;
  });

  const hasEnoughData = filteredPoints.length >= 2;

  // Compute SVG chart coordinates
  const values = filteredPoints.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const paddingY = range * 0.15;
  const chartMin = Math.max(0, minVal - paddingY);
  const chartMax = maxVal + paddingY;
  const chartRange = chartMax - chartMin || 1;

  const width = 560;
  const height = 180;
  const padX = 40;
  const padBottom = 30;
  const padTop = 20;

  const getX = (index: number) => {
    if (filteredPoints.length === 1) return width / 2;
    return padX + (index / (filteredPoints.length - 1)) * (width - padX * 2);
  };

  const getY = (val: number) => {
    const norm = (val - chartMin) / chartRange;
    return height - padBottom - norm * (height - padTop - padBottom);
  };

  const pathD = filteredPoints
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(pt.value)}`)
    .join(" ");

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-700" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Visual Health Trends
            </h3>
            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200">
              {currentTrend.coverage}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Repeated quantitative measurements tracked across verified source documents
          </p>
        </div>

        {/* Controls: Biomarker Selector & Period Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={currentTrend.biomarkerKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800"
          >
            {trends.map((t) => (
              <option key={t.biomarkerKey} value={t.biomarkerKey}>
                {t.displayName} ({t.points.length} record{t.points.length === 1 ? "" : "s"})
              </option>
            ))}
          </select>

          {/* Time Period Filter */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold">
            {(["1m", "6m", "1y", "all"] as TimePeriod[]).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setTimePeriod(period)}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  timePeriod === period
                    ? "bg-white text-teal-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {period === "1m" ? "1M" : period === "6m" ? "6M" : period === "1y" ? "1Y" : "All"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CHART OR EMPTY STATE */}
      {!hasEnoughData ? (
        <div className="py-10 px-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
          <HelpCircle className="w-7 h-7 text-slate-400 mx-auto" />
          <h4 className="text-xs font-bold text-slate-800">
            More records are needed to display a trend.
          </h4>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            {filteredPoints.length === 1
              ? `Currently ${currentTrend.displayName} is documented in only 1 report (${filteredPoints[0].date}: ${filteredPoints[0].value} ${currentTrend.unit}). Upload another record with this test to generate a longitudinal trend.`
              : `No data points match the selected time filter. Switch to 'All' to view historical records.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 select-none">
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f766e" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#0f766e" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line
                x1={padX}
                y1={getY(chartMin)}
                x2={width - padX}
                y2={getY(chartMin)}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <line
                x1={padX}
                y1={getY((chartMin + chartMax) / 2)}
                x2={width - padX}
                y2={getY((chartMin + chartMax) / 2)}
                stroke="#f1f5f9"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <line
                x1={padX}
                y1={getY(chartMax)}
                x2={width - padX}
                y2={getY(chartMax)}
                stroke="#e2e8f0"
                strokeWidth="1"
              />

              {/* Area fill */}
              <path
                d={`${pathD} L ${getX(filteredPoints.length - 1)} ${height - padBottom} L ${getX(0)} ${
                  height - padBottom
                } Z`}
                fill="url(#trendGradient)"
              />

              {/* Trend Line */}
              <path
                d={pathD}
                fill="none"
                stroke="#0f766e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Interactive Data Points */}
              {filteredPoints.map((pt, i) => {
                const cx = getX(i);
                const cy = getY(pt.value);
                const isOutOfRange = pt.status === "low" || pt.status === "high";

                return (
                  <g
                    key={i}
                    onClick={() => onSelectPoint && onSelectPoint(pt)}
                    className="cursor-pointer group"
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r="5"
                      fill={isOutOfRange ? "#e11d48" : "#0f766e"}
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="transition-transform group-hover:scale-125"
                    />
                    {/* Value Label */}
                    <text
                      x={cx}
                      y={cy - 10}
                      textAnchor="middle"
                      className="text-[10px] font-mono font-bold fill-slate-800"
                    >
                      {pt.value}
                    </text>
                    {/* Date label */}
                    <text
                      x={cx}
                      y={height - 10}
                      textAnchor="middle"
                      className="text-[9px] font-mono fill-slate-400"
                    >
                      {pt.date}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span>
              Click any point on the graph to inspect its source report in <strong>Evidence Passport</strong>.
            </span>
            <span className="font-semibold text-slate-700">
              Unit: {currentTrend.unit || "standard"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
