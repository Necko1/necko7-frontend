import { useState, useEffect } from "react";
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

// ── Chat Messages Tab ──────────────────────────────────────────────────────
function ChatMessagesTab({ channelId }: { channelId: string }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["chat-messages", channelId],
    queryFn: () => broadcastersApi.getChatMessages(channelId).then((r) => r.data),
  });

  const [messages, setMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) setMessages({ ...data.messages });
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: () => broadcastersApi.updateChatMessages(channelId, { messages }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-messages", channelId] }),
  });

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Customize the bot's Twitch chat messages. Use placeholders like{" "}
        <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">{"{buyer}"}</code> where indicated.
      </p>

      {Object.entries(data.default_messages).map(([msgId, defaultText]) => {
        const placeholders = data.placeholders[msgId] ?? [];
        return (
          <div key={msgId} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                {msgId}
              </code>
              {placeholders.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {placeholders.map((p) => (
                    <Badge key={p} variant="outline" className="text-xs font-mono">
                      {`{${p}}`}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Textarea
              rows={2}
              placeholder={defaultText}
              value={messages[msgId] ?? ""}
              onChange={(e) =>
                setMessages((m) => ({ ...m, [msgId]: e.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Default:{" "}
              <span className="italic">{defaultText}</span>
            </p>
            {data.custom_messages[msgId] && (
              <button
                className="text-xs text-destructive hover:underline"
                onClick={() =>
                  setMessages((m) => {
                    const next = { ...m };
                    delete next[msgId];
                    return next;
                  })
                }
              >
                Reset to default
              </button>
            )}
          </div>
        );
      })}

      <Button
        className="gap-2"
        onClick={() => updateMutation.mutate()}
        disabled={updateMutation.isPending}
      >
        <IconSave />
        {updateMutation.isPending ? "Saving…" : "Save Messages"}
      </Button>
      {updateMutation.isSuccess && (
        <p className="text-sm text-emerald-400">Messages saved successfully.</p>
      )}
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

// ── Main Settings Page ─────────────────────────────────────────────────────
export default function SettingsPage() {
  const { channelId } = useParams<{ channelId: string }>();

  if (!channelId) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No channel selected.
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Channel Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure bot behavior, pricing, messages, and access control.
        </p>
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
