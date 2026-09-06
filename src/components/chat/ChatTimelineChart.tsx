import { useState, useMemo } from "react";
import type { ChatTimelinePoint } from "@/types/api";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ChatTimelineChartProps {
  timeline: ChatTimelinePoint[];
  isLoading?: boolean;
}

type MetricType = "messages" | "characters" | "chatters";

export default function ChatTimelineChart({
  timeline,
  isLoading,
}: ChatTimelineChartProps) {
  const [metric, setMetric] = useState<MetricType>("messages");
  const [hoveredPoint, setHoveredPoint] = useState<{
    point: ChatTimelinePoint;
    x: number;
    y: number;
  } | null>(null);

  const metricConfig = {
    messages: {
      label: "Messages",
      field: "message_count" as const,
      color: "#06b6d4", // cyan-500
      gradientId: "grad-messages",
    },
    characters: {
      label: "Characters",
      field: "char_count" as const,
      color: "#8b5cf6", // violet-500
      gradientId: "grad-chars",
    },
    chatters: {
      label: "Unique Chatters",
      field: "unique_chatters" as const,
      color: "#10b981", // emerald-500
      gradientId: "grad-chatters",
    },
  }[metric];

  const { points, maxValue, totalMetric } = useMemo(() => {
    if (!timeline || timeline.length === 0) {
      return { points: [], maxValue: 0, totalMetric: 0 };
    }
    const field = metricConfig.field;
    let max = 0;
    let total = 0;
    for (const p of timeline) {
      const val = p[field];
      if (val > max) max = val;
      total += val;
    }
    return { points: timeline, maxValue: max > 0 ? max : 1, totalMetric: total };
  }, [timeline, metricConfig.field]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-36 bg-muted rounded animate-pulse" />
          <div className="h-8 w-48 bg-muted rounded-xl animate-pulse" />
        </div>
        <div className="h-48 w-full bg-muted/30 rounded-xl animate-pulse flex items-end p-4 gap-2">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-muted rounded-t"
              style={{ height: `${20 + ((i * 17) % 70)}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const svgHeight = 180;
  const svgPaddingTop = 20;
  const svgPaddingBottom = 30;
  const usableHeight = svgHeight - svgPaddingTop - svgPaddingBottom;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            Activity Timeline
            <span className="text-xs font-normal text-muted-foreground">
              ({points.length} intervals)
            </span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total {metricConfig.label.toLowerCase()}:{" "}
            <span className="font-semibold text-foreground">
              {totalMetric.toLocaleString()}
            </span>
          </p>
        </div>

        {/* Metric tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-1 self-start sm:self-auto">
          {(["messages", "characters", "chatters"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
                metric === m
                  ? "bg-card text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m === "messages"
                ? "Messages"
                : m === "characters"
                ? "Characters"
                : "Chatters"}
            </button>
          ))}
        </div>
      </div>

      {/* Chart container */}
      {points.length === 0 ? (
        <div className="h-44 flex flex-col items-center justify-center text-center text-muted-foreground text-xs">
          <p>No activity points recorded in this period</p>
        </div>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${Math.max(points.length * 16, 400)} ${svgHeight}`}
            className="w-full h-44 overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="grad-messages" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.15" />
              </linearGradient>
              <linearGradient id="grad-chars" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.15" />
              </linearGradient>
              <linearGradient id="grad-chatters" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.15" />
              </linearGradient>
            </defs>

            {/* Subtle horizontal grid lines */}
            {[0, 0.5, 1].map((pct) => {
              const y = svgPaddingTop + usableHeight * (1 - pct);
              return (
                <line
                  key={pct}
                  x1="0"
                  y1={y}
                  x2={Math.max(points.length * 16, 400)}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.08"
                  strokeDasharray="4 4"
                />
              );
            })}

            {/* Bars */}
            {points.map((p, i) => {
              const totalWidth = Math.max(points.length * 16, 400);
              const barSlotWidth = totalWidth / points.length;
              const barWidth = Math.max(barSlotWidth * 0.7, 4);
              const x = i * barSlotWidth + (barSlotWidth - barWidth) / 2;

              const val = p[metricConfig.field];
              const height = (val / maxValue) * usableHeight;
              const y = svgPaddingTop + (usableHeight - height);
              const isHovered = hoveredPoint?.point === p;

              return (
                <g key={i}>
                  {/* Interactive invisible hover hit area */}
                  <rect
                    x={i * barSlotWidth}
                    y={0}
                    width={barSlotWidth}
                    height={svgHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredPoint({
                        point: p,
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                      });
                    }}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                  {/* Visible bar */}
                  <rect
                    x={x}
                    y={height > 0 ? y : svgPaddingTop + usableHeight - 1}
                    width={barWidth}
                    height={Math.max(height, 1)}
                    rx={Math.min(barWidth / 2, 3)}
                    fill={`url(#${metricConfig.gradientId})`}
                    className={cn(
                      "transition-all duration-150 pointer-events-none",
                      isHovered ? "opacity-100 filter brightness-125" : "opacity-85"
                    )}
                  />
                  {/* X-axis time label (every ~6-8 bars or first/last) */}
                  {(i === 0 ||
                    i === points.length - 1 ||
                    (points.length > 10 && i % Math.ceil(points.length / 5) === 0)) && (
                    <text
                      x={x + barWidth / 2}
                      y={svgHeight - 8}
                      textAnchor="middle"
                      fill="currentColor"
                      className="text-[9px] fill-muted-foreground/60 select-none pointer-events-none"
                    >
                      {format(new Date(p.bucket_start), "HH:mm")}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Floating tooltip */}
          {hoveredPoint && (
            <div
              className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full mb-2 px-3 py-2 rounded-xl bg-popover/95 backdrop-blur-md border border-border shadow-xl text-xs space-y-1"
              style={{
                left: `${
                  (points.indexOf(hoveredPoint.point) / points.length) * 100 +
                  (1 / points.length) * 50
                }%`,
                top: 0,
              }}
            >
              <p className="font-semibold text-foreground text-[11px]">
                {format(
                  new Date(hoveredPoint.point.bucket_start),
                  "dd MMM yyyy · HH:mm"
                )}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                  {hoveredPoint.point.message_count.toLocaleString()} msgs
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
                  {hoveredPoint.point.char_count.toLocaleString()} chars
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  {hoveredPoint.point.unique_chatters.toLocaleString()} users
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
