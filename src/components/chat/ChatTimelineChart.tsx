import { useMemo, useRef, useState } from "react";
import type { ChatTimelinePoint } from "@/types/api";
import { useCopy } from "@/lib/useCopy";

type Metric = "message_count" | "char_count" | "unique_chatters";
export default function ChatTimelineChart({
  timeline,
  bucketHours = 6,
  timeWindowHours,
  asOf,
}: {
  timeline: ChatTimelinePoint[];
  bucketHours?: number | null;
  timeWindowHours?: number | null;
  asOf: number;
}) {
  const c = useCopy();
  const [metric, setMetric] = useState<Metric>("message_count");
  const [activeOnly, setActiveOnly] = useState(false);
  const [selected, setSelected] = useState(0);
  const bars = useRef<HTMLDivElement>(null);
  const points = useMemo(() => {
    const step = Math.max(1, bucketHours || 6) * 3600000;
    const available = timeline
      .filter((p) => Number.isFinite(Date.parse(p.bucket_start)))
      .sort((a, b) => a.bucket_start.localeCompare(b.bucket_start));
    if (!available.length || activeOnly) return available;
    const end = Math.max(
      Math.floor(asOf / step) * step,
      Math.floor(
        Date.parse(available[available.length - 1].bucket_start) / step,
      ) * step,
    );
    const beginning = timeWindowHours
      ? end - (timeWindowHours * 3600000 - step)
      : Date.parse(available[0].bucket_start);
    const start = Math.max(
      Math.floor(beginning / step) * step,
      end - 349 * step,
    );
    const byTime = new Map(
      available.map((point) => [
        Math.floor(Date.parse(point.bucket_start) / step) * step,
        point,
      ]),
    );
    const result: ChatTimelinePoint[] = [];
    for (let time = start; time <= end; time += step)
      result.push(
        byTime.get(time) || {
          bucket_start: new Date(time).toISOString(),
          message_count: 0,
          char_count: 0,
          unique_chatters: 0,
        },
      );
    return result;
  }, [timeline, activeOnly, bucketHours, timeWindowHours, asOf]);
  const max = Math.max(1, ...points.map((p) => p[metric]));
  const index = Math.min(selected, Math.max(0, points.length - 1));
  const point = points[index];
  const label =
    metric === "message_count"
      ? c("Messages", "Сообщения")
      : metric === "char_count"
        ? c("Characters", "Символы")
        : c("Distinct viewers per interval", "Уникальные зрители за интервал");
  return (
    <figure className="activity-chart">
      <figcaption className="chart-controls">
        <div>
          <h3 className="section-title">
            {c("When viewers participate", "Когда зрители участвуют")}
          </h3>
          <p>
            {c(
              `${bucketHours || 6}-hour intervals · up to 350 shown`,
              `Интервалы по ${bucketHours || 6} ч · показано до 350`,
            )}
          </p>
        </div>
        <div>
          <label>
            {c("Measure", "Показатель")}
            <select
              value={metric}
              onChange={(event) => setMetric(event.target.value as Metric)}
            >
              <option value="message_count">
                {c("Messages", "Сообщения")}
              </option>
              <option value="char_count">{c("Characters", "Символы")}</option>
              <option value="unique_chatters">
                {c("Distinct viewers", "Уникальные зрители")}
              </option>
            </select>
          </label>
          <label className="flex gap-2 items-center">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(event) => {
                setActiveOnly(event.target.checked);
                setSelected(0);
              }}
            />
            {c("Hide quiet intervals", "Скрыть тихие интервалы")}
          </label>
        </div>
      </figcaption>
      {!points.length ? (
        <p className="py-10 text-sm text-muted-foreground">
          {c("No activity in this period.", "За этот период нет активности.")}
        </p>
      ) : (
        <>
          <div className="chart-readout" aria-live="polite">
            <time>{new Date(point.bucket_start).toLocaleString()}</time>
            <strong>
              {point[metric].toLocaleString()} {label.toLowerCase()}
            </strong>
          </div>
          <div className="activity-bars" ref={bars} aria-label={label}>
            {points.map((p, i) => (
              <button
                key={p.bucket_start}
                type="button"
                tabIndex={i === index ? 0 : -1}
                aria-pressed={i === index}
                aria-label={`${new Date(p.bucket_start).toLocaleString()}: ${p[metric]} ${label}`}
                title={`${new Date(p.bucket_start).toLocaleString()}: ${p[metric]}`}
                onMouseEnter={() => setSelected(i)}
                onFocus={() => setSelected(i)}
                onClick={() => setSelected(i)}
                onKeyDown={(event) => {
                  if (
                    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                      event.key,
                    )
                  )
                    return;
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? points.length - 1
                        : Math.max(
                            0,
                            Math.min(
                              points.length - 1,
                              i + (event.key === "ArrowRight" ? 1 : -1),
                            ),
                          );
                  bars.current?.querySelectorAll("button")[next]?.focus();
                }}
              >
                <span
                  style={{ height: `${Math.max(1, (p[metric] / max) * 100)}%` }}
                />
              </button>
            ))}
          </div>
          <div className="chart-axis">
            <time>{new Date(points[0].bucket_start).toLocaleDateString()}</time>
            <span>
              {activeOnly
                ? c(
                    "Spacing between bars does not represent elapsed time",
                    "Расстояние между столбцами не отражает время",
                  )
                : c(
                    "Quiet intervals are shown as zero",
                    "Тихие интервалы показаны нулями",
                  )}
            </span>
            <time>
              {new Date(
                points[points.length - 1].bucket_start,
              ).toLocaleDateString()}
            </time>
          </div>
          <details className="builder-advanced">
            <summary>{c("Read interval values", "Таблица интервалов")}</summary>
            <div className="chart-data-table">
              <table>
                <thead>
                  <tr>
                    <th>{c("Interval start", "Начало интервала")}</th>
                    <th>{label}</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p) => (
                    <tr key={p.bucket_start}>
                      <td>{new Date(p.bucket_start).toLocaleString()}</td>
                      <td>{p[metric].toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </figure>
  );
}
