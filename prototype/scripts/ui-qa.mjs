import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const dir = path.join(root, 'docs/screenshots/v08')
await mkdir(dir, {recursive:true})
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:4174'
const browser = await chromium.launch({headless:true,...(process.env.UI_CHROMIUM_PATH ? {executablePath:process.env.UI_CHROMIUM_PATH,args:['--no-sandbox']} : {})})
const ctx = await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'})
const p = await ctx.newPage()
const report = {date:new Date().toISOString(),browser:browser.version(),baseURL:base,matrix:[],secondary:[],interactions:[],pageErrors:[],externalRequests:[],screenshots:[]}
p.on('pageerror',e=>report.pageErrors.push(e.message))
p.on('request',r=>{if(!r.url().startsWith(base) && !r.url().startsWith('data:'))report.externalRequests.push(r.url())})
const button = (name) => p.getByRole('button',{name,exact:true})
const tab = (name) => p.getByRole('tab',{name,exact:true})
const input = () => p.locator('#composer')
async function go(view='chat',theme='light',width=1440) {
 await p.setViewportSize({width,height:width===390?844:900});await p.goto(`${base}/?theme=${theme}&view=${view}&notransition=1`);await p.waitForTimeout(300)
}
async function scan(label) {
 const size=await p.evaluate(()=>({viewport:innerWidth,documentWidth:document.documentElement.scrollWidth}))
 const a=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
 return {...label,...size,violations:a.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))}
}
async function capture(file) {await p.waitForTimeout(150);await p.screenshot({path:path.join(dir,file),animations:'disabled'});report.screenshots.push(file)}
async function test(name,fn) {try{await fn();report.interactions.push({name,passed:true})}catch(e){report.interactions.push({name,passed:false,error:e.message});console.error('FAIL',name,e.message)}}
try {
 for(const theme of ['light','dark'])for(const width of [1440,960,390])for(const view of ['chat','tasks','skills','memory','messaging','artifacts','settings']) {await go(view,theme,width);report.matrix.push(await scan({view,theme,width}))}
 console.log('Matrix:',report.matrix.length)
 for(const theme of ['light','dark']) {
  for(const [view,names] of [['tasks',['看板']],['skills',['工具集','连接器','MCP','插件','机器人']],['memory',['知识图谱']],['messaging',['Webhooks']],['artifacts',['图片','链接']]]) {
   await go(view,theme,390)
   for(const name of names) {if(!await tab(name).count()){report.secondary.push({view,theme,tab:name,missing:true});continue}await tab(name).click();report.secondary.push(await scan({view,theme,tab:name,width:390}))}
  }
  await go('settings',theme,390)
  for(const name of ['外观','模型','安全与审批','提供方与密钥','配置档案','已归档对话','关于']) {await tab(name).click();report.secondary.push(await scan({view:'settings',theme,tab:name,width:390}))}
 }
 await test('Session drafts; IME Enter does not send',async()=>{
  await go();await input().fill('测试草稿，仅此会话');await p.getByRole('button',{name:/^每日 AI 早报素材整理/}).click();assert.equal(await input().inputValue(),'')
  await p.getByRole('button',{name:/^宿舍网络审计跟进.*默认/}).click();assert.equal(await input().inputValue(),'测试草稿，仅此会话')
  await input().dispatchEvent('keydown',{key:'Enter',code:'Enter',isComposing:true});assert.equal(await input().inputValue(),'测试草稿，仅此会话')
 })
 await test('Async sends stay in their original session',async()=>{
  await go();await input().fill('会话隔离测试标记');await button('发送消息').click();await p.getByRole('button',{name:/^每日 AI 早报素材整理/}).click();await p.waitForTimeout(1100)
  assert.equal(await p.locator('.chat-scroll').getByText(/会话隔离测试标记/).count(),0)
  await p.getByRole('button',{name:/^宿舍网络审计跟进.*默认/}).click();await p.waitForTimeout(150);assert.ok(await p.locator('.chat-scroll').getByText(/会话隔离测试标记/).count()>0)
  assert.equal(await p.getByText('Hermes 正在输入（模拟）…').isVisible(),false)
 })
 await test('Draft survives workbench navigation',async()=>{
  await go();await input().fill('导航后仍在');const nav=p.getByRole('navigation',{name:'主导航',exact:true});await nav.getByRole('button',{name:'任务',exact:true}).click();await p.getByRole('button',{name:/^宿舍网络审计跟进.*默认/}).click();assert.equal(await input().inputValue(),'导航后仍在')
 })
 await test('Slash keyboard insertion',async()=>{await go();await input().fill('/reas');await input().press('End');await input().press('Enter');assert.equal(await input().inputValue(),'/reasoning ')})
 await test('High-risk approval uses cancel default and Escape',async()=>{
  await go();const high=p.getByRole('region',{name:/待审批：执行：ZeroOmega/});await high.getByRole('button',{name:'批准',exact:true}).click();assert.match(await p.locator(':focus').innerText(),/取消/)
  await p.keyboard.press('Escape');assert.equal(await high.getByRole('button',{name:'确认批准',exact:true}).count(),0)
  await high.getByRole('button',{name:'批准',exact:true}).click();await high.getByRole('button',{name:'确认批准',exact:true}).click();await p.getByText('已批准',{exact:false}).first().waitFor();assert.equal(await p.getByRole('button',{name:/1 待审批/}).count(),1)
 })
 await test('Tool retry reaches settled state',async()=>{await go();await p.getByRole('button',{name:/执行记录/}).click();await button('重试（模拟）').click();await p.waitForTimeout(1800);assert.equal(await button('重试（模拟）').count(),0);assert.equal(await p.getByText('本会话有工具执行失败',{exact:true}).count(),0)})
 await test('Disconnect disables send while retaining draft',async()=>{await go();await input().fill('保留草稿');await button('模拟断开连接').click();assert.ok(await input().isDisabled());assert.ok(await button('发送消息').isDisabled());await button('模拟恢复连接').click();assert.equal(await input().inputValue(),'保留草稿')})
 await test('Command dialog traps/restores focus and closes on backdrop',async()=>{
  await go();await button('打开命令面板').click();await p.getByRole('dialog',{name:'命令面板',exact:true}).waitFor();await p.keyboard.press('Shift+Tab');assert.ok(await p.locator(':focus').evaluate(e=>!!e.closest('dialog')))
  await p.keyboard.press('Escape');assert.ok(await button('打开命令面板').evaluate(e=>e===document.activeElement));await button('打开命令面板').click();await p.mouse.click(15,15);assert.equal(await p.getByRole('dialog',{name:'命令面板',exact:true}).isVisible(),false)
 })
 await test('New-chat command opens empty demo; session search empty state',async()=>{
  await go();await p.keyboard.press('Control+k');await p.getByRole('combobox',{name:'搜索命令'}).fill('新会话');await p.keyboard.press('Enter');await p.getByText('有什么想一起完成？',{exact:true}).waitFor()
  await p.getByRole('textbox',{name:'搜索会话',exact:true}).fill('no-matching-session');assert.ok(await p.getByText('没有找到会话',{exact:true}).isVisible())
 })
 await test('Scheduled task create/run/search; tabs preserve edits',async()=>{
  await go('tasks');await button('新建').click();await p.getByRole('textbox',{name:'任务名称',exact:true}).fill('交互测试任务');await button('创建（模拟）').click();await p.getByRole('textbox',{name:'搜索任务',exact:true}).fill('交互测试任务');await button('运行').click();await p.waitForTimeout(1600);assert.ok(await p.getByText('上次成功',{exact:true}).isVisible());await tab('看板').click();await tab('定时任务').click();assert.ok(await p.getByText('交互测试任务（模拟）',{exact:true}).isVisible())
 })
 await test('Board keyboard tab/detail/progress/delete/undo',async()=>{
  await go('tasks');await tab('定时任务').focus();await p.keyboard.press('ArrowRight');assert.equal(await tab('看板').getAttribute('aria-selected'),'true')
  const card=p.locator('.board-card').first();const title=await card.locator('button').first().innerText();await card.locator('button').first().click();await p.getByRole('combobox',{name:'进度',exact:true}).selectOption('doing');await button('完成').click();await button(`删除卡片 ${title}`).click();await button('撤销').click();assert.ok(await p.locator('.board-card').getByText(title,{exact:true}).isVisible())
 })
 await test('Mobile navigation and session drawers',async()=>{
  await go('chat','light',390);await button('打开导航').click();await p.getByRole('navigation',{name:'移动主导航',exact:true}).getByRole('button',{name:'任务',exact:true}).click();assert.ok(await p.getByRole('heading',{name:'任务',exact:true}).isVisible())
  await button('打开导航').click();await p.getByRole('dialog',{name:'工作空间导航',exact:true}).getByRole('button',{name:/^新会话.*默认/}).click();await p.getByText('有什么想一起完成？',{exact:true}).waitFor()
 })
 await test('System theme and blocked-storage synchronization',async()=>{
  await go('settings');await button('外观').click();await p.getByRole('radio',{name:'跟随系统',exact:true}).click();await p.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});await p.waitForTimeout(100);assert.equal(await p.locator('html').getAttribute('data-theme'),'dark')
  await p.evaluate(()=>{Storage.prototype.setItem=()=>{throw new Error('Blocked for QA')}});await p.getByRole('radio',{name:'浅色',exact:true}).click();assert.equal(await p.locator('html').getAttribute('data-theme'),'light');await button('打开命令面板').click();await p.getByRole('combobox',{name:'搜索命令'}).fill('前往任务');await p.keyboard.press('Enter');assert.ok(await p.getByRole('heading',{name:'任务',exact:true}).isVisible())
 })
 await test('Completed maintenance log remains available',async()=>{
  await go();await p.keyboard.press('Control+.');await tab('维护').click();await p.getByRole('button',{name:'运行',exact:true}).first().click();await p.waitForTimeout(4200);assert.ok(await p.getByText('自检通过（模拟）',{exact:true}).isVisible())
 })
 await test('Command center actions run independently',async()=>{
  await go();await p.keyboard.press('Control+.');await tab('系统').click();await button('检查更新（模拟）').click();await button('重启网关（模拟）').click();assert.ok(await button('检查更新（模拟）').isDisabled());await p.waitForTimeout(2400);assert.equal(await button('检查更新（模拟）').isDisabled(),false);assert.match(await button('检查更新（模拟）').innerText(),/完成/)
 })
 await test('120% scale fits small viewport and applies to pixel controls',async()=>{
  await go('settings','light',390);await tab('外观').click();const before=await p.locator('.workspace-toolbar').evaluate(e=>e.getBoundingClientRect().height);await p.locator('#zoom').fill('120');await p.waitForTimeout(80);const after=await p.locator('.workspace-toolbar').evaluate(e=>e.getBoundingClientRect().height);assert.ok(after>before);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.locator('#zoom').fill('100')
 })

 await test('Session menu: pin, rename, archive and restore',async()=>{
  await go();await button('会话操作：每日 AI 早报素材整理').click();await p.getByRole('menuitem',{name:'置顶'}).click()
  assert.ok(await p.locator('.session-scroll').getByText('已置顶').isVisible())
  await button('会话操作：每日 AI 早报素材整理').click();await p.getByRole('menuitem',{name:'重命名…'}).click();await p.getByRole('textbox',{name:'会话名称'}).fill('早报 · 改名测试');await button('保存').click()
  assert.ok(await p.getByRole('button',{name:/^早报 · 改名测试/}).isVisible())
  await button('会话操作：早报 · 改名测试').click();await p.getByRole('menuitem',{name:'归档'}).click();assert.equal(await p.getByRole('button',{name:/^早报 · 改名测试/}).count(),0)
  await p.keyboard.press('Control+,');await button('已归档对话').click();await button('取消归档').click();assert.ok(await p.getByRole('button',{name:/^早报 · 改名测试/}).isVisible())
 })
 await test('Running turn: queue, stop and auto-send',async()=>{
  await go();await input().fill('第一条');await input().press('Enter');await input().fill('排队的第二条');await input().press('Enter')
  assert.ok(await p.getByText('1 条排队',{exact:true}).isVisible());await button('停止').click()
  await p.waitForTimeout(2500);assert.ok(await p.locator('.chat-scroll').getByText('排队的第二条').count()>0);assert.equal(await p.getByText('1 条排队',{exact:true}).count(),0)
 })
 await test('Attachments, model picker and voice stay per session',async()=>{
  await go();await button('添加附件或提示词片段').click();await p.getByRole('menuitem',{name:'文件…'}).click();assert.ok(await p.getByText('审计报告-阶段1.md',{exact:true}).first().isVisible())
  await p.getByRole('button',{name:/^每日 AI 早报素材整理/}).click();assert.equal(await p.locator('.attachment-chip').count(),0)
  await p.getByRole('button',{name:/^模型：/}).click();await p.getByRole('menuitemradio',{name:'Hermes 4 405B'}).click();assert.match(await p.getByRole('button',{name:/^模型：/}).innerText(),/405B/)
  await button('开始语音对话').click();assert.ok(await p.getByText(/语音对话中/).isVisible());await button('结束').click()
 })
 await test('Advanced mode shows the right panel; overlays open from shortcuts',async()=>{
  await go('settings');await p.getByRole('radio',{name:/^高级/}).click();await p.getByRole('button',{name:/^宿舍网络审计跟进/}).click();await p.keyboard.press('Control+j')
  assert.ok(await p.getByRole('complementary',{name:'右侧面板'}).isVisible());await tab('终端').click();assert.ok(await p.getByText(/hermes status/).isVisible())
  await p.keyboard.press('Control+/');assert.ok(await p.getByRole('dialog',{name:'键盘快捷键'}).isVisible());await p.keyboard.press('Escape')
  await button('账户、配置档案与设置').click();await p.getByRole('menuitem',{name:'从其他应用导入会话'}).click();assert.ok(await p.getByRole('dialog',{name:'导入会话'}).isVisible());await p.keyboard.press('Escape')
  await p.getByRole('button',{name:/子代理运行中/}).click();assert.ok(await p.getByRole('dialog',{name:'子代理'}).isVisible());await p.keyboard.press('Escape')
  await p.getByRole('radio',{name:/^简洁/}).count();await p.keyboard.press('Control+,');await p.getByRole('radio',{name:/^简洁/}).click()
 })
 await test('Command center: sessions, usage, maintenance',async()=>{
  await go();await button('账户、配置档案与设置').click();await p.getByRole('menuitem',{name:'命令中心'}).click();const d=p.getByRole('dialog',{name:'命令中心'});assert.ok(await d.isVisible())
  await d.getByRole('textbox',{name:'搜索全部会话'}).fill('Owala');assert.ok(await d.getByText('Owala 杯子比价').isVisible());await tab('用量').click();assert.ok(await d.getByText('预估成本').isVisible());await p.keyboard.press('Escape')
 })
 await test('Compact desktop rail opens full navigation',async()=>{
  await go('chat','light',960);await button('打开完整导航').click();assert.ok(await p.getByRole('dialog',{name:'工作空间导航',exact:true}).isVisible());await p.keyboard.press('Escape')
 })
 for(const theme of ['light','dark']) {
  await go('chat',theme);await capture(`chat-${theme}.png`);await p.getByRole('button',{name:/^新会话.*默认/}).click();await p.waitForTimeout(150);await capture(`empty-${theme}.png`)
  await go('tasks',theme);await capture(`tasks-${theme}.png`);await tab('看板').click();await capture(`board-${theme}.png`)
 }
 await go('chat','light',390);await capture('chat-mobile.png');await button('打开导航').click();report.secondary.push(await scan({state:'navigation-dialog',width:390}));await p.keyboard.press('Escape')
 await go('chat','dark');await button('打开命令面板').click();report.secondary.push(await scan({state:'command-dialog',width:1440}));await capture('command-dark.png')
 const failures=[...report.matrix,...report.secondary].filter(r=>r.missing||r.documentWidth>r.viewport||r.violations?.length)
 report.productionAssets=await p.evaluate(()=>Array.from(document.querySelectorAll('script[src],link[rel=stylesheet]')).map(e=>e.getAttribute('src')||e.getAttribute('href')));
 report.passed=!failures.length&&report.interactions.every(r=>r.passed)&&!report.pageErrors.length&&!report.externalRequests.length
 report.summary={matrix:report.matrix.length,secondary:report.secondary.length,interactionChecks:report.interactions.length,layoutOrAccessibilityFailures:failures.length,browserErrors:report.pageErrors.length}
 await writeFile(path.join(root,'docs/UI-QA-RESULTS.json'),JSON.stringify(report,null,2)+'\n')
 console.log(JSON.stringify({passed:report.passed,...report.summary,failures},null,2));if(!report.passed)process.exitCode=1
} finally {await browser.close()}
