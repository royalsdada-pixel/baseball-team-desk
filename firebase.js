import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, writeBatch, runTransaction, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

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
