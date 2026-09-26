import type { CreateRewardBody } from "@/types/api";
export function rewardErrors(
  f: Partial<CreateRewardBody>,
  stage: "items" | "all",
  existingDescription?: string,
) {
  const errors: string[] = [];
  const nonnegative = (n: number | null | undefined) =>
    n == null || (Number.isFinite(n) && n >= 0);
  if (f.reward_type === "FIXED" && !f.market_item_name?.trim())
    errors.push("item");
  if (
    f.reward_type === "POOL" &&
    (!f.pool_items?.length ||
      f.pool_items.some(
        (i) =>
          !i.market_hash_name.trim() ||
          !Number.isFinite(i.weight) ||
          i.weight <= 0 ||
          !nonnegative(i.permissible_market_price_deviation) ||
          i.permissible_market_price_deviation > 100,
      ))
  )
    errors.push("pool");
  if (
    f.reward_type === "FILTER" &&
    (!f.filter_config ||
      !nonnegative(f.filter_config.min_price) ||
      !Number.isFinite(f.filter_config.max_price) ||
      f.filter_config.max_price <= 0 ||
      f.filter_config.min_price > f.filter_config.max_price ||
      !nonnegative(f.filter_config.min_volume))
  )
    errors.push("filter");
  if (stage === "items") return errors;
  if (!f.twitch_title?.trim() || f.twitch_title.length > 45)
    errors.push("title");
  if (f.twitch_description !== existingDescription && Array.from(f.twitch_description || "").length > 200)
    errors.push("description");
  if (
    f.pricing_mode === "MANUAL" &&
    (!Number.isInteger(f.manual_twitch_points) ||
      (f.manual_twitch_points || 0) < 1)
  )
    errors.push("points");
  if (
    ![
      f.twitch_price_markup_percentage,
      f.permissible_market_price_deviation,
      f.min_market_price,
      f.max_market_price,
    ].every(nonnegative) ||
    (f.permissible_market_price_deviation || 0) > 100 ||
    (f.twitch_price_markup_percentage || 0) > 4900 ||
    (f.min_market_price != null &&
      f.max_market_price != null &&
      f.min_market_price > f.max_market_price)
  )
    errors.push("pricing");
  if (
    ![
      f.global_cooldown_seconds,
      f.max_redemptions_per_stream,
      f.max_redemptions_per_user_per_stream,
      f.chat_min_messages,
      f.chat_min_characters,
      f.chat_time_window_hours,
    ].every((n) => nonnegative(n) && (n == null || Number.isInteger(n)))
  )
    errors.push("limits");
  if (
    [
      ...(f.purchase_limits?.global || []),
      ...(f.purchase_limits?.user || []),
    ].some(
      (r) =>
        !Number.isInteger(r.max_redemptions) ||
        r.max_redemptions < 1 ||
        (r.window_hours != null &&
          (!Number.isInteger(r.window_hours) || r.window_hours < 1)),
    )
  )
    errors.push("limits");
  return [...new Set(errors)];
}
