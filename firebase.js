import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, writeBatch } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

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
  async uploadWorkspace(data){
    const user=auth.currentUser;if(!user)throw new Error("尚未登入");
    const groups={teams:data.teams||[],players:data.players||[],games:data.games||[]};
    for(const [name,items] of Object.entries(groups)){
      const ref=collection(db,"users",user.uid,name);
      const old=await getDocs(ref);
      const ops=[];
      old.forEach(s=>ops.push({type:"delete",ref:s.ref}));
      for(const item of items){
        if(!item?.id)throw new Error(name+" 中有資料缺少 ID，已中止上傳");
        ops.push({type:"set",ref:doc(ref,String(item.id)),data:item});
      }
      for(let i=0;i<ops.length;i+=400){
        const batch=writeBatch(db);
        for(const op of ops.slice(i,i+400)){if(op.type==="delete")batch.delete(op.ref);else batch.set(op.ref,op.data)}
        await batch.commit();
      }
    }
    return true;
  },
  async downloadWorkspace(){
    const user=auth.currentUser;if(!user)throw new Error("尚未登入");
    const result={teams:[],players:[],games:[]};
    for(const name of Object.keys(result)){
      const snap=await getDocs(collection(db,"users",user.uid,name));
      result[name]=snap.docs.map(d=>({...d.data(),id:d.id}));
    }
    return result;
  }
};

onAuthStateChanged(auth,user=>{
  window.dispatchEvent(new CustomEvent("firebase-auth-state",{detail:{user:user?{uid:user.uid,email:user.email}:null}}));
});
window.dispatchEvent(new Event("firebase-ready"));
