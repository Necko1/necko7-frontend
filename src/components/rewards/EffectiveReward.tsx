import type { ReactNode } from "react";
import type { RewardResponse } from "@/types/api";
import { useCopy } from "@/lib/useCopy";
import { formatMinorCurrency } from "@/lib/currency";
import ItemManifest from "./ItemManifest";
export default function EffectiveReward({
  reward,
  preview,
}: {
  reward: RewardResponse;
  preview?: ReactNode;
}) {
  const c = useCopy();
  const f = reward.filter_config;
  const chatRules = [
    reward.chat_min_messages
      ? `${reward.chat_min_messages} ${c("messages", "сообщений")}`
      : "",
    reward.chat_min_characters
      ? `${reward.chat_min_characters} ${c("characters", "символов")}`
      : "",
  ]
    .filter(Boolean)
    .join(
      reward.chat_logical_operator === "OR"
        ? c(" or ", " или ")
        : c(" and ", " и "),
    );
  return (
    <section className="effective-reward">
      <div className="section-heading">
        <h2>{c("Configured reward", "Настроенная награда")}</h2>
        <span>
          {reward.reward_type} ·{" "}
          {reward.market_autobuy
            ? c("Automatic purchase", "Автопокупка")
            : c("Auto-buy off", "Без автопокупки")}
        </span>
      </div>
      <div className="effective-register">
        <div>
          <span>{c("Pricing mode", "Расчёт баллов")}</span>
          <strong>
            {reward.pricing_mode === "MANUAL"
              ? `${reward.manual_twitch_points?.toLocaleString() ?? "—"} ${c("points", "баллов")}`
              : `${c("Market", "Рынок")} +${reward.twitch_price_markup_percentage}%`}
          </strong>
          <small>{reward.price_strategy || ""}</small>
        </div>
        <div>
          <span>{c("Recorded market price", "Цена маркета в записи")}</span>
          <strong>
            {formatMinorCurrency(reward.current_market_price, reward.currency)}
          </strong>
        </div>
        <div>
          <span>{c("Automatic pause range", "Диапазон до автопаузы")}</span>
          <strong>
            {reward.min_market_price == null
              ? "—"
              : formatMinorCurrency(
                  reward.min_market_price,
                  reward.currency,
                )}{" "}
            →{" "}
            {reward.max_market_price == null
              ? "—"
              : formatMinorCurrency(reward.max_market_price, reward.currency)}
          </strong>
        </div>
      </div>
      {reward.reward_type === "POOL" && (
        <>
          <p>
            {c(
              "One item is selected by weight. Individual purchase price tolerances are shown with each item.",
              "Один предмет выбирается по весу. Допустимое отклонение цены указано для каждого предмета.",
            )}
          </p>
          <ItemManifest
            items={reward.pool_items || []}
            currency={reward.currency}
          />
        </>
      )}
      {reward.reward_type === "FIXED" && (
        <ItemManifest
          fixed
          currency={reward.currency}
          items={
            reward.market_item_name
              ? [
                  {
                    market_hash_name: reward.market_item_name,
                    current_market_price: reward.current_market_price,
                    permissible_market_price_deviation:
                      reward.permissible_market_price_deviation,
                  },
                ]
              : []
          }
        />
      )}
      {reward.reward_type === "FILTER" && (
        <>
          <dl className="filter-register">
            {f &&
              Object.entries(f)
                .filter(([, v]) => v != null)
                .map(([key, value]) => (
                  <div key={key}>
                    <dt>
                      {(
                        {
                          min_price: c("Minimum price", "Минимальная цена"),
                          max_price: c("Maximum price", "Максимальная цена"),
                          name_contains: c("Contains", "Содержит"),
                          name_prefix: c("Starts with", "Начинается с"),
                          name_suffix: c("Ends with", "Заканчивается на"),
                          min_volume: c("Minimum volume", "Минимальный объём"),
                        } as Record<string, string>
                      )[key] || key}
                    </dt>
                    <dd>
                      {String(value)}
                      {key.endsWith("price") ? ` ${reward.currency}` : ""}
                    </dd>
                  </div>
                ))}
          </dl>
          <details className="builder-advanced">
            <summary>
              {c(
                "Inspect currently matching items",
                "Посмотреть подходящие предметы",
              )}
            </summary>
            {preview}
          </details>
        </>
      )}
      <div className="effective-restrictions">
        <h3 className="section-title">
          {c("Redemption rules", "Правила активации")}
        </h3>
        <dl className="filter-register">
          <div>
            <dt>{c("Twitch cooldown", "Кулдаун Twitch")}</dt>
            <dd>{reward.global_cooldown_seconds}s</dd>
          </div>
          <div>
            <dt>{c("Stream limit / per viewer", "За стрим / на зрителя")}</dt>
            <dd>
              {reward.max_redemptions_per_stream || "∞"} /{" "}
              {reward.max_redemptions_per_user_per_stream || "∞"}
            </dd>
          </div>
          {(["user", "global"] as const).flatMap((scope) =>
            (reward.purchase_limits?.[scope] || []).map((rule, i) => (
              <div key={`${scope}-${i}`}>
                <dt>
                  {scope === "user"
                    ? c("Per viewer", "На зрителя")
                    : c("Channel total", "На канал")}
                </dt>
                <dd>
                  {rule.max_redemptions} /{" "}
                  {rule.window_hours
                    ? `${rule.window_hours}h`
                    : c("lifetime", "всё время")}
                </dd>
              </div>
            )),
          )}
          <div>
            <dt>{c("Chat requirement", "Требования чата")}</dt>
            <dd>
              {chatRules || c("Open to every viewer", "Для всех зрителей")}
              {chatRules && " · "}
              {chatRules &&
                (reward.chat_time_window_hours
                  ? `${reward.chat_time_window_hours}h`
                  : c("all time", "всё время"))}
            </dd>
          </div>
          {chatRules && (
            <div>
              <dt>
                {c(
                  "If chat requirements fail",
                  "Если требования чата не выполнены",
                )}
              </dt>
              <dd>
                {reward.refund_if_chat_req_failed !== false
                  ? c("Refund points", "Вернуть баллы")
                  : c("No automatic refund", "Без автоматического возврата")}
              </dd>
            </div>
          )}
        </dl>
      </div>
      <details className="builder-advanced">
        <summary>
          {c("Technical configuration", "Техническая конфигурация")}
        </summary>
        <pre className="configuration-json">
          {JSON.stringify(reward, null, 2)}
        </pre>
      </details>
    </section>
  );
}
