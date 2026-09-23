import ConfirmAction from "@/components/common/ConfirmAction";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader, QueryError } from "@/components/common/Page";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { broadcastersApi, permissionsApi } from "@/lib/apiClient";
import type {
  UpdateBroadcasterSettingsBody,
  PermissionResponse,
  PublicRewardsConfig,
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
function Section({ title, description, children, id }: { title: string; description?: string; children: React.ReactNode; id?: string }) {
  return <section id={id} className="settings-section scroll-mt-20"><div><h2 className="text-sm font-semibold">{title}</h2>{description && <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{description}</p>}</div><div className="settings-fields">{children}</div></section>;
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
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: settings, isLoading, isError, refetch } = useQuery({
    queryKey: ["settings", channelId],
    queryFn: () => broadcastersApi.getSettings(channelId).then((r) => r.data),
  });

  const [draft, setDraft] = useState<UpdateBroadcasterSettingsBody>({});
  const base: UpdateBroadcasterSettingsBody = settings ? {
    is_active: settings.is_active, base_price_multiplier: settings.base_price_multiplier,
    update_prices_period: settings.update_prices_period, pause_reward_if_no_money: settings.pause_reward_if_no_money,
    market_chance_to_transfer: settings.market_chance_to_transfer, add_bot_badge: settings.add_bot_badge,
  } : {};
  const form = { ...base, ...draft };
  const dirty = Object.entries(draft).some(([key, value]) => value !== base[key as keyof typeof base] && value !== null);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const updateMutation = useMutation({
    mutationFn: (body: UpdateBroadcasterSettingsBody) => broadcastersApi.updateSettings(channelId, body),
    onSuccess: response => {
      qc.setQueryData(["settings", channelId], response.data);
      qc.invalidateQueries({ queryKey: ["balance", channelId] });
      setDraft({});
      toast.success(t("ops.saved"));
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (isError || !settings) return <QueryError onRetry={() => void refetch()} />;

  const set = <K extends keyof UpdateBroadcasterSettingsBody>(key: K, val: UpdateBroadcasterSettingsBody[K]) =>
    setDraft((f) => ({ ...f, [key]: val }));

  return (
    <form className="space-y-7" onSubmit={e => { e.preventDefault(); if (dirty && !updateMutation.isPending) updateMutation.mutate(draft); }}>
      <fieldset disabled={updateMutation.isPending} className="space-y-7 min-w-0">
      <Section id="market-integration" title={t("settings.general.marketApiKey")} description={t("settings.general.marketApiKeyDesc")}>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground mb-3">{t("ops.keyHelp")}</p>
          <Label htmlFor="market_api_key">{t("settings.general.marketApiKey")}</Label>
          <Input
            id="market_api_key"
            type="password"
            autoComplete="new-password"
            value={form.market_api_key ?? ""}
            placeholder={settings?.market_api_key_set ? t("settings.general.marketKeyPlaceholderSet") : t("settings.general.marketKeyPlaceholderEmpty")}
            onChange={(e) => set("market_api_key", e.target.value || null)}
          />
          <p className="text-xs text-muted-foreground">
            {settings?.market_api_key_set
              ? t("ops.keyConfigured")
              : t("ops.keyMissing")}
          </p>
        </div>
      </Section>

      <Section id="bot-processing" title={t("settings.general.botStatus")} description={t("settings.general.botStatusDesc")}>
        <div className="space-y-4">
          <ToggleField
            id="is_active"
            label={t("settings.general.botActive")}
            description={t("settings.general.botActiveDesc")}
            checked={form.is_active ?? true}
            onChange={(v) => set("is_active", v)}
          />
          <Separator />
          <ToggleField
            id="add_bot_badge"
            label={t("settings.general.botBadge")}
            description={t("settings.general.botBadgeDesc")}
            checked={form.add_bot_badge ?? false}
            onChange={(v) => set("add_bot_badge", v)}
          />
        </div>
      </Section>

      <Section title={t("settings.general.pricing")} description={t("settings.general.pricingDesc")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="base_price_multiplier">{t("settings.general.baseMultiplier")}</Label>
            <Input
              id="base_price_multiplier"
              type="number"
              required
              min={1}
              value={form.base_price_multiplier ?? ""}
              onChange={(e) => set("base_price_multiplier", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              {t("settings.general.baseMultiplierDesc")}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="update_prices_period">{t("settings.general.updatePeriod")}</Label>
            <Input
              id="update_prices_period"
              type="number"
              required
              min={60}
              value={form.update_prices_period ?? ""}
              onChange={(e) => set("update_prices_period", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              {t("settings.general.updatePeriodDesc")}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="market_chance_to_transfer">{t("settings.general.transferChance")}</Label>
            <Input
              id="market_chance_to_transfer"
              type="number"
              required
              min={0}
              max={100}
              value={form.market_chance_to_transfer ?? ""}
              onChange={(e) => set("market_chance_to_transfer", Number(e.target.value))}
            />
          </div>
        </div>
      </Section>

      <Section title={t("settings.general.pauseIfNoMoney")} description={t("settings.general.pauseIfNoMoneyDesc")}>
        <div className="space-y-4">
          <ToggleField
            id="pause_reward_if_no_money"
            label={t("settings.general.pauseIfNoMoney")}
            description={t("settings.general.pauseIfNoMoneyDesc")}
            checked={form.pause_reward_if_no_money ?? true}
            onChange={(v) => set("pause_reward_if_no_money", v)}
          />
        </div>
      </Section>



      </fieldset>
      {updateMutation.isError && <QueryError message={t("ops.saveError")} />}
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background py-4">
        <p role="status" className="text-xs text-muted-foreground">{t(dirty ? "ops.unsaved" : "ops.noChanges")}</p>
        <div className="flex gap-2"><Button variant="ghost" disabled={!dirty || updateMutation.isPending} onClick={() => setDraft({})}>{t("ops.discard")}</Button><Button type="submit" className="gap-2" disabled={!dirty || updateMutation.isPending}><IconSave />{updateMutation.isPending ? t("common.saving") : t("settings.saveChanges")}</Button></div>
      </div>
    </form>
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

function getCategoryMeta(key: string, t?: (k: string, opt?: any) => string): CategoryMeta {
  const meta = CATEGORY_META[key];
  if (meta) {
    return {
      id: key,
      label: t ? t(`settings.messagesTab.categories.${key}`, { defaultValue: meta.label }) : meta.label,
      description: t ? t(`settings.messagesTab.categories.${key}Desc`, { defaultValue: meta.description }) : meta.description,
    };
  }
  const label = key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { id: key, label, description: `Customizable chat messages for ${label}.` };
}

function formatMessageKey(key: string, t?: (k: string, opt?: any) => string): string {
  if (t) {
    const translated = t(`settings.messagesTab.templates.${key}`, { defaultValue: "" });
    if (translated) return translated;
  }
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Chat Messages Tab ──────────────────────────────────────────────────────
function ChatMessagesTab({ channelId }: { channelId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["chat-messages", channelId],
    queryFn: () => broadcastersApi.getChatMessages(channelId).then((r) => r.data),
  });

  const [edited, setEdited] = useState(false);
  const [messages, setMessages] = useState<Record<string, Record<string, string>>>({});
  const [activeCategory, setActiveCategory] = useState<string>("orders");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    if (data?.messages && !edited) {
      const initial: Record<string, Record<string, string>> = {};
      for (const [cat, catMsgs] of Object.entries(data.messages)) {
        initial[cat] = { ...(catMsgs as Record<string, string>) };
      }
      setMessages(initial);
    }
  }, [data, edited]);

  const updateMutation = useMutation({
    mutationFn: () => broadcastersApi.updateChatMessages(channelId, { messages }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["chat-messages", channelId] }); setEdited(false); toast.success(t("ops.saved")); },
  });

  const categories = useMemo(() => {
    if (!data?.default_messages) return [];
    const desiredOrder = ["orders", "trades", "chat_requirements", "limits"];
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
    setEdited(true);
    setMessages((prev) => ({
      ...prev,
      [cat]: {
        ...(prev[cat] || {}),
        [msgKey]: value,
      },
    }));
  };

  const handleResetMessage = (cat: string, msgKey: string) => {
    setEdited(true);
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
    setEdited(true);
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
  if (isError) return <QueryError onRetry={() => refetch()} />;
  if (!data) return null;

  const currentCatMeta = getCategoryMeta(activeCategory, t);
  const currentCatCustomCount = getCustomCount(activeCategory);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          {t("settings.messagesTab.intro")}{" "}
          <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">{"{buyer}"}</code>.
        </p>
      </div>

      {/* Sub-Tabs Navigation & Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/60">
          {categories.map((catKey) => {
            const meta = getCategoryMeta(catKey, t);
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
            placeholder={t("settings.messagesTab.searchPlaceholder")}
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
                {currentCatCustomCount} {t("settings.messagesTab.customized")}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground font-normal">
                {t("settings.messagesTab.allDefaults")}
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
            {t("settings.messagesTab.resetCategory")}
          </Button>
        )}
      </div>

      {/* Empty Search Results State */}
      {filteredMessages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("settings.messagesTab.noTemplatesMatch", { query: searchQuery, category: currentCatMeta.label })}
          </p>
          {otherCategoryMatches.length > 0 && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p>{t("settings.messagesTab.matchesInOther")}</p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {otherCategoryMatches.map(({ cat, count }) => {
                  const meta = getCategoryMeta(cat, t);
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
            {t("settings.messagesTab.clearSearch")}
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
                        {formatMessageKey(msgKey, t)}
                      </span>
                      <code className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/50">
                        {msgKey}
                      </code>
                      {isCustomized ? (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-500 border-amber-500/30 bg-amber-500/10">
                          {t("settings.messagesTab.customized")}
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
                        {t("settings.messagesTab.insert")}
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
                    <span className="font-medium text-foreground/80">{t("settings.messagesTab.defaultText")}</span>{" "}
                    <span className="italic select-all">{defaultText}</span>
                  </p>
                  {isCustomized && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-destructive hover:underline cursor-pointer font-medium ml-auto"
                      onClick={() => handleResetMessage(activeCategory, msgKey)}
                    >
                      <IconRotateCcw />
                      {t("settings.messagesTab.resetToDefault")}
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
          {updateMutation.isPending ? t("common.saving") : t("settings.messagesTab.saveBtn")}
        </Button>
        {updateMutation.isSuccess && (
          <p className="text-sm text-emerald-400 flex items-center gap-1.5 font-medium">
            <IconCheck /> {t("settings.messagesTab.savedSuccess")}
          </p>
        )}
        {updateMutation.isError && (
          <p className="text-sm text-destructive font-medium">
            {t("settings.messagesTab.saveFailed")}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Permissions Tab ────────────────────────────────────────────────────────
function PermissionsTab({ channelId }: { channelId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [newLogin, setNewLogin] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<PermissionResponse | null>(null);

  const { data: permissions = [], isLoading, isError, refetch } = useQuery({
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
    onSuccess: () => { setRevokeTarget(null); qc.invalidateQueries({ queryKey: ["permissions", channelId] }); },
  });

  return (
    <div className="space-y-6">
      {/* Grant new permission */}
      <Section title={t("settings.permissionsTab.grantTitle")} description={t("settings.permissionsTab.grantDesc")}>
        <div className="flex gap-2">
          <Input
            aria-label={t("settings.permissionsTab.usernamePlaceholder")}
            placeholder={t("settings.permissionsTab.usernamePlaceholder")}
            value={newLogin}
            onChange={(e) => setNewLogin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && newLogin.trim() && !grantMutation.isPending && grantMutation.mutate(newLogin.trim())}
          />
          <Button
            className="gap-2 shrink-0"
            onClick={() => newLogin.trim() && grantMutation.mutate(newLogin.trim())}
            disabled={grantMutation.isPending || !newLogin.trim()}
          >
            <IconPlus />
            {t("settings.permissionsTab.grantBtn")}
          </Button>
        </div>
        {grantMutation.isError && (
          <p className="text-sm text-destructive">
            {t("settings.permissionsTab.grantFailed")}
          </p>
        )}
      </Section>

      <ConfirmAction open={!!revokeTarget} onClose={() => setRevokeTarget(null)} onConfirm={() => { if (revokeTarget && !revokeMutation.isPending) revokeMutation.mutate(revokeTarget.user_id); }} pending={revokeMutation.isPending} destructive title={t("settings.permissionsTab.revokeConfirm", { login: revokeTarget?.user_login })} description={t("ops.revokeDesc")} label={t("ops.revoke")} />
      {/* Current permissions */}
      <Section title={t("settings.permissionsTab.currentTitle")}>
        {isError ? <QueryError onRetry={() => void refetch()} /> : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : permissions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("settings.permissionsTab.noEditors")}
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
                  perm.role.toUpperCase() === "OWNER" ? "border-primary/40 text-primary" : "border-border text-muted-foreground"
                )}>
                  {perm.role.toUpperCase() === "OWNER" ? t("settings.permissionsTab.ownerRole") : perm.role.toUpperCase() === "EDITOR" ? t("settings.permissionsTab.editorRole") : perm.role}
                </Badge>
                {perm.role.toUpperCase() !== "OWNER" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t("ops.revoke")}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setRevokeTarget(perm);
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

// ── Public Catalog Tab (v0.6.0) ────────────────────────────────────────────
function PublicCatalogTab({ channelId, channelLogin }: { channelId: string; channelLogin?: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: settings, isLoading, isError, refetch } = useQuery({
    queryKey: ["settings", channelId],
    queryFn: () => broadcastersApi.getSettings(channelId).then((r) => r.data),
  });

  const [edited, setEdited] = useState(false);
  const [config, setConfig] = useState<PublicRewardsConfig>({
    enabled: true,
    show_cost_points: true,
    show_description: true,
    show_market_price: true,
    show_price_deviation: true,
    show_paused_rewards: true,
    show_pause_reason: true,
    show_cooldown_and_limits: true,
    show_purchase_limits: true,
    show_chat_requirements: true,
    show_pool_items: true,
    show_pool_chances: true,
    show_pool_item_prices: true,
    show_filter_details: true,
  });

  useEffect(() => {
    if (settings?.public_rewards_config && !edited) {
      setConfig({
        enabled: settings.public_rewards_config.enabled ?? true,
        show_cost_points: settings.public_rewards_config.show_cost_points ?? true,
        show_description: settings.public_rewards_config.show_description ?? true,
        show_market_price: settings.public_rewards_config.show_market_price ?? true,
        show_price_deviation: settings.public_rewards_config.show_price_deviation ?? true,
        show_paused_rewards: settings.public_rewards_config.show_paused_rewards ?? true,
        show_pause_reason: settings.public_rewards_config.show_pause_reason ?? true,
        show_cooldown_and_limits: settings.public_rewards_config.show_cooldown_and_limits ?? true,
        show_purchase_limits: settings.public_rewards_config.show_purchase_limits ?? true,
        show_chat_requirements: settings.public_rewards_config.show_chat_requirements ?? true,
        show_pool_items: settings.public_rewards_config.show_pool_items ?? true,
        show_pool_chances: settings.public_rewards_config.show_pool_chances ?? true,
        show_pool_item_prices: settings.public_rewards_config.show_pool_item_prices ?? true,
        show_filter_details: settings.public_rewards_config.show_filter_details ?? true,
      });
    }
  }, [settings, edited]);

  const updateMutation = useMutation({
    mutationFn: (newCfg: PublicRewardsConfig) =>
      broadcastersApi.updateSettings(channelId, { public_rewards_config: newCfg }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["settings", channelId] }); setEdited(false); toast.success(t("ops.saved")); },
  });

  const activeLogin = settings?.channel_login || channelLogin || channelId;
  const showcaseUrl = `${window.location.origin}/c/${activeLogin}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(showcaseUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const setFlag = <K extends keyof PublicRewardsConfig>(key: K, val: boolean) => {
    setEdited(true); setConfig((prev) => ({ ...prev, [key]: val }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (isError) return <QueryError onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      {/* Shareable Link Banner */}
      <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {t("settings.catalogTab.bannerTitle")}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("settings.catalogTab.bannerDesc")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="text-xs h-8 gap-1.5"
            >
              {copied ? <IconCheck /> : null}
              <span>{copied ? t("settings.catalogTab.copied") : t("settings.catalogTab.copyLink")}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => window.open(`/c/${activeLogin}`, "_blank")}
              className="text-xs h-8"
            >
              {t("settings.catalogTab.openShowcase")}
            </Button>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-card border border-border/80 font-mono text-xs text-foreground/90 truncate select-all">
          {showcaseUrl}
        </div>
      </div>

      {/* Master Enable/Disable */}
      <Section title={t("settings.catalogTab.masterTitle")} description={t("settings.catalogTab.masterDesc")}>
        <ToggleField
          id="public_enabled"
          label={t("settings.catalogTab.enableShowcase")}
          description={t("settings.catalogTab.enableShowcaseDesc")}
          checked={config.enabled ?? true}
          onChange={(v) => setFlag("enabled", v)}
        />
      </Section>

      {/* Pricing & Economy */}
      <Section title={t("settings.catalogTab.pricingTitle")} description={t("settings.catalogTab.pricingDesc")}>
        <div className="space-y-4">
          <ToggleField
            id="show_cost_points"
            label={t("settings.catalogTab.showCostPoints")}
            description={t("settings.catalogTab.showCostPointsDesc")}
            checked={config.show_cost_points ?? true}
            onChange={(v) => setFlag("show_cost_points", v)}
          />
          <Separator />
          <ToggleField
            id="show_market_price"
            label={t("settings.catalogTab.showMarketPrice")}
            description={t("settings.catalogTab.showMarketPriceDesc")}
            checked={config.show_market_price ?? true}
            onChange={(v) => setFlag("show_market_price", v)}
          />
          <Separator />
          <ToggleField
            id="show_price_deviation"
            label={t("settings.catalogTab.showPriceDeviation")}
            description={t("settings.catalogTab.showPriceDeviationDesc")}
            checked={config.show_price_deviation ?? true}
            onChange={(v) => setFlag("show_price_deviation", v)}
          />
        </div>
      </Section>

      {/* Skin Pools */}
      <Section title={t("settings.catalogTab.poolTitle")} description={t("settings.catalogTab.poolDesc")}>
        <div className="space-y-4">
          <ToggleField
            id="show_pool_items"
            label={t("settings.catalogTab.showPoolItems")}
            description={t("settings.catalogTab.showPoolItemsDesc")}
            checked={config.show_pool_items ?? true}
            onChange={(v) => setFlag("show_pool_items", v)}
          />
          <Separator />
          <ToggleField
            id="show_pool_chances"
            label={t("settings.catalogTab.showPoolChances")}
            description={t("settings.catalogTab.showPoolChancesDesc")}
            checked={config.show_pool_chances ?? true}
            onChange={(v) => setFlag("show_pool_chances", v)}
          />
          <Separator />
          <ToggleField
            id="show_pool_item_prices"
            label={t("settings.catalogTab.showPoolItemPrices")}
            description={t("settings.catalogTab.showPoolItemPricesDesc")}
            checked={config.show_pool_item_prices ?? true}
            onChange={(v) => setFlag("show_pool_item_prices", v)}
          />
        </div>
      </Section>

      {/* Reward Info & Status */}
      <Section title={t("settings.catalogTab.rewardInfoTitle")} description={t("settings.catalogTab.rewardInfoDesc")}>
        <div className="space-y-4">
          <ToggleField
            id="show_description"
            label={t("settings.catalogTab.showDescription")}
            description={t("settings.catalogTab.showDescriptionDesc")}
            checked={config.show_description ?? true}
            onChange={(v) => setFlag("show_description", v)}
          />
          <Separator />
          <ToggleField
            id="show_paused_rewards"
            label={t("settings.catalogTab.showPausedRewards")}
            description={t("settings.catalogTab.showPausedRewardsDesc")}
            checked={config.show_paused_rewards ?? true}
            onChange={(v) => setFlag("show_paused_rewards", v)}
          />
          <Separator />
          <ToggleField
            id="show_pause_reason"
            label={t("settings.catalogTab.showPauseReason")}
            description={t("settings.catalogTab.showPauseReasonDesc")}
            checked={config.show_pause_reason ?? true}
            onChange={(v) => setFlag("show_pause_reason", v)}
          />
          <Separator />
          <ToggleField
            id="show_filter_details"
            label={t("settings.catalogTab.showFilterDetails")}
            description={t("settings.catalogTab.showFilterDetailsDesc")}
            checked={config.show_filter_details ?? true}
            onChange={(v) => setFlag("show_filter_details", v)}
          />
        </div>
      </Section>

      {/* Limits & Cooldowns */}
      <Section title={t("settings.catalogTab.limitsTitle")} description={t("settings.catalogTab.limitsDesc")}>
        <div className="space-y-4">
          <ToggleField
            id="show_cooldown_and_limits"
            label={t("settings.catalogTab.showCooldownAndLimits")}
            description={t("settings.catalogTab.showCooldownAndLimitsDesc")}
            checked={config.show_cooldown_and_limits ?? true}
            onChange={(v) => setFlag("show_cooldown_and_limits", v)}
          />
          <Separator />
          <ToggleField
            id="show_purchase_limits"
            label={t("settings.catalogTab.showPurchaseLimits")}
            description={t("settings.catalogTab.showPurchaseLimitsDesc")}
            checked={config.show_purchase_limits ?? true}
            onChange={(v) => setFlag("show_purchase_limits", v)}
          />
          <Separator />
          <ToggleField
            id="show_chat_requirements"
            label={t("settings.catalogTab.showChatRequirements")}
            description={t("settings.catalogTab.showChatRequirementsDesc")}
            checked={config.show_chat_requirements ?? true}
            onChange={(v) => setFlag("show_chat_requirements", v)}
          />
        </div>
      </Section>

      {/* Save Button */}
      <div className="flex items-center gap-4 pt-4 border-t border-border">
        <Button
          className="gap-2 cursor-pointer"
          onClick={() => updateMutation.mutate(config)}
          disabled={updateMutation.isPending}
        >
          <IconSave />
          {updateMutation.isPending ? t("common.saving") : t("settings.catalogTab.saveBtn")}
        </Button>
        {updateMutation.isSuccess && (
          <p className="text-sm text-emerald-400 flex items-center gap-1.5 font-medium">
            <IconCheck /> {t("settings.catalogTab.savedSuccess")}
          </p>
        )}
      </div>
    </div>
  );
}


export default function SettingsPage() {
  const { t } = useTranslation();
  const { channelId } = useParams<{ channelId: string }>();
  const channelRole = useAppStore(state => state.broadcasters.find(b => b.channel_id === channelId)?.role.toUpperCase());
  const isOwner = channelRole === "OWNER";

  const { data: settings } = useQuery({
    queryKey: ["settings", channelId],
    queryFn: () => broadcastersApi.getSettings(channelId!).then((r) => r.data),
    enabled: !!channelId,
    staleTime: 60_000,
  });

  if (!channelId) {
    return (
      <div className="page-shell text-center text-muted-foreground">
        {t("settings.noChannel")}
      </div>
    );
  }

  return (
    <div className="page-shell settings-workspace space-y-6 max-w-6xl">
      <PageHeader eyebrow={t("ops.configuration")} title={t("ops.settings")} description={t("ops.settingsDesc")} />

      <Tabs defaultValue="general">
        <TabsList className="mb-7 w-full justify-start bg-transparent border-b border-border rounded-none pb-2">
          <TabsTrigger value="general">{t("settings.tabs.general")}</TabsTrigger>
          <TabsTrigger value="messages">{t("settings.tabs.chatMessages")}</TabsTrigger>
          {isOwner && <TabsTrigger value="permissions">{t("settings.tabs.permissions")}</TabsTrigger>}
          <TabsTrigger value="public">{t("settings.tabs.showcase")}</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab channelId={channelId} />
        </TabsContent>
        <TabsContent value="messages">
          <ChatMessagesTab channelId={channelId} />
        </TabsContent>
        {isOwner && <TabsContent value="permissions"><PermissionsTab channelId={channelId} /></TabsContent>}
        <TabsContent value="public">
          <PublicCatalogTab channelId={channelId} channelLogin={settings?.channel_login} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

