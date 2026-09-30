import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { manualOrdersApi } from "@/lib/manualOrdersApi";
import { orderDate, orderError, orderMoney, splitTags, useDebounced } from "@/lib/manualOrderUtils";
import { useAppStore } from "@/store/useAppStore";
import type { ManualOrder, ManualAttempt } from "@/types/manualOrders";
import ManualOrderWizard from "@/components/manual-orders/ManualOrderWizard";
import SkinImage from "@/components/common/SkinImage";
import { PageHeader, EmptyState, QueryError } from "@/components/common/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statuses = ["WAITING_OPERATOR","ORDER_PENDING","TRADE_WAITING","TRADE_ACCEPTED","RETRY_AVAILABLE","INSUFFICIENT_FUNDS","TRADE_LINK_REQUIRED","RECONCILIATION_REQUIRED","OPERATOR_REVIEW","DELIVERED","CANCELLED"];
const active = new Set(["WAITING_OPERATOR","ORDER_PENDING","TRADE_WAITING","TRADE_ACCEPTED","RECONCILIATION_REQUIRED"]);
function Status({ status }: { status: string }) {
  const { t } = useTranslation();
  return <Badge variant="outline" className="manual-status" data-status={status}>{t(`manual.statuses.${status}`,{defaultValue:t("manual.statuses.OPERATOR_REVIEW")})}</Badge>;
}

export default function ManualOrdersPage() {
  const channel = useAppStore(s => s.selectedBroadcasterId) || "";
  return <ChannelManualOrdersPage key={channel} channel={channel} />;
}

function ChannelManualOrdersPage({ channel }: { channel: string }) {
  const { t } = useTranslation(); const { orderId } = useParams(); const navigate = useNavigate(); const qc = useQueryClient();
  const broadcaster = useAppStore(s => s.broadcasters.find(b => b.channel_id === s.selectedBroadcasterId));
  const [wizard, setWizard] = useState<"create" | ManualOrder | null>(null);
  const changed = (order: ManualOrder) => {
    setWizard(null); qc.setQueryData(["manual-order",channel,order.id],order);
    void qc.invalidateQueries({queryKey:["manual-orders",channel]});
    void qc.invalidateQueries({queryKey:["manual-audit",channel,order.id]});
    navigate(`/manual-orders/${order.id}`);
  };
  return <div className="page-shell">
    <PageHeader eyebrow={t("ops.operations")} title={t("manual.title")} description={t("manual.description")}
      actions={<Button onClick={() => setWizard("create")}>{t("manual.create")}</Button>} />
    {orderId ? <OrderDetail key={orderId} channel={channel} id={orderId} onRetry={setWizard} /> : <OrderList channel={channel} onCreate={() => setWizard("create")} />}
    {wizard && <ManualOrderWizard channel={channel} channelLabel={broadcaster?.display_name || broadcaster?.channel_login || channel}
      order={wizard === "create" ? undefined : wizard} onClose={() => setWizard(null)} onSuccess={changed} />}
  </div>;
}

function OrderList({ channel, onCreate }: { channel: string; onCreate: () => void }) {
  const { t, i18n } = useTranslation();
  const [search,setSearch] = useState(""); const settled = useDebounced(search);
  const [status,setStatus] = useState(""); const [tag,setTag] = useState(""); const settledTag = useDebounced(tag);
  const [offset,setOffset] = useState(0);
  const orders = useQuery({queryKey:["manual-orders",channel,settled,status,settledTag,offset],
    queryFn:() => manualOrdersApi.list(channel,{search:settled,status,tag:settledTag,offset,limit:25}),enabled:!!channel,refetchInterval:15_000});
  return <div className="space-y-5">
    <div className="manual-toolbar">
      <Input aria-label={t("manual.searchOrders")} placeholder={t("manual.searchOrders")} value={search} onChange={e=>{setSearch(e.target.value);setOffset(0);}} />
      <Select items={[{value:"",label:t("manual.allStatuses")},...statuses.map(s=>({value:s,label:t(`manual.statuses.${s}`)}))]}
        value={status} onValueChange={value=>{setStatus(value ?? "");setOffset(0);}}>
        <SelectTrigger aria-label={t("manual.status")}><SelectValue /></SelectTrigger>
        <SelectContent alignItemWithTrigger={false} className="w-max min-w-[var(--anchor-width)] max-w-[calc(100vw-2rem)] rounded-lg"><SelectItem value="">{t("manual.allStatuses")}</SelectItem>{statuses.map(s=><SelectItem key={s} value={s} className="rounded-sm [&>span:first-child]:whitespace-normal [&>span:first-child]:break-words">{t(`manual.statuses.${s}`)}</SelectItem>)}</SelectContent>
      </Select>
      <Input aria-label={t("manual.filterTag")} placeholder={t("manual.allTags")} value={tag} onChange={e=>{setTag(e.target.value);setOffset(0);}} />
      <Button variant="outline" onClick={()=>orders.refetch()} disabled={orders.isFetching}>{t("manual.refresh")}</Button>
    </div>
    {orders.isPending ? <Skeleton className="h-64 w-full" /> : orders.isError ? <QueryError message={orderError(orders.error,t)} onRetry={()=>orders.refetch()} />
      : !orders.data.items.length ? <EmptyState title={t(settled||status||settledTag ? "manual.noOrders":"manual.empty")}
          description={t(settled||status||settledTag ? "manual.noOrdersHint":"manual.emptyHint")} action={!(settled||status||settledTag)&&<Button onClick={onCreate}>{t("manual.create")}</Button>} />
      : <>
        <div className="manual-order-list">{orders.data.items.map(order=>{
          const attempt=order.attempts.at(-1);
          return <Link key={order.id} to={`/manual-orders/${order.id}`} className="manual-order-row">
            <div className="manual-row-image"><SkinImage marketItemName={order.item_name} /></div>
            <div className="min-w-0 space-y-1.5"><strong className="manual-row-name">{order.item_name}</strong><p className="text-xs text-muted-foreground">Steam partner {order.steam_partner} · {orderDate(order.created_at,i18n.language)}</p>
              <div className="flex flex-wrap gap-1.5">{order.tags.map(tag=><Badge key={tag} variant="secondary">{tag}</Badge>)}</div>
              {order.description&&<p className="text-xs text-muted-foreground line-clamp-2 break-words">{order.description}</p>}</div>
            <div className="manual-row-summary"><Status status={order.status} /><span>{orderMoney(attempt?.max_price??order.initial_max_price,order.currency,i18n.language)}</span><small>{order.id.slice(0,8)}</small></div>
          </Link>;
        })}</div>
        <div className="manual-pager"><Button variant="outline" disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-25))}>{t("manual.previous")}</Button>
          <span>{t("manual.page",{from:offset+1,to:Math.min(offset+25,orders.data.total),total:orders.data.total})}</span><Button variant="outline" disabled={offset+25>=orders.data.total} onClick={()=>setOffset(offset+25)}>{t("manual.nextPage")}</Button></div>
      </>}
  </div>;
}

function OrderDetail({ channel, id, onRetry }: { channel: string; id: string; onRetry: (order: ManualOrder) => void }) {
  const {t,i18n}=useTranslation(); const qc=useQueryClient();
  const order=useQuery({queryKey:["manual-order",channel,id],queryFn:()=>manualOrdersApi.detail(channel,id),enabled:!!channel,
    refetchInterval:query=>!query.state.data||active.has(query.state.data.status)?15_000:false});
  const audit=useQuery({queryKey:["manual-audit",channel,id],queryFn:()=>manualOrdersApi.audit(channel,id),enabled:!!order.data,
    refetchInterval:order.data&&active.has(order.data.status)?15_000:false});
  const [dialog,setDialog]=useState<"metadata"|"close"|null>(null);
  const [description,setDescription]=useState(""); const [tags,setTags]=useState(""); const [reason,setReason]=useState("");
  const changed=(result:ManualOrder)=>{qc.setQueryData(["manual-order",channel,id],result);void qc.invalidateQueries({queryKey:["manual-orders",channel]});void qc.invalidateQueries({queryKey:["manual-audit",channel,id]});setDialog(null);};
  const metadata=useMutation({mutationFn:()=>manualOrdersApi.metadata(channel,id,{description,tags:splitTags(tags)}),onSuccess:result=>{changed(result);toast.success(t("manual.saved"));},onError:()=>{}});
  const close=useMutation({mutationFn:()=>manualOrdersApi.close(channel,id,reason),onSuccess:changed,onError:()=>{void order.refetch();}});
  const busy=metadata.isPending||close.isPending;
  const open=(kind:"metadata"|"close")=>{setDescription(order.data?.description||"");setTags(order.data?.tags.join(", ")||"");setReason("");metadata.reset();close.reset();setDialog(kind);};
  if(order.isPending)return <Skeleton className="h-80"/>;
  if(order.isError)return <QueryError message={orderError(order.error,t)} onRetry={()=>order.refetch()}/>;
  const o=order.data; const last=o.attempts.at(-1);
  const tradeUrl=last?.trade_id&&/^\d+$/.test(last.trade_id)?`https://steamcommunity.com/tradeoffer/${last.trade_id}/`:null;
  const copy=()=>{if(tradeUrl)void navigator.clipboard.writeText(tradeUrl).then(()=>toast.success(t("manual.copied"))).catch(()=>toast.error(t("manual.copyFailed")));};
  return <div className="space-y-6">
    <div className="manual-detail-toolbar"><Link to="/manual-orders" className="text-sm text-primary">← {t("manual.backToList")}</Link><Button variant="outline" disabled={order.isFetching} onClick={()=>{void order.refetch();void audit.refetch();}}>{t("manual.refresh")}</Button></div>
    <section className="manual-panel">
      <div className="manual-order-heading"><div className="manual-selected"><SkinImage marketItemName={o.item_name}/><div><p className="eyebrow mb-2">{t("manual.origin")}</p><h2 className="text-xl font-semibold break-words">{o.item_name}</h2></div></div><Status status={o.status}/></div>
      <div aria-live="polite" className="manual-next"><h3>{t("manual.nextAction")}</h3><p>{t(`manual.explanations.${o.status}`,{defaultValue:t("manual.explanations.OPERATOR_REVIEW")})}</p></div>
      <div className="manual-actions manual-detail-actions">
        {tradeUrl&&o.status==="TRADE_WAITING"&&<><Button render={<a href={tradeUrl} target="_blank" rel="noreferrer"/>}>{t("manual.steamTrade")} ↗</Button><Button variant="outline" onClick={copy}>{t("manual.copyTrade")}</Button></>}
        {o.can_retry&&<Button onClick={()=>onRetry(o)}>{t("manual.retry")}</Button>}
        <Button variant="outline" onClick={()=>open("metadata")}>{t("manual.edit")}</Button>
        {o.can_close&&<Button variant="destructive" onClick={()=>open("close")}>{t("manual.close")}</Button>}
      </div>
      <dl className="manual-facts mt-6">
        <div><dt>{t("manual.orderId")}</dt><dd className="font-mono text-xs break-all">{o.id}</dd></div><div><dt>{t("manual.recipient")}</dt><dd>{o.steam_partner}</dd></div>
        <div><dt>{t("manual.createdBy")}</dt><dd>{o.created_by}</dd></div><div><dt>{t("manual.created")}</dt><dd>{orderDate(o.created_at,i18n.language)}</dd></div>
        <div><dt>{t("manual.descriptionLabel")}</dt><dd className="whitespace-pre-wrap">{o.description||t("manual.noDescription")}</dd></div>
        <div><dt>{t("manual.tags")}</dt><dd className="flex flex-wrap gap-1.5">{o.tags.length?o.tags.map(tag=><Badge key={tag} variant="secondary">{tag}</Badge>):t("manual.noTags")}</dd></div>
        {o.close_reason&&<><div><dt>{t("manual.closedReason")}</dt><dd>{o.close_reason}</dd></div><div><dt>{t("manual.closedBy")}</dt><dd>{o.closed_by} · {orderDate(o.closed_at,i18n.language)}</dd></div></>}
      </dl>
    </section>
    <div className="manual-detail-columns">
      <section className="manual-panel min-w-0"><h2 className="section-title mb-4">{t("manual.attempts")}</h2>
        {!o.attempts.length?<p className="text-sm text-muted-foreground">{t("manual.noAttempts")}</p>:<div className="space-y-5">{[...o.attempts].reverse().map((attempt,index)=><Attempt key={attempt.custom_id} attempt={attempt} number={o.attempts.length-index} currency={o.currency}
          acceptedAt={audit.data?.find(e=>e.event_type==="buyer_accepted_trade"&&e.attempt_custom_id===attempt.custom_id)?.created_at} />)}</div>}
      </section>
      <section className="manual-panel min-w-0"><h2 className="section-title mb-2">{t("manual.history")}</h2><p className="text-xs text-muted-foreground mb-5">{t("manual.retained")}</p>
        {audit.isPending?<Skeleton className="h-32"/>:audit.isError?<QueryError onRetry={()=>audit.refetch()}/>:<><ol className="manual-timeline">{audit.data?.filter(event=>event.event_type!=="inventory_created").map(event=><li key={event.id}>
          <span className="manual-event-dot" aria-hidden="true"/><div><strong>{t(`manual.events.${event.event_type}`,{defaultValue:t("manual.unknownEvent")})}</strong><p>{orderDate(event.created_at,i18n.language)}{event.actor_user_id&&` · ${event.actor_user_id}`}</p>
            {event.event_type==="manual_order_closed"&&typeof event.details.reason==="string"&&<p className="text-foreground whitespace-pre-wrap">{event.details.reason}</p>}
            {event.event_type==="manual_metadata_updated"&&<details><summary>{t("manual.descriptionLabel")} / {t("manual.tags")}</summary><pre className="manual-evidence">{JSON.stringify(event.details,null,2)}</pre></details>}
          </div></li>)}</ol>
          <details className="builder-advanced"><summary>{t("manual.auditEvidence")}</summary><pre className="manual-evidence">{JSON.stringify(audit.data,null,2)}</pre></details></>}
      </section>
    </div>
    {dialog&&<Dialog open onOpenChange={open=>{if(!open&&!busy)setDialog(null);}}><DialogContent className="manual-dialog" showCloseButton={!busy}>
      <DialogHeader><DialogTitle>{t(dialog==="close"?"manual.closeTitle":"manual.edit")}</DialogTitle><DialogDescription>{t(dialog==="close"?"manual.closeHint":"manual.permanent")}</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={e=>{e.preventDefault();if(!busy){if(dialog==="close")close.mutate();else metadata.mutate();}}}>
        {dialog==="close"?<label className="manual-field"><span>{t("manual.reason")}</span><Textarea autoFocus required maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)} /></label>
          :<><label className="manual-field"><span>{t("manual.descriptionLabel")}</span><Textarea autoFocus maxLength={4000} value={description} onChange={e=>setDescription(e.target.value)} /></label>
            <label className="manual-field"><span>{t("manual.tags")}</span><Input value={tags} onChange={e=>setTags(e.target.value)}/><small>{t("manual.tagsHint")}</small></label></>}
        {(metadata.error||close.error)&&<p role="alert" className="manual-error">{orderError(metadata.error||close.error,t)}</p>}
        <div className="manual-actions"><Button type="button" variant="outline" disabled={busy} onClick={()=>setDialog(null)}>{t("manual.cancel")}</Button>
          <Button type="submit" variant={dialog==="close"?"destructive":"default"} disabled={busy||(dialog==="close"&&!reason.trim())}>{t(busy?"manual.loading":dialog==="close"?"manual.closeSubmit":"manual.save")}</Button></div>
      </form>
    </DialogContent></Dialog>}
  </div>;
}

function Attempt({ attempt:a, number, currency, acceptedAt }: { attempt:ManualAttempt; number:number; currency:string; acceptedAt?:string }) {
  const {t,i18n}=useTranslation();
  const trade=a.trade_id&&/^\d+$/.test(a.trade_id)?`https://steamcommunity.com/tradeoffer/${a.trade_id}/`:null;
  return <article className="manual-attempt">
    <div className="flex flex-wrap justify-between gap-2 mb-3"><h3 className="font-semibold">{t("manual.attempt",{number})}</h3><span className="text-xs text-muted-foreground">{orderDate(a.created_at,i18n.language)}</span></div>
    <p className="text-sm mb-3">{a.outcome_kind?t(`manual.outcomes.${a.outcome_kind}`,{defaultValue:t("manual.outcomes.market_rejected")}):t(`manual.statuses.${a.status==="ORDER_CREATED"||a.status==="CALLING"?"ORDER_PENDING":a.status}`,{defaultValue:t("manual.statuses.OPERATOR_REVIEW")})}</p>
    <dl className="manual-facts">
      <div><dt>{t("manual.price")}</dt><dd>{orderMoney(a.max_price,currency,i18n.language)}</dd></div><div><dt>{t("manual.chance")}</dt><dd>{a.chance_to_transfer}%</dd></div>
      <div><dt>{t("manual.paid")}</dt><dd>{a.paid_price==null?t("manual.notRecorded"):orderMoney(a.paid_price,currency,i18n.language)}</dd></div>
      <div><dt>{t("manual.initiator")}</dt><dd>{a.initiator_user_id||"—"}</dd></div>
      <div><dt>{t("manual.tradeLink")}</dt><dd className="break-all">{a.trade_link}</dd></div>
      {a.send_until&&<div><dt>{t("manual.sentDeadline")}</dt><dd>{orderDate(a.send_until,i18n.language)}</dd></div>}
      {a.receive_until&&<div><dt>{t("manual.acceptDeadline")}</dt><dd>{orderDate(a.receive_until,i18n.language)}</dd></div>}
      {acceptedAt&&<div><dt>{t("manual.acceptedAt")}</dt><dd>{orderDate(acceptedAt,i18n.language)}</dd></div>}
      {a.settlement&&<div><dt>{t("manual.settlementAt")}</dt><dd>{orderDate(a.settlement,i18n.language)}</dd></div>}
      {a.last_checked_at&&<div><dt>{t("manual.checkedAt")}</dt><dd>{orderDate(a.last_checked_at,i18n.language)}</dd></div>}
    </dl>
    {trade&&<a href={trade} target="_blank" rel="noreferrer" className="text-sm text-primary inline-block mt-3">{t("manual.steamTrade")} ↗</a>}
    <details className="mt-3 text-xs text-muted-foreground"><summary>{t("manual.rawEvidence")}</summary><dl className="manual-facts mt-3"><div><dt>{t("manual.customId")}</dt><dd>{a.custom_id}</dd></div><div><dt>{t("manual.marketId")}</dt><dd>{a.market_order_id||"—"}</dd></div></dl>
      <pre className="manual-evidence">{JSON.stringify({stage:a.last_market_stage,outcome:a.outcome_kind,reason:a.outcome_detail,causer:a.causer,cancellation_reason:a.cancellation_reason,refund:a.market_refund},null,2)}</pre></details>
  </article>;
}
