import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import InventoryList from "@/components/profiles/InventoryList";
import { PageHeader, QueryError } from "@/components/common/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usersApi } from "@/lib/apiClient";
import { useCopy } from "@/lib/useCopy";

export default function InventoryPage() {
  const c = useCopy();
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["viewer-settings"], queryFn: () => usersApi.getSettings().then(r => r.data) });
  const [autoDraft, setAutoDraft] = useState<boolean | null>(null);
  const [linkDraft, setLinkDraft] = useState<string | null>(null);
  const auto = autoDraft ?? settings.data?.auto_buy_enabled ?? true;
  const link = linkDraft ?? settings.data?.trade_link ?? "";
  const save = useMutation({
    mutationFn: () => usersApi.updateSettings({ auto_buy_enabled: auto, trade_link: link.trim() || null }),
    onSuccess: response => { qc.setQueryData(["viewer-settings"], response.data); setAutoDraft(null); setLinkDraft(null); toast.success(c("Viewer settings saved", "Настройки зрителя сохранены")); },
    onError: () => toast.error(c("Check the Steam trade link and try again.", "Проверьте ссылку обмена Steam и повторите попытку.")),
  });
  return <div className="page-shell profile-shell space-y-7">
    <PageHeader eyebrow={c("Your account", "Ваш аккаунт")} title={c("Inventory", "Инвентарь")} description={c("Your concrete skins, fixed values, and delivery progress across channels.", "Ваши скины, зафиксированная стоимость и доставка на всех каналах.")} actions={<Link to="/me">{c("Your profile", "Ваш профиль")} →</Link>} />
    <section className="space-y-4 border-b border-border pb-6" aria-label={c("Delivery settings", "Настройки доставки")}>
      <div><h2 className="section-title">{c("Delivery settings", "Настройки доставки")}</h2><p className="text-sm text-muted-foreground">{c("These settings apply to future rewards. Existing inventory keeps its original fulfillment decision.", "Настройки применяются к будущим наградам. Уже созданные предметы сохраняют прежний способ выдачи.")}</p></div>
      {settings.isError ? <QueryError onRetry={() => settings.refetch()} /> : <div className="grid gap-4 md:grid-cols-2">
        <label className="flex items-start gap-3 text-sm"><input className="mt-1 accent-lime-400" type="checkbox" checked={auto} disabled={!settings.data || save.isPending} onChange={e => setAutoDraft(e.target.checked)} /><span><strong>{c("Automatically buy eligible rewards", "Автоматически покупать подходящие награды")}</strong><small className="block text-muted-foreground">{c("The reward must also allow auto-buy. Only one initial order is made.", "Награда тоже должна разрешать автопокупку. Создаётся только один первый заказ.")}</small></span></label>
        <label className="space-y-2 text-sm"><span>{c("Saved Steam trade link", "Сохранённая ссылка обмена Steam")}</span><Input value={link} disabled={!settings.data || save.isPending} onChange={e => setLinkDraft(e.target.value)} placeholder="https://steamcommunity.com/tradeoffer/new/?partner=…&token=…" /><small className="block text-muted-foreground">{c("Used only when a reward message has no valid trade link.", "Используется, только если в сообщении награды нет действительной ссылки.")}</small></label>
      </div>}
      <Button disabled={!settings.data || save.isPending || (auto === settings.data?.auto_buy_enabled && link === (settings.data?.trade_link ?? ""))} onClick={() => save.mutate()}>{save.isPending ? c("Saving…", "Сохранение…") : c("Save delivery settings", "Сохранить настройки доставки")}</Button>
    </section>
    <InventoryList />
  </div>;
}
