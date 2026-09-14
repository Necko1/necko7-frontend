import { useState, type ReactNode } from "react";
import type {
  CreateRewardBody,
  PriceStrategy,
  PurchaseLimitRule,
} from "@/types/api";
import { useCopy } from "@/lib/useCopy";
import { majorToMinor, minorToMajor } from "@/lib/currency";
import Segments from "@/components/common/Segments";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Form = Partial<CreateRewardBody>;
export default function BehaviorEditor({
  form,
  onChange,
  currency,
  isEdit,
  preview,
  errors = [],
}: {
  form: Form;
  onChange: (patch: Form) => void;
  currency?: string;
  isEdit: boolean;
  preview?: ReactNode;
  errors?: string[];
}) {
  const c = useCopy();
  const [panel, setPanel] = useState("viewer");
  const [lastError, setLastError] = useState("");
  const errorKey = errors.join(",");
  if (errorKey !== lastError) {
    setLastError(errorKey);
    if (errorKey)
      setPanel(
        errors.some((x) => ["title", "description"].includes(x))
          ? "viewer"
          : errors.some((x) => ["points", "pricing"].includes(x))
            ? "pricing"
            : [
                  form.chat_min_messages,
                  form.chat_min_characters,
                  form.chat_time_window_hours,
                ].some(
                  (value) =>
                    value != null && (!Number.isInteger(value) || value < 0),
                )
              ? "eligibility"
              : "limits",
      );
  }
  const [eligibility, setEligibility] = useState(
    !!(form.chat_min_messages || form.chat_min_characters),
  );
  const number = (id: string, label: string, key: keyof Form, min = 0) => (
    <label className="behavior-field">
      <span>{label}</span>
      <Input
        id={id}
        type="number"
        min={min}
        step={1}
        value={(form[key] as number | null) ?? ""}
        onChange={(e) =>
          onChange({
            [key]: e.target.value === "" ? null : Number(e.target.value),
          })
        }
      />
    </label>
  );
  const toggle = (label: string, value: boolean, set: (v: boolean) => void) => (
    <label className="intentional-toggle">
      <input
        role="switch"
        type="checkbox"
        checked={value}
        onChange={(e) => set(e.target.checked)}
      />
      {label}
    </label>
  );
  const panels = [
    [
      "viewer",
      c("Viewer experience", "Для зрителя"),
      form.twitch_title || c("Name & delivery", "Название и доставка"),
    ],
    [
      "pricing",
      c("Points & market", "Баллы и маркет"),
      form.pricing_mode === "MANUAL"
        ? `${form.manual_twitch_points || 0} ${c("points", "баллов")}`
        : c("Market-based pricing", "Цена по рынку"),
    ],
    [
      "eligibility",
      c("Viewer eligibility", "Требования к зрителю"),
      eligibility
        ? c("Chat rules configured", "Правила чата включены")
        : c("Open to every viewer", "Для всех зрителей"),
    ],
    [
      "limits",
      c("Usage limits", "Лимиты активаций"),
      c(
        "Cooldown, stream & rolling limits",
        "Кулдаун, лимиты стрима и периода",
      ),
    ],
  ];
  const updateRules = (scope: "user" | "global", rules: PurchaseLimitRule[]) =>
    onChange({
      purchase_limits: { ...(form.purchase_limits || {}), [scope]: rules },
    });
  return (
    <div className="behavior-editor">
      <nav
        aria-label={c(
          "Configure behavior sections",
          "Разделы настройки поведения",
        )}
        className="behavior-nav"
      >
        {panels.map(([key, label, summary]) => (
          <button
            type="button"
            key={key}
            aria-current={panel === key ? "step" : undefined}
            onClick={() => setPanel(key)}
          >
            <strong>{label}</strong>
            <small>{summary}</small>
          </button>
        ))}
      </nav>
      <section
        className="behavior-panel"
        aria-label={panels.find((p) => p[0] === panel)?.[1]}
      >
        {panel === "viewer" && (
          <>
            <h3>{c("What the viewer sees", "Что увидит зритель")}</h3>
            <p>
              {c(
                "Name the reward and explain what to enter. The selected item behavior is summarized alongside this editor.",
                "Назовите награду и объясните, что нужно ввести. Выбранное поведение предметов показано в сводке рядом.",
              )}
            </p>
            <label className="behavior-field">
              <span>{c("Twitch Reward Title", "Название награды Twitch")}</span>
              <Input
                id="twitch_title"
                value={form.twitch_title || ""}
                onChange={(e) => onChange({ twitch_title: e.target.value })}
              />
              <small>{(form.twitch_title || "").length} / 45</small>
            </label>
            <label className="behavior-field">
              <span>{c("Description", "Описание")}</span>
              <Textarea
                id="twitch_description"
                rows={3}
                value={form.twitch_description || ""}
                onChange={(e) =>
                  onChange({ twitch_description: e.target.value })
                }
              />
              <small>
                {(form.twitch_description || "").length} / 200 ·{" "}
                {c(
                  "Ask for a Steam trade URL.",
                  "Запросите ссылку обмена Steam.",
                )}
              </small>
            </label>
            <div className="behavior-options">
              {toggle(
                c("Auto-buy from market", "Автопокупка на маркете"),
                form.market_autobuy !== false,
                (v) => onChange({ market_autobuy: v }),
              )}
              {form.market_autobuy === false && (
                <p>
                  {c(
                    "The bot will not automatically buy an item for this reward.",
                    "Бот не будет автоматически покупать предмет для этой награды.",
                  )}
                </p>
              )}
              {toggle(
                c("Show in public catalog", "Показывать в каталоге"),
                form.is_public !== false,
                (v) => onChange({ is_public: v }),
              )}
              {!isEdit &&
                toggle(
                  c("Create as paused", "Создать на паузе"),
                  !!form.is_paused,
                  (v) => onChange({ is_paused: v }),
                )}
            </div>
          </>
        )}
        {panel === "pricing" && (
          <>
            <h3>{c("How many Channel Points?", "Сколько баллов канала?")}</h3>
            <Segments
              label={c("Pricing mode", "Расчёт стоимости")}
              value={form.pricing_mode || "AUTO"}
              options={[
                { value: "AUTO", label: c("Follow market", "По рынку") },
                {
                  value: "MANUAL",
                  label: c("Fixed points", "Фиксированные баллы"),
                },
              ]}
              onChange={(v) =>
                onChange({ pricing_mode: v as "AUTO" | "MANUAL" })
              }
            />
            {form.pricing_mode === "MANUAL" ? (
              <>
                {number(
                  "manual_points",
                  c(
                    "Fixed Twitch Channel Points",
                    "Фиксированная стоимость в баллах",
                  ),
                  "manual_twitch_points",
                  1,
                )}
                <p>
                  {c(
                    "The viewer's points cost stays fixed even when the item price changes.",
                    "Стоимость в баллах не меняется при изменении цены предмета.",
                  )}
                </p>
              </>
            ) : (
              <>
                {form.reward_type !== "FIXED" && (
                  <Segments
                    label={c(
                      "Combine item prices using",
                      "Расчёт по ценам предметов",
                    )}
                    value={form.price_strategy || "AVERAGE"}
                    options={[
                      { value: "AVERAGE", label: c("Average", "Среднее") },
                      { value: "MEDIAN", label: c("Median", "Медиана") },
                      { value: "MAX", label: c("Maximum", "Максимум") },
                    ]}
                    onChange={(v) =>
                      onChange({ price_strategy: v as PriceStrategy })
                    }
                  />
                )}
                {number(
                  "markup_pct",
                  c("Twitch Price Markup %", "Наценка баллов Twitch, %"),
                  "twitch_price_markup_percentage",
                )}
                <p>
                  {c(
                    "Channel Points follow the market price, channel multiplier and this markup. They can change when prices refresh.",
                    "Баллы рассчитываются по цене маркета, множителю канала и наценке. Стоимость может меняться при обновлении цен.",
                  )}
                </p>
              </>
            )}
            {preview && (
              <details className="builder-advanced">
                <summary>
                  {c(
                    "Check current filter pricing",
                    "Проверить цену по фильтру",
                  )}
                </summary>
                {preview}
              </details>
            )}
            <details className="builder-advanced">
              <summary>{c("Market protection", "Защита покупки")}</summary>
              <p>
                {c(
                  "Safety settings affect purchases and automatic pauses, independently of the points pricing mode.",
                  "Защита влияет на покупки и автоматические паузы независимо от режима расчёта баллов.",
                )}
              </p>
              {form.reward_type === "FIXED" ? (
                number(
                  "deviation",
                  c(
                    "Maximum purchase price deviation, %",
                    "Максимальное отклонение цены покупки, %",
                  ),
                  "permissible_market_price_deviation",
                )
              ) : (
                <p>
                  {form.reward_type === "POOL"
                    ? c(
                        "Each pool item's deviation is configured in Choose items.",
                        "Отклонение цены каждого предмета пула задаётся на шаге выбора предметов.",
                      )
                    : c(
                        "The item price range is configured in Choose items.",
                        "Диапазон цены предметов задаётся на шаге выбора предметов.",
                      )}
                </p>
              )}
              {!currency && (
                <p>
                  {c(
                    "Connect the market account to edit monetary safety limits.",
                    "Подключите маркет для изменения денежных лимитов.",
                  )}
                </p>
              )}
              <fieldset disabled={!currency} className="behavior-field-pair">
                {(["min_market_price", "max_market_price"] as const).map(
                  (key) => (
                    <label className="behavior-field" key={key}>
                      <span>
                        {key === "min_market_price"
                          ? c("Pause below", "Пауза ниже")
                          : c("Pause above", "Пауза выше")}{" "}
                        · {currency || "—"}
                      </span>
                      <Input
                        id={key}
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder={c("No limit", "Без лимита")}
                        value={
                          form[key] == null
                            ? ""
                            : minorToMajor(form[key]!, currency)
                        }
                        onChange={(e) =>
                          onChange({
                            [key]:
                              e.target.value === ""
                                ? null
                                : majorToMinor(
                                    Number(e.target.value),
                                    currency,
                                  ),
                          })
                        }
                      />
                    </label>
                  ),
                )}
              </fieldset>
            </details>
          </>
        )}
        {panel === "eligibility" && (
          <>
            <h3>{c("Who can redeem?", "Кто может активировать?")}</h3>
            <p>
              {c(
                "Limit this reward to viewers with recorded chat activity. These rules are checked in addition to purchase limits.",
                "Ограничьте награду по активности чата. Эти требования проверяются вместе с лимитами покупок.",
              )}
            </p>
            {toggle(
              c("Require chat activity", "Требовать активность чата"),
              eligibility,
              (v) => {
                setEligibility(v);
                onChange(
                  v
                    ? { chat_min_messages: 1 }
                    : { chat_min_messages: null, chat_min_characters: null },
                );
              },
            )}
            {eligibility && (
              <>
                <div className="behavior-field-pair">
                  {number(
                    "chat_min_messages",
                    c("Minimum messages", "Минимум сообщений"),
                    "chat_min_messages",
                  )}
                  {number(
                    "chat_min_characters",
                    c("Minimum characters", "Минимум символов"),
                    "chat_min_characters",
                  )}
                </div>
                {!!form.chat_min_messages && !!form.chat_min_characters && (
                  <Segments
                    label={c("Viewer must meet", "Зритель должен выполнить")}
                    value={form.chat_logical_operator || "AND"}
                    options={[
                      {
                        value: "AND",
                        label: c("Both rules", "Оба требования"),
                      },
                      {
                        value: "OR",
                        label: c("Either rule", "Любое требование"),
                      },
                    ]}
                    onChange={(v) =>
                      onChange({ chat_logical_operator: v as "AND" | "OR" })
                    }
                  />
                )}
                {number(
                  "chat_time_window_hours",
                  c(
                    "Count the last N hours (empty = all time)",
                    "Учитывать последние N часов (пусто = всё время)",
                  ),
                  "chat_time_window_hours",
                  1,
                )}
                {toggle(
                  c(
                    "Refund points if requirements fail",
                    "Вернуть баллы при невыполнении требований",
                  ),
                  form.refund_if_chat_req_failed !== false,
                  (v) => onChange({ refund_if_chat_req_failed: v }),
                )}
                {form.refund_if_chat_req_failed === false && (
                  <p className="text-amber-300">
                    {c(
                      "Points will not be automatically returned when chat requirements fail.",
                      "При невыполнении требований чата баллы автоматически не возвращаются.",
                    )}
                  </p>
                )}
              </>
            )}
          </>
        )}
        {panel === "limits" && (
          <>
            <h3>
              {c(
                "How often can it be redeemed?",
                "Как часто можно активировать?",
              )}
            </h3>
            <p>
              {c(
                "Twitch cooldown applies to the whole channel. Zero means no restriction for these Twitch limits.",
                "Кулдаун Twitch действует на весь канал. Ноль отключает соответствующее ограничение Twitch.",
              )}
            </p>
            {number(
              "global_cooldown_seconds",
              c("Channel cooldown, seconds", "Кулдаун канала, секунды"),
              "global_cooldown_seconds",
            )}
            <div className="behavior-field-pair">
              {number(
                "max_per_stream",
                c("Per stream", "За стрим"),
                "max_redemptions_per_stream",
              )}
              {number(
                "max_per_user",
                c("Per viewer / stream", "На зрителя / стрим"),
                "max_redemptions_per_user_per_stream",
              )}
            </div>
            <details className="builder-advanced" open={undefined}>
              <summary>
                {c(
                  "Rolling & lifetime purchase limits",
                  "Лимиты за период и за всё время",
                )}
                <span>
                  {(form.purchase_limits?.user?.length || 0) +
                    (form.purchase_limits?.global?.length || 0)}
                </span>
              </summary>
              <p>
                {c(
                  "Every applicable rule must allow the purchase. Leave hours empty for a lifetime cap.",
                  "Покупку должны разрешать все применимые правила. Пустое окно часов задаёт лимит за всё время.",
                )}
              </p>
              {(["user", "global"] as const).map((scope) => (
                <section className="limit-rule-editor" key={scope}>
                  <h4>
                    {scope === "user"
                      ? c("Per viewer", "На зрителя")
                      : c("Across all viewers", "На весь канал")}
                  </h4>
                  {(form.purchase_limits?.[scope] || []).map((rule, i) => (
                    <div className="limit-rule" key={i}>
                      <label>
                        <span>{c("Maximum", "Максимум")}</span>
                        <Input
                          aria-label={`${scope} maximum ${i + 1}`}
                          type="number"
                          min={1}
                          value={rule.max_redemptions}
                          onChange={(e) =>
                            updateRules(
                              scope,
                              form.purchase_limits![scope]!.map((r, j) =>
                                j === i
                                  ? {
                                      ...r,
                                      max_redemptions: Number(e.target.value),
                                    }
                                  : r,
                              ),
                            )
                          }
                        />
                      </label>
                      <label>
                        <span>{c("Hours", "Часы")}</span>
                        <Input
                          aria-label={`${scope} hours ${i + 1}`}
                          type="number"
                          min={1}
                          placeholder={c("Lifetime", "Всё время")}
                          value={rule.window_hours ?? ""}
                          onChange={(e) =>
                            updateRules(
                              scope,
                              form.purchase_limits![scope]!.map((r, j) =>
                                j === i
                                  ? {
                                      ...r,
                                      window_hours:
                                        e.target.value === ""
                                          ? null
                                          : Number(e.target.value),
                                    }
                                  : r,
                              ),
                            )
                          }
                        />
                      </label>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          updateRules(
                            scope,
                            form.purchase_limits![scope]!.filter(
                              (_, j) => i !== j,
                            ),
                          )
                        }
                        aria-label={c("Remove limit", "Удалить лимит")}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() =>
                      updateRules(scope, [
                        ...(form.purchase_limits?.[scope] || []),
                        { max_redemptions: 1, window_hours: 24 },
                      ])
                    }
                  >
                    {c("Add limit", "Добавить лимит")}
                  </Button>
                </section>
              ))}
            </details>
          </>
        )}
      </section>
    </div>
  );
}
