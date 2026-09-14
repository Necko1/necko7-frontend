import type { Page } from "@playwright/test";
import { mockApi, rewards, redemptions, channel } from "./fixtures";
export const longToken = "uninterrupted".repeat(24);
const avatar = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" fill="#43575b"/><circle cx="64" cy="47" r="25" fill="#e8b795"/><path d="M18 128V103Q64 54 110 103V128" fill="#172626"/><path d="M38 44Q34 10 70 18Q94 21 89 50L70 35Z" fill="#25322c"/></svg>`;
const artwork = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180" viewBox="0 0 300 180"><path d="M30 100L68 85H160L181 94H266V107H174L144 116H77L33 125Z" fill="#597077"/><path d="M64 88H158V105H67Z" fill="#d6e997"/><path d="M126 111L144 116L154 147L137 150Z" fill="#202828"/><path d="M93 109L116 111L107 141L87 133Z" fill="#8e4c4c"/><path d="M34 106L12 120V96L42 91Z" fill="#222b2c"/><path d="M163 92H256V99H164Z" fill="#b9cacb"/></svg>`;
export const richRewards = rewards.map((r, i) => ({
  ...r,
  twitch_description:
    "Enter your own Steam trade URL. One item will be selected when the redemption is processed.",
  pool_items: Array.from({ length: 26 }, (_, j) => ({
    market_hash_name:
      j === 2
        ? `AK-47 | ${longToken}`
        : `${["AK-47 | Redline", "USP-S | Cortex", "AWP | Atheris"][j % 3]} (Field-Tested) ${j + 1}`,
    weight: j + 1,
    permissible_market_price_deviation: 10,
    current_market_price: 2450 + j * 100,
    custom_message:
      j === 1 ? `Thanks for joining the channel! ${longToken}` : null,
  })),
  filter_config:
    i === 3
      ? {
          min_price: 10,
          max_price: 30,
          name_contains: "AWP",
          name_prefix: "",
          min_volume: 5,
        }
      : r.filter_config,
  purchase_limits: {
    user: [{ max_redemptions: 2, window_hours: 24 }],
    global: [{ max_redemptions: 20, window_hours: 168 }],
  },
}));
export async function correctionApi(
  page: Page,
  { manyChannels = false }: { manyChannels?: boolean } = {},
) {
  const mutations = await mockApi(page);
  await page.route("https://cdn2.csgo.com/item/**", (route) =>
    route.fulfill({ contentType: "image/svg+xml", body: artwork }),
  );
  await page.route("**/qa-avatar.svg", (route) =>
    route.fulfill({ contentType: "image/svg+xml", body: avatar }),
  );
  await page.route("**/api/v1/users/me", (route) =>
    route.fulfill({
      json: { twitch_id: "123", login: "necko", avatar_url: "/qa-avatar.svg" },
    }),
  );
  await page.route(
    "**/api/v1/broadcasters/123/chat/users/900/stats**",
    (route) =>
      route.fulfill({
        json: {
          user_id: "900",
          user_login: "pixelpilot_with_a_long_username",
          display_name: "PixelPilot",
          profile_image_url: "/qa-avatar.svg",
          message_count: 1500,
          char_count: 12000,
        },
      }),
  );
  await page.route("**/api/v1/me/profile", (route) =>
    route.fulfill({
      json: {
        user_id: "123",
        total_chat_messages: 1240,
        total_chat_characters: 24000,
        redemption_stats: {
          total_redemptions: 32,
          completed: 18,
          failed: 8,
          pending: 6,
          total_points_spent: 75000,
          total_market_value: 2450,
        },
        channels: Array.from({ length: manyChannels ? 18 : 1 }, (_, i) => ({
          ...channel,
          channel_id: String(123 + i),
          channel_login: i ? `community_${i}` : "necko",
          display_name: i === 3 ? longToken : i ? `Community ${i}` : "Necko",
          profile_image_url: "/qa-avatar.svg",
          messages_count: 1200 - i * 50,
          redemptions_count: 18 - i,
        })),
      },
    }),
  );
  await page.route("**/api/v1/broadcasters/123/rewards?**", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ json: richRewards })
      : route.fallback(),
  );
  await page.route("**/api/v1/broadcasters/123/me/redemptions**", (route) =>
    route.fulfill({
      json: redemptions.slice(0, 6).map((r) => ({
        ...r,
        reward_title: richRewards.find(
          (x) => x.twitch_id === r.twitch_reward_id,
        )?.twitch_title,
      })),
    }),
  );
  await page.route("**/api/v1/me/redemptions**", (route) =>
    route.fulfill({
      json: redemptions.slice(0, 6).map((r) => ({
        ...r,
        ...channel,
        reward_title: richRewards.find(
          (x) => x.twitch_id === r.twitch_reward_id,
        )?.twitch_title,
      })),
    }),
  );
  await page.route("**/api/v1/public/broadcasters/*/rewards**", (route) => {
    const parts = new URL(route.request().url()).pathname.split("/");
    const id = parts[parts.length - 1];
    const pub = richRewards.map((r) => ({
      ...r,
      twitch_description: `${r.twitch_description}\n${"A viewer-provided instruction with a long URL: ".repeat(8)}https://example.com/${longToken}`,
      market_price: r.current_market_price / 1000,
      cost_points: r.manual_twitch_points,
      pool_items: r.pool_items.map((item) => ({
        market_hash_name: item.market_hash_name,
        current_market_price: item.current_market_price / 1000,
        permissible_market_price_deviation:
          item.permissible_market_price_deviation,
        chance_percentage: (item.weight / 351) * 100,
      })),
      filter_details: r.filter_config,
      chat_requirements: {
        min_messages: 20,
        min_characters: 500,
        logical_operator: "AND",
        time_window_hours: 168,
      },
    }));
    return route.fulfill({
      json: id === "rewards" ? pub : pub.find((r) => r.twitch_id === id),
      status:
        id === "rewards" || pub.some((r) => r.twitch_id === id) ? 200 : 404,
    });
  });
  await page.route("**/api/v1/broadcasters/123/chat/messages**", (route) => {
    const url = new URL(route.request().url());
    const user = url.searchParams.get("chatter_login");
    const offset = Number(url.searchParams.get("offset") || 0);
    const limit = Number(url.searchParams.get("limit") || 50);
    const items = Array.from({ length: 120 }, (_, i) => ({
      id: i,
      message_id: `chat-${i}`,
      broadcaster_id: "123",
      chatter_user_id: i < 3 || i % 2 === 0 ? "900" : "901",
      chatter_user_login:
        i < 3 || i % 2 === 0 ? "pixelpilot_with_a_long_username" : "nova_scout",
      message_text:
        i === 3
          ? `Look at this: https://example.com/${longToken}`
          : i === 5
            ? ""
            : `Message ${i}: ${i < 3 ? "This belongs to a consecutive sequence." : "Another viewer joins the conversation."}`,
      sent_at: new Date(Date.now() - i * 30000).toISOString(),
      created_at: new Date().toISOString(),
      char_count: 55,
    }));
    const found = items.filter(
      (m) =>
        (!user || m.chatter_user_login === user) &&
        (!url.searchParams.get("user_id") ||
          m.chatter_user_id === url.searchParams.get("user_id")),
    );
    return route.fulfill({
      json: { items: found.slice(offset, offset + limit), total: found.length },
    });
  });
  await page.route("**/api/v1/broadcasters/123/chat/leaderboard**", (route) =>
    route.fulfill({
      json: {
        total: 8,
        items: Array.from({ length: 8 }, (_, i) => ({
          chatter_user_id: String(900 + i),
          chatter_user_login:
            i === 0 ? "pixelpilot_with_a_long_username" : `viewer_${i}`,
          message_count: 1200 - i * 100,
          char_count: 15000 - i * 1000,
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        })),
      },
    }),
  );
  await page.route("**/api/v1/broadcasters/123/logs?**", (route) => {
    const query = new URL(route.request().url()).searchParams;
    return route.fulfill({
      json: {
        items: Array.from({ length: 8 }, (_, i) => ({
          id: i + 1,
          broadcaster_id: "123",
          level: i < 3 ? "INFO" : "WARN",
          category: "REDEMPTION",
          event_type: [
            "REDEMPTION_RETRY_REQUESTED",
            "REDEMPTION_ORDER_CREATED",
            "REDEMPTION_STATUS_CHANGED",
            "REDEMPTION_MANUAL_HOLD",
          ][i % 4],
          message:
            i === 5
              ? `Market returned a long diagnostic ${longToken}`
              : "The market request was processed; inspect the structured result for this attempt.",
          solution_hint:
            i > 3 ? "Check the recorded market outcome before retrying." : null,
          details: {
            redemption_id: redemptions[0].twitch_redemption_id,
            old_status: "PENDING",
            new_status: i < 3 ? "ORDER_CREATED" : "MANUAL_HOLD",
            attempt: i + 1,
            diagnostic: i === 5 ? longToken : null,
          },
          created_at: new Date(Date.now() - (8 - i) * 60000).toISOString(),
        })),
        total: 8,
        limit: Number(query.get("limit") || 25),
        offset: 0,
      },
    });
  });
  return mutations;
}
