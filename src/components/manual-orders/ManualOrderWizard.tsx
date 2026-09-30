import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { manualOrdersApi } from "@/lib/manualOrdersApi";
import { majorToMinor, minorToMajor, getCurrencyDivisor } from "@/lib/currency";
import { orderError, orderMoney, splitTags, useDebounced } from "@/lib/manualOrderUtils";
import type { AttemptParameters, CreateManualOrder, ManualOrder, ManualPreview } from "@/types/manualOrders";
import SkinImage from "@/components/common/SkinImage";
import WizardProgress from "@/components/common/WizardProgress";
import { EmptyState, QueryError } from "@/components/common/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Pending = { body: CreateManualOrder | AttemptParameters; item: string; currency: string; minimum: number };
function readPending(key: string): Pending | null {
  try { const value = JSON.parse(sessionStorage.getItem(key) || "null"); return value?.body?.request_id && value.item && value.currency ? value : null; }
  catch { return null; }
}
function remember(key: string, pending: Pending | null) {
  try { if (pending) sessionStorage.setItem(key, JSON.stringify(pending)); else sessionStorage.removeItem(key); } catch { /* Server idempotency still protects this mounted form. */ }
}

export default function ManualOrderWizard({ channel, channelLabel, order, onClose, onSuccess }: {
  channel: string; channelLabel: string; order?: ManualOrder; onClose: () => void; onSuccess: (order: ManualOrder) => void;
}) {
  const { t, i18n } = useTranslation();
  const storageKey = `manual-pending:${channel}:${order?.id || "create"}`;
  const [pending, setPending] = useState<Pending | null>(() => readPending(storageKey));
  const last = order?.attempts.at(-1);
  const [step, setStep] = useState(pending ? 2 : order ? 1 : 0);
  const [search, setSearch] = useState(""); const settledSearch = useDebounced(search);
  const [offset, setOffset] = useState(0);
  const [quote, setQuote] = useState<ManualPreview | null>(() => pending ? { item_name: pending.item, currency: pending.currency,
    min_price: pending.minimum, max_price: pending.body.max_price, chance_to_transfer: pending.body.chance_to_transfer,
    trade_link: pending.body.trade_link, steam_partner: null } : null);
  const [selectedItem, setSelectedItem] = useState(order?.item_name || pending?.item || "");
  const [maxPrice, setMaxPrice] = useState(last ? String(minorToMajor(last.max_price, order!.currency)) : "");
  const [chance, setChance] = useState(last ? String(last.chance_to_transfer) : "");
  const [trade, setTrade] = useState(last?.trade_link || "");
  const [description, setDescription] = useState(""); const [tags, setTags] = useState("");
  const [requestId, setRequestId] = useState(() => pending?.body.request_id || crypto.randomUUID());
  const submitLock = useRef(false);
  const catalog = useQuery({ queryKey: ["manual-catalog", channel, settledSearch, offset],
    queryFn: () => manualOrdersApi.catalog(channel, settledSearch, offset), enabled: step === 0, retry: false });
  const select = useMutation({ mutationFn: (name: string) => manualOrdersApi.preview(channel, { item_name: name, ...(order ? { currency: order.currency } : {}) }),
    onMutate: name => setSelectedItem(name),
    onSuccess: data => { setQuote(data); if (!order) { setMaxPrice(String(minorToMajor(data.min_price, data.currency))); setChance(String(data.chance_to_transfer)); } setStep(1); }, onError: () => {} });
  const selectRef = useRef(select.mutate);
  useEffect(() => { if (order && !pending) selectRef.current(order.item_name); }, [order, pending]);
  const preview = useMutation({ mutationFn: () => {
    if (!quote) throw new Error("Missing item");
    return manualOrdersApi.preview(channel, { item_name: quote.item_name, currency: quote.currency,
      max_price: majorToMinor(Number(maxPrice.replace(",", ".")), quote.currency), chance_to_transfer: Number(chance), trade_link: trade });
  }, onSuccess: data => { setQuote(data); setStep(2); }, onError: () => {} });
  const submit = useMutation({ mutationFn: (body: CreateManualOrder | AttemptParameters) => order
    ? manualOrdersApi.retry(channel, order.id, body) : manualOrdersApi.create(channel, body as CreateManualOrder),
    onSuccess: result => { remember(storageKey, null); onSuccess(result); },
    onError: error => {
      // A network/5xx result may have committed. Keep exactly the same request,
      // including across reloads, until its server identity has been recovered.
      if (isAxiosError(error) && error.response && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 409) {
        remember(storageKey, null); setPending(null); setRequestId(crypto.randomUUID());
      }
    }, onSettled: () => { submitLock.current = false; } });
  const busy = select.isPending || preview.isPending || submit.isPending;
  const body: CreateManualOrder | AttemptParameters | null = pending?.body || (quote ? {
    request_id: requestId, max_price: quote.max_price, chance_to_transfer: quote.chance_to_transfer,
    trade_link: quote.trade_link || trade,
    ...(!order ? { item_name: quote.item_name, currency: quote.currency, description, tags: splitTags(tags) } : {}),
  } : null);
  const createBody = !order && body ? body as CreateManualOrder : null;
  const reviewDescription = createBody?.description ?? order?.description ?? "";
  const reviewTags = createBody?.tags ?? order?.tags ?? [];
  const confirm = () => {
    if (!body || !quote || submitLock.current) return;
    submitLock.current = true;
    const saved = { body, item: quote.item_name, currency: quote.currency, minimum: quote.min_price };
    remember(storageKey, saved); setPending(saved); submit.mutate(body);
  };
  const fieldError = select.error || preview.error || submit.error;
  const recipient = quote?.steam_partner || (() => { try { return new URL(body?.trade_link || "").searchParams.get("partner"); } catch { return null; } })();
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="manual-dialog sm:max-w-3xl" showCloseButton={!busy}>
      <DialogHeader><DialogTitle>{t(order ? "manual.retryTitle" : "manual.createTitle")}</DialogTitle>
        <DialogDescription>{t(order ? "manual.retryHint" : "manual.previewHint")}</DialogDescription></DialogHeader>
      <WizardProgress label={t("manual.setup")} steps={[0,1,2].map(n => t(`manual.steps.${n}`))} current={step}
        isDisabled={n => busy || !!pending || (!!order && n === 0) || (n > step && !(step === 1 && n === 2))}
        onChange={n => { if (n === 2 && step === 1) (document.getElementById("manual-parameters") as HTMLFormElement)?.requestSubmit(); else setStep(n); }} />
      {fieldError && <div role="alert" className="manual-error">{orderError(fieldError, t)}</div>}
      {pending && <p role="status" className="manual-notice">{t("manual.pendingRequest")}</p>}
      {step === 0 && <div className="space-y-4">
        <div className="wizard-heading"><h3>{t("manual.itemHeading")}</h3><p>{t("manual.searchHint")}</p></div>
        <label className="manual-field"><span>{t("manual.searchItems")}</span><Input autoFocus value={search} onChange={e => { setSearch(e.target.value); setOffset(0); }} placeholder="Glock-18 | Vogue" /></label>
        {catalog.isPending ? <div className="manual-catalog">{Array.from({length:6},(_,i) => <Skeleton key={i} className="h-40 rounded-lg" />)}</div>
          : catalog.isError ? <QueryError message={orderError(catalog.error,t)} onRetry={() => catalog.refetch()} />
          : !catalog.data?.items.length ? <EmptyState title={t("manual.noItems")} description={t("manual.noItemsHint")} />
          : <>
            <div className="manual-catalog" aria-busy={select.isPending}>{catalog.data.items.map(item => <button type="button" key={item.market_hash_name} disabled={busy}
              className="manual-skin" aria-pressed={selectedItem === item.market_hash_name} aria-label={`${item.market_hash_name}, ${orderMoney(item.price,catalog.data.currency,i18n.language)}`} onClick={() => select.mutate(item.market_hash_name)}>
              <SkinImage marketItemName={item.market_hash_name} /><strong>{item.market_hash_name}</strong>
              <span>{orderMoney(item.price,catalog.data.currency,i18n.language)}</span><small>{t("manual.availability",{count:item.volume})}</small>
            </button>)}</div>
            <div className="manual-pager"><Button type="button" variant="outline" disabled={offset === 0 || busy} onClick={() => setOffset(Math.max(0,offset-24))}>{t("manual.previous")}</Button>
              <span>{t("manual.page",{from:offset+1,to:Math.min(offset+24,catalog.data.total),total:catalog.data.total})}</span>
              <Button type="button" variant="outline" disabled={offset+24 >= catalog.data.total || busy} onClick={() => setOffset(offset+24)}>{t("manual.nextPage")}</Button></div>
          </>}
      </div>}
      {(select.isPending || preview.isPending) && <div role="status" className="manual-preview-loading"><Skeleton className="h-1 w-full" /><strong>{t("manual.selecting")}</strong><p>{t("manual.previewWait")}</p></div>}
      {step === 1 && <form id="manual-parameters" className="space-y-4" onSubmit={event => { event.preventDefault(); if (!busy) preview.mutate(); }}>
        {quote ? <div className="manual-selected"><SkinImage marketItemName={quote.item_name} /><div><strong>{quote.item_name}</strong><p>{t("manual.minPrice")}: {orderMoney(quote.min_price,quote.currency,i18n.language)}</p></div></div>
          : <p role="status">{t("manual.selecting")}</p>}
        <fieldset className="manual-form-section" disabled={busy}><legend>{t("manual.recipientSection")}</legend>
        <label className="manual-field"><span>{t("manual.tradeLink")}</span><Input type="url" required autoFocus={!order} value={trade} onChange={e => { setTrade(e.target.value); preview.reset(); }} placeholder="https://steamcommunity.com/tradeoffer/new/?partner=…&token=…" /><small>{t("manual.tradeHint")}</small></label></fieldset>
        <fieldset className="manual-form-section" disabled={busy}><legend>{t("manual.purchaseSection")}</legend><div className="manual-fields">
          <label className="manual-field"><span>{t("manual.price")}{quote && ` · ${quote.currency}`}</span><Input type="number" required min={quote ? 1/getCurrencyDivisor(quote.currency) : 0.001} step={quote ? 1/getCurrencyDivisor(quote.currency) : 0.001} max={quote ? i32Max/getCurrencyDivisor(quote.currency) : undefined} value={maxPrice} onChange={e => { setMaxPrice(e.target.value); preview.reset(); }} /><small>{t("manual.priceHint")}</small></label>
          <label className="manual-field"><span>{t("manual.chance")}</span><Input type="number" required min={0} max={100} step={1} value={chance} onChange={e => { setChance(e.target.value); preview.reset(); }} /><small>{t("manual.chanceHint")}</small></label>
        </div></fieldset>
        {!order && <fieldset className="manual-form-section" disabled={busy}><legend>{t("manual.metadataSection")}</legend><div className="manual-fields"><label className="manual-field"><span>{t("manual.descriptionLabel")}</span><Textarea rows={2} value={description} maxLength={4000} onChange={e => setDescription(e.target.value)} /><small>{t("manual.descriptionHint")}</small></label>
          <label className="manual-field"><span>{t("manual.tags")}</span><Input value={tags} onChange={e => setTags(e.target.value)} /><small>{t("manual.tagsHint")}</small></label></div></fieldset>}
      </form>}
      {step === 2 && quote && body && <section className="reward-preview manual-review" aria-label={t("manual.summary")}>
        <div className="wizard-heading"><h3>{t("manual.reviewHeading")}</h3></div>
        <div className="manual-selected"><SkinImage marketItemName={quote.item_name} /><div><p className="eyebrow">{t("manual.item")}</p><strong>{quote.item_name}</strong></div></div>
        <dl className="preview-facts manual-review-facts">
          <div><dt>{t("manual.account")}</dt><dd>{channelLabel}</dd></div>
          <div><dt>{t("manual.recipient")}</dt><dd>{recipient}</dd></div>
          <div><dt>{t("manual.tradeLink")}</dt><dd className="break-all manual-review-link">{body.trade_link}</dd></div>
          <div><dt>{t("manual.price")}</dt><dd>{orderMoney(body.max_price,quote.currency,i18n.language)}</dd></div>
          <div><dt>{t("manual.chance")}</dt><dd>{body.chance_to_transfer}%</dd></div>
          <div><dt>{t("manual.minPrice")}</dt><dd>{orderMoney(quote.min_price,quote.currency,i18n.language)}</dd></div>
          <div><dt>{t("manual.descriptionLabel")}</dt><dd className="whitespace-pre-wrap">{reviewDescription || t("manual.noDescription")}</dd></div>
          <div><dt>{t("manual.tags")}</dt><dd>{reviewTags.join(", ") || t("manual.noTags")}</dd></div>
        </dl>
      </section>}
      <div className="builder-footer manual-actions">
        <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>{t("manual.cancel")}</Button>
        {step > (order ? 1 : 0) && !pending && <Button type="button" variant="outline" disabled={busy} onClick={() => { setStep(step-1); submit.reset(); }}>{t("manual.back")}</Button>}
        {step === 1 && <Button type="submit" form="manual-parameters" disabled={busy || !quote}>{busy ? t("manual.loading") : t("manual.review")}</Button>}
        {step === 2 && <Button type="button" disabled={busy || !body} onClick={confirm}>{submit.isPending ? t("manual.loading") : t(pending ? "manual.resend" : order ? "manual.retrySubmit" : "manual.submit")}</Button>}
      </div>
    </DialogContent>
  </Dialog>;
}
const i32Max = 2147483647;
