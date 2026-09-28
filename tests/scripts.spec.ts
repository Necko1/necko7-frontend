import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures";

test("editor uses Monaco, saves drafts and requires explicit publication",async({page})=>{
  await mockApi(page);
  const project={id:"00000000-0000-0000-0000-000000000001",name:"Round rewards",enabled:false,draft_version:1,active_revision:null as number|null,draft:{"main.rhai":"fn on_event(ctx) {\n    log.info(ctx.event.kind);\n}"}};
  const actions:string[]=[];
  await page.route("**/api/v1/broadcasters/123/scripts",async route=>{
    if(route.request().method()==="POST") {
      const body=route.request().postDataJSON();actions.push(body.action);
      if(body.action==="save"){project.draft=body.files;project.draft_version++;return route.fulfill({json:{version:project.draft_version}});}
      if(body.action==="publish")project.active_revision=1;
      return route.fulfill({json:{ok:true}});
    }
    return route.fulfill({json:{projects:[project],revisions:[],jobs:[],storage:[],executions:[],matches:[],snapshots:[]}});
  });
  await page.goto("/scripts/editor");
  await expect(page.getByRole("heading",{name:"Scripts",exact:true})).toBeVisible();
  await expect(page.locator(".monaco-editor")).toBeVisible();
  await page.locator(".monaco-editor").click();
  await page.keyboard.press("Control+End");await page.keyboard.type("\n// draft only");
  await expect(page.getByRole("button",{name:"Publish",exact:true})).toBeDisabled();
  await page.keyboard.press("Control+s");
  await expect.poll(()=>actions).toEqual(["save"]);
  expect(project.draft["main.rhai"]).toContain("// draft only");
  await expect(page.getByRole("button",{name:"Publish",exact:true})).toBeEnabled();
  page.once("dialog",dialog=>dialog.accept());
  await page.getByRole("button",{name:"Publish",exact:true}).click();
  await expect.poll(()=>actions).toEqual(["save","publish"]);
  await expect(page.getByText(/Live revision 1/)).toBeVisible();
  await page.screenshot({path:".qa/scripts-editor.png",fullPage:true});
});

test("blocked timer warns before real run and has no leave-as-is action",async({page})=>{
  await mockApi(page);
  let mutations=0;
  await page.route("**/api/v1/broadcasters/123/scripts",route=>{
    if(route.request().method()==="POST"){mutations++;return route.fulfill({json:{ok:true}});}
    return route.fulfill({json:{projects:[{id:"p",name:"Disabled project",enabled:false,draft:{},draft_version:1,active_revision:1}],revisions:[],jobs:[{id:"j",project_id:"p",job_key:"hide_skin",status:"blocked",reason:"project_disabled",revision:1}],storage:[],executions:[],matches:[],snapshots:[]}});
  });
  await page.goto("/scripts/scheduler");
  await expect(page.getByText("project_disabled",{exact:true})).toBeVisible();
  page.once("dialog",dialog=>{expect(dialog.message()).toContain("even if the project is disabled");return dialog.dismiss();});
  await page.getByRole("button",{name:"Run now"}).click();expect(mutations).toBe(0);
  page.once("dialog",dialog=>dialog.accept());await page.getByRole("button",{name:"Run now"}).click();
  await expect.poll(()=>mutations).toBe(1);
  await expect(page.getByRole("button",{name:"Leave as is"})).toHaveCount(0);
});

test("scripts are restricted to channel owners",async({page})=>{
  await mockApi(page,{role:"EDITOR"});await page.goto("/scripts/editor");await expect(page).toHaveURL(/\/channels$/);
});


test("recorded context, diagnostic errors and dirty navigation remain reviewable",async({page})=>{
  await mockApi(page);
  await page.setViewportSize({width:390,height:900});
  const context={event:{kind:"player_kill"},state:{player:{health:90}},previous:{player:{health:100}},current_match:{rounds:[]}};
  await page.route("**/api/v1/broadcasters/123/scripts",route=>{
    if(route.request().method()==="POST") {
      const body=route.request().postDataJSON();
      if(body.action==="snapshot")return route.fulfill({json:context});
      if(body.action==="validate")return route.fulfill({status:400,json:{message:"main.rhai: Syntax error (line 2, position 3)"}});
      return route.fulfill({json:{ok:true}});
    }
    return route.fulfill({json:{projects:[{id:"p",name:"Test",enabled:false,draft:{"main.rhai":"fn on_event(ctx) {}"},draft_version:1,active_revision:null}],revisions:[],jobs:[],storage:[],executions:[],matches:[],snapshots:[{id:1,created_at:"2026-09-28",events:[{kind:"player_kill"}]}]}});
  });
  await page.goto("/scripts/editor");
  await page.getByRole("button",{name:"Validate",exact:true}).click();
  await expect(page.getByRole("region",{name:"Diagnostics"})).toContainText("Syntax error");
  await page.getByText("Dry Run / Test",{exact:false}).click();
  await page.getByLabel("Recorded event").selectOption("1:0");
  await expect(page.getByLabel("Test context")).toHaveValue(JSON.stringify(context,null,2));
  await page.locator(".monaco-editor").click();await page.keyboard.press("Control+End");await page.keyboard.type(" // unsaved");
  page.once("dialog",d=>d.dismiss());
  await page.getByRole("link",{name:"Matches",exact:true}).click();
  await expect(page).toHaveURL(/scripts\/editor$/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  await page.screenshot({path:".qa/scripts-mobile.png",fullPage:true});
});
