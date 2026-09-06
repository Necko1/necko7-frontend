import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { broadcastersApi, permissionsApi } from "@/lib/apiClient";
import type {
  UpdateBroadcasterSettingsBody,
  PermissionResponse,
} from "@/types/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ── Icons ──────────────────────────────────────────────────────────────────
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const IconPlus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IconSave = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
  </svg>
);
const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconRotateCcw = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── Section wrapper ────────────────────────────────────────────────────────
function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        {children}
      </div>
    </div>
  );
}

// ── Toggle field ───────────────────────────────────────────────────────────
function ToggleField({
  id, label, description, checked, onChange,
}: {
  id: string; label: string; description?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer group">
      <div className={cn(
        "relative w-10 h-5 rounded-full transition-colors shrink-0 mt-0.5",
        checked ? "bg-primary" : "bg-input"
      )}>
        <div className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )} />
        <input id={id} type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground leading-none mb-1">{label}</p>
        {description && <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>}
      </div>
    </label>
  );
}

// ── General Tab ────────────────────────────────────────────────────────────
function GeneralTab({ channelId }: { channelId: string }) {
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings", channelId],
    queryFn: () => broadcastersApi.getSettings(channelId).then((r) => r.data),
  });

  const [form, setForm] = useState<UpdateBroadcasterSettingsBody>({});

  useEffect(() => {
    if (settings) {
      setForm({
        is_active: settings.is_active,
        base_price_multiplier: settings.base_price_multiplier,
        update_prices_period: settings.update_prices_period,
        refund_on_buyer_fail: settings.refund_on_buyer_fail,
        refund_if_no_money: settings.refund_if_no_money,
        pause_reward_if_no_money: settings.pause_reward_if_no_money,
        market_chance_to_transfer: settings.market_chance_to_transfer,
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (body: UpdateBroadcasterSettingsBody) =>
      broadcastersApi.updateSettings(channelId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings", channelId] }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const set = <K extends keyof UpdateBroadcasterSettingsBody>(key: K, val: UpdateBroadcasterSettingsBody[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="space-y-6">
      <Section title="Bot Status" description="Enable or disable the bot for this channel.">
        <ToggleField
          id="is_active"
          label="Bot Active"
          description="When disabled, the bot will not process any new redemptions."
          checked={form.is_active ?? true}
          onChange={(v) => set("is_active", v)}
        />
      </Section>

      <Section title="Pricing" description="Control how market prices translate into Twitch channel point costs.">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="base_price_multiplier">Base Price Multiplier</Label>
            <Input
              id="base_price_multiplier"
              type="number"
              min={1}
              value={form.base_price_multiplier ?? ""}
              onChange={(e) => set("base_price_multiplier", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Points per 1 major currency unit (e.g. 200 = 200 pts per 1 RUB/USD)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="update_prices_period">Price Update Period (s)</Label>
            <Input
              id="update_prices_period"
              type="number"
              min={60}
              value={form.update_prices_period ?? ""}
              onChange={(e) => set("update_prices_period", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              How often market prices are refreshed
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="market_chance_to_transfer">Market Transfer Chance (%)</Label>
            <Input
              id="market_chance_to_transfer"
              type="number"
              min={0}
              max={100}
              value={form.market_chance_to_transfer ?? ""}
              onChange={(e) => set("market_chance_to_transfer", Number(e.target.value))}
            />
          </div>
        </div>
      </Section>

      <Section title="Refund Behavior" description="Configure automatic actions when redemptions fail.">
        <div className="space-y-4">
          <ToggleField
            id="refund_on_buyer_fail"
            label="Refund if buyer fails delivery"
            description="Automatically refund channel points if the trade isn't accepted by the buyer."
            checked={form.refund_on_buyer_fail ?? true}
            onChange={(v) => set("refund_on_buyer_fail", v)}
          />
          <Separator />
          <ToggleField
            id="refund_if_no_money"
            label="Refund if insufficient market balance"
            description="Automatically refund if there's not enough balance in the market account."
            checked={form.refund_if_no_money ?? false}
            onChange={(v) => set("refund_if_no_money", v)}
          />
          <Separator />
          <ToggleField
            id="pause_reward_if_no_money"
            label="Pause reward if insufficient balance"
            description="Pause the Twitch reward instead of failing when the balance runs out."
            checked={form.pause_reward_if_no_money ?? true}
            onChange={(v) => set("pause_reward_if_no_money", v)}
          />
        </div>
      </Section>

      <Section title="Market API Key" description="Set the API key for the CS:GO market integration.">
        <div className="space-y-2">
          <Label htmlFor="market_api_key">Market API Key</Label>
          <Input
            id="market_api_key"
            type="password"
            placeholder={settings?.market_api_key_set ? "••••••••••••••• (already set)" : "Paste your API key here"}
            onChange={(e) => set("market_api_key", e.target.value || null)}
          />
          <p className="text-xs text-muted-foreground">
            {settings?.market_api_key_set
              ? "✓ Market API key is currently configured"
              : "⚠ No market API key set — auto-buy is disabled"}
          </p>
        </div>
      </Section>

      <Button
        className="gap-2"
        onClick={() => updateMutation.mutate(form)}
        disabled={updateMutation.isPending}
      >
        <IconSave />
        {updateMutation.isPending ? "Saving…" : "Save Changes"}
      </Button>
      {updateMutation.isSuccess && (
        <p className="text-sm text-emerald-400">Settings saved successfully.</p>
      )}
    </div>
  );
}

// ── Category Metadata ──────────────────────────────────────────────────────
interface CategoryMeta {
  id: string;
  label: string;
  description: string;
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  orders: {
    id: "orders",
    label: "Orders",
    description: "Market order creation, price filtering, and purchase outcomes.",
  },
  trades: {
    id: "trades",
    label: "Trades",
    description: "Steam trade offer delivery, acceptance, declines, and timeouts.",
  },
  market_errors: {
    id: "market_errors",
    label: "Market Errors",
    description: "CS:GO Market API and Steam inventory verification error messages.",
  },
  chat_requirements: {
    id: "chat_requirements",
    label: "Chat Requirements",
    description: "Viewer chat activity requirements (messages and character count).",
  },
  limits: {
    id: "limits",
    label: "Limits",
    description: "Global and per-user reward redemption rate limit alerts.",
  },
};

function getCategoryMeta(key: string): CategoryMeta {
  if (CATEGORY_META[key]) return CATEGORY_META[key];
  const label = key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { id: key, label, description: `Customizable chat messages for ${label}.` };
}

function formatMessageKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Chat Messages Tab ──────────────────────────────────────────────────────
function ChatMessagesTab({ channelId }: { channelId: string }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["chat-messages", channelId],
    queryFn: () => broadcastersApi.getChatMessages(channelId).then((r) => r.data),
  });

  const [messages, setMessages] = useState<Record<string, Record<string, string>>>({});
  const [activeCategory, setActiveCategory] = useState<string>("orders");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    if (data?.messages) {
      const initial: Record<string, Record<string, string>> = {};
      for (const [cat, catMsgs] of Object.entries(data.messages)) {
        initial[cat] = { ...(catMsgs as Record<string, string>) };
      }
      setMessages(initial);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: () => broadcastersApi.updateChatMessages(channelId, { messages }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-messages", channelId] }),
  });

  const categories = useMemo(() => {
    if (!data?.default_messages) return [];
    const desiredOrder = ["orders", "trades", "market_errors", "chat_requirements", "limits"];
    const serverCategories = Object.keys(data.default_messages);
    return [
      ...desiredOrder.filter((k) => serverCategories.includes(k)),
      ...serverCategories.filter((k) => !desiredOrder.includes(k)),
    ];
  }, [data]);

  useEffect(() => {
    if (categories.length > 0 && !categories.includes(activeCategory)) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  const handleMessageChange = (cat: string, msgKey: string, value: string) => {
    setMessages((prev) => ({
      ...prev,
      [cat]: {
        ...(prev[cat] || {}),
        [msgKey]: value,
      },
    }));
  };

  const handleResetMessage = (cat: string, msgKey: string) => {
    setMessages((prev) => {
      const nextCat = { ...(prev[cat] || {}) };
      delete nextCat[msgKey];
      return {
        ...prev,
        [cat]: nextCat,
      };
    });
  };

  const handleResetCategory = (cat: string) => {
    setMessages((prev) => {
      const nextCat = { ...(prev[cat] || {}) };
      const defaultKeys = Object.keys(data?.default_messages?.[cat] || {});
      for (const k of defaultKeys) {
        delete nextCat[k];
      }
      return {
        ...prev,
        [cat]: nextCat,
      };
    });
  };

  const isMessageCustomized = (cat: string, msgKey: string): boolean => {
    if (!data) return false;
    const currentVal = messages[cat]?.[msgKey];
    const defaultVal = data.default_messages?.[cat]?.[msgKey] ?? "";
    const hadCustomOnServer = Boolean(data.custom_messages?.[cat]?.[msgKey]);

    if (currentVal === undefined) {
      return false;
    }
    if (currentVal !== defaultVal) {
      return true;
    }
    return hadCustomOnServer;
  };

  const getCustomCount = (cat: string): number => {
    if (!data?.default_messages?.[cat]) return 0;
    let count = 0;
    for (const msgKey of Object.keys(data.default_messages[cat])) {
      if (isMessageCustomized(cat, msgKey)) {
        count++;
      }
    }
    return count;
  };

  const insertPlaceholder = (cat: string, msgKey: string, placeholder: string) => {
    const textarea = document.getElementById(
      `msg-input-${cat}-${msgKey}`
    ) as HTMLTextAreaElement | null;
    const tagToInsert = `{${placeholder}}`;
    const defaultVal = data?.default_messages?.[cat]?.[msgKey] ?? "";
    const currentVal = messages[cat]?.[msgKey] ?? defaultVal;

    if (textarea) {
      const start = textarea.selectionStart ?? currentVal.length;
      const end = textarea.selectionEnd ?? currentVal.length;
      const updated =
        currentVal.substring(0, start) + tagToInsert + currentVal.substring(end);
      handleMessageChange(cat, msgKey, updated);

      setTimeout(() => {
        textarea.focus();
        const newPos = start + tagToInsert.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    } else {
      handleMessageChange(cat, msgKey, currentVal + tagToInsert);
    }
  };

  const filteredMessages = useMemo(() => {
    if (!data?.default_messages?.[activeCategory]) return [];
    const entries = Object.entries(data.default_messages[activeCategory]);
    if (!searchQuery.trim()) return entries;

    const q = searchQuery.toLowerCase().trim();
    return entries.filter(([msgKey, defaultText]) => {
      const currentVal = messages[activeCategory]?.[msgKey] ?? "";
      const placeholders = data.placeholders?.[activeCategory]?.[msgKey] || [];
      return (
        msgKey.toLowerCase().includes(q) ||
        defaultText.toLowerCase().includes(q) ||
        currentVal.toLowerCase().includes(q) ||
        placeholders.some((p) => p.toLowerCase().includes(q))
      );
    });
  }, [data, activeCategory, searchQuery, messages]);

  const otherCategoryMatches = useMemo(() => {
    if (!searchQuery.trim() || !data?.default_messages) return [];
    const q = searchQuery.toLowerCase().trim();
    const results: { cat: string; count: number }[] = [];

    for (const [catKey, catDefaults] of Object.entries(data.default_messages)) {
      if (catKey === activeCategory) continue;
      let matches = 0;
      for (const [msgKey, defaultText] of Object.entries(catDefaults)) {
        const currentVal = messages[catKey]?.[msgKey] ?? "";
        const placeholders = data.placeholders?.[catKey]?.[msgKey] || [];
        if (
          msgKey.toLowerCase().includes(q) ||
          defaultText.toLowerCase().includes(q) ||
          currentVal.toLowerCase().includes(q) ||
          placeholders.some((p) => p.toLowerCase().includes(q))
        ) {
          matches++;
        }
      }
      if (matches > 0) {
        results.push({ cat: catKey, count: matches });
      }
    }
    return results;
  }, [searchQuery, data, messages, activeCategory]);

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (!data) return null;

  const currentCatMeta = getCategoryMeta(activeCategory);
  const currentCatCustomCount = getCustomCount(activeCategory);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Customize the bot's Twitch chat announcements and responses. Click placeholder badges to insert variables like{" "}
          <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">{"{buyer}"}</code> into the message template.
        </p>
      </div>

      {/* Sub-Tabs Navigation & Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/60">
          {categories.map((catKey) => {
            const meta = getCategoryMeta(catKey);
            const isActive = activeCategory === catKey;
            const customCount = getCustomCount(catKey);

            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setActiveCategory(catKey)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer select-none",
                  isActive
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                )}
              >
                {meta.label}
                {customCount > 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[10px] font-mono leading-none",
                      isActive
                        ? "bg-primary/15 text-primary font-bold"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {customCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search filter input */}
        <div className="relative w-full md:w-64">
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <IconSearch />
          </div>
          <Input
            type="text"
            placeholder="Search templates…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-7 h-9 text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Active Category Header & Bulk Reset */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-1 border-b border-border/40">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            {currentCatMeta.label}
            {currentCatCustomCount > 0 ? (
              <Badge variant="secondary" className="text-[11px] font-normal font-mono">
                {currentCatCustomCount} customized
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground font-normal">
                (all using defaults)
              </span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {currentCatMeta.description}
          </p>
        </div>
        {currentCatCustomCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5 h-8 cursor-pointer"
            onClick={() => handleResetCategory(activeCategory)}
            title="Reset all modified messages in this category back to defaults"
          >
            <IconRotateCcw />
            Reset Category to Defaults
          </Button>
        )}
      </div>

      {/* Empty Search Results State */}
      {filteredMessages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            No message templates found matching &ldquo;{searchQuery}&rdquo; in {currentCatMeta.label}.
          </p>
          {otherCategoryMatches.length > 0 && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Found matches in other categories:</p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {otherCategoryMatches.map(({ cat, count }) => {
                  const meta = getCategoryMeta(cat);
                  return (
                    <Button
                      key={cat}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5 cursor-pointer"
                      onClick={() => setActiveCategory(cat)}
                    >
                      {meta.label} ({count})
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => setSearchQuery("")}
          >
            Clear Search
          </Button>
        </div>
      ) : (
        /* Message Cards */
        <div className="space-y-4">
          {filteredMessages.map(([msgKey, defaultText]) => {
            const placeholders = data.placeholders?.[activeCategory]?.[msgKey] ?? [];
            const isCustomized = isMessageCustomized(activeCategory, msgKey);

            return (
              <div
                key={msgKey}
                className={cn(
                  "rounded-xl border bg-card p-5 space-y-3.5 transition-colors",
                  isCustomized ? "border-primary/40 shadow-xs" : "border-border"
                )}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">
                        {formatMessageKey(msgKey)}
                      </span>
                      <code className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/50">
                        {msgKey}
                      </code>
                      {isCustomized ? (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-500 border-amber-500/30 bg-amber-500/10">
                          Customized
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground/70 border-border/60">
                          Default
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Placeholder Buttons */}
                  {placeholders.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-muted-foreground font-medium mr-0.5 select-none">
                        Insert:
                      </span>
                      {placeholders.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => insertPlaceholder(activeCategory, msgKey, p)}
                          title={`Click to insert {${p}} at cursor`}
                          className="group inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md border border-primary/20 bg-primary/5 hover:bg-primary/15 text-primary hover:border-primary/40 transition-all cursor-pointer active:scale-95 select-none"
                        >
                          <span>{`{${p}}`}</span>
                          <span className="opacity-40 group-hover:opacity-100 text-[10px] leading-none">+</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Textarea
                  id={`msg-input-${activeCategory}-${msgKey}`}
                  rows={2}
                  placeholder={defaultText}
                  value={messages[activeCategory]?.[msgKey] ?? ""}
                  onChange={(e) =>
                    handleMessageChange(activeCategory, msgKey, e.target.value)
                  }
                  className="font-normal text-sm leading-relaxed resize-y"
                />

                <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap text-xs">
                  <p className="text-muted-foreground text-xs leading-normal flex-1 min-w-[200px]">
                    <span className="font-medium text-foreground/80">Default:</span>{" "}
                    <span className="italic select-all">{defaultText}</span>
                  </p>
                  {isCustomized && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-destructive hover:underline cursor-pointer font-medium ml-auto"
                      onClick={() => handleResetMessage(activeCategory, msgKey)}
                    >
                      <IconRotateCcw />
                      Reset to default
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Save Button & Notifications */}
      <div className="flex items-center gap-4 pt-4 border-t border-border">
        <Button
          className="gap-2 cursor-pointer"
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
        >
          <IconSave />
          {updateMutation.isPending ? "Saving…" : "Save Messages"}
        </Button>
        {updateMutation.isSuccess && (
          <p className="text-sm text-emerald-400 flex items-center gap-1.5 font-medium">
            <IconCheck /> Messages saved successfully.
          </p>
        )}
        {updateMutation.isError && (
          <p className="text-sm text-destructive font-medium">
            Failed to save messages. Please try again.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Permissions Tab ────────────────────────────────────────────────────────
function PermissionsTab({ channelId }: { channelId: string }) {
  const qc = useQueryClient();
  const [newLogin, setNewLogin] = useState("");

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ["permissions", channelId],
    queryFn: () => permissionsApi.list(channelId).then((r) => r.data),
  });

  const grantMutation = useMutation({
    mutationFn: (login: string) =>
      permissionsApi.grant(channelId, { login }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permissions", channelId] });
      setNewLogin("");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (userId: string) => permissionsApi.revoke(channelId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["permissions", channelId] }),
  });

  return (
    <div className="space-y-6">
      {/* Grant new permission */}
      <Section title="Grant Editor Access" description="The user must have logged into necko7 at least once.">
        <div className="flex gap-2">
          <Input
            placeholder="Twitch username"
            value={newLogin}
            onChange={(e) => setNewLogin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && newLogin && grantMutation.mutate(newLogin)}
          />
          <Button
            className="gap-2 shrink-0"
            onClick={() => newLogin && grantMutation.mutate(newLogin)}
            disabled={grantMutation.isPending || !newLogin}
          >
            <IconPlus />
            Grant Access
          </Button>
        </div>
        {grantMutation.isError && (
          <p className="text-sm text-destructive">
            Failed to grant access — user may not exist in the system.
          </p>
        )}
      </Section>

      {/* Current permissions */}
      <Section title="Current Editors">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : permissions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No editors have been granted access yet.
          </p>
        ) : (
          <div className="space-y-2">
            {permissions.map((perm: PermissionResponse) => (
              <div
                key={perm.user_id}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-background/50 border border-border"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                    {perm.user_login.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{perm.user_login}</p>
                  <p className="text-xs text-muted-foreground">ID: {perm.user_id}</p>
                </div>
                <Badge variant="outline" className={cn(
                  "text-xs capitalize",
                  perm.role === "Owner" ? "border-primary/40 text-primary" : "border-border text-muted-foreground"
                )}>
                  {perm.role}
                </Badge>
                {perm.role !== "Owner" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Revoke access from @${perm.user_login}?`)) {
                        revokeMutation.mutate(perm.user_id);
                      }
                    }}
                    disabled={revokeMutation.isPending}
                  >
                    <IconTrash />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

export default function SettingsPage() {
  const { channelId } = useParams<{ channelId: string }>();

  const { data: settings } = useQuery({
    queryKey: ["settings", channelId],
    queryFn: () => broadcastersApi.getSettings(channelId!).then((r) => r.data),
    enabled: !!channelId,
    staleTime: 60_000,
  });

  if (!channelId) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No channel selected.
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        {settings?.profile_image_url ? (
          <img
            src={settings.profile_image_url}
            alt={settings.display_name || settings.channel_login}
            className="w-14 h-14 rounded-2xl object-cover ring-2 ring-primary/20 shrink-0 shadow-sm"
          />
        ) : null}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {settings?.display_name ? `${settings.display_name} Settings` : "Channel Settings"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {settings?.channel_login ? `@${settings.channel_login} · ` : ""}Configure bot behavior, pricing, messages, and access control.
          </p>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="messages">Chat Messages</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab channelId={channelId} />
        </TabsContent>
        <TabsContent value="messages">
          <ChatMessagesTab channelId={channelId} />
        </TabsContent>
        <TabsContent value="permissions">
          <PermissionsTab channelId={channelId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
