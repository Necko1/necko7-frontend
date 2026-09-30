import { test, expect, type Page } from "@playwright/test";
import { mockApi } from "./fixtures";

const id="550e8400-e29b-41d4-a716-446655449999";
const name="Glock-18 | Vogue (Field-Tested)";
const now=new Date().toISOString();
const link="https://steamcommunity.com/tradeoffer/new/?partner=123456&token=example";
function sample(status="INSUFFICIENT_FUNDS") {
  const failed=["INSUFFICIENT_FUNDS","RETRY_AVAILABLE","TRADE_LINK_REQUIRED"].includes(status);
  return {id,inventory_id:"inventory",channel_id:"123",origin:"MANUAL",item_name:name,currency:"USD",trade_link:link,steam_partner:"123456",initial_max_price:2750,initial_chance_to_transfer:80,
    description:"Telegram giveaway",tags:["telegram"],created_by:"123",created_at:now,updated_at:now,closed_at:null as string|null,closed_by:null as string|null,close_reason:null as string|null,
    status,can_retry:failed,can_close:failed,action_block_reason:failed?null:status==="DELIVERED"?"delivered":status==="RECONCILIATION_REQUIRED"?"uncertain_market_result":"active_delivery",
    attempts:[{request_id:"550e8400-e29b-41d4-a716-446655448888",custom_id:`manual-${id}-0`,max_price:2750,chance_to_transfer:80,trade_link:link,
      paid_price:null as number|null,market_order_id:null as string|null,status:failed?"REJECTED":status==="ORDER_PENDING"?"ORDER_CREATED":status,
      outcome_kind:failed?"no_money":null as string|null,outcome_detail:null,last_market_stage:null,trade_id:null as string|null,send_until:null,receive_until:null as string|null,settlement:null,
      causer:null,cancellation_reason:null,market_refund:null,initiator_user_id:"123",created_at:now,last_checked_at:now}]};
}
async function setup(page:Page, options:{status?:string; empty?:boolean; role?:string; failCreateOnce?:boolean; language?:string; itemName?:string}={}) {
  await mockApi(page,{role:options.role||"OWNER"});
  if(options.language)await page.addInitScript(lang=>localStorage.setItem("necko_lang",lang),options.language);
  let order=sample(options.status); let exists=!options.empty; let createFailure=!!options.failCreateOnce;
  if(options.itemName)order.item_name=options.itemName;
  const requests:{method:string;path:string;body:Record<string,unknown>}[]=[];
  const events=[{id:1,event_key:"created",manual_order_id:id,event_type:"manual_order_created",actor_kind:"operator",actor_user_id:"123",attempt_custom_id:null,details:{origin:"MANUAL"},created_at:now}];
  await page.route("**/api/v1/broadcasters/123/manual-orders**",async route=>{
    const req=route.request();const url=new URL(req.url());const path=url.pathname;
    const send=(value:unknown,status=200)=>route.fulfill({status,contentType:"application/json",body:JSON.stringify(value)});
    if(req.method()!=="GET")requests.push({method:req.method(),path,body:req.postDataJSON()});
    if(path.endsWith("/catalog")){
      const offset=Number(url.searchParams.get("offset")||0);const query=url.searchParams.get("search")||"";
      return send({items:query.toLowerCase().includes("missing")?[]:Array.from({length:offset===0?24:3},(_,i)=>({market_hash_name:offset===0&&i===0?name:`Glock-18 | Vogue variant ${offset+i}`,price:2750+i,volume:10})),currency:"USD",total:query.toLowerCase().includes("missing")?0:27,limit:24,offset});
    }
    if(path.endsWith("/preview")){
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
      let items=exists?[order]:[];const status=url.searchParams.get("status"),tag=url.searchParams.get("tag"),search=url.searchParams.get("search");
      if(status)items=items.filter(o=>o.status===status);if(tag)items=items.filter(o=>o.tags.includes(tag));if(search)items=items.filter(o=>`${o.item_name} ${o.description} ${o.steam_partner} ${o.id}`.toLowerCase().includes(search.toLowerCase()));
      return send({items,total:items.length,offset:0,limit:25});
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

test("retry changes parameters and destination while retaining the failed attempt",async({page})=>{
  const requests=await setup(page);await page.goto(`/manual-orders/${id}`);
  await page.getByRole("button",{name:"Retry delivery",exact:true}).click();
  await expect(page.getByRole("spinbutton",{name:/Purchase ceiling/})).toHaveValue("2.75");
  await page.getByRole("spinbutton",{name:/Purchase ceiling/}).fill("4.5");await page.getByRole("spinbutton",{name:/Transfer chance/}).fill("60");
  const newLink="https://steamcommunity.com/tradeoffer/new/?partner=777&token=changed";
  await page.getByRole("textbox",{name:/Steam trade link/}).fill(newLink);await page.getByRole("button",{name:"Review delivery",exact:true}).click();
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
    await page.screenshot({path:testInfo.outputPath(`manual-detail-ru-${width}-${theme}.png`),fullPage:true});
  }
  await page.getByRole("button",{name:"Повторить доставку",exact:true}).click();await expect(page.getByRole("spinbutton",{name:/Потолок покупки/})).toHaveValue("2.75");
  expect(await page.getByRole("dialog").evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath("manual-retry-ru-mobile.png"),fullPage:true});
});
