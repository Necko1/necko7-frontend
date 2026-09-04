import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/useAppStore";
import { rewardsApi } from "@/lib/apiClient";
import type { RewardResponse, CreateRewardBody, UpdateRewardBody } from "@/types/api";
import { formatMinorCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import RedemptionList from "@/components/redemptions/RedemptionList";

// ── Icons ──────────────────────────────────────────────────────────────────
const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const IconPause = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
  </svg>
);
const IconPlay = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ── Reward Card ────────────────────────────────────────────────────────────
function RewardCard({
  reward,
  selected,
  onSelect,
  onClick,
}: {
  reward: RewardResponse;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onClick: () => void;
}) {
  const formattedPrice = formatMinorCurrency(reward.current_market_price, reward.currency);

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-2xl border bg-card p-5 cursor-pointer transition-all duration-200 group",
        "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
        selected && "border-primary/60 bg-primary/5 shadow-md shadow-primary/10",
        reward.is_paused && !selected && "opacity-60",
        reward.is_deleted && "opacity-40 pointer-events-none"
      )}
    >
      {/* Checkbox */}
      <div
        className="absolute top-4 right-4 z-10"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(reward.twitch_id, !selected);
        }}
      >
        <div
          className={cn(
            "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
            selected
              ? "bg-primary border-primary"
              : "border-border opacity-0 group-hover:opacity-100"
          )}
        >
          {selected && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {reward.is_paused && (
          <Badge variant="outline" className="status-failed-refund text-xs gap-1">
            <IconPause /> Paused
          </Badge>
        )}
        {reward.market_autobuy && (
          <Badge variant="outline" className="status-completed text-xs">
            Auto-buy
          </Badge>
        )}
        {reward.is_deleted && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Deleted
          </Badge>
        )}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-foreground text-sm leading-tight mb-1 pr-6 line-clamp-2">
        {reward.twitch_title}
      </h3>
      <p className="text-xs text-muted-foreground line-clamp-1 mb-4">
        {reward.market_item_name}
      </p>

      {/* Price info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-background/60 border border-border px-3 py-2">
          <p className="text-xs text-muted-foreground">Market price</p>
          <p className="text-sm font-bold tabular-nums text-foreground">{formattedPrice}</p>
        </div>
        <div className="rounded-lg bg-background/60 border border-border px-3 py-2">
          <p className="text-xs text-muted-foreground">Markup</p>
          <p className="text-sm font-bold tabular-nums text-primary">+{reward.twitch_price_markup_percentage}%</p>
        </div>
      </div>

      {/* Footer meta */}
      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
        <span>CD: {reward.global_cooldown_seconds}s</span>
        <span>·</span>
        <span>Max/stream: {reward.max_redemptions_per_stream}</span>
      </div>
    </div>
  );
}

// ── Create/Edit Form ───────────────────────────────────────────────────────
function RewardForm({
  initial,
  onSubmit,
  loading,
}: {
  initial?: Partial<CreateRewardBody & UpdateRewardBody>;
  onSubmit: (data: CreateRewardBody) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<CreateRewardBody>({
    market_item_name: initial?.market_item_name ?? "",
    twitch_title: initial?.twitch_title ?? "",
    twitch_description: initial?.twitch_description ?? "",
    permissible_market_price_deviation: initial?.permissible_market_price_deviation ?? 10,
    twitch_price_markup_percentage: initial?.twitch_price_markup_percentage ?? 150,
    global_cooldown_seconds: initial?.global_cooldown_seconds ?? 60,
    max_redemptions_per_stream: initial?.max_redemptions_per_stream ?? 0,
    max_redemptions_per_user_per_stream: initial?.max_redemptions_per_user_per_stream ?? 0,
    market_autobuy: initial?.market_autobuy ?? true,
    is_paused: initial?.is_paused ?? false,
  });

  const field = (key: keyof CreateRewardBody) => ({
    value: String(form[key]),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const v = e.target.value;
      const numKeys: (keyof CreateRewardBody)[] = [
        "permissible_market_price_deviation",
        "twitch_price_markup_percentage",
        "global_cooldown_seconds",
        "max_redemptions_per_stream",
        "max_redemptions_per_user_per_stream",
      ];
      setForm((f) => ({
        ...f,
        [key]: numKeys.includes(key) ? Number(v) : v,
      }));
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-5"
    >
      <div className="space-y-2">
        <Label htmlFor="market_item_name">Market Item Name</Label>
        <Input id="market_item_name" placeholder="AWP | Asiimov (Field-Tested)" required {...field("market_item_name")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="twitch_title">Twitch Reward Title</Label>
        <Input id="twitch_title" placeholder="Get AWP Asiimov" required {...field("twitch_title")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="twitch_description">Description</Label>
        <Textarea id="twitch_description" placeholder="Redeem to get this skin delivered to your Steam account." rows={2} {...field("twitch_description")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="twitch_price_markup_percentage">Price Markup %</Label>
          <Input id="twitch_price_markup_percentage" type="number" min={100} max={500} required {...field("twitch_price_markup_percentage")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="permissible_market_price_deviation">Max Deviation %</Label>
          <Input id="permissible_market_price_deviation" type="number" min={0} max={100} required {...field("permissible_market_price_deviation")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="global_cooldown_seconds">Global Cooldown (s)</Label>
          <Input id="global_cooldown_seconds" type="number" min={0} {...field("global_cooldown_seconds")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max_redemptions_per_stream">Max / Stream</Label>
          <Input id="max_redemptions_per_stream" type="number" min={0} {...field("max_redemptions_per_stream")} />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.market_autobuy}
            onChange={(e) => setForm((f) => ({ ...f, market_autobuy: e.target.checked }))}
            className="rounded accent-primary"
          />
          <span className="text-sm">Auto-buy from market</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_paused}
            onChange={(e) => setForm((f) => ({ ...f, is_paused: e.target.checked }))}
            className="rounded accent-primary"
          />
          <span className="text-sm">Create as paused</span>
        </label>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Saving…" : "Save Reward"}
      </Button>
    </form>
  );
}

// ── Edit Sheet ─────────────────────────────────────────────────────────────
function RewardEditSheet({
  reward,
  channelId,
  open,
  onClose,
}: {
  reward: RewardResponse | null;
  channelId: string;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (body: UpdateRewardBody) =>
      rewardsApi.update(channelId, reward!.twitch_id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rewards", channelId] });
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: () => rewardsApi.updatePrice(channelId, reward!.twitch_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rewards", channelId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => rewardsApi.delete(channelId, reward!.twitch_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rewards", channelId] });
      onClose();
    },
  });

  if (!reward) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">{reward.twitch_title}</SheetTitle>
          <SheetDescription className="text-left">
            {reward.market_item_name} · {formatMinorCurrency(reward.current_market_price, reward.currency)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Edit form */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground">Edit Reward</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => updatePriceMutation.mutate()}
                  disabled={updatePriceMutation.isPending}
                >
                  <IconRefresh />
                  Update Price
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() =>
                    updateMutation.mutate({ is_paused: !reward.is_paused })
                  }
                  disabled={updateMutation.isPending}
                >
                  {reward.is_paused ? <IconPlay /> : <IconPause />}
                  {reward.is_paused ? "Unpause" : "Pause"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1.5 text-xs"
                  onClick={() => {
                    if (confirm(`Delete "${reward.twitch_title}"?`)) deleteMutation.mutate();
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <IconTrash />
                </Button>
              </div>
            </div>
            <RewardForm
              initial={reward}
              onSubmit={(data) => updateMutation.mutate(data)}
              loading={updateMutation.isPending}
            />
          </div>

          {/* Redemptions for this reward */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-foreground">Recent Redemptions</h3>
            <RedemptionList channelId={channelId} rewardId={reward.twitch_id} compact />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Create Modal ───────────────────────────────────────────────────────────
function CreateRewardModal({
  channelId,
  open,
  onClose,
}: {
  channelId: string;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (body: CreateRewardBody) => rewardsApi.create(channelId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rewards", channelId] });
      onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Reward</DialogTitle>
          <DialogDescription>
            The reward will be created on Twitch and linked to the market item.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          <RewardForm
            onSubmit={(data) => createMutation.mutate(data)}
            loading={createMutation.isPending}
          />
          {createMutation.error && (
            <p className="text-sm text-destructive mt-2">
              {(createMutation.error as Error).message}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Bulk Action Bar ────────────────────────────────────────────────────────
function BulkActionBar({
  count,
  onPause,
  onUnpause,
  onDelete,
  onClear,
  loading,
}: {
  count: number;
  onPause: () => void;
  onUnpause: () => void;
  onDelete: () => void;
  onClear: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/30 bg-primary/5">
      <span className="text-sm font-medium text-primary">{count} selected</span>
      <Separator orientation="vertical" className="h-4" />
      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={onPause} disabled={loading}>
        <IconPause /> Pause all
      </Button>
      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={onUnpause} disabled={loading}>
        <IconPlay /> Unpause all
      </Button>
      <Button size="sm" variant="destructive" className="gap-1.5 text-xs" onClick={onDelete} disabled={loading}>
        <IconTrash /> Delete all
      </Button>
      <Button size="sm" variant="ghost" className="gap-1.5 text-xs ml-auto" onClick={onClear}>
        <IconClose /> Clear
      </Button>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function RewardsPage() {
  const { selectedBroadcasterId } = useAppStore();
  const channelId = selectedBroadcasterId ?? "";
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterPaused, setFilterPaused] = useState<"all" | "paused" | "active">("all");
  const [showDeleted, setShowDeleted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingReward, setEditingReward] = useState<RewardResponse | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ["rewards", channelId, showDeleted],
    queryFn: () =>
      rewardsApi
        .list(channelId, { is_deleted: showDeleted ? null : false })
        .then((r) => r.data),
    enabled: !!channelId,
  });

  const batchMutation = useMutation({
    mutationFn: (action: "pause" | "unpause" | "delete") =>
      rewardsApi.batch(channelId, {
        action,
        reward_ids: Array.from(selectedIds),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rewards", channelId] });
      setSelectedIds(new Set());
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rewards.filter((r) => {
      if (filterPaused === "paused" && !r.is_paused) return false;
      if (filterPaused === "active" && r.is_paused) return false;
      if (!q) return true;
      return (
        r.twitch_title.toLowerCase().includes(q) ||
        r.market_item_name.toLowerCase().includes(q) ||
        r.twitch_description.toLowerCase().includes(q)
      );
    });
  }, [rewards, search, filterPaused]);

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  if (!channelId) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <p className="text-muted-foreground">Select a broadcaster channel first.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rewards</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} reward{filtered.length !== 1 ? "s" : ""}
            {search && ` matching "${search}"`}
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <IconPlus />
          New Reward
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <IconSearch />
          </span>
          <Input
            className="pl-9"
            placeholder="Search by title, skin, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          {(["all", "active", "paused"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterPaused(f)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all",
                filterPaused === f
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
            className="rounded accent-primary"
          />
          Show deleted
        </label>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onPause={() => batchMutation.mutate("pause")}
          onUnpause={() => batchMutation.mutate("unpause")}
          onDelete={() => {
            if (confirm(`Delete ${selectedIds.size} rewards?`)) batchMutation.mutate("delete");
          }}
          onClear={() => setSelectedIds(new Set())}
          loading={batchMutation.isPending}
        />
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-64 text-center space-y-3">
          <p className="text-muted-foreground">No rewards found</p>
          <Button variant="outline" onClick={() => { setSearch(""); setFilterPaused("all"); }}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((reward) => (
            <RewardCard
              key={reward.twitch_id}
              reward={reward}
              selected={selectedIds.has(reward.twitch_id)}
              onSelect={toggleSelect}
              onClick={() => setEditingReward(reward)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <RewardEditSheet
        reward={editingReward}
        channelId={channelId}
        open={!!editingReward}
        onClose={() => setEditingReward(null)}
      />
      <CreateRewardModal
        channelId={channelId}
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  );
}
