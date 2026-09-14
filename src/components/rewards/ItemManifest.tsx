import { useState } from "react";
import SkinImage from "@/components/common/SkinImage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCopy } from "@/lib/useCopy";
import { formatMajorCurrency, formatMinorCurrency } from "@/lib/currency";
export type ManifestItem = {
  market_hash_name: string;
  chance_percentage?: number | null;
  weight?: number;
  current_market_price?: number | null;
  permissible_market_price_deviation?: number | null;
  custom_message?: string | null;
};
export default function ItemManifest({
  items,
  currency,
  fixed = false,
  priceUnit = "minor",
}: {
  items: ManifestItem[];
  currency?: string | null;
  fixed?: boolean;
  priceUnit?: "major" | "minor";
}) {
  const c = useCopy();
  const [search, setSearch] = useState("");
  const [count, setCount] = useState(12);
  const found = items.filter((item) =>
    item.market_hash_name.toLowerCase().includes(search.toLowerCase()),
  );
  const total = items.reduce((sum, item) => sum + (item.weight || 0), 0);
  return (
    <section className={`item-manifest ${fixed ? "manifest-fixed" : ""}`}>
      {items.length > 8 && (
        <div className="manifest-search">
          <Input
            aria-label={c("Find an item", "Найти предмет")}
            placeholder={c("Find an item…", "Найти предмет…")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCount(12);
            }}
          />
          <span>
            {found.length} / {items.length}
          </span>
        </div>
      )}
      <ul>
        {found.slice(0, count).map((item, i) => {
          const chance =
            item.chance_percentage ??
            (total > 0 && item.weight != null
              ? (item.weight / total) * 100
              : null);
          return (
            <li key={`${item.market_hash_name}-${i}`}>
              <a
                className="manifest-art"
                href={`https://market.csgo.com/en/?search=${encodeURIComponent(item.market_hash_name)}`}
                target="_blank"
                rel="noreferrer"
              >
                <SkinImage
                  key={item.market_hash_name}
                  marketItemName={item.market_hash_name}
                  size={300}
                />
              </a>
              <div className="manifest-item-copy">
                <a
                  href={`https://market.csgo.com/en/?search=${encodeURIComponent(item.market_hash_name)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.market_hash_name} ↗
                </a>
                {item.custom_message && (
                  <p className="manifest-message">{item.custom_message}</p>
                )}
                <div className="manifest-price">
                  {item.current_market_price != null
                    ? currency
                      ? (priceUnit === "major"
                          ? formatMajorCurrency
                          : formatMinorCurrency)(
                          item.current_market_price,
                          currency,
                        )
                      : c("Currency not published", "Валюта не опубликована")
                    : c("Price not published", "Цена не опубликована")}
                  {item.permissible_market_price_deviation != null && (
                    <small>
                      {" "}
                      · ±{item.permissible_market_price_deviation}%
                    </small>
                  )}
                </div>
              </div>
              {!fixed && (
                <div className="manifest-chance">
                  <strong>
                    {chance == null ? "—" : `${chance.toFixed(2)}%`}
                  </strong>
                  <small>
                    {c("selection chance", "шанс выбора")}
                    {item.weight != null && (
                      <>
                        {" "}
                        · {c("weight", "вес")} {item.weight}
                      </>
                    )}
                  </small>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {!found.length && <p>{c("No matching items", "Предметы не найдены")}</p>}
      {found.length > count && (
        <Button variant="outline" onClick={() => setCount(count + 12)}>
          {c("Show more items", "Показать ещё предметы")} (
          {found.length - count})
        </Button>
      )}
    </section>
  );
}
