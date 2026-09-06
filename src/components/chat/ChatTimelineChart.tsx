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

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            Activity Timeline
            <span className="text-xs font-normal text-muted-foreground">
              ({points.length} {points.length === 1 ? "interval" : "intervals"})
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
        <div className="relative pt-2 pb-1">
          {/* Subtle horizontal grid lines */}
          <div className="absolute inset-x-0 top-2 h-36 flex flex-col justify-between pointer-events-none z-0">
            <div className="border-b border-border/40 border-dashed w-full" />
            <div className="border-b border-border/40 border-dashed w-full" />
            <div className="border-b border-border/40 border-dashed w-full" />
          </div>

          {/* Bars row */}
          <div className="relative z-10 flex items-end h-36 w-full px-1">
            {points.map((p, i) => {
              const val = p[metricConfig.field];
              const heightPct = maxValue > 0 ? Math.max((val / maxValue) * 100, val > 0 ? 4 : 1) : 1;
              const isHovered = hoveredPoint?.point === p;

              return (
                <div
                  key={i}
                  className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredPoint({
                      point: p,
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                    });
                  }}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  <div
                    className={cn(
                      "w-[85%] min-w-[3px] rounded-t-md transition-all duration-150",
                      metric === "messages" &&
                        "bg-gradient-to-t from-cyan-500/20 via-cyan-500/60 to-cyan-400",
                      metric === "characters" &&
                        "bg-gradient-to-t from-violet-500/20 via-violet-500/60 to-violet-400",
                      metric === "chatters" &&
                        "bg-gradient-to-t from-emerald-500/20 via-emerald-500/60 to-emerald-400",
                      isHovered
                        ? "brightness-125 opacity-100 shadow-sm ring-1 ring-white/20"
                        : "opacity-85 hover:opacity-100"
                    )}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* X-axis time labels (clean HTML typography, never stretched) */}
          <div className="relative w-full h-5 mt-2 px-1 select-none">
            {points.map((p, i) => {
              const step = Math.max(1, Math.ceil(points.length / 6));
              const shouldShow =
                points.length <= 8 ||
                i === 0 ||
                i === points.length - 1 ||
                i % step === 0;

              if (!shouldShow) return null;

              const leftPct = ((i + 0.5) / points.length) * 100;
              const transform =
                leftPct < 5
                  ? "translateX(0%)"
                  : leftPct > 95
                  ? "translateX(-100%)"
                  : "translateX(-50%)";

              return (
                <span
                  key={i}
                  className={cn(
                    "absolute text-[11px] text-muted-foreground/70 whitespace-nowrap font-mono transition-colors",
                    hoveredPoint?.point === p && "text-foreground font-semibold"
                  )}
                  style={{
                    left: `${leftPct}%`,
                    transform,
                  }}
                >
                  {format(new Date(p.bucket_start), "HH:mm")}
                </span>
              );
            })}
          </div>

          {/* Floating tooltip */}
          {hoveredPoint && (
            <div
              className="absolute z-30 pointer-events-none -translate-x-1/2 -top-14 px-3 py-2 rounded-xl bg-popover/95 backdrop-blur-md border border-border shadow-xl text-xs space-y-1"
              style={{
                left: `${Math.max(
                  15,
                  Math.min(
                    85,
                    ((points.indexOf(hoveredPoint.point) + 0.5) / points.length) * 100
                  )
                )}%`,
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
