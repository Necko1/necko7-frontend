import type { CreateRewardBody } from "@/types/api";
import { formatMinorCurrency } from "@/lib/currency";
import { useCopy } from "@/lib/useCopy";

export default function RewardSummary({
  value,
  currency,
}: {
  value: Partial<CreateRewardBody>;
  currency?: string;
}) {
  const c = useCopy();
  const type = value.reward_type || "FIXED";
  const pool = value.pool_items || [];
  const weight = pool.reduce((sum, item) => sum + item.weight, 0);
  const chatRules = [
    (value.chat_min_messages || 0) > 0
      ? c(
          `${value.chat_min_messages} messages`,
          `${value.chat_min_messages} сообщений`,
        )
      : null,
    (value.chat_min_characters || 0) > 0
      ? c(
          `${value.chat_min_characters} characters`,
          `${value.chat_min_characters} символов`,
        )
      : null,
  ]
    .filter(Boolean)
    .join(
      value.chat_logical_operator === "OR"
        ? c(" or ", " или ")
        : c(" and ", " и "),
    );
  const chat =
    (value.chat_min_messages || 0) > 0 || (value.chat_min_characters || 0) > 0;
  return (
    <section
      className="reward-preview"
      aria-label={c("Reward summary", "Сводка награды")}
    >
      <p className="eyebrow">{c("Viewer experience", "Для зрителя")}</p>
      <h3>
        {value.twitch_title || c("Untitled reward", "Награда без названия")}
      </h3>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
        {value.twitch_description ||
          c(
            "Enter a Steam trade URL when redeeming.",
            "Укажите ссылку на обмен Steam при активации.",
          )}
      </p>
      <dl className="preview-facts">
        <div>
          <dt>{c("Channel Points", "Баллы канала")}</dt>
          <dd>
            {value.pricing_mode === "MANUAL"
              ? (value.manual_twitch_points || 0).toLocaleString()
              : c(
                  `Market-based · +${value.twitch_price_markup_percentage || 0}%`,
                  `По рынку · +${value.twitch_price_markup_percentage || 0}%`,
                )}
          </dd>
        </div>
        <div>
          <dt>{c("What happens", "Что произойдёт")}</dt>
          <dd>
            {value.market_autobuy === false
              ? c("Automatic buying is disabled", "Автопокупка отключена")
              : type === "FIXED"
                ? c("Buy this item", "Купить этот предмет")
                : type === "POOL"
                  ? c(
                      "Pick one item by weight",
                      "Выбрать один предмет по весам",
                    )
                  : c(
                      "Buy an item matching the filter",
                      "Купить предмет по фильтру",
                    )}
          </dd>
        </div>
      </dl>
      {type === "FIXED" && (
        <p className="text-sm break-words">
          {value.market_item_name || c("No item selected", "Предмет не выбран")}
        </p>
      )}
      {type === "POOL" && (
        <ul className="preview-pool">
          {pool.map((item, index) => (
            <li key={index}>
              <span>{item.market_hash_name || "—"}</span>
              <strong>
                {weight > 0 ? ((item.weight / weight) * 100).toFixed(1) : "0"}%
              </strong>
            </li>
          ))}
        </ul>
      )}
      {type === "FILTER" && (
        <p className="text-sm">
          {value.filter_config?.min_price ?? 0} –{" "}
          {value.filter_config?.max_price ?? "—"}{" "}
          {currency || c("market currency", "валюта маркета")}
          <br />
          {[
            value.filter_config?.name_contains,
            value.filter_config?.name_prefix,
            value.filter_config?.name_suffix,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      <dl className="preview-facts">
        <div>
          <dt>{c("Price protection", "Защита цены")}</dt>
          <dd>
            {value.permissible_market_price_deviation ?? 10}%{" "}
            {c("maximum deviation", "максимальное отклонение")}
            {(value.min_market_price != null ||
              value.max_market_price != null) && (
              <small className="block">
                {currency
                  ? `${value.min_market_price != null ? formatMinorCurrency(value.min_market_price, currency) : "—"} – ${value.max_market_price != null ? formatMinorCurrency(value.max_market_price, currency) : "—"}`
                  : c(
                      "Limits configured · currency unavailable",
                      "Лимиты настроены · валюта недоступна",
                    )}
              </small>
            )}
          </dd>
        </div>
        <div>
          <dt>{c("Availability", "Доступность")}</dt>
          <dd>
            {value.is_paused
              ? c("Starts paused", "Приостановлена")
              : c("Active", "Активна")}{" "}
            ·{" "}
            {value.is_public === false
              ? c("Hidden from catalog", "Скрыта в каталоге")
              : c("Visible in catalog", "Видна в каталоге")}
          </dd>
        </div>
        <div>
          <dt>{c("Twitch cooldown", "Кулдаун Twitch")}</dt>
          <dd>
            {value.global_cooldown_seconds || 0}s ·{" "}
            {c("Channel-wide", "На весь канал")}
          </dd>
        </div>
        <div>
          <dt>
            {c("Per stream · channel / viewer", "За стрим · канал / зритель")}
          </dt>
          <dd>
            {value.max_redemptions_per_stream || c("Unlimited", "Без лимита")} /{" "}
            {value.max_redemptions_per_user_per_stream ||
              c("Unlimited per viewer", "Без лимита на зрителя")}
          </dd>
        </div>
        <div>
          <dt>{c("Viewer eligibility", "Требования к зрителю")}</dt>
          <dd>
            {chat
              ? chatRules
              : c("No chat requirements", "Без требований к чату")}
            {chat && (
              <small className="block">
                {value.chat_time_window_hours
                  ? `${value.chat_time_window_hours}h`
                  : c("All time", "За всё время")}{" "}
                ·{" "}
                {value.refund_if_chat_req_failed !== false
                  ? c("Refund if unmet", "Возврат при невыполнении")
                  : c("No refund if unmet", "Без возврата при невыполнении")}
              </small>
            )}
          </dd>
        </div>
        {(["global", "user"] as const).flatMap((scope) =>
          (value.purchase_limits?.[scope] || []).map((rule, index) => (
            <div key={`${scope}-${index}`}>
              <dt>
                {scope === "user"
                  ? c("Per-viewer limit", "Лимит зрителя")
                  : c("Channel limit", "Лимит канала")}
              </dt>
              <dd>
                {rule.max_redemptions} /{" "}
                {rule.window_hours
                  ? `${rule.window_hours}h`
                  : c("All time", "За всё время")}
              </dd>
            </div>
          )),
        )}
      </dl>
    </section>
  );
}
