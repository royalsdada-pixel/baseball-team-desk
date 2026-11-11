const $=id=>document.getElementById(id), uid=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()), esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));let db,state={teams:[],players:[],games:[]},timer;
function openDB(){return new Promise((ok,no)=>{let r=indexedDB.open("baseball-team-desk",1);r.onupgradeneeded=()=>r.result.createObjectStore("data");r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
function read(){return new Promise((ok,no)=>{let r=db.transaction("data").objectStore("data").get("state");r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
function persist(){return new Promise((ok,no)=>{let t=db.transaction("data","readwrite");t.objectStore("data").put(state,"state");t.oncomplete=ok;t.onerror=()=>no(t.error)})}
function toast(s){$("toast").textContent=s;$("toast").classList.add("show");clearTimeout(timer);timer=setTimeout(()=>$("toast").classList.remove("show"),2200)}
function team(id){return state.teams.find(x=>x.id===id)?.name||"未知球隊"}
function comparePlayerNumbers(a,b){return String(a.number??"").localeCompare(String(b.number??""),"zh-Hant",{numeric:true,sensitivity:"base"})||String(a.name??"").localeCompare(String(b.name??""),"zh-Hant")}
async function save(){await persist();$("saveState").textContent="本機資料已儲存";render();scheduleCloudSync()}
function go(id){document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.id===id));document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===id));if(id==="players")teamOptions("playerTeam");if(id==="games")teamOptions("gameTeam");if(id==="pitchAnalysis")renderPitchAnalysis();if(id==="batterAnalysis")renderBatterAnalysis();if(id==="fieldAnalysis")renderFieldAnalysis();if(id==="teamAnalytics")renderTeamAnalytics()}
document.querySelectorAll(".nav").forEach(x=>x.onclick=()=>go(x.dataset.page));document.querySelectorAll(".close").forEach(x=>x.onclick=()=>x.closest("dialog").close());
function teamOptions(id){let s=$(id),old=s.value;s.innerHTML=state.teams.map(t=>'<option value="'+t.id+'">'+esc(t.name)+'</option>').join("");if(state.teams.some(t=>t.id===old))s.value=old;if(id==="playerTeam")$("filterTeam").innerHTML='<option value="">所有球隊</option>'+state.teams.map(t=>'<option value="'+t.id+'">'+esc(t.name)+'</option>').join("")}
function render(){ $("teamCount").textContent=state.teams.length;$("playerCount").textContent=state.players.length;$("gameCount").textContent=state.games.length;
$("teamList").innerHTML=state.teams.length?state.teams.map(t=>'<article><div class="cardtitle">'+esc(t.name)+'</div><div class="muted">'+esc(t.org||"未填寫單位")+'</div><span class="tag">'+state.players.filter(p=>p.teamId===t.id).length+' 位球員</span><div class="actions"><button data-et="'+t.id+'">編輯</button><button class="danger" data-dt="'+t.id+'">刪除</button></div></article>').join(""):'<div class="empty">尚未建立球隊，請新增第一支球隊。</div>';
let q=$("search").value.toLowerCase(),f=$("filterTeam").value,ps=state.players.filter(p=>(!f||p.teamId===f)&&(!q||p.name.toLowerCase().includes(q)||p.number.toLowerCase().includes(q)));ps.sort(comparePlayerNumbers);
$("playerRows").innerHTML=ps.map(p=>'<tr><td>#'+esc(p.number)+'</td><td><b>'+esc(p.name)+'</b></td><td>'+esc(team(p.teamId))+'</td><td>'+esc(p.position||"未設定")+'</td><td><button data-ep="'+p.id+'">編輯</button> <button class="danger" data-dp="'+p.id+'">刪除</button></td></tr>').join("");$("playerEmpty").hidden=ps.length>0;
$("gameList").innerHTML=state.games.length?[...state.games].sort((a,b)=>b.date.localeCompare(a.date)).map(g=>'<article><div class="muted">'+esc(g.date)+' '+esc(g.time||"")+'</div><div class="cardtitle">'+esc(team(g.teamId))+' vs '+esc(g.opponent)+'</div><div class="muted">'+esc(g.venue||"地點未設定")+'</div><span class="tag">'+g.innings+' 局制</span><span class="tag">'+(g.extra==="true"?"允許延長":"不延長")+'</span><span class="tag">'+(g.mercy==="none"?"未設定提前結束":'領先 '+(g.mercy==="custom"?g.customMercy:g.mercy)+' 分，至少 '+g.minInnings+' 局')+'</span><div class="actions"><button class="primary" data-score="'+g.id+'">⚾ 比賽紀錄</button><button data-eg="'+g.id+'">編輯</button><button class="danger" data-dg="'+g.id+'">刪除</button></div></article>').join(""):'<div class="empty">尚未建立賽事，請建立第一場比賽。</div>';
$("recent").innerHTML=state.games.length?[...state.games].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,4).map(g=>'<div class="mini"><b>'+esc(team(g.teamId))+' vs '+esc(g.opponent)+'</b><span>'+esc(g.date)+'</span></div>').join(""):'<div class="empty">還沒有賽事紀錄</div>';
$("summary").innerHTML=state.teams.length?state.teams.slice(0,5).map(t=>'<div class="mini"><b>'+esc(t.name)+'</b><span>'+state.players.filter(p=>p.teamId===t.id).length+' 位球員</span></div>').join(""):'<div class="empty">尚未建立球隊</div>';
document.querySelectorAll("[data-et]").forEach(b=>b.onclick=()=>editTeam(b.dataset.et));document.querySelectorAll("[data-dt]").forEach(b=>b.onclick=()=>delTeam(b.dataset.dt));document.querySelectorAll("[data-ep]").forEach(b=>b.onclick=()=>editPlayer(b.dataset.ep));document.querySelectorAll("[data-dp]").forEach(b=>b.onclick=()=>delPlayer(b.dataset.dp));document.querySelectorAll("[data-eg]").forEach(b=>b.onclick=()=>editGame(b.dataset.eg));document.querySelectorAll("[data-dg]").forEach(b=>b.onclick=()=>delGame(b.dataset.dg))}
function modal(id){$(id).showModal()}
function editTeam(id){let t=state.teams.find(x=>x.id===id);$("teamForm").reset();$("teamId").value=id||"";$("teamTitle").textContent=id?"編輯球隊":"新增球隊";if(t){$("teamName").value=t.name;$("teamOrg").value=t.org||"";$("teamNote").value=t.note||""}modal("teamModal")}
$("addTeam").onclick=()=>editTeam("");$("teamForm").onsubmit=async e=>{e.preventDefault();let id=$("teamId").value,t={id:id||uid(),name:$("teamName").value.trim(),org:$("teamOrg").value.trim(),note:$("teamNote").value.trim()};state.teams=id?state.teams.map(x=>x.id===id?t:x):[...state.teams,t];$("teamModal").close();await save();toast("球隊已儲存")};
async function delTeam(id){if(state.players.some(p=>p.teamId===id)||state.games.some(g=>g.teamId===id)){toast("請先刪除該球隊的球員與賽事");return}if(confirm("確定刪除這支球隊？")){state.teams=state.teams.filter(t=>t.id!==id);await save()}}
function editPlayer(id){if(!state.teams.length){toast("請先建立球隊");return}let p=state.players.find(x=>x.id===id);$("playerForm").reset();teamOptions("playerTeam");$("playerId").value=id||"";$("playerTitle").textContent=id?"編輯球員":"新增球員";if(p){$("playerTeam").value=p.teamId;$("number").value=p.number;$("playerName").value=p.name;$("position").value=p.position||"";$("playerNote").value=p.note||""}modal("playerModal")}
$("addPlayer").onclick=()=>editPlayer("");$("playerForm").onsubmit=async e=>{e.preventDefault();let id=$("playerId").value,teamId=$("playerTeam").value,number=$("number").value.trim();if(state.players.some(p=>p.teamId===teamId&&p.number===number&&p.id!==id)){toast("同一球隊已有這個背號");return}let p={id:id||uid(),teamId,number,name:$("playerName").value.trim(),position:$("position").value,note:$("playerNote").value.trim()};state.players=id?state.players.map(x=>x.id===id?p:x):[...state.players,p];$("playerModal").close();await save();toast("球員已儲存")};
async function delPlayer(id){if(confirm("確定刪除這位球員？")){state.players=state.players.filter(p=>p.id!==id);await save()}}
function editGame(id){if(!state.teams.length){toast("請先建立球隊");return}let g=state.games.find(x=>x.id===id);$("gameForm").reset();teamOptions("gameTeam");$("gameId").value=id||"";$("gameTitle").textContent=id?"編輯比賽":"建立比賽";$("date").value=new Date().toLocaleDateString("en-CA");$("innings").value="6";$("extra").value="true";$("mercy").value="none";$("minInnings").value="3";$("battingOrder").value="first";if(g){$("battingOrder").value=g.battingOrder||"first";$("gameTeam").value=g.teamId;$("opponent").value=g.opponent;$("date").value=g.date;$("time").value=g.time||"";$("venue").value=g.venue||"";$("innings").value=g.innings;$("extra").value=g.extra;$("mercy").value=g.mercy;$("minInnings").value=g.minInnings;$("customMercy").value=g.customMercy||"";$("gameNote").value=g.note||""} $("customWrap").hidden=$("mercy").value!=="custom";modal("gameModal")}
$("addGame").onclick=$("quickGame").onclick=()=>editGame("");$("mercy").onchange=()=>$("customWrap").hidden=$("mercy").value!=="custom";$("gameForm").onsubmit=async e=>{e.preventDefault();let id=$("gameId").value,m=$("mercy").value;if(m==="custom"&&Number($("customMercy").value)<1){toast("請輸入有效分差");return}let g={id:id||uid(),teamId:$("gameTeam").value,opponent:$("opponent").value.trim(),date:$("date").value,time:$("time").value,venue:$("venue").value.trim(),battingOrder:$("battingOrder").value,innings:Number($("innings").value),extra:$("extra").value,mercy:m,minInnings:Number($("minInnings").value),customMercy:$("customMercy").value,note:$("gameNote").value.trim()};state.games=id?state.games.map(x=>x.id===id?g:x):[...state.games,g];$("gameModal").close();await save();toast("賽事已儲存")};
async function delGame(id){if(confirm("確定刪除這場比賽？")){state.games=state.games.filter(g=>g.id!==id);await save()}}
$("search").oninput=render;$("filterTeam").onchange=render;
$("export").onclick=()=>{let blob=new Blob([JSON.stringify({format:"baseball-team-desk",version:1,exportedAt:new Date().toISOString(),data:state},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="少棒紀錄室備份-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(a.href);toast("備份已匯出")};
$("import").onchange=async e=>{let f=e.target.files[0];if(!f)return;try{let x=JSON.parse(await f.text());if(x.format!=="baseball-team-desk"||!x.data||!Array.isArray(x.data.teams)||!Array.isArray(x.data.players)||!Array.isArray(x.data.games))throw 0;if(confirm("匯入將取代目前裝置資料，確定？")){state=x.data;await save();toast("備份匯入完成")}}catch{toast("備份格式不正確")}e.target.value=""};
(async()=>{try{db=await openDB();state=await read()||state;$("saveState").textContent="IndexedDB 本機資料庫已啟用";render();if("serviceWorker"in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(console.warn);$("net").textContent=navigator.onLine?"● 離線資料已啟用":"● 目前離線";addEventListener("online",()=>$("net").textContent="● 已連線");addEventListener("offline",()=>$("net").textContent="● 目前離線")}catch(e){console.error(e);$("saveState").textContent="本機資料庫初始化失敗";toast("請使用新版瀏覽器")}})();


// ===== 黑金版即時比賽紀錄 =====
let activeGameId=null;
const defensePositionLabels={"P":"投手","C":"捕手","1B":"一壘手","2B":"二壘手","3B":"三壘手","SS":"游擊手","LF":"左外野手","CF":"中外野手","RF":"右外野手"};
function currentGame(){return state.games.find(g=>g.id===activeGameId)}
function ensureLive(g){
 if(!g.live)g.live={inning:1,half:"top",balls:0,strikes:0,outs:0,home:0,away:0,pitches:0,inningPitches:{},events:[],status:"進行中"};
 const s=g.live;
 s.inning=s.inning||1;s.half=s.half||"top";s.balls=s.balls||0;s.strikes=s.strikes||0;s.outs=s.outs||0;
 s.away=s.away||0;s.home=s.home||0;s.pitches=s.pitches||0;s.inningPitches=s.inningPitches||{};s.events=s.events||[];s.bases=s.bases||[null,null,null];s.runnerPitcherMap=s.runnerPitcherMap||{};s.lineup=s.lineup||Array(9).fill("");s.lineupIndex=Number.isInteger(s.lineupIndex)?s.lineupIndex:0;s.lineupPositions=s.lineupPositions||Array(9).fill("");s.substitutions=s.substitutions||[];s.defense=s.defense||{};s.defenseHistory=s.defenseHistory||[];if(!s.defenseInitialized){const positionCodes={"投手":"P","捕手":"C","一壘手":"1B","二壘手":"2B","三壘手":"3B","游擊手":"SS","左外野手":"LF","中外野手":"CF","右外野手":"RF"};for(let i=0;i<s.lineup.length;i++){const id=s.lineup[i],position=s.lineupPositions[i]||state.players.find(p=>p.id===id)?.position,code=positionCodes[position];if(id&&code&&!s.defense[code]&&!Object.values(s.defense).includes(id))s.defense[code]=id;}s.defenseInitialized=true;}
 return s;
}
function ourTeamBatting(g,s){return (s.half==="top" && (g.battingOrder||"first")==="first") || (s.half==="bottom" && (g.battingOrder||"first")==="second")}
function showScoring(id){const g=state.games.find(x=>x.id===id);if(!g)return;activeGameId=id;ensureLive(g);go("scorePage");renderScoring()}
function renderScoring(){
 const g=currentGame();if(!g)return;const s=ensureLive(g),batting=ourTeamBatting(g,s);
 $("scoreTitle").textContent=team(g.teamId)+" vs "+g.opponent;
 $("scoreMeta").textContent=g.date+"・"+g.innings+" 局制・"+(g.battingOrder==="second"?"我方後攻":"我方先攻");
 $("scoreAwayName").textContent=team(g.teamId);$("scoreHomeName").textContent=g.opponent;
 $("scoreAway").textContent=s.away;$("scoreHome").textContent=s.home;
 $("scoreInning").textContent="第 "+s.inning+" 局";
 $("scoreHalf").textContent=(s.half==="top"?"上半局":"下半局")+"・"+(batting?"我方進攻":"我方守備");
 $("scoreBalls").textContent=s.balls;$("scoreStrikes").textContent=s.strikes;$("scoreOuts").textContent=s.outs;$("scorePitches").textContent=s.pitches;
 $("inningPitches").textContent=s.inningPitches[s.inning]||0;$("scorePitchesMirror").textContent=s.pitches;
 $("strikeRate").textContent=s.pitches?Math.round((s.events.filter(e=>e.meta?.pitchType==="strike"||e.meta?.pitchType==="foul"&&e.meta?.countedStrike).length/s.pitches)*100)+"%":"--";
 const pitcherSelect=$("pitcherSelect");$("pitcherPicker").hidden=batting;$("batterPicker").hidden=!batting;$("fieldingPanel").hidden=batting;
 const roster=state.players.filter(p=>p.teamId===g.teamId).sort(comparePlayerNumbers);
 pitcherSelect.innerHTML='<option value="">未指定投手</option>'+roster.map(p=>'<option value="'+p.id+'">#'+esc(p.number)+' '+esc(p.name)+'</option>').join("");
 pitcherSelect.value=s.activePitcherId||"";
 const defensePositions={"P":"投手","C":"捕手","1B":"一壘手","2B":"二壘手","3B":"三壘手","SS":"游擊手","LF":"左外野手","CF":"中外野手","RF":"右外野手"};
 const activeDefenseIds=Object.values(s.defense).filter(Boolean);
 for(const [code,label] of Object.entries(defensePositions)){const sel=$("defense_"+code);if(!sel)continue;const old=s.defense[code]||"";sel.innerHTML='<option value="">未指定</option>'+roster.filter(p=>!activeDefenseIds.includes(p.id)||p.id===old).map(p=>'<option value="'+p.id+'">#'+esc(p.number)+' '+esc(p.name)+'</option>').join("");sel.value=old;}
 const defenseSummary=$("defenseSummary");if(defenseSummary){const filled=Object.entries(defensePositions).filter(([code])=>s.defense[code]).length;defenseSummary.textContent="已設定 "+filled+" / 9 個守備位置";}
 const fieldingSelect=$("fielderSelect");if(fieldingSelect){const oldFielder=fieldingSelect.value;fieldingSelect.innerHTML='<option value="">選擇守備球員</option>'+roster.filter(p=>activeDefenseIds.includes(p.id)||p.id===oldFielder).map(p=>'<option value="'+p.id+'">#'+esc(p.number)+' '+esc(p.name)+'</option>').join("");fieldingSelect.value=activeDefenseIds.includes(oldFielder)?oldFielder:(s.activePitcherId||"")}
 for(let i=1;i<=3;i++){const sel=$("autoFielder"+i);if(sel){const old=sel.value;const fielders=roster.filter(p=>activeDefenseIds.includes(p.id)||p.id===old);sel.innerHTML='<option value="">選擇球員</option>'+fielders.map(p=>'<option value="'+p.id+'">#'+esc(p.number)+' '+esc(p.name)+'</option>').join("");sel.value=fielders.some(p=>p.id===old)?old:""}}
 const pitcherChanges=s.events.filter(e=>e.meta?.pitcherChange).slice(-5).reverse();
 $("pitcherHistory").innerHTML=pitcherChanges.length?pitcherChanges.map(e=>'<div class="pitcher-history-row"><b>'+esc(e.detail)+'</b><small>'+esc(e.inningLabel)+'・'+esc(e.time)+'</small></div>').join(""):'<small>尚未有投手輪替紀錄</small>';
 for(let i=0;i<9;i++){const sel=$("lineup"+(i+1)),old=s.lineup[i]||"";sel.innerHTML='<option value="">未設定</option>'+roster.map(p=>'<option value="'+p.id+'">#'+esc(p.number)+' '+esc(p.name)+'</option>').join("");sel.value=old;const pos=s.lineupPositions[i]||"";sel.title=pos?"守備位置："+pos:"尚未設定守備位置"}
 const subSlot=$("subSlot"),subPlayer=$("subPlayer"),subPosition=$("subPosition");if(subSlot&&subPlayer&&subPosition){const slot=Number(subSlot.value||1)-1;subPlayer.innerHTML='<option value="">選擇替補球員</option>'+roster.filter(p=>!s.lineup.includes(p.id)||p.id===s.lineup[slot]).map(p=>'<option value="'+p.id+'">#'+esc(p.number)+' '+esc(p.name)+'</option>').join("");subPosition.value=s.lineupPositions[slot]||"";const current=s.lineup[slot];subPlayer.value=subPlayer.querySelector('option[value="'+CSS.escape(current||"") +'"]')?current:""}
 $("subHistory").innerHTML=s.substitutions.length?[...s.substitutions].reverse().map(x=>{const from=state.players.find(p=>p.id===x.fromPlayerId),to=state.players.find(p=>p.id===x.toPlayerId);return '<div class="pitcher-history-row"><b>'+esc(x.slot+'棒：'+(from?from.name:"未設定")+' → '+(to?to.name:"未知球員"))+'</b><small>'+esc(x.inningLabel+'・'+(x.position||"守備位置未指定"))+'</small></div>'}).join(""):'<small>尚無替補紀錄</small>';
 const lineupId=s.lineup[s.lineupIndex]||s.activeBatterId||"";
 if(lineupId)s.activeBatterId=lineupId;
 const batterSelect=$("batterSelect");batterSelect.innerHTML='<option value="">未指定打者</option>'+roster.map(p=>'<option value="'+p.id+'">#'+esc(p.number)+' '+esc(p.name)+'</option>').join("");batterSelect.value=s.activeBatterId||"";
 const bases=s.bases;$("base1").classList.toggle("occupied",!!bases[0]);$("base2").classList.toggle("occupied",!!bases[1]);$("base3").classList.toggle("occupied",!!bases[2]);
 $("baseText").textContent=bases.some(Boolean)?["一壘","二壘","三壘"].filter((_,i)=>bases[i]).join("、")+"有人":"目前無人在壘";
 const runnerSelect=$("runnerSelect"),oldRunner=runnerSelect.value;
 runnerSelect.innerHTML='<option value="">選擇壘上跑者</option>'+bases.map((id,i)=>id?'<option value="'+i+'">'+["一壘","二壘","三壘"][i]+'跑者'+(state.players.find(p=>p.id===id)?'・'+esc(state.players.find(p=>p.id===id).name):"")+'</option>':"").join("");
 if([...runnerSelect.options].some(o=>o.value===oldRunner))runnerSelect.value=oldRunner;
 const dest=$("runnerDestination");if(dest)dest.disabled=!bases.some(Boolean);
 $("scoreMode").textContent=batting?"進攻模式":"守備模式";
 $("scoreModeHint").textContent=batting?"記錄我方打者結果":"記錄投手投球結果";
 $("defenseActions").hidden=batting;$("offenseActions").hidden=!batting;
 $("scoreEvents").innerHTML=s.events.length?[...s.events].reverse().slice(0,24).map(e=>'<div class="event-row"><span><b>'+esc(e.label)+'</b><small>'+esc(e.inningLabel)+'・'+esc(e.time)+'</small></span><span>'+esc(e.detail||"")+'</span></div>').join(""):'<div class="empty">尚無紀錄</div>';
 renderFieldPlayControls();
 $("scoreStatus").textContent=s.status;$("scoreSaved").textContent="資料自動儲存";
}
async function saveScoring(){await persist();renderScoring();scheduleCloudSync()}
function eventRecord(s,label,detail="",meta={},beforeOverride=null){
 const before={inning:s.inning,half:s.half,balls:s.balls,strikes:s.strikes,outs:s.outs,pitches:s.pitches,inningPitches:{...s.inningPitches},bases:[...s.bases],away:s.away,home:s.home,lineupIndex:s.lineupIndex,lineup:[...s.lineup],lineupPositions:[...s.lineupPositions],substitutions:[...s.substitutions],defense:{...s.defense},defenseHistory:[...s.defenseHistory],activeBatterId:s.activeBatterId||"",activePitcherId:s.activePitcherId||"",runnerPitcherMap:{...(s.runnerPitcherMap||{})},...(beforeOverride||{})};
 const eventMeta={...meta};if(meta.pitchType||meta.outcome)eventMeta.pitcherId=s.activePitcherId||"";if(meta.batterOutcome)eventMeta.batterId=s.activeBatterId||"";if(meta.batterOutcome)eventMeta.batterId=s.activeBatterId||"";
 s.events.push({label,detail,meta:eventMeta, before,inning:s.inning,half:s.half,inningLabel:"第"+s.inning+"局"+(s.half==="top"?"上":"下"),time:new Date().toLocaleTimeString("zh-TW",{hour:"2-digit",minute:"2-digit"})});
}
function autoChangeHalfIfThreeOuts(s){
 if(s.outs<3)return false;
 const endedHalf=s.half,endedInning=s.inning;
 if(s.half==="top")s.half="bottom";else{s.half="top";s.inning++}
 s.outs=0;s.balls=0;s.strikes=0;s.bases=[null,null,null];
 s._autoHalfNotice="第 "+endedInning+" 局"+(endedHalf==="top"?"上":"下")+"半局三出局，已自動換"+(endedHalf==="top"?"到下半局":"局");
 return true;
}
function attachRunRecords(s,scorers,fallbackPitcherId,forcedReason=null){
 if(!scorers||!scorers.length)return [];
 s.runnerPitcherMap=s.runnerPitcherMap||{};
 s.runRecordSeq=(s.runRecordSeq||0);
 const inningEvents=s.events.filter(e=>e.inning===s.inning&&e.half===s.half);
 const priorDefensiveError=inningEvents.some(e=>e.meta?.outcome==="error"||e.meta?.fieldingError);
 const priorPassedBall=inningEvents.some(e=>e.meta?.catcherEvent==="PB"||e.meta?.passedBallAdvance);
 const autoEarned=forcedReason==="PB"?false:forcedReason==="WP"?true:!(priorDefensiveError||priorPassedBall);
 return scorers.map((runnerId,index)=>{
  const pitcherId=s.runnerPitcherMap[runnerId]||fallbackPitcherId||s.activePitcherId||"";
  const record={id:"run-"+(++s.runRecordSeq),runnerId,pitcherId,earned:autoEarned,autoEarned,reviewed:false,inning:s.inning,half:s.half,reason:forcedReason==="PB"?"捕逸進壘得分，初判非自責分":forcedReason==="WP"?"暴投進壘得分，初判自責分":priorDefensiveError?"本半局曾有守備失誤，待覆核":priorPassedBall?"本半局曾有捕逸，待覆核":"依目前事件初判自責分"};
  return record;
 });
}
function countPitch(s,kind){
 s.pitches++;
 s.inningPitches[s.inning]=(s.inningPitches[s.inning]||0)+1;
}
function advanceWildPitchRunners(s,forceWalk=false){
 const before=[...s.bases],next=[null,null,null];let runs=0;
 if(forceWalk){
  if(before[0]){
   if(before[1]){
    if(before[2])runs++;
    next[2]=before[1];next[1]=before[0];
   }else next[1]=before[0];
  }else{next[1]=before[1];next[2]=before[2];}
  next[0]=s.activeBatterId||null;
 }else{
  if(before[2])runs++;
  if(before[1])next[2]=before[1];
  if(before[0])next[1]=before[0];
  next[0]=before[0]?null:null;
 }
 s.bases=next;
 if(runs)addRuns(currentGame(),s,runs);
 return {runs,scoredRunners:before[2]?[before[2]]:[]};
}
async function recordCatcherEvent(type){
 const g=currentGame();if(!g)return;const s=ensureLive(g);
 if(s.status==="已結束"){toast("比賽已結束");return}
 if(ourTeamBatting(g,s)){toast("目前是我方進攻");return}
 const catcherId=s.defense.C||"",pitcherId=s.activePitcherId||s.defense.P||"";
 if(!catcherId){toast("請先在九宮格設定捕手");return}
 if(type==="WP"&&!pitcherId){toast("請先指定目前投手");return}
 const catcher=state.players.find(p=>p.id===catcherId),pitcher=state.players.find(p=>p.id===pitcherId);
 const before={balls:s.balls,strikes:s.strikes,outs:s.outs,pitches:s.pitches,inningPitches:{...s.inningPitches}};
 const label=type==="PB"?"捕逸（PB）":"暴投（WP）";
 const detail=type==="PB"?"捕手 #"+catcher.number+" "+catcher.name+" 記錄捕逸":"投手 #"+(pitcher?.number||"")+" "+(pitcher?.name||"未指定")+" 暴投，捕手 #"+catcher.number+" "+catcher.name+" 面對此球";
 if(type==="WP"){
  countPitch(s,"ball");s.balls++;
  const walk=s.balls>=4;
  const runnerResult=advanceWildPitchRunners(s,walk);
  const meta={catcherEvent:type,catcherId,pitcherId,catcherFaced:true,pitchType:"ball",wildPitch:true,wpRuns:runnerResult.runs,wpScoredRunners:runnerResult.scoredRunners,forcedWalk:walk};
  if(runnerResult.runs)meta.runRecords=attachRunRecords(s,runnerResult.scoredRunners,pitcherId);
  if(walk){
   eventRecord(s,"四壞球保送",detail+"；本球為第 4 壞球"+(runnerResult.runs?"；滿壘推進，跑者得分":"；依四壞球規則推進跑者"),meta,before);
   s.balls=0;s.strikes=0;
  }else eventRecord(s,label,detail+"；計入 1 壞球"+(runnerResult.runs?"；三壘跑者因暴投得分":"；壘上跑者向前推進一個壘包"),meta,before);
 }else{
  eventRecord(s,label,detail,{catcherEvent:type,catcherId,pitcherId,catcherFaced:true},before);
 }
 await saveScoring();toast(type==="PB"?"已記錄捕逸 PB":"已記錄暴投 WP、投球數與跑者推進");
}
async function defensePitch(type){
 const g=currentGame();if(!g)return;const s=ensureLive(g);
 if(s.status==="已結束"){toast("比賽已結束");return}
 if(ourTeamBatting(g,s)){toast("目前是我方進攻");return}
 const before={balls:s.balls,strikes:s.strikes,outs:s.outs,pitches:s.pitches,inningPitches:{...s.inningPitches}};
 countPitch(s,type);
 if(type==="ball"){
  s.balls++;
  if(s.balls>=4){eventRecord(s,"四壞球保送","累積 4 壞球，打者保送",{pitchType:type},before);s.balls=0;s.strikes=0}
  else eventRecord(s,"壞球",s.balls+" 壞球",{pitchType:type},before);
 }else if(type==="strike"){
  s.strikes++;
  if(s.strikes>=3){eventRecord(s,"三振出局","累積 3 好球",{pitchType:type},before);s.outs=Math.min(3,s.outs+1);s.balls=0;s.strikes=0;autoChangeHalfIfThreeOuts(s)}
  else eventRecord(s,"好球",s.strikes+" 好球",{pitchType:type},before);
 }else if(type==="foul"){
  const counted=s.strikes<2;if(counted)s.strikes++;
  eventRecord(s,"界外球",counted?"計為好球":"兩好球後不增加好球數",{pitchType:type,countedStrike:counted},before);
 }else if(type==="inPlay"){
  eventRecord(s,"打進場內","擊球進入場內，計入投球與好球率",{pitchType:type},before);
 }
 await saveScoring();
}
async function recordManualRunnerEvent(action){
 const g=currentGame();if(!g)return;const s=ensureLive(g);
 if(s.status==="已結束"){toast("比賽已結束");return}
 const selectedRunner=$("runnerSelect").value,index=Number(selectedRunner),destination=$("runnerDestination").value;
 if(selectedRunner===""||!Number.isInteger(index)||index<0||index>2||!s.bases[index]){toast("請先選擇壘上跑者");return}
 const runnerId=s.bases[index],from=index+1,to=destination==="home"?4:Number(destination);
 if(to!==4&&to<=from){toast("目標壘包必須在跑者前方");return}
 if(to!==4&&s.bases[to-1]&&to-1!==index){toast("目標壘包已有跑者，請先處理前方跑者");return}
 const runner=state.players.find(p=>p.id===runnerId),runnerName=runner?"#"+runner.number+" "+runner.name:"跑者";
 const before={balls:s.balls,strikes:s.strikes,outs:s.outs,pitches:s.pitches,inningPitches:{...s.inningPitches}};
 const reason={runnerSteal:"盜壘成功",runnerWP:"暴投（WP）進壘",runnerPB:"捕逸（PB）進壘",runnerCaught:"盜壘失敗／阻殺"}[action];
 const baseName=n=>n===4?"本壘":n+"壘";
 if(action==="runnerCaught"){
  s.bases[index]=null;s.outs=Math.min(3,s.outs+1);
  eventRecord(s,reason,runnerName+" 從"+baseName(from)+"遭觸殺出局",{stolenBaseAttempt:true,caughtStealing:true,runnerId,fromBase:from},before);
  const changed=autoChangeHalfIfThreeOuts(s);
  await saveScoring();toast(changed?"盜壘失敗，三出局！已自動換局":"已記錄盜壘失敗／阻殺");return;
 }
 s.bases[index]=null;
 if(to===4)addRuns(g,s,1);else s.bases[to-1]=runnerId;
 const meta={runnerId,fromBase:from,toBase:to,manualAdvance:true};
 if(action==="runnerSteal"){meta.stolenBaseAttempt=true;meta.stolenBase=true}
 if(action==="runnerWP")meta.wildPitchAdvance=true;
 if(action==="runnerPB")meta.passedBallAdvance=true;
 if(to===4)meta.runRecords=attachRunRecords(s,[runnerId],s.activePitcherId||"",action==="runnerPB"?"PB":action==="runnerWP"?"WP":null);
 eventRecord(s,reason,runnerName+" 從"+baseName(from)+"前進至"+baseName(to)+(to===4?"，跑者得分":""),meta,before);
 await saveScoring();toast(reason+"已記錄"+(to===4?"，比分已更新":""));
}
async function recordPitcherResult(type){
 const g=currentGame();if(!g)return;const s=ensureLive(g);
 if(s.status==="已結束"){toast("比賽已結束");return}
 if(ourTeamBatting(g,s)){toast("目前是我方進攻");return}
 const labels={pitchSingle:"對方一壘安打",pitchInfieldHit:"對方內野安打",pitchDouble:"對方二壘安打",pitchTriple:"對方三壘安打",pitchHomerun:"對方全壘打",pitchGroundout:"對方內野出局"};
 const before={balls:s.balls,strikes:s.strikes,outs:s.outs,pitches:s.pitches,inningPitches:{...s.inningPitches}};
 countPitch(s,"inPlay");
 const bases=[...s.bases],next=[null,null,null];let runs=0;
 if(type==="pitchSingle"||type==="pitchInfieldHit"){
  if(bases[2])runs++;if(bases[1])next[2]=bases[1];if(bases[0])next[1]=bases[0];next[0]="opponent-batter-"+(s.events.length+1);
 }else if(type==="pitchDouble"){
  if(bases[2])runs++;if(bases[1])runs++;if(bases[0])next[2]=bases[0];next[1]="opponent-batter-"+(s.events.length+1);
 }else if(type==="pitchTriple"){
  runs=bases.filter(Boolean).length;next[2]="opponent-batter-"+(s.events.length+1);
 }else if(type==="pitchHomerun"){
  runs=bases.filter(Boolean).length+1;
 }else{
  s.outs=Math.min(3,s.outs+1);next.splice(0,3,...bases);
 }
 if(type!=="pitchGroundout")s.bases=next;
 if(runs)addRuns(g,s,runs);
 const scoringIds=bases.filter(Boolean).slice(0,runs);if(type==="pitchHomerun")scoringIds.push("batter-"+(s.events.length+1));
 const runRecords=attachRunRecords(s,scoringIds,s.activePitcherId||"");
 if(type==="pitchSingle"||type==="pitchInfieldHit")s.runnerPitcherMap=s.runnerPitcherMap||{},s.runnerPitcherMap[next[0]]=s.activePitcherId||"";
 if(type==="pitchDouble"||type==="pitchTriple")s.runnerPitcherMap=s.runnerPitcherMap||{},s.runnerPitcherMap[next[type==="pitchDouble"?1:2]]=s.activePitcherId||"";
 eventRecord(s,labels[type],(runs?"跑者得分 "+runs+" 分；":"")+(type==="pitchGroundout"?"壘包維持原狀":"壘包已依打擊結果更新"),{pitchType:"inPlay",pitcherOutcome:type,opponentHit:type!=="pitchGroundout",runs,runRecords},before);
 s.balls=0;s.strikes=0;
 if(type==="pitchGroundout")autoChangeHalfIfThreeOuts(s);
 await saveScoring();toast(type==="pitchGroundout"&&s.outs===0?"三出局！已自動換局":labels[type]+"，壘包與比分已更新");
}
async function pitcherOutcome(type){
 const g=currentGame();if(!g)return;const s=ensureLive(g);
 if(s.status==="已結束"){toast("比賽已結束");return}
 if(ourTeamBatting(g,s)){toast("目前是我方進攻");return}
 const before={balls:s.balls,strikes:s.strikes,outs:s.outs,pitches:s.pitches,inningPitches:{...s.inningPitches}};
 const labels={strikeout:"三振出局",walk:"四壞球保送",balk:"投手犯規",error:"失誤上壘"};
 const details={strikeout:"手動登記三振結果",walk:"手動登記四壞保送",balk:"投手犯規，不計入投球數",error:"守備失誤，打者上壘"};
 // A balk is not a pitch. Strikeout/walk buttons record a completed result, not an extra pitch.
 if(type==="error")countPitch(s,"inPlay");
 eventRecord(s,labels[type],details[type],{outcome:type,pitchType:type==="error"?"inPlay":null},before);
 if(type==="strikeout"){s.outs=Math.min(3,s.outs+1);s.balls=0;s.strikes=0;autoChangeHalfIfThreeOuts(s)}
 if(type==="walk"){s.balls=0;s.strikes=0}
 await saveScoring();
}
function addRuns(g,s,n){if(!n)return;const battingAway=(g.battingOrder||"first")==="first"?s.half==="top":s.half==="bottom";if(battingAway)s.away+=n;else s.home+=n}
function addRuns(g,s,n){if(!n)return;const battingAway=(g.battingOrder||"first")==="first"?s.half==="top":s.half==="bottom";if(battingAway)s.away+=n;else s.home+=n}
function advanceRunners(s,result){
 const g=currentGame(),b=[...s.bases],next=[...b],batter=s.activeBatterId||"";
 let runs=0;
 if(result==="single"){
  next.splice(0,3,null);if(b[2])runs++;if(b[1])next[2]=b[1];if(b[0])next[1]=b[0];next[0]=batter;
 }else if(result==="double"){
  next.splice(0,3,null);if(b[2])runs++;if(b[1])runs++;if(b[0])next[2]=b[0];next[1]=batter;
 }else if(result==="triple"){
  next.splice(0,3,null);runs=b.filter(Boolean).length;next[2]=batter;
 }else if(result==="homerun"){
  next.splice(0,3,null);runs=b.filter(Boolean).length+1;
 }else if(result==="walk"||result==="hbp"){
  // Only force runners when every preceding base is occupied.
  if(b[0]){
   if(b[1]){
    if(b[2])runs++;
    next[2]=b[1];next[1]=b[0];
   }else next[1]=b[0];
  }
  next[0]=batter;
 }else if(result==="error"){
  next.splice(0,3,null);if(b[2])runs++;if(b[1])next[2]=b[1];if(b[0])next[1]=b[0];next[0]=batter;
 }else if(result==="out"||result==="strikeout"){
  for(let i=0;i<3;i++)next[i]=b[i];
 }
 s.bases=next;if(g)addRuns(g,s,runs);
}
async function offenseResult(type){
 const g=currentGame();if(!g)return;const s=ensureLive(g);
 if(s.status==="已結束"){toast("比賽已結束");return}
 if(!ourTeamBatting(g,s)){toast("目前是我方守備");return}
 const labels={single:"一壘安打",double:"二壘安打",triple:"三壘安打",homerun:"全壘打",walk:"四壞球上壘",hbp:"觸身球上壘",out:"打者出局",strikeout:"三振出局",error:"失誤上壘",sacFly:"犧牲飛球",sacBunt:"犧牲觸擊"};
 const batterId=s.lineup[s.lineupIndex]||s.activeBatterId||"";
 s.activeBatterId=batterId;
 if(type==="sacFly"&&(s.outs>=2||!s.bases[2])){toast("犧牲飛球需少於兩出局，且三壘有人");return}
 if(type==="sacBunt"&&!s.bases.some(Boolean)){toast("犧牲觸擊需有跑者在壘");return}
 const beforeScore=(g.battingOrder||"first")==="first"?s.away:s.home;
 const beforeBases=[...s.bases];
 let rbi=0;
 if(type==="sacFly"){
  s.bases[2]=null;addRuns(g,s,1);rbi=1;s.outs=Math.min(3,s.outs+1);
 }else if(type==="sacBunt"){
  const next=[null,null,null];
  if(beforeBases[2]){addRuns(g,s,1);rbi=1}
  if(beforeBases[1])next[2]=beforeBases[1];
  if(beforeBases[0])next[1]=beforeBases[0];
  s.bases=next;s.outs=Math.min(3,s.outs+1);
 }else{
  advanceRunners(s,type);
  const afterScore=(g.battingOrder||"first")==="first"?s.away:s.home;
  if(["single","double","triple","homerun","walk","hbp"].includes(type))rbi=Math.max(0,afterScore-beforeScore);
 }
 eventRecord(s,labels[type]||type,"",{batterOutcome:type,batterId,rbi,sacrificeFly:type==="sacFly",sacrificeBunt:type==="sacBunt",scoringRbi:rbi}, {bases:beforeBases});
 if(type==="out"||type==="strikeout"||type==="sacFly"||type==="sacBunt"){if(type==="out"||type==="strikeout")s.outs=Math.min(3,s.outs+1);autoChangeHalfIfThreeOuts(s)}
 s.balls=0;s.strikes=0;
 if(["single","double","triple","homerun","walk","hbp","out","strikeout","error","sacFly","sacBunt"].includes(type)){s.lineupIndex=(s.lineupIndex+1)%9;s.activeBatterId=s.lineup[s.lineupIndex]||""}
 await saveScoring();
}
async function adjustScore(side,delta){const g=currentGame();if(!g)return;const s=ensureLive(g);s[side]=Math.max(0,s[side]+delta);await saveScoring()}
async function nextHalf(){
 const g=currentGame();if(!g)return;const s=ensureLive(g);
 if(s.half==="top")s.half="bottom";else{s.half="top";s.inning++}
 s.balls=0;s.strikes=0;s.outs=0;s.bases=[null,null,null];await saveScoring();
}
async function undoScoring(){
 const g=currentGame();if(!g)return;const s=ensureLive(g);
 if(!s.events.length){toast("目前沒有紀錄");return}
 const last=s.events.pop();
 if(last.before){if(last.before.inning!==undefined)s.inning=last.before.inning;if(last.before.half)s.half=last.before.half;s.balls=last.before.balls;s.strikes=last.before.strikes;s.outs=last.before.outs;s.pitches=last.before.pitches;s.inningPitches={...last.before.inningPitches};s.bases=[...(last.before.bases||[null,null,null])];s.away=last.before.away??s.away;s.home=last.before.home??s.home;s.lineupIndex=last.before.lineupIndex??s.lineupIndex;if(last.before.lineup)s.lineup=[...last.before.lineup];if(last.before.lineupPositions)s.lineupPositions=[...last.before.lineupPositions];if(last.before.substitutions)s.substitutions=[...last.before.substitutions];if(last.before.defense)s.defense={...last.before.defense};if(last.before.defenseHistory)s.defenseHistory=[...last.before.defenseHistory];if(last.before.runnerPitcherMap)s.runnerPitcherMap={...last.before.runnerPitcherMap};s.activeBatterId=last.before.activeBatterId??s.activeBatterId;s.activePitcherId=last.before.activePitcherId??s.activePitcherId}
 else {if(["壞球","好球","界外球"].includes(last.label))s.pitches=Math.max(0,s.pitches-1);s.balls=0;s.strikes=0}
 await saveScoring();
}
$("pitcherSelect").addEventListener("change",async e=>{
 const g=currentGame();if(!g)return;const s=ensureLive(g),nextId=e.target.value,previousId=s.activePitcherId||"";
 if(nextId===previousId)return;
 const playerName=id=>{const p=state.players.find(x=>x.id===id);return p?"#"+p.number+" "+p.name:"未指定投手"};
 const detail=(previousId?playerName(previousId):"尚未指定投手")+" → "+(nextId?playerName(nextId):"未指定投手");
 const previousCount={balls:s.balls,strikes:s.strikes};
 eventRecord(s,nextId?"投手登板／更換":"投手取消指定",detail,{pitcherChange:true,fromPitcherId:previousId,toPitcherId:nextId,previousPitcherCount:previousCount});
 s.activePitcherId=nextId;
 s.balls=0;s.strikes=0;
 await persist();scheduleCloudSync();renderScoring();toast(nextId?"投手輪替已記錄，新投手球數歸零":"已取消目前投手");
});
$("batterSelect").addEventListener("change",async e=>{const g=currentGame();if(!g)return;ensureLive(g).activeBatterId=e.target.value;await persist();scheduleCloudSync();toast(e.target.value?"已切換目前打者":"目前打者設為未指定")});
const fieldPositionOptions=[["P","投手"],["C","捕手"],["1B","一壘手"],["2B","二壘手"],["3B","三壘手"],["SS","游擊手"],["LF","左外野手"],["CF","中外野手"],["RF","右外野手"]];
function renderFieldPlayControls(){const s=currentGame()?ensureLive(currentGame()):null;if(!s)return;const source=$("fieldSource"),target=$("fieldTarget"),finalTarget=$("fieldFinalTarget");const old=[source.value,target.value,finalTarget.value];for(const [sel,first] of [[source,"選擇接球位置"],[target,"選擇傳球目標"],[finalTarget,"選擇最後傳球目標"]]){sel.innerHTML='<option value="">'+first+'</option>'+fieldPositionOptions.filter(([code])=>s.defense[code]).map(([code,label])=>'<option value="'+code+'">'+label+'</option>').join("");}if(s.defense[old[0]])source.value=old[0];if(s.defense[old[1]])target.value=old[1];if(s.defense[old[2]])finalTarget.value=old[2];updateFieldPlayControls();}
function updateFieldPlayControls(){const type=$("fieldPlayType").value,isFly=type==="flyout",isError=type==="error",isDouble=type==="doubleplay";$("fieldTargetWrap").hidden=isFly||isError;$("fieldFinalWrap").hidden=!isDouble;$("fieldPlayHint").textContent=isFly?"選擇完成接殺的守備位置，系統自動記錄該球員刺殺。":isError?"選擇發生失誤的守備位置，系統自動記錄失誤，不增加出局數。":isDouble?"選擇接球位置、第一次傳球目標及最後刺殺位置，系統自動記錄雙殺的助殺與刺殺。":"例如：游擊手接球，傳向一壘刺殺，系統自動記錄游擊手助殺及一壘手刺殺。";}
$("fieldPlayType").addEventListener("change",updateFieldPlayControls);
$("recordFieldPlay").addEventListener("click",async()=>{const g=currentGame();if(!g)return;const s=ensureLive(g);if(s.status==="已結束"){toast("比賽已結束");return}if(ourTeamBatting(g,s)){toast("目前是我方進攻");return}const type=$("fieldPlayType").value,source=$("fieldSource").value,target=$("fieldTarget").value,finalTarget=$("fieldFinalTarget").value,getPlayer=code=>code?s.defense[code]||"":"";const pos=code=>fieldPositionOptions.find(x=>x[0]===code)?.[1]||"";if(!source||!getPlayer(source)){toast("請先設定並選擇接球守備位置");return}if(type==="groundout"&&(!target||!getPlayer(target))){toast("請選擇傳球刺殺位置，並確認該位置已設定球員");return}if(type==="doubleplay"&&(!target||!finalTarget||!getPlayer(target)||!getPlayer(finalTarget))){toast("雙殺需要設定第一次及最後傳球的守備位置");return}if(type==="doubleplay"&&new Set([source,target,finalTarget]).size!==3){toast("雙殺的三個守備位置必須不同");return}if(type==="groundout"&&source===target){toast("接球位置與傳球刺殺位置相同，請修正位置");return}const entries=[],add=(code,action)=>{const id=getPlayer(code);if(id)entries.push({fielderId:id,fieldingAction:action,fieldingPosition:pos(code)});};if(type==="flyout")add(source,"putout");else if(type==="error")add(source,"error");else if(type==="groundout"){add(source,"assist");add(target,"putout")}else{add(source,"assist");add(target,"assist");add(target,"putout");add(finalTarget,"putout")}const outsAdded=type==="doubleplay"?2:type==="error"?0:1,labels={groundout:"滾地球出局",flyout:"飛球接殺",doubleplay:"雙殺",error:"守備失誤"};const detail=entries.map(x=>{const p=state.players.find(z=>z.id===x.fielderId);return "#"+(p?.number||"")+" "+(p?.name||"未知球員")+"・"+x.fieldingPosition+" "+({putout:"刺殺",assist:"助殺",error:"失誤"}[x.fieldingAction])}).join("；");const before={balls:s.balls,strikes:s.strikes,outs:s.outs,pitches:s.pitches,inningPitches:{...s.inningPitches}};eventRecord(s,labels[type],detail,{fieldingPlay:type,fieldingEntries:entries,outsAdded},before);s.outs=Math.min(3,s.outs+outsAdded);s.balls=0;s.strikes=0;const changed=autoChangeHalfIfThreeOuts(s);await saveScoring();toast(type==="error"?"已記錄守備失誤":changed?"三出局！已自動換局":"已記錄守備結果，增加 "+outsAdded+" 個出局數");});
$("subSlot").addEventListener("change",()=>renderScoring());
$("substituteBtn").addEventListener("click",async()=>{const g=currentGame();if(!g)return;const s=ensureLive(g),slot=Number($("subSlot").value)-1,nextId=$("subPlayer").value,position=$("subPosition").value,previousId=s.lineup[slot]||"";if(!nextId){toast("請先選擇替補球員");return}if(nextId===previousId){toast("替補球員與原球員相同");return}if(s.lineup.some((id,i)=>i!==slot&&id===nextId)){toast("這位球員已在其他棒次，不能重複排入");return}const from=state.players.find(p=>p.id===previousId),to=state.players.find(p=>p.id===nextId),label=(p)=>p?"#"+p.number+" "+p.name:"未設定";const record={slot:slot+1,fromPlayerId:previousId,toPlayerId:nextId,position,inning:s.inning,half:s.half,inningLabel:"第"+s.inning+"局"+(s.half==="top"?"上":"下"),time:new Date().toLocaleTimeString("zh-TW",{hour:"2-digit",minute:"2-digit"})};eventRecord(s,"球員替補",record.slot+" 棒："+label(from)+" → "+label(to)+(position?"（"+position+"）":""),{substitution:true,...record});s.substitutions.push(record);s.lineup[slot]=nextId;s.lineupPositions[slot]=position;for(const code of Object.keys(s.defense)){if(s.defense[code]===previousId)s.defense[code]=nextId;}if(s.lineupIndex===slot)s.activeBatterId=nextId;if(s.activePitcherId===previousId&&position==="投手")s.activePitcherId=nextId;else if(s.activePitcherId===previousId)s.activePitcherId="";await saveScoring();toast("替補完成，歷史紀錄已保留")});
for(let i=0;i<9;i++)$("lineup"+(i+1)).addEventListener("change",async e=>{const g=currentGame();if(!g)return;const s=ensureLive(g);s.lineup[i]=e.target.value;const selectedPlayer=state.players.find(p=>p.id===e.target.value);s.lineupPositions[i]=selectedPlayer?.position||"";if(i===s.lineupIndex)s.activeBatterId=e.target.value;await persist();scheduleCloudSync();renderScoring();toast("第 "+(i+1)+" 棒已更新")});
$("gameList").addEventListener("click",e=>{const b=e.target.closest("[data-score]");if(b)showScoring(b.dataset.score)});
$("scorePage").addEventListener("click",async e=>{
 const b=e.target.closest("[data-action]");if(!b)return;const a=b.dataset.action;
 if(a==="back"){go("games");return}
 if(a==="half"){await nextHalf();return}
 if(a==="undo"){await undoScoring();return}
 if(a==="finish"||a==="resume"){const g=currentGame();if(g){ensureLive(g).status=a==="finish"?"已結束":"進行中";await saveScoring()}return}
 if(a==="awayPlus"){await adjustScore("away",1);return}if(a==="awayMinus"){await adjustScore("away",-1);return}
 if(a==="homePlus"){await adjustScore("home",1);return}if(a==="homeMinus"){await adjustScore("home",-1);return}
 if(["ball","strike","foul"].includes(a)){await defensePitch(a);return}
 if(["pitchSingle","pitchInfieldHit","pitchDouble","pitchTriple","pitchHomerun","pitchGroundout"].includes(a)){await recordPitcherResult(a);return}
 const g=currentGame();if(["walk","error"].includes(a)){if(g&&ourTeamBatting(g,ensureLive(g)))await offenseResult(a);else await pitcherOutcome(a);return}
 if(a==="strikeout"){if(g&&ourTeamBatting(g,ensureLive(g)))await offenseResult(a);else await pitcherOutcome(a);return}
 if(a==="balk"){await pitcherOutcome(a);return}
 if(a==="catcherPB"||a==="catcherWP"){await recordCatcherEvent(a==="catcherPB"?"PB":"WP");return}
 if(["runnerSteal","runnerWP","runnerPB","runnerCaught"].includes(a)){await recordManualRunnerEvent(a);return}
 if(["single","double","triple","homerun","hbp","out","sacFly","sacBunt"].includes(a))await offenseResult(a);
});

function renderPitchAnalysis(){
 const gameSelect=$("analysisGame"),pitcherSelect=$("analysisPitcher");
 const games=state.games.filter(g=>g.live&&Array.isArray(g.live.events));
 const previous=gameSelect.value;
 gameSelect.innerHTML=games.length?games.map(g=>'<option value="'+g.id+'">'+esc(g.date)+'｜'+esc(team(g.teamId))+' vs '+esc(g.opponent)+'</option>').join(""):'<option value="">尚無比賽資料</option>';
 if(games.some(g=>g.id===previous))gameSelect.value=previous;
 const game=games.find(g=>g.id===gameSelect.value);
 if(!game){$("analysisContent").innerHTML='<div class="empty">目前尚無投手紀錄，請先在比賽守備模式選擇投手並記錄投球。</div>';pitcherSelect.innerHTML='<option value="">全部投手</option>';return}
 const events=game.live.events,ids=[...new Set(events.map(e=>e.meta?.pitcherId||""))];
 pitcherSelect.innerHTML='<option value="">全部投手</option>'+ids.map(id=>{const p=state.players.find(x=>x.id===id);return '<option value="'+esc(id)+'">'+esc(p?"#"+p.number+" "+p.name:"未指定投手")+'</option>'}).join("");
 const selected=pitcherSelect.value,filtered=events.filter(e=>!selected||(e.meta?.pitcherId||"")===selected),groups=new Map();
 for(const e of filtered){
  const id=e.meta?.pitcherId||"";
  if(!groups.has(id))groups.set(id,{id,events:[],innings:{}});
  const group=groups.get(id);group.events.push(e);const inning=e.inning||1;
  if(!group.innings[inning])group.innings[inning]={pitches:0,balls:0,strikes:0,fouls:0,k:0,bb:0};
  const row=group.innings[inning],type=e.meta?.pitchType;
  if(["ball","strike","foul","inPlay"].includes(type)){row.pitches++;if(type==="ball")row.balls++;if(type==="strike")row.strikes++;if(type==="foul")row.fouls++}
  if(e.label==="三振出局")row.k++;if(e.label==="四壞球保送")row.bb++;
 }
 const cards=[...groups.values()].map(group=>{
  const p=state.players.find(x=>x.id===group.id),name=p?"#"+p.number+" "+p.name:"未指定投手";
  const pitches=group.events.filter(e=>["ball","strike","foul","inPlay"].includes(e.meta?.pitchType));
  const total=pitches.length,balls=pitches.filter(e=>e.meta.pitchType==="ball").length;
  const strikes=pitches.filter(e=>["strike","foul","inPlay"].includes(e.meta.pitchType)).length;
  const fouls=pitches.filter(e=>e.meta.pitchType==="foul").length;
  const pitcherRuns=events.flatMap(e=>e.meta?.runRecords||[]).filter(r=>(r.pitcherId||"")===group.id),runsAllowed=pitcherRuns.length,earnedRuns=pitcherRuns.filter(r=>r.earned).length,unearnedRuns=runsAllowed-earnedRuns;
  const ks=group.events.filter(e=>e.label==="三振出局").length,walks=group.events.filter(e=>e.label==="四壞球保送").length,wildPitches=group.events.filter(e=>e.meta?.wildPitch).length,balks=group.events.filter(e=>e.label==="投手犯規").length,errors=group.events.filter(e=>e.label==="失誤上壘").length,rate=total?Math.round(strikes/total*100):0;
  const rows=Object.keys(group.innings).sort((a,b)=>Number(a)-Number(b)).map(n=>{const x=group.innings[n];return '<tr><td>第 '+n+' 局</td><td>'+x.pitches+'</td><td>'+x.balls+'</td><td>'+x.strikes+'</td><td>'+x.fouls+'</td><td>'+x.k+'</td><td>'+x.bb+'</td></tr>'}).join("");
  return '<article class="analysis-card"><div class="analysis-card-head"><h2>'+esc(name)+'</h2><span>'+total+' 球</span></div><div class="analysis-metrics"><div><small>好球率（含界外）</small><strong>'+(total?rate+"%":"--")+'</strong></div><div><small>好球／界外／場內球</small><strong>'+strikes+'</strong></div><div><small>壞球</small><strong>'+balls+'</strong></div><div><small>界外球</small><strong>'+fouls+'</strong></div><div><small>三振</small><strong>'+ks+'</strong></div><div><small>四壞</small><strong>'+walks+'</strong></div><div><small>失分 R</small><strong>'+runsAllowed+'</strong></div><div><small>自責分 ER</small><strong>'+earnedRuns+'</strong></div><div><small>非自責分 UER</small><strong>'+unearnedRuns+'</strong></div><div><small>暴投 WP</small><strong>'+wildPitches+'</strong></div><div><small>投手犯規</small><strong>'+balks+'</strong></div><div><small>失誤上壘</small><strong>'+errors+'</strong></div></div><div class="analysis-table-wrap"><table class="analysis-table"><thead><tr><th>局數</th><th>總球數</th><th>壞球</th><th>好球</th><th>界外</th><th>三振</th><th>四壞</th></tr></thead><tbody>'+rows+'</tbody></table></div></article>';
 }).join("");
 const runRows=events.flatMap((e,eventIndex)=>(e.meta?.runRecords||[]).map(r=>({e,r,eventIndex})));
 const runReview=runRows.length?'<section class="run-review"><h3>失分判定與修正</h3>'+runRows.map(({e,r})=>{const p=state.players.find(x=>x.id===r.pitcherId);return '<div class="run-review-row"><span>'+esc(p?'#'+p.number+' '+p.name:'未指定投手')+'｜'+esc(e.inningLabel||'')+'｜'+esc(e.label)+'</span><select data-run-review="'+esc(r.id)+'" data-event-time="'+esc(e.time||'')+'"><option value="earned"'+(r.earned?' selected':'')+'>自責分 ER</option><option value="unearned"'+(!r.earned?' selected':'')+'>非自責分 UER</option></select></div>'}).join('')+'</section>':'';
 $("analysisContent").innerHTML=(cards||'<div class="empty">這場比賽尚無可分析的投手事件。</div>')+runReview;
}
$("analysisGame").addEventListener("change",()=>{$("analysisPitcher").value="";renderPitchAnalysis()});
$("analysisPitcher").addEventListener("change",renderPitchAnalysis);
$("analysisContent").addEventListener("change",async e=>{
 const select=e.target.closest("[data-run-review]");if(!select)return;
 const g=state.games.find(x=>x.id===$("analysisGame").value);if(!g?.live)return;
 for(const event of g.live.events||[]){const run=(event.meta?.runRecords||[]).find(x=>x.id===select.dataset.runReview);if(run){run.earned=select.value==="earned";run.reviewed=true;run.reason="紀錄者手動修正";break}}
 await persist();scheduleCloudSync();renderPitchAnalysis();toast("已更新自責分判定");
});

function renderBatterAnalysis(){
 const gameSelect=$("battingGame"),batterSelect=$("analysisBatter"),games=state.games.filter(g=>g.live&&Array.isArray(g.live.events));
 const previous=gameSelect.value;
 gameSelect.innerHTML=games.length?games.map(g=>'<option value="'+g.id+'">'+esc(g.date)+'｜'+esc(team(g.teamId))+' vs '+esc(g.opponent)+'</option>').join(""):'<option value="">尚無比賽資料</option>';
 if(games.some(g=>g.id===previous))gameSelect.value=previous;
 const game=games.find(g=>g.id===gameSelect.value);
 if(!game){$("battingContent").innerHTML='<div class="empty">尚無打者紀錄。請在我方進攻時選擇打者並記錄打席結果。</div>';batterSelect.innerHTML='<option value="">全部打者</option>';return}
 const events=game.live.events.filter(e=>e.meta?.batterOutcome);
 const ids=[...new Set(events.map(e=>e.meta?.batterId||""))];
 batterSelect.innerHTML='<option value="">全部打者</option>'+ids.map(id=>{const p=state.players.find(x=>x.id===id);return '<option value="'+esc(id)+'">'+esc(p?"#"+p.number+" "+p.name:"未指定打者")+'</option>'}).join("");
 const selected=batterSelect.value,filtered=events.filter(e=>!selected||(e.meta?.batterId||"")===selected),groups=new Map();
 for(const e of filtered){const id=e.meta?.batterId||"";if(!groups.has(id))groups.set(id,[]);groups.get(id).push(e)}
 const cards=[...groups.entries()].map(([id,rows])=>{
  const p=state.players.find(x=>x.id===id),name=p?"#"+p.number+" "+p.name:"未指定打者";
  const count=label=>rows.filter(e=>e.label===label).length;
  const singles=count("一壘安打"),doubles=count("二壘安打"),triples=count("三壘安打"),homers=count("全壘打");
  const hits=singles+doubles+triples+homers,walks=count("四壞球上壘"),hbp=count("觸身球上壘"),strikeouts=count("三振出局"),outs=count("打者出局"),errors=count("失誤上壘"),sacFly=count("犧牲飛球"),sacBunt=count("犧牲觸擊");
  const atBats=hits+strikeouts+outs+errors,pa=atBats+walks+hbp+sacFly+sacBunt,avg=atBats?(hits/atBats).toFixed(3).replace(/^0/,""):".---",obp=(atBats+walks+hbp+sacFly)?((hits+walks+hbp)/(atBats+walks+hbp+sacFly)).toFixed(3).replace(/^0/,""):".---";
  const totalBases=singles+2*doubles+3*triples+4*homers,slg=atBats?(totalBases/atBats).toFixed(3).replace(/^0/,""):".---";
  return '<article class="analysis-card"><div class="analysis-card-head"><h2>'+esc(name)+'</h2><span>'+pa+' 打席</span></div><div class="analysis-metrics"><div><small>打擊率 AVG</small><strong>'+avg+'</strong></div><div><small>上壘率 OBP</small><strong>'+obp+'</strong></div><div><small>長打率 SLG</small><strong>'+slg+'</strong></div><div><small>打席 PA</small><strong>'+pa+'</strong></div><div><small>打數 AB</small><strong>'+atBats+'</strong></div><div><small>安打 H</small><strong>'+hits+'</strong></div><div><small>一壘安打</small><strong>'+singles+'</strong></div><div><small>二壘安打</small><strong>'+doubles+'</strong></div><div><small>三壘安打</small><strong>'+triples+'</strong></div><div><small>全壘打</small><strong>'+homers+'</strong></div><div><small>三振 SO</small><strong>'+strikeouts+'</strong></div><div><small>四壞 BB</small><strong>'+walks+'</strong></div><div><small>觸身球 HBP</small><strong>'+hbp+'</strong></div><div><small>犧牲飛球 SF</small><strong>'+sacFly+'</strong></div><div><small>犧牲觸擊 SH</small><strong>'+sacBunt+'</strong></div><div><small>打點 RBI</small><strong>'+rows.reduce((sum,e)=>sum+(Number(e.meta?.rbi)||0),0)+'</strong></div><div><small>失誤上壘</small><strong>'+errors+'</strong></div></div></article>';
 }).join("");
 $("battingContent").innerHTML=cards||'<div class="empty">這場比賽尚無已指定打者的打席紀錄。</div><p class="analysis-note">未指定打者的舊紀錄會歸在「未指定打者」。打擊率以安打除以打數計算，上壘率包含安打、四壞與觸身球。</p>';
}
$("battingGame").addEventListener("change",()=>{$("analysisBatter").value="";renderBatterAnalysis()});
$("analysisBatter").addEventListener("change",renderBatterAnalysis);
function renderFieldAnalysis(){const gameSelect=$("fieldingGame"),playerSelect=$("analysisFielder"),games=state.games.filter(g=>g.live&&Array.isArray(g.live.events));const previous=gameSelect.value;gameSelect.innerHTML=games.length?games.map(g=>'<option value="'+g.id+'">'+esc(g.date)+'｜'+esc(team(g.teamId))+' vs '+esc(g.opponent)+'</option>').join(""):'<option value="">尚無比賽資料</option>';if(games.some(g=>g.id===previous))gameSelect.value=previous;const game=games.find(g=>g.id===gameSelect.value);if(!game){$("fieldingContent").innerHTML='<div class="empty">尚無守備紀錄，請在比賽守備模式記錄刺殺、助殺或失誤。</div>';playerSelect.innerHTML='<option value="">全部球員</option>';return}const events=game.live.events.flatMap(e=>(e.meta?.fieldingEntries|| (e.meta?.fieldingAction?[{fielderId:e.meta.fielderId,fieldingAction:e.meta.fieldingAction,fieldingPosition:e.meta.fieldingPosition}]:[])).map(entry=>({...entry,inning:e.inning,inningLabel:e.inningLabel}))),ids=[...new Set(events.map(e=>e.fielderId))];playerSelect.innerHTML='<option value="">全部球員</option>'+ids.map(id=>{const p=state.players.find(x=>x.id===id);return '<option value="'+esc(id)+'">'+esc(p?"#"+p.number+" "+p.name:"未知球員")+"</option>"}).join("");const selected=playerSelect.value,filtered=events.filter(e=>!selected||e.fielderId===selected),groups=new Map();for(const e of filtered){const id=e.fielderId;if(!groups.has(id))groups.set(id,{putout:0,assist:0,error:0,positions:new Set()});const x=groups.get(id);x[e.fieldingAction]=(x[e.fieldingAction]||0)+1;x.positions.add(e.fieldingPosition||"未指定位置")}const catcherIds=[game.live.defense?.C,...(game.live.defenseHistory||[]).filter(x=>x.code==="C").flatMap(x=>[x.fromPlayerId,x.toPlayerId]),...game.live.events.map(e=>e.meta?.catcherId)].filter((id,i,all)=>id&&all.indexOf(id)===i);$("catcherContent").innerHTML=catcherIds.length?catcherIds.map(catcherId=>{const catcher=state.players.find(p=>p.id===catcherId);const catcherEvents=game.live.events.filter(e=>e.meta?.catcherId===catcherId);const pb=catcherEvents.filter(e=>e.meta.catcherEvent==="PB").length,wpFaced=catcherEvents.filter(e=>e.meta.catcherFaced&&e.meta.catcherEvent==="WP").length,csEvents=catcherEvents.filter(e=>e.meta?.caughtStealing||e.meta?.stolenBaseAttempt),cs=csEvents.filter(e=>e.meta.caughtStealing).length,attempts=csEvents.length;const catcherEntries=events.filter(e=>e.fielderId===catcherId),po=catcherEntries.filter(e=>e.fieldingAction==="putout").length,assist=catcherEntries.filter(e=>e.fieldingAction==="assist").length,error=catcherEntries.filter(e=>e.fieldingAction==="error").length,fpDen=po+assist+error,fp=fpDen?(po+assist)/fpDen:null;return '<div class="analysis-card"><div class="analysis-card-head"><h2>'+esc(catcher?"#"+catcher.number+" "+catcher.name:"未知捕手")+'</h2><span>捕手專項</span></div><div class="analysis-metrics"><div><small>阻殺率 CS%</small><strong>'+(attempts?(cs/attempts*100).toFixed(1)+"%":"待累積")+'</strong></div><div><small>捕逸 PB</small><strong>'+pb+'</strong></div><div><small>暴投面對 WP</small><strong>'+wpFaced+'</strong></div><div><small>守備率 FPCT</small><strong>'+(fp===null?"--":fp.toFixed(3).replace(/^0/,""))+'</strong></div></div><p class="analysis-note">阻殺率待盜壘成功／失敗紀錄功能接通後計算；守備率依 PO、A、E 計算。WP 歸屬投手，另顯示捕手面對次數。</p></div>'}).join(""):'<div class="empty">請先在比賽九宮格設定捕手，才能顯示捕手專項數據。</div>';const cards=[...groups].map(([id,x])=>{const p=state.players.find(z=>z.id===id),name=p?"#"+p.number+" "+p.name:"未知球員";return '<article class="analysis-card"><div class="analysis-card-head"><h2>'+esc(name)+'</h2><span>'+(x.putout+x.assist+x.error)+' 次守備紀錄</span></div><div class="analysis-metrics"><div><small>刺殺 PO</small><strong>'+x.putout+'</strong></div><div><small>助殺 A</small><strong>'+x.assist+'</strong></div><div><small>失誤 E</small><strong>'+x.error+'</strong></div><div><small>守備位置</small><strong style="font-size:13px">'+esc([...x.positions].join("、"))+'</strong></div></div></article>'}).join("");$("fieldingContent").innerHTML=cards||'<div class="empty">這場比賽尚無守備統計。</div>'}
$("fieldingGame").addEventListener("change",()=>{$("analysisFielder").value="";renderFieldAnalysis()});$("analysisFielder").addEventListener("change",renderFieldAnalysis);


// ===== Firebase Authentication bridge =====
const cloudLoginModal=$("cloudLoginModal");
$("cloudLogin").addEventListener("click",()=>cloudLoginModal.showModal());
$("cloudLoginClose").addEventListener("click",()=>cloudLoginModal.close());
$("cloudLoginCancel").addEventListener("click",()=>cloudLoginModal.close());
$("cloudLoginForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const submit=$("cloudLoginSubmit"),error=$("cloudLoginError");
 error.textContent="";submit.disabled=true;submit.textContent="登入中…";
 try{
  if(!window.firebaseBridge)throw new Error("Firebase 尚未載入，請確認網路連線後重新整理頁面。");
  await window.firebaseBridge.signIn($("cloudEmail").value.trim(),$("cloudPassword").value);
  $("cloudPassword").value="";cloudLoginModal.close();toast("雲端登入成功");
 }catch(err){error.textContent=firebaseErrorText(err); }
 finally{submit.disabled=false;submit.textContent="登入"}
});
$("cloudLogout").addEventListener("click",async()=>{
 if(!confirm("確定要登出雲端帳號？本機資料不會刪除。"))return;
 try{await window.firebaseBridge.signOut();toast("已登出雲端帳號")}catch(e){toast("登出失敗，請稍後再試")}
});
function firebaseErrorText(err){
 const map={"auth/invalid-credential":"電子郵件或密碼不正確。","auth/too-many-requests":"嘗試次數過多，請稍後再試。","auth/network-request-failed":"網路連線失敗，請確認網路。","auth/invalid-email":"電子郵件格式不正確。"};
 return map[err?.code]||"登入失敗："+(err?.message||"未知錯誤");
}
function updateCloudUI(user){
 const status=$("cloudStatus"),login=$("cloudLogin"),logout=$("cloudLogout");
 if(user){status.textContent="雲端："+(user.email||"已登入");login.hidden=true;logout.hidden=false;}
 else{status.textContent="雲端：未登入";login.hidden=false;logout.hidden=true;}
}
window.addEventListener("firebase-auth-state",e=>updateCloudUI(e.detail.user));
window.addEventListener("firebase-ready",()=>{if(window.firebaseBridge?.currentUser)updateCloudUI(window.firebaseBridge.currentUser);});


// ===== Explicit cloud backup and restore =====
function updateCloudUI(user){
 const status=$("cloudStatus"),login=$("cloudLogin"),logout=$("cloudLogout");
 const upload=$("cloudUpload"),download=$("cloudDownload");
 if(user){
  status.textContent="雲端："+(user.email||"已登入");
  login.hidden=true;logout.hidden=false;upload.hidden=false;download.hidden=false;
 }else{
  status.textContent="雲端：未登入";
  login.hidden=false;logout.hidden=true;upload.hidden=true;download.hidden=true;
 }
}
window.addEventListener("firebase-auth-state",e=>updateCloudUI(e.detail.user));
window.addEventListener("firebase-ready",()=>{if(window.firebaseBridge?.currentUser)updateCloudUI(window.firebaseBridge.currentUser);});
$("cloudUpload").addEventListener("click",async()=>{
 if(!window.firebaseBridge?.currentUser){toast("請先登入雲端");return}
 const count=state.teams.length+state.players.length+state.games.length;
 if(!count){toast("本機沒有可上傳的資料");return}
 if(!confirm("即將以這台裝置的本機資料，完整取代雲端資料。\n球隊："+state.teams.length+"、球員："+state.players.length+"、賽事："+state.games.length+"\n請確認已先匯出 JSON 備份，確定繼續？"))return;
 const b=$("cloudUpload");b.disabled=true;b.textContent="上傳中…";
 try{const rev=await window.firebaseBridge.uploadWorkspace(state);if(cloudSyncEnabled){cloudSyncRevision=rev;localStorage.setItem(syncPreferenceKey()+"-revision",String(rev))}toast("本機資料已上傳至雲端");$("cloudStatus").textContent="雲端：已同步（剛剛上傳）"}
 catch(err){console.error(err);toast("上傳失敗："+(err.message||"請檢查 Firestore 規則"))}
 finally{b.disabled=false;b.textContent="上傳本機資料"}
});
$("cloudDownload").addEventListener("click",async()=>{
 if(!window.firebaseBridge?.currentUser){toast("請先登入雲端");return}
 if(!confirm("下載會以雲端資料取代這台裝置目前的本機資料。\n建議先匯出 JSON 備份。確定繼續？"))return;
 const b=$("cloudDownload");b.disabled=true;b.textContent="下載中…";
 try{
  const remote=await window.firebaseBridge.downloadWorkspace();
  if(!remote.teams.length&&!remote.players.length&&!remote.games.length){toast("雲端目前沒有資料，沒有變更本機內容");return}
  cloudApplyingRemote=true;
  try{
   state={teams:remote.teams,players:remote.players,games:remote.games};
   cloudSyncFingerprint=JSON.stringify({teams:state.teams,players:state.players,games:state.games});
   if(cloudSyncEnabled){cloudSyncRevision=remote._revision;localStorage.setItem(syncPreferenceKey()+"-revision",String(cloudSyncRevision))}
   await persist();render();
  }finally{cloudApplyingRemote=false}
  toast("雲端資料已下載到本機");$("cloudStatus").textContent="雲端：已同步（剛剛下載）";
 }catch(err){console.error(err);toast("下載失敗："+(err.message||"請檢查 Firestore 規則"))}
 finally{b.disabled=false;b.textContent="下載雲端資料"}
});


// ===== Guarded automatic sync =====
let cloudSyncRevision=null,cloudSyncTimer=null,cloudSyncBusy=false,cloudSyncEnabled=false,cloudWatchStop=null,cloudApplyingRemote=false,cloudSyncFingerprint=null;
function setCloudSyncLabel(message){const el=$("cloudStatus");if(el&&window.firebaseBridge?.currentUser)el.textContent="雲端："+message}
function syncPreferenceKey(){return "baseball-team-desk-sync-"+(window.firebaseBridge?.currentUser?.uid||"")}
function syncDeviceId(){
 const key="baseball-team-desk-device-id";
 let id=localStorage.getItem(key);
 if(!id){id=uid();localStorage.setItem(key,id)}
 return id;
}
function stopCloudWatch(){if(cloudWatchStop){cloudWatchStop();cloudWatchStop=null}}
function startCloudWatch(){
 stopCloudWatch();
 if(!cloudSyncEnabled||!window.firebaseBridge?.currentUser||!window.firebaseBridge.watchWorkspace)return;
 cloudWatchStop=window.firebaseBridge.watchWorkspace(meta=>{
  if(meta.error){console.error(meta.error);setCloudSyncLabel("即時連線中斷");return}
  if(!cloudSyncEnabled||!meta.revision)return;
  if(meta.updatedBy===syncDeviceId()){
   cloudSyncRevision=meta.revision;
   localStorage.setItem(syncPreferenceKey()+"-revision",String(cloudSyncRevision));
   return;
  }
  if(meta.revision===cloudSyncRevision)return;
  // Never replace local edits that are waiting to upload. Pause and ask for a deliberate refresh instead.
  if(cloudSyncBusy||cloudSyncTimer!==null){
   cloudSyncEnabled=false;localStorage.removeItem(syncPreferenceKey());clearTimeout(cloudSyncTimer);cloudSyncTimer=null;
   $("cloudAuto").disabled=false;$("cloudAuto").textContent="重新啟用自動同步";
   setCloudSyncLabel("有其他裝置更新，請先下載雲端資料");toast("偵測到其他裝置更新。為保護本機尚未同步的紀錄，已暫停自動同步，請先匯出備份再下載雲端資料。");
   stopCloudWatch();return;
  }
  applyRemoteWorkspace(meta.revision).catch(err=>{console.error(err);setCloudSyncLabel("接收雲端更新失敗");toast("接收雲端更新失敗："+(err.message||"請稍後重試"))});
 });
}
async function applyRemoteWorkspace(revision){
 const remote=await window.firebaseBridge.downloadWorkspace();
 if(remote._revision!==revision)return;
 cloudApplyingRemote=true;
 try{
  state={teams:remote.teams,players:remote.players,games:remote.games};
  cloudSyncFingerprint=JSON.stringify({teams:state.teams,players:state.players,games:state.games});
  await persist();render();
  if(activeGameId&&state.games.some(g=>g.id===activeGameId))renderScoring();
  cloudSyncRevision=remote._revision;
  localStorage.setItem(syncPreferenceKey()+"-revision",String(cloudSyncRevision));
  setCloudSyncLabel("已接收其他裝置更新");
  toast("已自動接收其他裝置的最新資料");
 }finally{cloudApplyingRemote=false}
}
async function activateCloudSync(){
 const user=window.firebaseBridge?.currentUser;if(!user)return;
 const remote=await window.firebaseBridge.downloadWorkspace();
 if(remote._revision===0){
   const rev=await window.firebaseBridge.uploadWorkspace(state,0);
   cloudSyncRevision=rev;
 }else{
   // Do not silently overwrite a cloud workspace when enabling sync.
   const same=JSON.stringify({teams:state.teams,players:state.players,games:state.games})===JSON.stringify({teams:remote.teams,players:remote.players,games:remote.games});
   if(!same)throw new Error("本機與雲端資料目前不同。請先選擇下載雲端資料或手動上傳本機資料，確認一致後再啟用自動同步。");
   cloudSyncRevision=remote._revision;
 }
 cloudSyncFingerprint=JSON.stringify({teams:state.teams,players:state.players,games:state.games});
 cloudSyncEnabled=true;localStorage.setItem(syncPreferenceKey(),"1");localStorage.setItem(syncPreferenceKey()+"-revision",String(cloudSyncRevision));
 $("cloudAuto").textContent="自動同步已啟用";$("cloudAuto").disabled=true;startCloudWatch();
 setCloudSyncLabel("自動同步已啟用");toast("自動同步已啟用");
}
async function pushCloudChanges(){
 if(!cloudSyncEnabled||cloudSyncBusy||!navigator.onLine||!window.firebaseBridge?.currentUser)return;
 cloudSyncBusy=true;setCloudSyncLabel("同步中…");
 try{
  const payload=JSON.stringify({teams:state.teams,players:state.players,games:state.games});
  if(payload===cloudSyncFingerprint){setCloudSyncLabel("已同步");return;}
  if(cloudSyncFingerprint===null){
   const remote=await window.firebaseBridge.downloadWorkspace();
   const remotePayload=JSON.stringify({teams:remote.teams,players:remote.players,games:remote.games});
   if(remotePayload===payload){cloudSyncRevision=remote._revision;cloudSyncFingerprint=payload;localStorage.setItem(syncPreferenceKey()+"-revision",String(cloudSyncRevision));setCloudSyncLabel("已同步");return;}
  }
  const rev=await window.firebaseBridge.uploadWorkspace(state,cloudSyncRevision,syncDeviceId());
  cloudSyncRevision=rev;cloudSyncFingerprint=payload;localStorage.setItem(syncPreferenceKey()+"-revision",String(rev));
  setCloudSyncLabel("已同步");
 }catch(err){
  console.error(err);cloudSyncEnabled=false;localStorage.removeItem(syncPreferenceKey());
  $("cloudAuto").disabled=false;$("cloudAuto").textContent="重新啟用自動同步";
  setCloudSyncLabel("同步暫停，需處理衝突");toast(err.message||"雲端同步失敗");
 }finally{cloudSyncBusy=false}
}
function scheduleCloudSync(){
 if(cloudApplyingRemote||!cloudSyncEnabled||!window.firebaseBridge?.currentUser)return;
 clearTimeout(cloudSyncTimer);cloudSyncTimer=setTimeout(()=>{cloudSyncTimer=null;pushCloudChanges()},4000);
}
$("cloudAuto").addEventListener("click",async()=>{
 const b=$("cloudAuto");b.disabled=true;b.textContent="檢查雲端資料…";
 try{await activateCloudSync()}catch(e){toast(e.message||"啟用自動同步失敗");b.disabled=false;b.textContent="啟用自動同步"}
});
window.addEventListener("firebase-auth-state",e=>{
 cloudSyncEnabled=false;cloudSyncRevision=null;stopCloudWatch();
 const user=e.detail.user;
 $("cloudAuto").hidden=!user;
 if(user){
  cloudSyncEnabled=localStorage.getItem("baseball-team-desk-sync-"+user.uid)==="1";
  const saved=localStorage.getItem("baseball-team-desk-sync-"+user.uid+"-revision");
  cloudSyncRevision=saved===null?null:Number(saved);
  $("cloudAuto").textContent=cloudSyncEnabled?"自動同步已啟用":"啟用自動同步";
  $("cloudAuto").disabled=cloudSyncEnabled;
  if(cloudSyncEnabled&&cloudSyncRevision!==null){setCloudSyncLabel("自動同步待連線");startCloudWatch();if(navigator.onLine)scheduleCloudSync()}
 }else{$("cloudAuto").textContent="啟用自動同步";$("cloudAuto").disabled=false;setCloudSyncLabel("未登入")}
});
window.addEventListener("online",()=>{if(cloudSyncEnabled){startCloudWatch();scheduleCloudSync()}});


// ===== Unified team analytics foundation =====

function statFmtRate(n,d){return d?(n/d).toFixed(3).replace(/^0/,""): "資料不足"}
function renderTeamAnalytics(){
 const scopeEl=$("teamStatsScope"),teamEl=$("teamStatsTeam"),gameEl=$("teamStatsGame");
 const oldTeam=teamEl.value,oldGame=gameEl.value;
 teamEl.innerHTML=state.teams.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join("");
 if(state.teams.some(t=>t.id===oldTeam))teamEl.value=oldTeam;
 const selectedTeam=teamEl.value;
 const allGames=state.games.filter(g=>g.teamId===selectedTeam&&g.live&&Array.isArray(g.live.events));
 gameEl.innerHTML=allGames.map(g=>'<option value="'+esc(g.id)+'">'+esc(g.date)+'｜'+esc(g.opponent)+'</option>').join("");
 if(allGames.some(g=>g.id===oldGame))gameEl.value=oldGame;
 const isGame=scopeEl.value==="game";$("teamStatsGameWrap").hidden=!isGame;
 const games=isGame?allGames.filter(g=>g.id===gameEl.value):allGames;
 if(!selectedTeam){$("teamStatsSummary").innerHTML='<div class="empty">請先建立並選擇球隊。</div>';["teamOffenseStats","teamPitchingStats","teamFieldingStats","teamBattingLeaders"].forEach(id=>$(id).innerHTML="");return}
 const events=games.flatMap(g=>g.live.events.map(e=>({e,g})));
 const batting=events.filter(x=>x.e.meta?.batterOutcome);
 const countOutcome=(rows,type)=>rows.filter(x=>x.e.meta?.batterOutcome===type).length;
 const singles=countOutcome(batting,"single"),doubles=countOutcome(batting,"double"),triples=countOutcome(batting,"triple"),homers=countOutcome(batting,"homerun");
 const hits=singles+doubles+triples+homers,walks=countOutcome(batting,"walk"),hbp=countOutcome(batting,"hbp"),sf=countOutcome(batting,"sacFly"),sh=countOutcome(batting,"sacBunt"),ks=countOutcome(batting,"strikeout"),outs=countOutcome(batting,"out"),errors=countOutcome(batting,"error");
 const ab=hits+ks+outs+errors,pa=ab+walks+hbp+sf+sh,tb=singles+2*doubles+3*triples+4*homers;
 const runs=games.reduce((sum,g)=>sum+((g.battingOrder||"first")==="first"?g.live.away:g.live.home),0);
 const offense=[["打擊率 BA",statFmtRate(hits,ab)],["上壘率 OBP",statFmtRate(hits+walks+hbp,ab+walks+hbp+sf)],["長打率 SLG",statFmtRate(tb,ab)],["OPS",ab&&ab+walks+hbp?(hits+walks+hbp)/(ab+walks+hbp)+tb/ab: "資料不足"],["得分 R",runs],["安打 H",hits],["全壘打 HR",homers],["打數 AB",ab],["四壞 BB",walks],["觸身球 HBP",hbp],["犧牲飛球 SF",sf],["犧牲觸擊 SH",sh],["打點 RBI",batting.reduce((sum,x)=>sum+(Number(x.e.meta?.rbi)||0),0)],["三振 SO",ks]];
 const pitchRows=events.filter(x=>x.e.meta?.pitcherId),pitchIds=[...new Set(pitchRows.map(x=>x.e.meta.pitcherId))];
 const pitchK=pitchRows.filter(x=>x.e.label==="三振出局").length,pitchBB=pitchRows.filter(x=>x.e.label==="四壞球保送").length;
 const runRecords=events.flatMap(x=>(x.e.meta?.runRecords||[]).map(r=>({r,g:x.g})));
 const allowed=runRecords.length,earned=runRecords.filter(x=>x.r.earned).length;
 const fieldEntries=events.flatMap(x=>(x.e.meta?.fieldingEntries|| (x.e.meta?.fieldingAction?[{fieldingAction:x.e.meta.fieldingAction}]:[])));
 const po=fieldEntries.filter(x=>x.fieldingAction==="putout").length,assists=fieldEntries.filter(x=>x.fieldingAction==="assist").length,fieldErrors=fieldEntries.filter(x=>x.fieldingAction==="error").length;
 const fpDen=po+assists+fieldErrors;
 const metricHtml=arr=>'<div class="team-stat-grid">'+arr.map(([label,value])=>'<div class="team-stat"><small>'+label+'</small><strong>'+((typeof value==="number"||typeof value==="string")? (typeof value==="number"?value:(typeof value==="string"&&value.includes(".")?Number(value).toFixed(3).replace(/^0/,""):value)):"資料不足")+'</strong></div>').join("")+'</div>';
 $("teamStatsSummary").innerHTML='<div class="stats"><article><small>統計賽事</small><b>'+games.length+'</b><small>場</small></article><article><small>團隊得分</small><b>'+runs+'</b><small>分</small></article><article><small>團隊安打</small><b>'+hits+'</b><small>支</small></article></div>';
 $("teamOffenseStats").innerHTML=metricHtml(offense);
 $("teamPitchingStats").innerHTML=metricHtml([["失分 R",allowed],["自責分 ER",earned],["三振 SO",pitchK],["四壞 BB",pitchBB],["ERA","資料不足"],["WHIP","資料不足"]])+'<p class="analysis-note">投手登板事件及責失分紀錄尚未涵蓋所有情境，ERA、WHIP 暫不計算。</p>';
 $("teamFieldingStats").innerHTML=metricHtml([["刺殺 PO",po],["助殺 A",assists],["失誤 E",fieldErrors],["守備率 FPCT",fpDen?statFmtRate(po+assists,fpDen):"資料不足"]]);
 const playerMap=new Map();
 for(const {e} of batting){const id=e.meta?.batterId||"";if(!playerMap.has(id))playerMap.set(id,[]);playerMap.get(id).push(e)}
 const leaders=[...playerMap].map(([id,rows])=>{const p=state.players.find(x=>x.id===id);const n=t=>rows.filter(e=>e.meta?.batterOutcome===t).length;const h=n("single")+n("double")+n("triple")+n("homerun"),a=h+n("strikeout")+n("out")+n("error"),w=n("walk"),hb=n("hbp"),sf=n("sacFly"),sh=n("sacBunt"),b=n("single")+2*n("double")+3*n("triple")+4*n("homerun");return {name:p?"#"+p.number+" "+p.name:"未指定打者",pa:a+w+hb+sf+sh,avg:statFmtRate(h,a),ops:a&&a+w+hb+sf?((h+w+hb)/(a+w+hb+sf)+b/a).toFixed(3).replace(/^0/,""):"資料不足",h}});
 leaders.sort((a,b)=>(b.h-a.h)||(b.pa-a.pa));
 $("teamBattingLeaders").innerHTML=leaders.length?'<div class="analysis-table-wrap"><table class="analysis-table"><thead><tr><th>球員</th><th>打席 PA</th><th>安打 H</th><th>打擊率 BA</th><th>OPS</th></tr></thead><tbody>'+leaders.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+x.pa+'</td><td>'+x.h+'</td><td>'+x.avg+'</td><td>'+x.ops+'</td></tr>').join("")+'</tbody></table></div>':'<div class="empty">目前尚無可用的打席紀錄。</div>';
}
$("teamStatsScope").addEventListener("change",renderTeamAnalytics);
$("teamStatsTeam").addEventListener("change",renderTeamAnalytics);
$("teamStatsGame").addEventListener("change",renderTeamAnalytics);
