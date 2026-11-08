const $=id=>document.getElementById(id), uid=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()), esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));let db,state={teams:[],players:[],games:[]},timer;
function openDB(){return new Promise((ok,no)=>{let r=indexedDB.open("baseball-team-desk",1);r.onupgradeneeded=()=>r.result.createObjectStore("data");r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
function read(){return new Promise((ok,no)=>{let r=db.transaction("data").objectStore("data").get("state");r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
function persist(){return new Promise((ok,no)=>{let t=db.transaction("data","readwrite");t.objectStore("data").put(state,"state");t.oncomplete=ok;t.onerror=()=>no(t.error)})}
function toast(s){$("toast").textContent=s;$("toast").classList.add("show");clearTimeout(timer);timer=setTimeout(()=>$("toast").classList.remove("show"),2200)}
function team(id){return state.teams.find(x=>x.id===id)?.name||"未知球隊"}
async function save(){await persist();$("saveState").textContent="本機資料已儲存";render()}
function go(id){document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.id===id));document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===id));if(id==="players")teamOptions("playerTeam");if(id==="games")teamOptions("gameTeam")}
document.querySelectorAll(".nav").forEach(x=>x.onclick=()=>go(x.dataset.page));document.querySelectorAll(".close").forEach(x=>x.onclick=()=>x.closest("dialog").close());
function teamOptions(id){let s=$(id),old=s.value;s.innerHTML=state.teams.map(t=>'<option value="'+t.id+'">'+esc(t.name)+'</option>').join("");if(state.teams.some(t=>t.id===old))s.value=old;if(id==="playerTeam")$("filterTeam").innerHTML='<option value="">所有球隊</option>'+state.teams.map(t=>'<option value="'+t.id+'">'+esc(t.name)+'</option>').join("")}
function render(){ $("teamCount").textContent=state.teams.length;$("playerCount").textContent=state.players.length;$("gameCount").textContent=state.games.length;
$("teamList").innerHTML=state.teams.length?state.teams.map(t=>'<article><div class="cardtitle">'+esc(t.name)+'</div><div class="muted">'+esc(t.org||"未填寫單位")+'</div><span class="tag">'+state.players.filter(p=>p.teamId===t.id).length+' 位球員</span><div class="actions"><button data-et="'+t.id+'">編輯</button><button class="danger" data-dt="'+t.id+'">刪除</button></div></article>').join(""):'<div class="empty">尚未建立球隊，請新增第一支球隊。</div>';
let q=$("search").value.toLowerCase(),f=$("filterTeam").value,ps=state.players.filter(p=>(!f||p.teamId===f)&&(!q||p.name.toLowerCase().includes(q)||p.number.toLowerCase().includes(q)));
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
function editGame(id){if(!state.teams.length){toast("請先建立球隊");return}let g=state.games.find(x=>x.id===id);$("gameForm").reset();teamOptions("gameTeam");$("gameId").value=id||"";$("gameTitle").textContent=id?"編輯比賽":"建立比賽";$("date").value=new Date().toLocaleDateString("en-CA");$("innings").value="6";$("extra").value="true";$("mercy").value="none";$("minInnings").value="3";if(g){$("gameTeam").value=g.teamId;$("opponent").value=g.opponent;$("date").value=g.date;$("time").value=g.time||"";$("venue").value=g.venue||"";$("innings").value=g.innings;$("extra").value=g.extra;$("mercy").value=g.mercy;$("minInnings").value=g.minInnings;$("customMercy").value=g.customMercy||"";$("gameNote").value=g.note||""} $("customWrap").hidden=$("mercy").value!=="custom";modal("gameModal")}
$("addGame").onclick=$("quickGame").onclick=()=>editGame("");$("mercy").onchange=()=>$("customWrap").hidden=$("mercy").value!=="custom";$("gameForm").onsubmit=async e=>{e.preventDefault();let id=$("gameId").value,m=$("mercy").value;if(m==="custom"&&Number($("customMercy").value)<1){toast("請輸入有效分差");return}let g={id:id||uid(),teamId:$("gameTeam").value,opponent:$("opponent").value.trim(),date:$("date").value,time:$("time").value,venue:$("venue").value.trim(),innings:Number($("innings").value),extra:$("extra").value,mercy:m,minInnings:Number($("minInnings").value),customMercy:$("customMercy").value,note:$("gameNote").value.trim()};state.games=id?state.games.map(x=>x.id===id?g:x):[...state.games,g];$("gameModal").close();await save();toast("賽事已儲存")};
async function delGame(id){if(confirm("確定刪除這場比賽？")){state.games=state.games.filter(g=>g.id!==id);await save()}}
$("search").oninput=render;$("filterTeam").onchange=render;
$("export").onclick=()=>{let blob=new Blob([JSON.stringify({format:"baseball-team-desk",version:1,exportedAt:new Date().toISOString(),data:state},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="少棒紀錄室備份-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(a.href);toast("備份已匯出")};
$("import").onchange=async e=>{let f=e.target.files[0];if(!f)return;try{let x=JSON.parse(await f.text());if(x.format!=="baseball-team-desk"||!x.data||!Array.isArray(x.data.teams)||!Array.isArray(x.data.players)||!Array.isArray(x.data.games))throw 0;if(confirm("匯入將取代目前裝置資料，確定？")){state=x.data;await save();toast("備份匯入完成")}}catch{toast("備份格式不正確")}e.target.value=""};
(async()=>{try{db=await openDB();state=await read()||state;$("saveState").textContent="IndexedDB 本機資料庫已啟用";render();if("serviceWorker"in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(console.warn);$("net").textContent=navigator.onLine?"● 離線資料已啟用":"● 目前離線";addEventListener("online",()=>$("net").textContent="● 已連線");addEventListener("offline",()=>$("net").textContent="● 目前離線")}catch(e){console.error(e);$("saveState").textContent="本機資料庫初始化失敗";toast("請使用新版瀏覽器")}})();

// ===== 第二階段：即時比賽紀錄工作台 =====
let activeGameId=null;
const scoringEvents=[
 ["ball","壞球"],["strike","好球"],["foul","界外球"],
 ["single","一壘安打"],["double","二壘安打"],["triple","三壘安打"],["homerun","全壘打"],
 ["walk","四壞球"],["hbp","觸身球"],["strikeout","三振出局"],["out","出局"],["error","失誤上壘"]
];
function currentGame(){return state.games.find(g=>g.id===activeGameId)}
function ensureLive(g){if(!g.live)g.live={inning:1,half:"top",balls:0,strikes:0,outs:0,home:0,away:0,pitches:0,events:[],status:"進行中"};return g.live}
function scoreName(g){return team(g.teamId)+" vs "+g.opponent}
function showScoring(id){
 const g=state.games.find(x=>x.id===id);if(!g)return;
 activeGameId=id;ensureLive(g);go("scorePage");renderScoring();
}
function renderScoring(){
 const g=currentGame();if(!g)return;const s=ensureLive(g);
 $("scoreTitle").textContent=scoreName(g);
 $("scoreMeta").textContent=g.date+"・"+g.innings+" 局制・"+(g.venue||"地點未設定");
 $("scoreAwayName").textContent=team(g.teamId);$("scoreHomeName").textContent=g.opponent;
 $("scoreAway").textContent=s.away;$("scoreHome").textContent=s.home;
 $("scoreInning").textContent="第 "+s.inning+" 局";
 $("scoreHalf").textContent=s.half==="top"?"▲ 上半局":"▼ 下半局";
 $("scoreBalls").textContent=s.balls;$("scoreStrikes").textContent=s.strikes;$("scoreOuts").textContent=s.outs;
 $("scorePitches").textContent=s.pitches;
 $("scoreEvents").innerHTML=s.events.length?[...s.events].reverse().slice(0,30).map((e,i)=>'<div class="event-row"><span><b>'+esc(e.label)+'</b><small>'+esc(e.inningLabel)+'・'+esc(e.time)+'</small></span><span>'+esc(e.detail||"")+'</span></div>').join(""):'<div class="empty">尚無紀錄，開始第一球吧！</div>';
 $("scoreStatus").textContent=s.status;
}
async function saveScoring(){await persist();renderScoring();$("scoreSaved").textContent="已自動儲存";}
function addScoringEvent(type){
 const g=currentGame();if(!g)return;const s=ensureLive(g);if(s.status==="已結束"){toast("比賽已結束，請先恢復比賽");return}
 const labels=Object.fromEntries(scoringEvents);
 const e={type,label:labels[type]||type,inningLabel:"第"+s.inning+"局"+(s.half==="top"?"上":"下"),time:new Date().toLocaleTimeString("zh-TW",{hour:"2-digit",minute:"2-digit"}),detail:""};
 s.pitches++;
 if(type==="ball"){if(s.balls<3)s.balls++;else{s.balls=0;s.strikes=0;e.detail="四壞球，打席結束"}}
 else if(type==="strike"){if(s.strikes<2)s.strikes++;else{s.outs=Math.min(3,s.outs+1);s.balls=0;s.strikes=0;e.detail="三振出局"}}
 else if(type==="foul"){if(s.strikes<2)s.strikes++}
 else if(type==="walk"||type==="hbp"||type==="single"||type==="double"||type==="triple"||type==="homerun"||type==="error"){s.balls=0;s.strikes=0}
 else if(type==="strikeout"||type==="out"){s.outs=Math.min(3,s.outs+1);s.balls=0;s.strikes=0}
 else if(type==="error"){e.detail="守備失誤"}
 if(type==="walk"&&s.balls===0&&s.strikes===0)e.detail="四壞球";
 if(type==="hbp")e.detail="觸身球";
 if(["single","double","triple","homerun"].includes(type))e.detail="安打結果已記錄";
 s.events.push(e);
 if(s.outs>=3){s.outs=3;e.detail=(e.detail?e.detail+"・":"")+"三出局，請切換半局"}
 await saveScoring();
}
async function scoreAdjust(side,delta){
 const g=currentGame();if(!g)return;const s=ensureLive(g);s[side]=Math.max(0,s[side]+delta);await saveScoring();
}
async function nextHalf(){
 const g=currentGame();if(!g)return;const s=ensureLive(g);
 if(s.half==="top")s.half="bottom";else{s.half="top";s.inning++}
 s.balls=0;s.strikes=0;s.outs=0;await saveScoring();
}
async function undoScoring(){
 const g=currentGame();if(!g)return;const s=ensureLive(g);const e=s.events.pop();if(!e){toast("目前沒有可復原的紀錄");return}
 // Rebuild count and outs from the remaining events in the current half.
 s.balls=0;s.strikes=0;s.outs=0;
 for(const x of s.events){if(x.inningLabel==="第"+s.inning+"局"+(s.half==="top"?"上":"下")){if(x.type==="ball")s.balls=(s.balls+1)%4;else if(x.type==="strike"||x.type==="foul")s.strikes=Math.min(2,s.strikes+1);else if(["out","strikeout"].includes(x.type))s.outs=Math.min(3,s.outs+1)}}
 s.pitches=Math.max(0,s.pitches-1);await saveScoring();
}
$("gameList").addEventListener("click",e=>{const b=e.target.closest("[data-score]");if(b)showScoring(b.dataset.score)});
$("scorePage").addEventListener("click",async e=>{
 const b=e.target.closest("[data-action]");if(!b)return;const a=b.dataset.action;
 if(a==="back"){go("games");return}
 if(a==="half"){await nextHalf();return}
 if(a==="undo"){await undoScoring();return}
 if(a==="finish"){const g=currentGame();if(g){ensureLive(g).status="已結束";await saveScoring()}return}
 if(a==="resume"){const g=currentGame();if(g){ensureLive(g).status="進行中";await saveScoring()}return}
 if(a==="awayPlus"){await scoreAdjust("away",1);return}if(a==="awayMinus"){await scoreAdjust("away",-1);return}
 if(a==="homePlus"){await scoreAdjust("home",1);return}if(a==="homeMinus"){await scoreAdjust("home",-1);return}
 if(a==="ball"||a==="strike"||a==="foul"||a==="single"||a==="double"||a==="triple"||a==="homerun"||a==="walk"||a==="hbp"||a==="strikeout"||a==="out"||a==="error")await addScoringEvent(a);
});
