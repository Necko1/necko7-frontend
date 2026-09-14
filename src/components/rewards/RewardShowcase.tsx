import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { PublicRewardResponse } from "@/types/api";
import { useCopy } from "@/lib/useCopy";
import { getShortRewardUrl } from "@/lib/shortUrl";
import { Button } from "@/components/ui/button";
import ItemManifest from "./ItemManifest";
export default function RewardShowcase({
  reward,
  identifier,
  onBack,
}: {
  reward: PublicRewardResponse;
  identifier: string;
  onBack: () => void;
}) {
  const c = useCopy();
  const [copied, setCopied] = useState(false);
  const url = getShortRewardUrl(identifier, reward.twitch_id);
  const filter = reward.filter_details;
  const req = reward.chat_requirements;
  const chat = [
    req?.min_messages
      ? `${req.min_messages} ${c("messages", "сообщений")}`
      : "",
    req?.min_characters
      ? `${req.min_characters} ${c("characters", "символов")}`
      : "",
  ]
    .filter(Boolean)
    .join(
      req?.logical_operator === "OR" ? c(" or ", " или ") : c(" and ", " и "),
    );
  return (
    <article className="reward-showcase">
      <nav className="showcase-nav">
        <Button variant="ghost" onClick={onBack}>
          ← {c("All rewards", "Все награды")}
        </Button>
        <span>
          {reward.reward_type} / {c("CHANNEL REWARD", "НАГРАДА КАНАЛА")}
        </span>
      </nav>
      <header className="showcase-header">
        <div>
          <p className="eyebrow">
            @{identifier} ·{" "}
            {reward.is_paused
              ? c("Currently paused", "Сейчас на паузе")
              : c("Published reward", "Опубликованная награда")}
          </p>
          {reward.is_paused && reward.pause_reason && (
            <p className="text-sm text-amber-300">
              {(
                {
                  NO_MONEY: c(
                    "Paused: market balance is insufficient",
                    "Пауза: недостаточно средств на маркете",
                  ),
                  PRICE_LIMIT: c(
                    "Paused: market price is outside the configured range",
                    "Пауза: цена вне заданного диапазона",
                  ),
                  LIMIT_REACHED: c(
                    "Paused: purchase limit reached",
                    "Пауза: достигнут лимит покупок",
                  ),
                  MANUAL: c(
                    "Paused by the channel team",
                    "Приостановлено командой канала",
                  ),
                } as Record<string, string>
              )[reward.pause_reason] || reward.pause_reason}
            </p>
          )}
          <h2>{reward.twitch_title}</h2>
          <p className="showcase-description">
            {reward.twitch_description ||
              c(
                "Enter your Steam trade URL when redeeming this reward on Twitch.",
                "Укажите ссылку обмена Steam при активации награды на Twitch.",
              )}
          </p>
        </div>
        <div className="showcase-cost">
          <span>{c("Channel Points", "Баллы канала")}</span>
          <strong>
            {reward.cost_points == null
              ? "—"
              : reward.cost_points.toLocaleString()}
          </strong>
          <small>
            {reward.cost_points == null
              ? c("Cost not published", "Стоимость не опубликована")
              : reward.pricing_mode === "AUTO"
                ? c("Tracks market pricing", "Обновляется по рынку")
                : c("Fixed points cost", "Фиксированная стоимость")}
          </small>
        </div>
      </header>
      <div className="showcase-body">
        <section className="showcase-contents">
          <h3 className="section-title">
            {reward.reward_type === "FIXED"
              ? c("The item you redeem", "Предмет награды")
              : reward.reward_type === "POOL"
                ? c(
                    "One reward, one of these items",
                    "Одна награда — один из предметов",
                  )
                : c("Selected by market conditions", "Выбор по условиям рынка")}
          </h3>
          {reward.reward_type === "FIXED" && (
            <ItemManifest
              priceUnit="major"
              fixed
              currency={reward.currency}
              items={
                reward.market_item_name
                  ? [
                      {
                        market_hash_name: reward.market_item_name,
                        current_market_price: reward.market_price,
                        permissible_market_price_deviation:
                          reward.permissible_market_price_deviation,
                      },
                    ]
                  : []
              }
            />
          )}
          {reward.reward_type === "POOL" && (
            <>
              <p>
                {c(
                  "One item is selected using the published probabilities. A selection chance is not a guarantee of delivery.",
                  "Один предмет выбирается по указанным вероятностям. Шанс выбора не гарантирует доставку.",
                )}
              </p>
              {reward.pool_items?.length ? (
                <ItemManifest
                  priceUnit="major"
                  items={reward.pool_items}
                  currency={reward.currency}
                />
              ) : (
                <p>
                  {c(
                    "Pool contents are not published.",
                    "Состав пула не опубликован.",
                  )}
                </p>
              )}
            </>
          )}
          {reward.reward_type === "FILTER" && (
            <>
              <p>
                {c(
                  "The bot selects an item matching these conditions when processing the redemption. The available selection can change with the market.",
                  "Бот выбирает предмет по этим условиям при обработке активации. Список доступных предметов меняется вместе с рынком.",
                )}
              </p>
              {filter ? (
                <dl className="filter-register">
                  <div>
                    <dt>{c("Price range", "Диапазон цен")}</dt>
                    <dd>
                      {filter.min_price ?? 0} – {filter.max_price ?? "∞"}{" "}
                      {reward.currency}
                    </dd>
                  </div>
                  {[
                    [c("Contains", "Содержит"), filter.name_contains],
                    [c("Starts with", "Начинается с"), filter.name_prefix],
                    [c("Ends with", "Заканчивается на"), filter.name_suffix],
                  ]
                    .filter(([, v]) => v)
                    .map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                </dl>
              ) : (
                <p>
                  {c(
                    "Filter conditions are not published.",
                    "Условия фильтра не опубликованы.",
                  )}
                </p>
              )}
            </>
          )}
        </section>
        <aside className="showcase-redeem">
          <h3 className="section-title">
            {c("Before you redeem", "Перед активацией")}
          </h3>
          <p>
            {c(
              "Redeem with Channel Points on Twitch. Use your own Steam trade URL when prompted.",
              "Активируйте награду за баллы канала на Twitch. При запросе укажите свою ссылку обмена Steam.",
            )}
          </p>
          {reward.is_paused && (
            <p className="showcase-paused">
              {c(
                "Redemption is currently paused.",
                "Активация сейчас приостановлена.",
              )}
              {reward.pause_reason && <small>{reward.pause_reason}</small>}
            </p>
          )}
          <dl className="filter-register">
            {chat && (
              <div>
                <dt>{c("Chat eligibility", "Требования чата")}</dt>
                <dd>
                  {chat}
                  <small>
                    {req?.time_window_hours
                      ? `${req.time_window_hours}h`
                      : c("All time", "Всё время")}
                  </small>
                </dd>
              </div>
            )}
            {(reward.global_cooldown_seconds || 0) > 0 && (
              <div>
                <dt>{c("Channel cooldown", "Кулдаун канала")}</dt>
                <dd>{reward.global_cooldown_seconds}s</dd>
              </div>
            )}
            {(reward.max_redemptions_per_stream || 0) > 0 && (
              <div>
                <dt>{c("Per stream", "За стрим")}</dt>
                <dd>{reward.max_redemptions_per_stream}</dd>
              </div>
            )}
            {(reward.max_redemptions_per_user_per_stream || 0) > 0 && (
              <div>
                <dt>{c("Per viewer / stream", "На зрителя / стрим")}</dt>
                <dd>{reward.max_redemptions_per_user_per_stream}</dd>
              </div>
            )}
            {(["global", "user"] as const).flatMap((scope) =>
              (reward.purchase_limits?.[scope] || []).map((rule, i) => (
                <div key={`${scope}-${i}`}>
                  <dt>
                    {scope === "global"
                      ? c("All viewers", "Все зрители")
                      : c("Per viewer", "На зрителя")}
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
          </dl>
          <Link to={`/c/${identifier}/profile`}>
            {c(
              "Check your history & eligibility",
              "Ваша история и доступность",
            )}{" "}
            →
          </Link>
          <div className="showcase-share">
            <span>{c("Share this reward", "Поделиться наградой")}</span>
            <code>{url}</code>
            <Button
              variant="outline"
              onClick={() =>
                navigator.clipboard
                  .writeText(url)
                  .then(() => setCopied(true))
                  .catch(() =>
                    toast.error(c("Could not copy", "Не удалось скопировать")),
                  )
              }
            >
              {copied
                ? c("Copied", "Скопировано")
                : c("Copy short link", "Копировать короткую ссылку")}
            </Button>
          </div>
        </aside>
      </div>
    </article>
  );
}
