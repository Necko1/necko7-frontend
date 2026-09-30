import { test, expect, type Page } from "@playwright/test";
import { mockApi } from "./fixtures";
import type { ManualOrder, ManualAuditEvent } from "../src/types/manualOrders";

const id="550e8400-e29b-41d4-a716-446655449999";
const name="Glock-18 | Vogue (Field-Tested)";
const now=new Date().toISOString();
const link="https://steamcommunity.com/tradeoffer/new/?partner=123456&token=example";
function sample(status="INSUFFICIENT_FUNDS"): ManualOrder {
  const failed=["INSUFFICIENT_FUNDS","RETRY_AVAILABLE","TRADE_LINK_REQUIRED"].includes(status);
  return {id,inventory_id:"inventory",channel_id:"123",origin:"MANUAL",item_name:name,currency:"USD",trade_link:link,steam_partner:"123456",initial_max_price:2750,initial_chance_to_transfer:80,
    description:"Telegram giveaway",tags:["telegram"],created_by:"123",created_at:now,updated_at:now,closed_at:null as string|null,closed_by:null as string|null,close_reason:null as string|null,
    status,can_retry:failed,can_close:failed,action_block_reason:failed?null:status==="DELIVERED"?"delivered":status==="RECONCILIATION_REQUIRED"?"uncertain_market_result":"active_delivery",
    attempts:[{request_id:"550e8400-e29b-41d4-a716-446655448888",custom_id:`manual-${id}-0`,max_price:2750,chance_to_transfer:80,trade_link:link,
      paid_price:null as number|null,market_order_id:null as string|null,status:failed?"REJECTED":status==="ORDER_PENDING"?"ORDER_CREATED":status,
      outcome_kind:failed?"no_money":null as string|null,outcome_detail:null,last_market_stage:null,trade_id:null as string|null,send_until:null,receive_until:null as string|null,settlement:null,
      causer:null,cancellation_reason:null,market_refund:null,initiator_user_id:"123",created_at:now,last_checked_at:now}]};
}
async function setup(page:Page, options:{status?:string; empty?:boolean; role?:string; failCreateOnce?:boolean; language?:string; itemName?:string;
  previewDelay?:number; accepted?:boolean; rawReason?:string; multipleAttempts?:boolean; emptyMetadata?:boolean; tradeLink?:string; orderCount?:number}={}) {
  await mockApi(page,{role:options.role||"OWNER"});
  if(options.language)await page.addInitScript(lang=>localStorage.setItem("necko_lang",lang),options.language);
  let order=sample(options.status); let exists=!options.empty; let createFailure=!!options.failCreateOnce;
  if(options.itemName)order.item_name=options.itemName;
  if(options.emptyMetadata){order.description="";order.tags=[];}
  if(options.tradeLink){order.trade_link=options.tradeLink;order.attempts[0].trade_link=options.tradeLink;}
  if(options.rawReason){order.attempts[0].outcome_kind="trade_link";order.attempts[0].outcome_detail=options.rawReason;}
  if(options.multipleAttempts)order.attempts.push({...order.attempts[0],custom_id:`manual-${id}-1`,max_price:3500});
  if(options.accepted)Object.assign(order.attempts.at(-1)!,{status:"TRADE_ACCEPTED",paid_price:3100,outcome_kind:null,
    last_market_stage:"1",trade_id:"789",settlement:"2026-10-07T10:00:00Z"});
  const requests:{method:string;path:string;body:Record<string,unknown>}[]=[];
  const events:ManualAuditEvent[]=[{id:1,event_key:"created",manual_order_id:id,event_type:"manual_order_created",actor_kind:"operator",actor_user_id:"123",attempt_custom_id:null,details:{origin:"MANUAL"},created_at:now},
    {id:2,event_key:"inventory",manual_order_id:id,event_type:"inventory_created",actor_kind:"system",actor_user_id:null,attempt_custom_id:null,details:{origin:"MANUAL"},created_at:now}];
  if(options.rawReason)events.push({...events[0],id:3,event_key:"rejected",event_type:"market_order_rejected",details:{reason:options.rawReason}});
  if(options.accepted)events.push({...events[0],id:4,event_key:"accepted",event_type:"buyer_accepted_trade",attempt_custom_id:order.attempts.at(-1)!.custom_id,created_at:"2026-09-30T10:00:00Z"});
  await page.route("**/api/v1/broadcasters/123/manual-orders**",async route=>{
    const req=route.request();const url=new URL(req.url());const path=url.pathname;
    const send=(value:unknown,status=200)=>route.fulfill({status,contentType:"application/json",body:JSON.stringify(value)});
    if(req.method()!=="GET")requests.push({method:req.method(),path,body:req.postDataJSON()});
    if(path.endsWith("/catalog")){
      const offset=Number(url.searchParams.get("offset")||0);const query=url.searchParams.get("search")||"";
      return send({items:query.toLowerCase().includes("missing")?[]:Array.from({length:offset===0?24:3},(_,i)=>({market_hash_name:offset===0&&i===0?(options.itemName||name):`Glock-18 | Vogue variant ${offset+i}`,price:2750+i,volume:10})),currency:"USD",total:query.toLowerCase().includes("missing")?0:27,limit:24,offset});
    }
    if(path.endsWith("/preview")){
      if(options.previewDelay)await new Promise(resolve=>setTimeout(resolve,options.previewDelay));
      const body=req.postDataJSON();
      if(body.trade_link&&!String(body.trade_link).includes("partner="))return send({error:{message:"invalid_trade_link"}},422);
      return send({item_name:body.item_name,currency:"USD",min_price:3000,max_price:body.max_price??3000,chance_to_transfer:body.chance_to_transfer??80,
        trade_link:body.trade_link??null,steam_partner:body.trade_link?new URL(body.trade_link).searchParams.get("partner"):null});
    }
    if(path.endsWith("/audit"))return send(events);
    if(req.method()==="POST"&&path.endsWith("/manual-orders")){
      if(createFailure){createFailure=false;return send({error:{message:"internal"}},500);}
      const body=req.postDataJSON();exists=true;order=sample("ORDER_PENDING");order.description=body.description;order.tags=body.tags;
      order.attempts[0]={...order.attempts[0],max_price:body.max_price,chance_to_transfer:body.chance_to_transfer,trade_link:body.trade_link,request_id:body.request_id};
      return send(order);
    }
    if(path.endsWith("/retry")){
      const body=req.postDataJSON();order.status="ORDER_PENDING";order.can_retry=false;order.can_close=false;order.action_block_reason="active_delivery";
      order.trade_link=body.trade_link;order.steam_partner=new URL(body.trade_link).searchParams.get("partner")!;
      order.attempts.push({...order.attempts[0],custom_id:`manual-${id}-1`,request_id:body.request_id,max_price:body.max_price,chance_to_transfer:body.chance_to_transfer,trade_link:body.trade_link,status:"ORDER_CREATED",outcome_kind:null});return send(order);
    }
    if(req.method()==="PATCH"){
      const body=req.postDataJSON();order.description=body.description;order.tags=body.tags;
      events.push({...events[0],id:events.length+1,event_key:`metadata-${events.length}`,event_type:"manual_metadata_updated",details:{origin:"MANUAL"}});return send(order);
    }
    if(path.endsWith("/close")){
      const body=req.postDataJSON();if(!String(body.reason).trim())return send({error:{message:"close_reason_required"}},422);
      order.status="CANCELLED";order.can_retry=false;order.can_close=false;order.closed_at=now;order.closed_by="123";order.close_reason=body.reason;order.action_block_reason="closed";
      events.push({...events[0],id:events.length+1,event_key:"closed",event_type:"manual_order_closed",details:{origin:"MANUAL"}});return send(order);
    }
    if(path.endsWith("/manual-orders")){
      let items=exists?Array.from({length:options.orderCount??1},(_,index)=>index?{...order,id:id.slice(0,-4)+String(index).padStart(4,"0")}:order):[];
      const status=url.searchParams.get("status"),tag=url.searchParams.get("tag"),search=url.searchParams.get("search");
      if(status)items=items.filter(o=>o.status===status);if(tag)items=items.filter(o=>o.tags.includes(tag));if(search)items=items.filter(o=>`${o.item_name} ${o.description} ${o.steam_partner} ${o.id}`.toLowerCase().includes(search.toLowerCase()));
      const offset=Number(url.searchParams.get("offset")||0),limit=Number(url.searchParams.get("limit")||25);
      return send({items:items.slice(offset,offset+limit),total:items.length,offset,limit});
    }
    return send(order);
  });
  return requests;
}

test("create from catalog, preview explicit parameters, then track and edit",async({page})=>{
  const requests=await setup(page,{empty:true});await page.goto("/manual-orders");
  await expect(page.getByText("No manual deliveries yet",{exact:true})).toBeVisible();
  // The header and empty state offer the same action; use the header here.
  await page.getByRole("button",{name:"New delivery",exact:true}).first().click();
  await page.getByRole("button",{name:"Next",exact:true}).click();
  await expect(page.getByRole("button",{name:/variant 24/})).toBeVisible();
  await page.getByRole("button",{name:"Previous",exact:true}).click();
  const skin=page.getByRole("button",{name:/^Glock-18 \| Vogue \(Field-Tested\)/});
  await skin.focus();await page.keyboard.press("Enter");
  await expect(page.getByRole("spinbutton",{name:/Purchase ceiling/})).toHaveValue("3");
  await page.getByRole("textbox",{name:/Steam trade link/}).fill(link);
  await page.getByRole("spinbutton",{name:/Purchase ceiling/}).fill("3.805");await page.getByRole("spinbutton",{name:/Transfer chance/}).fill("70");
  await page.getByRole("textbox",{name:/Description/}).fill("Friday Telegram giveaway");await page.getByRole("textbox",{name:/Tags/}).fill("telegram, friday");
  await page.getByRole("button",{name:"Review delivery",exact:true}).focus();await page.keyboard.press("Enter");
  const dialog=page.getByRole("dialog");await expect(dialog.getByText("3.805 USD",{exact:true})).toBeVisible();await expect(dialog.getByText("70%",{exact:true})).toBeVisible();
  await expect(dialog.getByText("123456",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Create and start delivery",exact:true}).focus();await page.keyboard.press("Enter");
  await expect(page).toHaveURL(`/manual-orders/${id}`);await expect(page.getByText("Market order in progress",{exact:true}).first()).toBeVisible();
  const created=requests.find(r=>r.path.endsWith("/manual-orders")&&r.method==="POST")!.body;
  expect(created.max_price).toBe(3805);expect(created.chance_to_transfer).toBe(70);expect(created.request_id).toMatch(/^[0-9a-f-]{36}$/);
  expect(created).not.toHaveProperty("reward_id");expect(created).not.toHaveProperty("redemption_id");expect(created).not.toHaveProperty("username");
  await expect(page.getByRole("button",{name:"Retry delivery",exact:true})).toHaveCount(0);await expect(page.getByRole("button",{name:"Close without delivery",exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"Edit description & tags"}).click();await page.getByRole("dialog").getByRole("textbox",{name:/Description/}).fill("Corrected giveaway");
  await page.getByRole("button",{name:"Save changes",exact:true}).click();await expect(page.getByText("Corrected giveaway",{exact:true})).toBeVisible();
});

test("retry changes parameters and destination while retaining the failed attempt",async({page},testInfo)=>{
  const requests=await setup(page);await page.goto(`/manual-orders/${id}`);
  await expect(page.getByRole("button",{name:"Retry delivery",exact:true})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath("manual-failure-en-desktop.png"),fullPage:true,animations:"disabled"});
  await page.getByRole("button",{name:"Retry delivery",exact:true}).click();
  await expect(page.getByRole("spinbutton",{name:/Purchase ceiling/})).toHaveValue("2.75");
  await page.getByRole("spinbutton",{name:/Purchase ceiling/}).fill("4.5");await page.getByRole("spinbutton",{name:/Transfer chance/}).fill("60");
  const newLink="https://steamcommunity.com/tradeoffer/new/?partner=777&token=changed";
  await page.getByRole("textbox",{name:/Steam trade link/}).fill(newLink);await page.getByRole("button",{name:"Review delivery",exact:true}).click();
  await page.getByRole("dialog").screenshot({path:testInfo.outputPath("manual-retry-review-en-desktop.png"),animations:"disabled"});
  await page.getByRole("button",{name:"Confirm and retry",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Attempt 2",exact:true})).toBeVisible();await expect(page.getByRole("heading",{name:"Attempt 1",exact:true})).toBeVisible();
  expect(requests.find(r=>r.path.endsWith("/retry"))?.body).toMatchObject({max_price:4500,chance_to_transfer:60,trade_link:newLink});
  await expect(page.getByText("2.75 USD",{exact:true})).toBeVisible();await expect(page.getByText("4.50 USD",{exact:true})).toBeVisible();
});

test("closing requires a reason and retains attempts, audit and metadata editing",async({page})=>{
  await setup(page);await page.goto(`/manual-orders/${id}`);await page.getByRole("button",{name:"Close without delivery",exact:true}).click();
  await expect(page.getByRole("button",{name:"Close delivery",exact:true})).toBeDisabled();
  await page.getByRole("textbox",{name:"Reason for closing",exact:true}).fill("Winner declined the prize");await page.getByRole("button",{name:"Close delivery",exact:true}).click();
  await expect(page.getByText("Cancelled",{exact:true})).toBeVisible();await expect(page.getByText("Winner declined the prize",{exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Attempt 1",exact:true})).toBeVisible();await expect(page.getByText("Delivery closed by administrator",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Edit description & tags"})).toBeVisible();await expect(page.getByRole("button",{name:"Retry delivery",exact:true})).toHaveCount(0);
});

for(const status of ["RECONCILIATION_REQUIRED","TRADE_ACCEPTED"])
test(`${status} does not offer retry or closing`,async({page})=>{
  await setup(page,{status});await page.goto(`/manual-orders/${id}`);
  await expect(page.getByText(status==="RECONCILIATION_REQUIRED"?/The purchase may still deliver/:/accepted.*final/i).first()).toBeVisible();
  await expect(page.getByRole("button",{name:"Retry delivery",exact:true})).toHaveCount(0);await expect(page.getByRole("button",{name:"Close without delivery",exact:true})).toHaveCount(0);
});

test("lost creation response can recover the identical request after reload",async({page})=>{
  const requests=await setup(page,{empty:true,failCreateOnce:true});await page.goto("/manual-orders");
  await page.getByRole("button",{name:"New delivery",exact:true}).first().click();await page.getByRole("button",{name:/^Glock-18 \| Vogue \(Field-Tested\)/}).click();
  await page.getByRole("textbox",{name:/Steam trade link/}).fill(link);await page.getByRole("button",{name:"Review delivery",exact:true}).click();await page.getByRole("button",{name:"Create and start delivery",exact:true}).click();
  await expect(page.getByText(/previous request has no confirmed response/)).toBeVisible();await page.reload();
  await page.getByRole("button",{name:"New delivery",exact:true}).first().click();await expect(page.getByRole("button",{name:"Resend the same request",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Resend the same request",exact:true}).click();await expect(page).toHaveURL(`/manual-orders/${id}`);
  const creates=requests.filter(r=>r.path.endsWith("/manual-orders")&&r.method==="POST");expect(creates).toHaveLength(2);expect(creates[0].body).toEqual(creates[1].body);
});

test("viewer cannot open manual delivery routes or see navigation",async({page})=>{
  await setup(page,{role:"VIEWER"});await page.goto("/manual-orders");
  await expect(page).not.toHaveURL(/\/manual-orders/);await expect(page.getByRole("link",{name:"Manual deliveries",exact:true})).toHaveCount(0);
});

test("catalog and order filters have empty states",async({page})=>{
  await setup(page);await page.goto("/manual-orders");await page.getByRole("textbox",{name:"Filter by tag"}).fill("missing");
  await expect(page.getByText("No matching deliveries",{exact:true})).toBeVisible();await page.getByRole("button",{name:"New delivery",exact:true}).click();
  await page.getByRole("textbox",{name:/Search skins/}).fill("missing");await expect(page.getByText("No matching skins",{exact:true})).toBeVisible();
});

test("Russian and English layouts fit desktop and mobile in both themes",async({page},testInfo)=>{
  await setup(page,{language:"ru",itemName:"StatTrak™ Glock-18 | Vogue (Field-Tested) · Очень длинное название приза для победителя большого Telegram-розыгрыша"});await page.goto(`/manual-orders/${id}`);
  await expect(page.getByRole("heading",{name:"Ручные выдачи",exact:true})).toBeVisible();
  for(const width of [1440,390])for(const theme of ["dark","light"]){
    await page.setViewportSize({width,height:1000});await page.evaluate(theme=>document.documentElement.classList.toggle("dark",theme==="dark"),theme);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`manual-detail-ru-${width}-${theme}.png`),fullPage:true,animations:"disabled"});
  }
  await page.getByRole("button",{name:"Повторить доставку",exact:true}).click();await expect(page.getByRole("spinbutton",{name:/Потолок покупки/})).toHaveValue("2.75");
  await expect(page.getByRole("button",{name:"Проверить выдачу",exact:true})).toBeEnabled();
  expect(await page.getByRole("dialog").evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath("manual-retry-ru-mobile.png"),fullPage:true,animations:"disabled"});
  await page.getByRole("button",{name:"Проверить выдачу",exact:true}).click();
  await expect(page.getByRole("button",{name:"Подтвердить и повторить",exact:true})).toBeVisible();
  for(const theme of ["dark","light"]){
    await page.evaluate(theme=>document.documentElement.classList.toggle("dark",theme==="dark"),theme);
    expect(await page.getByRole("dialog").evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    await page.getByRole("dialog").screenshot({path:testInfo.outputPath(`manual-retry-review-ru-mobile-${theme}.png`),animations:"disabled"});
  }
});

test("standard status filter supports keyboard selection and preserves filtering",async({page},testInfo)=>{
  await setup(page);await page.goto("/manual-orders");
  const filter=page.getByRole("combobox",{name:"Delivery status",exact:true});
  await expect(filter).toContainText("All statuses");
  await filter.focus();await page.keyboard.press("Enter");
  await page.getByRole("option",{name:"Delivered",exact:true}).click();
  await expect(page.getByText("No matching deliveries",{exact:true})).toBeVisible();
  await filter.click();await page.getByRole("option",{name:"All statuses",exact:true}).click();
  await expect(page.getByRole("link",{name:/Glock-18 \| Vogue/})).toBeVisible();
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});await filter.click();
    const popup=page.getByRole("listbox");await expect(popup).toBeVisible();
    const box=await popup.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width);
    await page.screenshot({path:testInfo.outputPath(`manual-filter-en-${width}.png`),fullPage:true,animations:"disabled"});await page.keyboard.press("Escape");
    await page.screenshot({path:testInfo.outputPath(`manual-list-en-${width}.png`),fullPage:true,animations:"disabled"});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
});

test("acceptance and future trade lock end are separate; raw failures stay in evidence",async({page},testInfo)=>{
  const raw="Неверная ссылка обмена: пользователь не может принять предмет";
  await setup(page,{status:"TRADE_ACCEPTED",accepted:true,multipleAttempts:true,rawReason:raw,emptyMetadata:true,
    tradeLink:`https://steamcommunity.com/tradeoffer/new/?partner=123456&token=${"example".repeat(24)}`});
  await page.goto(`/manual-orders/${id}`);
  const first=page.locator(".manual-attempt").first();
  await expect(first.getByText("Acceptance recorded",{exact:true})).toBeVisible();
  await expect(first.getByText("Trade lock ends",{exact:true})).toBeVisible();
  const accepted=await page.evaluate(()=>new Date("2026-09-30T10:00:00Z").toLocaleString("en"));
  const settlement=await page.evaluate(()=>new Date("2026-10-07T10:00:00Z").toLocaleString("en"));
  await expect(first.locator("dl > div").filter({has:page.getByText("Acceptance recorded",{exact:true})})).toContainText(accepted);
  await expect(first.locator("dl > div").filter({has:page.getByText("Trade lock ends",{exact:true})})).toContainText(settlement);
  await expect(page.locator(".manual-attempt").last().getByText("Acceptance recorded",{exact:true})).toHaveCount(0);
  await expect(page.getByText("Delivered",{exact:true})).toHaveCount(0);
  await expect(page.getByText("No description",{exact:true})).toBeVisible();await expect(page.getByText("No tags",{exact:true})).toBeVisible();
  await expect(page.locator(".manual-timeline")).not.toContainText("Delivery item saved");
  await expect(page.locator(".manual-timeline")).not.toContainText(raw);
  await expect(page.getByText(raw,{exact:true})).not.toBeVisible();
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`manual-accepted-en-${width}.png`),fullPage:true,animations:"disabled"});
  }
  await page.locator(".manual-attempt").last().getByText("Market evidence",{exact:true}).click();
  await expect(page.locator(".manual-attempt").last().locator("pre")).toContainText(raw);
  await page.getByText("Technical audit · all events",{exact:true}).click();
  await expect(page.locator(".builder-advanced pre")).toContainText("inventory_created");
});

for(const width of [1440,390])for(const language of ["en","ru"])
test(`manual wizard uses reward navigation and compact review at ${width}px in ${language}`,async({page},testInfo)=>{
  await setup(page,{empty:true,language,previewDelay:1300,itemName:"StatTrak™ Glock-18 | Vogue (Field-Tested) · Extremely long exact variant name for the Telegram giveaway winner"});
  await page.setViewportSize({width,height:1000});await page.goto("/manual-orders");
  await page.getByRole("button",{name:language==="en"?"New delivery":"Новая выдача",exact:true}).first().click();
  const dialog=page.getByRole("dialog"),nav=dialog.locator(".wizard-progress");
  await expect(nav.getByRole("button")).toHaveCount(3);
  await expect(nav.getByRole("button").nth(0)).toContainText("01");await expect(nav.getByRole("button").nth(1)).toContainText("02");await expect(nav.getByRole("button").nth(2)).toContainText("03");
  await page.locator(".manual-skin").first().waitFor();
  const price=page.locator(".manual-skin > span").first();
  const foreground=await price.evaluate(el=>getComputedStyle(el).color);
  expect(foreground).toBe(await page.locator(".manual-skin strong").first().evaluate(el=>getComputedStyle(el).color));
  await dialog.screenshot({path:testInfo.outputPath(`manual-item-${language}-${width}.png`),animations:"disabled"});
  await page.locator(".manual-skin").first().click();
  await expect(page.locator('.manual-skin[aria-pressed="true"]')).toHaveCount(1);
  await expect(dialog.getByText(language==="en"?/Waiting for Market to confirm/:/Ожидаем от Market/)).toBeVisible();
  await expect(nav.getByRole("button").nth(1)).toHaveAttribute("aria-current","step");
  await expect(dialog.getByRole("group")).toHaveCount(3);
  await dialog.getByRole("textbox",{name:language==="en"?/Steam trade link/:/Трейд-ссылка Steam/}).fill(link+"&context="+"long-link".repeat(20));
  for(const theme of ["dark","light"]){
    await page.evaluate(theme=>document.documentElement.classList.toggle("dark",theme==="dark"),theme);
    expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    await dialog.screenshot({path:testInfo.outputPath(`manual-details-${language}-${width}-${theme}.png`),animations:"disabled"});
  }
  // Clicking the third step uses the same validated submit as the footer.
  await nav.getByRole("button").nth(2).focus();await page.keyboard.press("Enter");
  await expect(nav.getByRole("button").nth(2)).toHaveAttribute("aria-current","step");
  await expect(dialog.getByText("Necko",{exact:true})).toBeVisible();await expect(dialog.getByText("123456",{exact:true})).toBeVisible();
  await expect(dialog.getByText(language==="en"?"No description":"Без описания",{exact:true})).toBeVisible();
  await expect(dialog.getByText(language==="en"?"No tags":"Без тегов",{exact:true})).toBeVisible();
  await expect(dialog.getByRole("button",{name:language==="en"?"Create and start delivery":"Создать и начать доставку",exact:true})).toBeVisible();
  for(const theme of ["dark","light"]){
    await page.evaluate(theme=>document.documentElement.classList.toggle("dark",theme==="dark"),theme);
    expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    await dialog.screenshot({path:testInfo.outputPath(`manual-review-${language}-${width}-${theme}.png`),animations:"disabled"});
  }
});

for(const count of [1,2,3])test(`${count} compact delivery cards retain metadata at desktop and mobile widths`,async({page},testInfo)=>{
  const language=count===2?"ru":"en";
  await setup(page,{orderCount:count,language,multipleAttempts:true,emptyMetadata:count===1,
    itemName:count===2?"StatTrak™ Glock-18 | Vogue (Field-Tested) · Очень длинное название скина для победителя розыгрыша":undefined});
  await page.goto("/manual-orders");
  const grid=page.locator(".manual-order-grid"),cards=grid.getByRole("link");
  await expect(cards).toHaveCount(count);
  const first=cards.first();
  await expect(first.getByText(language==="en"?"Purchase ceiling":"Потолок покупки",{exact:true})).toBeVisible();
  await expect(first.getByText(language==="en"?"3.50 USD":"3,50 USD",{exact:true})).toBeVisible();
  await expect(first.getByText("123456",{exact:true})).toBeVisible();
  await expect(first.locator("time")).toHaveAttribute("datetime",now);
  if(count>1){await expect(first.getByText("Telegram giveaway",{exact:true})).toBeVisible();await expect(first.getByText("telegram",{exact:true})).toBeVisible();}
  for(const width of [1920,1440,1100,390]){
    await page.setViewportSize({width,height:1000});
    const columns=width>=1280?3:width>=640?2:1;
    const gridBox=(await grid.boundingBox())!,firstBox=(await first.boundingBox())!;
    expect(firstBox.width).toBeLessThanOrEqual(gridBox.width/columns+1);
    expect(firstBox.height).toBeLessThan(430);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(count===3){
      const boxes=await Promise.all([0,1,2].map(n=>cards.nth(n).boundingBox()));
      if(columns===3){expect(boxes[1]!.x).toBeGreaterThan(boxes[0]!.x);expect(boxes[2]!.y).toBe(boxes[0]!.y);}
      if(columns===2){expect(boxes[1]!.x).toBeGreaterThan(boxes[0]!.x);expect(boxes[2]!.y).toBeGreaterThan(boxes[0]!.y);}
      if(columns===1){expect(boxes[1]!.x).toBe(boxes[0]!.x);expect(boxes[1]!.y).toBeGreaterThan(boxes[0]!.y);}
    }
    if(width===1440||width===390)for(const theme of ["dark","light"]){
      await page.evaluate(theme=>document.documentElement.classList.toggle("dark",theme==="dark"),theme);
      await page.screenshot({path:testInfo.outputPath(`manual-cards-${count}-${language}-${width}-${theme}.png`),fullPage:true,animations:"disabled"});
    }
  }
  // The image region and the rest of the card are one native link.
  await first.locator('[aria-hidden="true"]').click();await expect(page).toHaveURL(`/manual-orders/${id}`);
  await page.goto("/manual-orders");await grid.getByRole("link").first().focus();await page.keyboard.press("Enter");
  await expect(page).toHaveURL(`/manual-orders/${id}`);
});

test("delivery cards retain pagination and reset it when filtering",async({page})=>{
  await setup(page,{orderCount:26});await page.goto("/manual-orders");
  const cards=page.locator(".manual-order-grid").getByRole("link");
  await expect(cards).toHaveCount(25);await page.getByRole("button",{name:"Next",exact:true}).click();
  await expect(cards).toHaveCount(1);await expect(page.getByText("26–26 of 26",{exact:true})).toBeVisible();
  await page.getByRole("textbox",{name:"Search ID, skin, Steam partner or description",exact:true}).fill(id);
  await expect(cards).toHaveCount(1);await expect(page.getByText("1–1 of 1",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Previous",exact:true})).toBeDisabled();
});
