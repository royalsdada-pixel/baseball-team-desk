import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, writeBatch, runTransaction, serverTimestamp, onSnapshot, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBVDjWRSamm5xChl288274TP20aeJNYjdM",
  authDomain: "baseball-team-desk.firebaseapp.com",
  projectId: "baseball-team-desk",
  storageBucket: "baseball-team-desk.firebasestorage.app",
  messagingSenderId: "413050251121",
  appId: "1:413050251121:web:ad32970236864dac3db8d0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Conservative snapshot retention: never touch the active generation, keep the newest
// ten marked generations, and only consider ready generations older than 90 days.
async function cleanupOldGenerations(userId, activeGeneration){
  const root=collection(db,"users",userId,"workspaces");
  const snapshot=await getDocs(root);
  const cutoff=Date.now()-90*24*60*60*1000;
  const marked=snapshot.docs
    .map(d=>({id:d.id,data:d.data(),ref:d.ref}))
    .filter(x=>x.data.status==="ready"&&x.data.createdAt?.toMillis)
    .sort((a,b)=>b.data.createdAt.toMillis()-a.data.createdAt.toMillis());
  const keep=new Set(marked.slice(0,10).map(x=>x.id));
  if(activeGeneration)keep.add(activeGeneration);
  for(const item of marked){
    if(keep.has(item.id)||item.data.createdAt.toMillis()>cutoff)continue;
    for(const name of ["teams","players","games"]){
      const child=await getDocs(collection(db,"users",userId,"workspaces",item.id,name));
      for(let i=0;i<child.docs.length;i+=400){
        const batch=writeBatch(db);
        child.docs.slice(i,i+400).forEach(d=>batch.delete(d.ref));
        await batch.commit();
      }
    }
    await deleteDoc(item.ref);
  }
}

window.firebaseBridge = {
  app, auth, db,
  get currentUser(){ return auth.currentUser; },
  signIn(email,password){ return signInWithEmailAndPassword(auth,email,password); },
  signOut(){ return signOut(auth); },
  async getSyncRevision(){
    const user=auth.currentUser;if(!user)throw new Error("尚未登入");
    const snap=await getDocs(collection(db,"users",user.uid,"sync"));
    const meta=snap.docs.find(d=>d.id==="meta");
    return meta?.data()?.revision||0;
  },
  watchWorkspace(callback){
    const user=auth.currentUser;if(!user)throw new Error("尚未登入");
    const ref=doc(db,"users",user.uid,"sync","meta");
    return onSnapshot(ref,snap=>{
      const value=snap.exists()?snap.data():{};
      callback({revision:value.revision||0,updatedBy:value.updatedBy||"",activeGeneration:value.activeGeneration||""});
    },error=>callback({error}));
  },
  async uploadWorkspace(data, expectedRevision=null, deviceId="manual"){
    const user=auth.currentUser;if(!user)throw new Error("尚未登入");
    const generation=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+"-"+Math.random().toString(36).slice(2));
    const groups={teams:data.teams||[],players:data.players||[],games:data.games||[]};
    const generationRef=doc(db,"users",user.uid,"workspaces",generation);
    await setDoc(generationRef,{status:"staging",createdAt:serverTimestamp(),counts:{teams:groups.teams.length,players:groups.players.length,games:groups.games.length}});
    // Stage a complete immutable snapshot first. The active pointer is not changed until every batch succeeds.
    for(const [name,items] of Object.entries(groups)){
      const ref=collection(db,"users",user.uid,"workspaces",generation,name);
      for(let i=0;i<items.length;i+=400){
        const batch=writeBatch(db);
        for(const item of items.slice(i,i+400)){
          if(!item?.id)throw new Error(name+" 中有資料缺少 ID，已中止上傳");
          batch.set(doc(ref,String(item.id)),item);
        }
        await batch.commit();
      }
    }
    await updateDoc(generationRef,{status:"ready"});
    const metaRef=doc(db,"users",user.uid,"sync","meta");
    try{
      const nextRevision=await runTransaction(db,async tx=>{
        const snap=await tx.get(metaRef);
        const current=snap.exists()?(snap.data().revision||0):0;
        if(expectedRevision!==null&&current!==expectedRevision)throw new Error("雲端資料已在其他裝置更新，為避免覆蓋，已停止同步。請先取得最新雲端資料。");
        const next=current+1;
        tx.set(metaRef,{revision:next,activeGeneration:generation,updatedAt:serverTimestamp(),updatedBy:deviceId});
        return next;
      });
      // Cleanup is best-effort and never turns a successful sync into a failed save.
      try{await cleanupOldGenerations(user.uid,generation);}
      catch(cleanupError){console.warn("舊快照清理暫時失敗，之後同步時會再嘗試。",cleanupError);}
      return nextRevision;
    }catch(error){
      // The staged generation is an orphan; it is intentionally left untouched for safe later cleanup.
      throw error;
    }
  },
  async downloadWorkspace(){
    const user=auth.currentUser;if(!user)throw new Error("尚未登入");
    const result={teams:[],players:[],games:[]};
    const metaRef=doc(db,"users",user.uid,"sync","meta");
    const metaSnap=await getDocs(collection(db,"users",user.uid,"sync"));
    const meta=metaSnap.docs.find(d=>d.id==="meta")?.data()||{};
    result._revision=meta.revision||0;
    result._updatedBy=meta.updatedBy||"";
    const generation=meta.activeGeneration||"";
    for(const name of ["teams","players","games"]){
      const ref=generation
        ?collection(db,"users",user.uid,"workspaces",generation,name)
        :collection(db,"users",user.uid,name); // legacy workspace migration
      const snap=await getDocs(ref);
      result[name]=snap.docs.map(d=>({...d.data(),id:d.id}));
    }
    return result;
  }
};

onAuthStateChanged(auth,user=>{
  window.dispatchEvent(new CustomEvent("firebase-auth-state",{detail:{user:user?{uid:user.uid,email:user.email}:null}}));
});
window.dispatchEvent(new Event("firebase-ready"));
