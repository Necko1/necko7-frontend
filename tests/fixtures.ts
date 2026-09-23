import type { Page } from "@playwright/test";

const now = new Date(Date.now() - 3600000).toISOString();
export const channel = { channel_id: "123", channel_login: "necko", display_name: "Necko", profile_image_url: null, role: "OWNER" };
export const settings = { ...channel, is_active: true, market_api_key_set: true, base_price_multiplier: 100, update_prices_period: 300, pause_reward_if_no_money: true, market_chance_to_transfer: 80, add_bot_badge: false, chat_messages: {}, public_rewards_config: { enabled: true } };
export const rewards = ["AK-47 | Redline (Field-Tested)", "USP-S | Cortex (Minimal Wear)", "AWP | Atheris (Field-Tested)", "M4A1-S | Decimator (Field-Tested)"].map((name, i) => ({
  id: `reward-${i}`, twitch_id: `550e8400-e29b-41d4-a716-44665544000${i}`, streamer_id: "123", twitch_title: ["Redline drop", "Cortex delivery", "AWP surprise", "Decimator reward"][i], twitch_description: "Redeem for a CS item. Enter your Steam trade URL.", reward_type: i === 2 ? "POOL" : i === 3 ? "FILTER" : "FIXED", pricing_mode: "MANUAL", manual_twitch_points: 25000 * (i + 1), market_item_name: name, is_paused: i === 1, pause_reason: i === 1 ? "NO_MONEY" : null, is_deleted: false, current_market_price: 2450, permissible_market_price_deviation: 10, twitch_price_markup_percentage: 15, global_cooldown_seconds: 60, max_redemptions_per_stream: 5, max_redemptions_per_user_per_stream: 1, market_autobuy: true, currency: "USD", is_public: true, created_at: now, updated_at: now, pool_items: [{ market_hash_name: name, weight: 1, permissible_market_price_deviation: 10, current_market_price: 2450 }], filter_config: { min_price: 10, max_price: 30 },
}));
export const redemptions = Array.from({ length: 32 }, (_, i) => ({
  twitch_redemption_id: `a1b2c3d4-e5f6-7890-abcd-ef12345678${String(i).padStart(2, "0")}`, twitch_reward_id: rewards[i % 4].twitch_id,
  user_id: String(900 + i), user_login: ["pixelpilot", "nova_scout", "marshmallow", "lunarwave"][i % 4],
  user_trade_link: "https://steamcommunity.com/tradeoffer/new/?partner=123456&token=example",
  twitch_points_cost: 25000, currency: "USD", market_paid_price: i % 6 === 0 ? null : 2450,
  market_item_name: rewards[i % 4].market_item_name, retry_count: i % 6 === 0 ? 3 : 0,
  fail_cause: i % 6 === 0 ? "no_money" : null, fail_description: i % 6 === 0 ? "Insufficient funds on the configured market account." : null,
  status: ["MANUAL_HOLD", "ORDER_CREATED", "COMPLETED", "FAILED_REFUND", "FAILED_PENALTY", "PENDING"][i % 6], created_at: now, updated_at: now,
}));

export async function mockApi(page: Page, options: { role?: string; tour?: boolean; empty?: boolean; fail?: string; guest?: boolean } = {}) {
  const mutations: { path: string; body: unknown }[] = [];
  const role = options.role || "OWNER";
  let currentSettings = structuredClone(settings);
  let currentViewerSettings = { viewer_id: "123", auto_buy_enabled: true, trade_link: null as string | null, updated_at: now };
  const rows = options.empty ? [] : structuredClone(redemptions);
  await page.addInitScript(({ role, tour }) => {
    localStorage.setItem("necko_lang", "en");
    localStorage.setItem("necko7-app-store", JSON.stringify({ state: { selectedBroadcasterId: "123" }, version: 0 }));
    if (!tour) localStorage.setItem(`necko7:guide:v1:123:123:${role}`, "completed");
    window.__APP_CONFIG__ = { API_BASE_URL: location.origin, BACKEND_URL: location.origin };
  }, { role, tour: options.tour });
  // All API responses are isolated, even if local .env points at a live host.
  await page.route("**/api/**", async route => {
    const req = route.request(); const url = new URL(req.url()); const path = url.pathname;
    const send = (data: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (options.fail && path.endsWith(options.fail)) return send({ error: { message: "Service unavailable" } }, 503);
    if (path === "/api/v1/users/me/settings" && req.method() === "GET") return send(currentViewerSettings);
    if (path.endsWith("/users/me")) return options.guest ? send({}, 401) : send({ twitch_id: "123", login: "necko", avatar_url: null });
    if (path === "/api/v1/broadcasters") return send([{ ...channel, role }]);
    if (req.method() !== "GET") {
      mutations.push({ path, body: req.postDataJSON() });
      if (path === "/api/v1/users/me/settings") { currentViewerSettings = { ...currentViewerSettings, ...req.postDataJSON() }; return send(currentViewerSettings); }
      if (path.endsWith("/settings")) { currentSettings = { ...currentSettings, ...req.postDataJSON() }; return send(currentSettings); }
      if (/\/(retry|refund|penalty)$/.test(path)) {
        const row = rows.find(r => path.includes(r.twitch_redemption_id));
        if (row) row.status = path.endsWith("retry") ? "ORDER_CREATED" : path.endsWith("refund") ? "FAILED_REFUND" : "FAILED_PENALTY";
        return send(row || {});
      }
      return send({ success: true, affected: 1 });
    }
    if (path.endsWith("/market/balance")) return send({ money: 284.75, money_settlement: 24.5, currency: "USD", updated_at: now });
    if (path.endsWith("/stats") && !path.includes("/chat/")) return send({ total_redemptions: 128, completed: 112, failed: 10, total_spent: 268540, total_points_earned: 3240000 });
    if (path.endsWith("/me/redemptions")) return send(rows.slice(0, 3).map(r => ({ ...r, ...channel, reward_title: "Redline drop" })));
    if (path.endsWith("/inventory")) return send([]);
    if (path.endsWith("/redemptions")) {
      const filtered = rows.filter(r => (!url.searchParams.get("status") || r.status === url.searchParams.get("status")) && (!url.searchParams.get("user_id") || r.user_id === url.searchParams.get("user_id")) && (!url.searchParams.get("reward_id") || r.twitch_reward_id === url.searchParams.get("reward_id")));
      const offset = Number(url.searchParams.get("offset") || 0), limit = Number(url.searchParams.get("limit") || 25);
      return send({ items: filtered.slice(offset, offset + limit), total: filtered.length, offset, limit });
    }
    if (path.endsWith("/logs/summary")) return send({ errors_last_24h: 3, warnings_last_24h: 6, info_last_24h: 128, total_last_24h: 137 });
    if (path.endsWith("/logs")) return send({ items: ["MANUAL_HOLD", "ORDER_CREATED", "COMPLETED"].map((event, i) => ({ id: i, broadcaster_id: "123", level: i ? "INFO" : "ERROR", category: "REDEMPTION", event_type: event, message: ["Purchase held: insufficient market balance. Manual review required.", "Market order created for nova_scout.", "Trade completed for marshmallow."][i], solution_hint: i ? null : "Check the market balance and order history before retrying.", details: { redemption_id: redemptions[i].twitch_redemption_id, user_login: "pixelpilot", retry_count: 3 }, created_at: now })), total: 3, offset: 0, limit: 50 });
    if (path.endsWith("/permissions")) return role === "OWNER" ? send([{ channel_id: "123", user_id: "123", user_login: "necko", role: "OWNER" }, { channel_id: "123", user_id: "456", user_login: "trusted_editor", role: "EDITOR" }]) : send({}, 403);
    if (path.endsWith("/rewards")) return send(options.empty ? [] : path.includes("/public/") ? rewards.map(r => ({ ...r, cost_points: r.manual_twitch_points, market_price: r.current_market_price })) : rewards);
    if (path.includes("/public/broadcasters/")) return send({ ...channel, public_rewards_enabled: true });
    if (path.endsWith("/me/profile") || /\/chat\/users\/[^/]+\/profile$/.test(path)) return send({ user_id: "123", ...channel, total_chat_messages: 1240, total_chat_characters: 24000, channels: [{ ...channel, messages_count: 1240, redemptions_count: 3 }], chat_stats: { total_messages: 1240, total_characters: 24000, leaderboard_rank: 3 }, redemption_stats: { total_redemptions: 3, completed: 2, failed: 1, pending: 0, total_points_spent: 75000, total_market_value: 2450 }, limits: [{ twitch_reward_id: rewards[0].twitch_id, reward_title: "Redline drop", max_redemptions: 2, used_redemptions: 2, remaining_redemptions: 0, is_limit_reached: true, window_hours: 24 }] });
    if (path.endsWith("/chat/dashboard")) return send({ summary: { total_messages: 1200, total_characters: 34000, unique_chatters: 42, avg_characters_per_message: 28 }, timeline: Array.from({ length: 24 }, (_, i) => ({ bucket_start: new Date(Date.parse(now) - (23 - i) * Number(url.searchParams.get("bucket_hours") || 6) * 3600000).toISOString(), message_count: (i % 6) * 18 + 4, char_count: (i % 6) * 360 + 40, unique_chatters: (i % 6) * 3 + 1 })), top_chatters: [] });
    if (path.endsWith("/summary")) return send({ chatter_user_id: "900", chatter_user_login: "pixelpilot", total_messages: 42, total_chars: 400, first_seen_at: now, last_seen_at: now });
    if (path.endsWith("/stats")) return send({ user_id: "900", user_login: "pixelpilot", message_count: 42, char_count: 400 });
    if (path.endsWith("/chat/messages") || /\/chat\/users\/[^/]+\/messages$/.test(path)) return send({ items: [{ id: 1, message_id: "msg", broadcaster_id: "123", chatter_user_id: "900", chatter_user_login: "pixelpilot", message_text: "Thanks for the reward!", char_count: 22, sent_at: now, created_at: now }], total: 1 });
    if (path.endsWith("/messages")) return send({ channel_id: "123", messages: { orders: { order_created: "Order created for {user}" } }, custom_messages: {}, default_messages: { orders: { order_created: "Order created for {user}" } }, placeholders: { orders: { order_created: ["user"] } } });
    if (path.endsWith("/leaderboard")) return send({ items: [{ chatter_user_id: "900", chatter_user_login: "pixelpilot", message_count: 42, char_count: 400, first_seen_at: now, last_seen_at: now }], total: 1 });
    if (path === "/api/v1/broadcasters/123") return send(currentSettings);
    if (path.includes("/proxy/")) return route.abort();
    return send({ error: { message: `Unmocked API: ${path}` } }, 404);
  });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, route => route.request().url().includes("/api/") ? route.fallback() : route.abort());
  return mutations;
}
