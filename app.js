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
function editGame(id){if(!state.teams.length){toast("請先建立球隊");return}let g=state.games.find(x=>x.id===id);$("gameForm").reset();teamOptions("gameTeam");$("gameId").value=id||"";$("gameTitle").textContent=id?"編輯比賽":"建立比賽";$("date").value=new Date().toLocaleDateString("en-CA");$("innings").value="6";$("extra").value="true";$("mercy").value="none";$("minInnings").value="3";$("battingOrder").value="first";if(g){$("battingOrder").value=g.battingOrder||"first";$("gameTeam").value=g.teamId;$("opponent").value=g.opponent;$("date").value=g.date;$("time").value=g.time||"";$("venue").value=g.venue||"";$("innings").value=g.innings;$("extra").value=g.extra;$("mercy").value=g.mercy;$("minInnings").value=g.minInnings;$("customMercy").value=g.customMercy||"";$("gameNote").value=g.note||""} $("customWrap").hidden=$("mercy").value!=="custom";modal("gameModal")}
$("addGame").onclick=$("quickGame").onclick=()=>editGame("");$("mercy").onchange=()=>$("customWrap").hidden=$("mercy").value!=="custom";$("gameForm").onsubmit=async e=>{e.preventDefault();let id=$("gameId").value,m=$("mercy").value;if(m==="custom"&&Number($("customMercy").value)<1){toast("請輸入有效分差");return}let g={id:id||uid(),teamId:$("gameTeam").value,opponent:$("opponent").value.trim(),date:$("date").value,time:$("time").value,venue:$("venue").value.trim(),battingOrder:$("battingOrder").value,innings:Number($("innings").value),extra:$("extra").value,mercy:m,minInnings:Number($("minInnings").value),customMercy:$("customMercy").value,note:$("gameNote").value.trim()};state.games=id?state.games.map(x=>x.id===id?g:x):[...state.games,g];$("gameModal").close();await save();toast("賽事已儲存")};
async function delGame(id){if(confirm("確定刪除這場比賽？")){state.games=state.games.filter(g=>g.id!==id);await save()}}
$("search").oninput=render;$("filterTeam").onchange=render;
$("export").onclick=()=>{let blob=new Blob([JSON.stringify({format:"baseball-team-desk",version:1,exportedAt:new Date().toISOString(),data:state},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="少棒紀錄室備份-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(a.href);toast("備份已匯出")};
$("import").onchange=async e=>{let f=e.target.files[0];if(!f)return;try{let x=JSON.parse(await f.text());if(x.format!=="baseball-team-desk"||!x.data||!Array.isArray(x.data.teams)||!Array.isArray(x.data.players)||!Array.isArray(x.data.games))throw 0;if(confirm("匯入將取代目前裝置資料，確定？")){state=x.data;await save();toast("備份匯入完成")}}catch{toast("備份格式不正確")}e.target.value=""};
(async()=>{try{db=await openDB();state=await read()||state;$("saveState").textContent="IndexedDB 本機資料庫已啟用";render();if("serviceWorker"in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(console.warn);$("net").textContent=navigator.onLine?"● 離線資料已啟用":"● 目前離線";addEventListener("online",()=>$("net").textContent="● 已連線");addEventListener("offline",()=>$("net").textContent="● 目前離線")}catch(e){console.error(e);$("saveState").textContent="本機資料庫初始化失敗";toast("請使用新版瀏覽器")}})();


// ===== 黑金版即時比賽紀錄 =====
let activeGameId=null;
function currentGame(){return state.games.find(g=>g.id===activeGameId)}
function ensureLive(g){
 if(!g.live)g.live={inning:1,half:"top",balls:0,strikes:0,outs:0,home:0,away:0,pitches:0,events:[],status:"進行中"};
 const s=g.live;
 s.inning=s.inning||1;s.half=s.half||"top";s.balls=s.balls||0;s.strikes=s.strikes||0;s.outs=s.outs||0;
 s.away=s.away||0;s.home=s.home||0;s.pitches=s.pitches||0;s.events=s.events||[];
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
 $("scoreMode").textContent=batting?"進攻模式":"守備模式";
 $("scoreModeHint").textContent=batting?"記錄我方打者結果":"記錄投手投球結果";
 $("defenseActions").hidden=batting;$("offenseActions").hidden=!batting;
 $("scoreEvents").innerHTML=s.events.length?[...s.events].reverse().slice(0,24).map(e=>'<div class="event-row"><span><b>'+esc(e.label)+'</b><small>'+esc(e.inningLabel)+'・'+esc(e.time)+'</small></span><span>'+esc(e.detail||"")+'</span></div>').join(""):'<div class="empty">尚無紀錄</div>';
 $("scoreStatus").textContent=s.status;$("scoreSaved").textContent="資料自動儲存";
}
async function saveScoring(){await persist();renderScoring()}
function eventRecord(s,label,detail=""){
 s.events.push({label,detail,inningLabel:"第"+s.inning+"局"+(s.half==="top"?"上":"下"),time:new Date().toLocaleTimeString("zh-TW",{hour:"2-digit",minute:"2-digit"})});
}
async function defensePitch(type){
 const g=currentGame();if(!g)return;const s=ensureLive(g);
 if(s.status==="已結束"){toast("比賽已結束");return}
 if(ourTeamBatting(g,s)){toast("目前是我方進攻");return}
 s.pitches++;
 if(type==="ball"){
  s.balls++;
  if(s.balls>=4){eventRecord(s,"四壞球","投出第 4 顆壞球，打者保送");s.balls=0;s.strikes=0}
  else eventRecord(s,"壞球",s.balls+" 壞球");
 }else if(type==="strike"){
  s.strikes++;
  if(s.strikes>=3){eventRecord(s,"三振出局","三振");s.outs=Math.min(3,s.outs+1);s.balls=0;s.strikes=0}
  else eventRecord(s,"好球",s.strikes+" 好球");
 }else if(type==="foul"){
  if(s.strikes<2)s.strikes++;
  eventRecord(s,"界外球",s.strikes<2?"計為好球":"兩好球後界外球，不增加好球數");
 }
 await saveScoring();
}
async function offenseResult(type){
 const g=currentGame();if(!g)return;const s=ensureLive(g);
 if(s.status==="已結束"){toast("比賽已結束");return}
 if(!ourTeamBatting(g,s)){toast("目前是我方守備");return}
 const labels={single:"一壘安打",double:"二壘安打",triple:"三壘安打",homerun:"全壘打",walk:"四壞球上壘",hbp:"觸身球上壘",out:"打者出局",error:"失誤上壘"};
 eventRecord(s,labels[type]||type);
 if(type==="out")s.outs=Math.min(3,s.outs+1);
 s.balls=0;s.strikes=0;
 await saveScoring();
}
async function adjustScore(side,delta){const g=currentGame();if(!g)return;const s=ensureLive(g);s[side]=Math.max(0,s[side]+delta);await saveScoring()}
async function nextHalf(){
 const g=currentGame();if(!g)return;const s=ensureLive(g);
 if(s.half==="top")s.half="bottom";else{s.half="top";s.inning++}
 s.balls=0;s.strikes=0;s.outs=0;await saveScoring();
}
async function undoScoring(){
 const g=currentGame();if(!g)return;const s=ensureLive(g);
 if(!s.events.length){toast("目前沒有紀錄");return}
 const last=s.events.pop();s.pitches=Math.max(0,s.pitches-((["壞球","好球","界外球"].includes(last.label))?1:0));
 // Keep undo safe and predictable: remove last event, reset current batter count.
 s.balls=0;s.strikes=0;
 await saveScoring();
}
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
 if(["single","double","triple","homerun","walk","hbp","out","error"].includes(a))await offenseResult(a);
});
