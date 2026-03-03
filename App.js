import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

/* ─────────────────────────────────────────────────────────────
   COULEURS & CONSTANTES
───────────────────────────────────────────────────────────── */
const C = {
  bg:"#0f1923", card:"#162130", cardAlt:"#1c2d3f",
  accent:"#00c2a8", accentSoft:"#00c2a818", accentBorder:"#00c2a840",
  warn:"#f59e0b", danger:"#ef4444", success:"#22c55e",
  text:"#e2eaf4", muted:"#7a92a8", border:"#243447",
};

const fmt   = (n) => `${Number(n||0).toFixed(2).replace(".",",")} €`;
const today = () => new Date().toISOString().slice(0,10);

const GROUPES    = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];
const MODES      = ["Espèces","Carte bancaire","Virement","Chèque","Mutuelle"];
const SOINS_TYPES = [
  "Injection insuline","Prise de sang","Pansement simple","Pansement complexe",
  "Nébulisation","Perfusion IV","Sonde urinaire","Lavement","Glycémie capillaire",
  "Injection IM","Injection SC","Soins de plaie","Ablation fils/agrafes","Autre",
];

/* ─────────────────────────────────────────────────────────────
   UI ATOMS
───────────────────────────────────────────────────────────── */
function Badge({ statut }) {
  const map = {
    critique:     ["#ef444420","#ef4444","Critique"],
    stable:       ["#22c55e20","#22c55e","Stable"],
    fait:         ["#22c55e20","#22c55e","Fait"],
    "en attente": ["#f59e0b20","#f59e0b","En attente"],
  };
  const [bg,col,lbl] = map[statut]||map.stable;
  return <span style={{background:bg,color:col,border:`1px solid ${col}40`,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{lbl}</span>;
}

function StatCard({label,value,sub,accent}) {
  return (
    <div style={{background:C.card,border:`1px solid ${(accent||C.accent)}30`,borderRadius:16,padding:"20px 24px",flex:1,minWidth:130}}>
      <div style={{color:accent||C.accent,fontSize:22,fontWeight:800,fontFamily:"Georgia,serif"}}>{value}</div>
      <div style={{color:C.text,fontSize:13,fontWeight:600,marginTop:4}}>{label}</div>
      {sub&&<div style={{color:C.muted,fontSize:11,marginTop:2}}>{sub}</div>}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:40}}>
      <div style={{width:32,height:32,border:`3px solid ${C.border}`,borderTop:`3px solid ${C.accent}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const iS = {background:C.cardAlt,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.text,fontSize:13,width:"100%",outline:"none",boxSizing:"border-box"};
const lS = {color:C.muted,fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,display:"block",marginBottom:4};
const btnP = {background:C.accent,color:"#0f1923",border:"none",borderRadius:8,padding:"9px 20px",fontWeight:700,fontSize:13,cursor:"pointer"};
const btnS = {background:"transparent",color:C.muted,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 16px",fontWeight:600,fontSize:13,cursor:"pointer"};
const btnW = {background:"#ef444415",color:"#ef4444",border:"1px solid #ef444435",borderRadius:8,padding:"9px 16px",fontWeight:600,fontSize:13,cursor:"pointer"};

function Field({label,half,children}) {
  return (
    <div style={{marginBottom:14,gridColumn:half?"span 1":"span 2"}}>
      <label style={lS}>{label}</label>{children}
    </div>
  );
}

function Modal({title,onClose,wide,children}) {
  return (
    <div style={{position:"fixed",inset:0,background:"#000c",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:18,padding:28,width:wide?720:600,maxWidth:"98vw",maxHeight:"94vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <div style={{color:C.text,fontSize:17,fontWeight:700}}>{title}</div>
          <button onClick={onClose} style={{...btnS,padding:"4px 12px"}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   AUTH SCREENS
───────────────────────────────────────────────────────────── */
function AuthBg() {
  return (
    <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none"}}>
      {[...Array(6)].map((_,i)=>(
        <div key={i} style={{position:"absolute",borderRadius:"50%",
          background:`radial-gradient(circle, #00c2a8${["18","10","0c","08","14","0a"][i]} 0%, transparent 70%)`,
          width:[600,400,500,300,450,350][i],height:[600,400,500,300,450,350][i],
          top:["-10%","60%","30%","80%","-5%","45%"][i],left:["-5%","70%","50%","-10%","60%","20%"][i]}}/>
      ))}
    </div>
  );
}

function LoginPage({onLogin, onGoRegister}) {
  const [login,setLogin]       = useState("");
  const [password,setPassword] = useState("");
  const [err,setErr]           = useState("");
  const [showPw,setShowPw]     = useState(false);
  const [loading,setLoading]   = useState(false);

  const handle = async () => {
    if (!login.trim()||!password) { setErr("Remplissez tous les champs."); return; }
    setLoading(true); setErr("");
    const {data,error} = await supabase
      .from("utilisateurs").select("*")
      .eq("login",login.trim()).eq("password",password).single();
    setLoading(false);
    if (error||!data) { setErr("Identifiant ou mot de passe incorrect."); return; }
    if (data.statut==="en_attente") { setErr("Compte en attente de validation par l'administrateur."); return; }
    if (data.statut==="refuse")     { setErr("Compte refusé. Contactez l'administrateur."); return; }
    onLogin(data);
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <AuthBg/>
      <div style={{position:"relative",zIndex:1,width:420,maxWidth:"94vw"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:10,marginBottom:8}}>
            <div style={{width:44,height:44,background:"linear-gradient(135deg,#00c2a8,#0ea5e9)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🩺</div>
            <span style={{color:C.text,fontSize:32,fontFamily:"Georgia,serif",letterSpacing:-1}}>e<span style={{color:C.accent}}>-Soins</span></span>
          </div>
          <div style={{color:C.muted,fontSize:13}}>Plateforme infirmière à domicile</div>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:"32px 36px",boxShadow:"0 24px 60px #00000040"}}>
          <div style={{color:C.text,fontSize:18,fontWeight:700,marginBottom:6}}>Connexion</div>
          <div style={{color:C.muted,fontSize:12,marginBottom:24}}>Connectez-vous à votre espace infirmier</div>
          <div style={{marginBottom:16}}>
            <label style={lS}>Identifiant</label>
            <input style={{...iS,fontSize:14}} value={login} onChange={e=>setLogin(e.target.value)} placeholder="Votre identifiant" onKeyDown={e=>e.key==="Enter"&&handle()}/>
          </div>
          <div style={{marginBottom:20}}>
            <label style={lS}>Mot de passe</label>
            <div style={{position:"relative"}}>
              <input style={{...iS,fontSize:14,paddingRight:44}} type={showPw?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handle()}/>
              <button onClick={()=>setShowPw(v=>!v)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:16,padding:0}}>{showPw?"🙈":"👁"}</button>
            </div>
          </div>
          {err&&<div style={{background:"#ef444415",border:"1px solid #ef444440",borderRadius:8,padding:"10px 14px",color:"#ef4444",fontSize:12,marginBottom:16}}>⚠ {err}</div>}
          <button onClick={handle} disabled={loading} style={{...btnP,width:"100%",padding:"12px",fontSize:14,borderRadius:10,marginBottom:16,opacity:loading?0.7:1}}>
            {loading?"Connexion…":"Se connecter"}
          </button>
          <div style={{textAlign:"center"}}>
            <span style={{color:C.muted,fontSize:13}}>Pas encore de compte ? </span>
            <span onClick={onGoRegister} style={{color:C.accent,fontSize:13,fontWeight:600,cursor:"pointer",textDecoration:"underline"}}>S'inscrire</span>
          </div>
        </div>
        <div style={{textAlign:"center",marginTop:20,color:C.muted,fontSize:11}}>© 2026 e-Soins — Tous droits réservés</div>
      </div>
    </div>
  );
}

function RegisterPage({onGoLogin}) {
  const [f,setF]     = useState({prenom:"",nom:"",login:"",password:"",confirm:"",specialite:"",telephone:""});
  const set          = (k,v) => setF(p=>({...p,[k]:v}));
  const [err,setErr] = useState("");
  const [done,setDone] = useState(false);
  const [loading,setLoading] = useState(false);

  const handle = async () => {
    if (!f.prenom.trim()||!f.nom.trim()) { setErr("Prénom et nom obligatoires."); return; }
    if (!f.login.trim())                  { setErr("Choisissez un identifiant."); return; }
    if (f.password.length<6)              { setErr("Mot de passe min. 6 caractères."); return; }
    if (f.password!==f.confirm)           { setErr("Mots de passe différents."); return; }
    setLoading(true); setErr("");
    const {error} = await supabase.from("utilisateurs").insert({
      login:f.login.trim(), password:f.password,
      prenom:f.prenom, nom:f.nom, telephone:f.telephone,
      specialite:f.specialite, role:"infirmier", statut:"en_attente",
    });
    setLoading(false);
    if (error) { setErr(error.message.includes("unique")?`L'identifiant "${f.login}" est déjà pris.`:"Erreur : "+error.message); return; }
    setDone(true);
  };

  if (done) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <AuthBg/>
      <div style={{position:"relative",zIndex:1,width:420,maxWidth:"94vw",textAlign:"center"}}>
        <div style={{background:C.card,border:"1px solid #22c55e40",borderRadius:20,padding:"40px 36px",boxShadow:"0 24px 60px #00000040"}}>
          <div style={{fontSize:48,marginBottom:16}}>✅</div>
          <div style={{color:C.text,fontSize:20,fontWeight:700,marginBottom:10}}>Demande envoyée !</div>
          <div style={{color:C.muted,fontSize:13,lineHeight:1.6,marginBottom:28}}>Votre compte est en attente de validation.<br/>L'administrateur doit approuver votre inscription.</div>
          <button onClick={onGoLogin} style={{...btnP,padding:"11px 32px",borderRadius:10}}>Retour à la connexion</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",fontFamily:"'DM Sans','Segoe UI',sans-serif",padding:16}}>
      <AuthBg/>
      <div style={{position:"relative",zIndex:1,width:480,maxWidth:"96vw"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:10}}>
            <div style={{width:40,height:40,background:"linear-gradient(135deg,#00c2a8,#0ea5e9)",borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🩺</div>
            <span style={{color:C.text,fontSize:28,fontFamily:"Georgia,serif",letterSpacing:-1}}>e<span style={{color:C.accent}}>-Soins</span></span>
          </div>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:"30px 32px",boxShadow:"0 24px 60px #00000040"}}>
          <div style={{color:C.text,fontSize:17,fontWeight:700,marginBottom:4}}>Créer un compte infirmier</div>
          <div style={{color:C.muted,fontSize:12,marginBottom:22}}>Votre demande sera examinée par l'administrateur.</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
            <div style={{marginBottom:14}}><label style={lS}>Prénom *</label><input style={iS} value={f.prenom} onChange={e=>set("prenom",e.target.value)} placeholder="Marie"/></div>
            <div style={{marginBottom:14}}><label style={lS}>Nom *</label><input style={iS} value={f.nom} onChange={e=>set("nom",e.target.value)} placeholder="Dupont"/></div>
            <div style={{marginBottom:14}}><label style={lS}>Téléphone</label><input style={iS} value={f.telephone} onChange={e=>set("telephone",e.target.value)} placeholder="06 00 00 00 00"/></div>
            <div style={{marginBottom:14}}>
              <label style={lS}>Spécialité</label>
              <select style={iS} value={f.specialite} onChange={e=>set("specialite",e.target.value)}>
                <option value="">— Choisir —</option>
                {["Infirmier(e) généraliste","Infirmier(e) spécialisé(e)","Aide-soignant(e)","Sage-femme","Kinésithérapeute"].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{marginBottom:14}}><label style={lS}>Identifiant *</label><input style={iS} value={f.login} onChange={e=>set("login",e.target.value)} placeholder="Unique, sans espace"/></div>
          <div style={{marginBottom:14}}><label style={lS}>Mot de passe * (min. 6 caractères)</label><input type="password" style={iS} value={f.password} onChange={e=>set("password",e.target.value)} placeholder="••••••••"/></div>
          <div style={{marginBottom:18}}><label style={lS}>Confirmer le mot de passe *</label><input type="password" style={iS} value={f.confirm} onChange={e=>set("confirm",e.target.value)} placeholder="••••••••"/></div>
          {err&&<div style={{background:"#ef444415",border:"1px solid #ef444440",borderRadius:8,padding:"10px 14px",color:"#ef4444",fontSize:12,marginBottom:14}}>⚠ {err}</div>}
          <button onClick={handle} disabled={loading} style={{...btnP,width:"100%",padding:"12px",fontSize:14,borderRadius:10,marginBottom:14,opacity:loading?0.7:1}}>
            {loading?"Envoi…":"Envoyer la demande d'inscription"}
          </button>
          <div style={{textAlign:"center"}}>
            <span style={{color:C.muted,fontSize:13}}>Déjà un compte ? </span>
            <span onClick={onGoLogin} style={{color:C.accent,fontSize:13,fontWeight:600,cursor:"pointer",textDecoration:"underline"}}>Se connecter</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ADMIN PANEL
───────────────────────────────────────────────────────────── */
function AdminPanel({currentUser, onBack}) {
  const [users,setUsers]         = useState([]);
  const [loading,setLoading]     = useState(true);
  const [resetTarget,setResetTarget] = useState(null);
  const [newPw,setNewPw]         = useState("");
  const [newPwC,setNewPwC]       = useState("");
  const [resetMsg,setResetMsg]   = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const {data} = await supabase.from("utilisateurs").select("*").neq("role","admin").order("created_at",{ascending:false});
    setUsers(data||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{loadUsers();},[loadUsers]);

  const update = async (id, fields) => {
    await supabase.from("utilisateurs").update(fields).eq("id",id);
    setUsers(prev=>prev.map(u=>u.id===id?{...u,...fields}:u));
  };
  const remove = async (id) => {
    if(!window.confirm("Supprimer ce compte ?")) return;
    await supabase.from("utilisateurs").delete().eq("id",id);
    setUsers(prev=>prev.filter(u=>u.id!==id));
  };
  const doReset = async () => {
    if (newPw.length<6) { setResetMsg("Minimum 6 caractères."); return; }
    if (newPw!==newPwC)  { setResetMsg("Mots de passe différents."); return; }
    await supabase.from("utilisateurs").update({password:newPw}).eq("id",resetTarget.id);
    alert(`✅ Mot de passe de ${resetTarget.prenom} ${resetTarget.nom} réinitialisé.`);
    setResetTarget(null); setNewPw(""); setNewPwC(""); setResetMsg("");
  };

  const pending  = users.filter(u=>u.statut==="en_attente");
  const approved = users.filter(u=>u.statut==="approuve");
  const refused  = users.filter(u=>u.statut==="refuse");

  const UserRow = ({u,actions}) => (
    <div style={{background:C.cardAlt,border:`1px solid ${C.border}`,borderRadius:11,padding:"13px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexWrap:"wrap",gap:8}}>
      <div>
        <div style={{color:C.text,fontWeight:700,fontSize:13}}>{u.prenom} {u.nom}</div>
        <div style={{color:C.muted,fontSize:11,marginTop:2}}>@{u.login}{u.specialite?` · ${u.specialite}`:""}{u.telephone?` · ${u.telephone}`:""}</div>
      </div>
      <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{actions(u)}</div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans','Segoe UI',sans-serif",color:C.text}}>
      <style>{`*{box-sizing:border-box;} input,select,textarea{font-family:inherit;color:#e2eaf4;}`}</style>

      {resetTarget&&(
        <div style={{position:"fixed",inset:0,background:"#000c",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:18,padding:28,width:420,maxWidth:"96vw"}}>
            <div style={{color:C.text,fontSize:16,fontWeight:700,marginBottom:6}}>🔑 Réinitialiser le mot de passe</div>
            <div style={{color:C.muted,fontSize:12,marginBottom:20}}>Compte : <strong style={{color:C.text}}>{resetTarget.prenom} {resetTarget.nom}</strong> (@{resetTarget.login})</div>
            <div style={{marginBottom:12}}><label style={lS}>Nouveau mot de passe *</label><input type="password" style={iS} value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Minimum 6 caractères"/></div>
            <div style={{marginBottom:16}}><label style={lS}>Confirmer *</label><input type="password" style={iS} value={newPwC} onChange={e=>setNewPwC(e.target.value)} placeholder="Répéter"/></div>
            {resetMsg&&<div style={{background:"#ef444415",border:"1px solid #ef444440",borderRadius:8,padding:"9px 14px",color:"#ef4444",fontSize:12,marginBottom:12}}>⚠ {resetMsg}</div>}
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button style={btnS} onClick={()=>{setResetTarget(null);setNewPw("");setNewPwC("");setResetMsg("");}}>Annuler</button>
              <button style={btnP} onClick={doReset}>Réinitialiser</button>
            </div>
          </div>
        </div>
      )}

      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,padding:"16px 28px",display:"flex",alignItems:"center",gap:16}}>
        <div style={{width:36,height:36,background:"linear-gradient(135deg,#00c2a8,#0ea5e9)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🩺</div>
        <span style={{color:C.text,fontSize:20,fontFamily:"Georgia,serif"}}>e<span style={{color:C.accent}}>-Soins</span></span>
        <span style={{color:C.muted,fontSize:13,marginLeft:4}}>— Panneau Administrateur</span>
        <div style={{flex:1}}/>
        <button onClick={onBack} style={{...btnP,padding:"8px 18px",fontSize:12}}>→ Application</button>
      </div>

      <div style={{maxWidth:820,margin:"0 auto",padding:"32px 24px"}}>
        {loading ? <Spinner/> : (
          <>
            <div style={{display:"flex",gap:14,marginBottom:32,flexWrap:"wrap"}}>
              <StatCard label="En attente" value={pending.length}  accent="#f59e0b" sub="à valider"/>
              <StatCard label="Approuvés"  value={approved.length} accent="#22c55e" sub="comptes actifs"/>
              <StatCard label="Refusés"    value={refused.length}  accent="#ef4444" sub="comptes refusés"/>
            </div>

            {/* Pending */}
            <div style={{marginBottom:28}}>
              <div style={{color:C.warn,fontSize:14,fontWeight:700,marginBottom:12}}>⏳ Demandes en attente ({pending.length})</div>
              {pending.length===0?<div style={{color:C.muted,fontSize:13}}>Aucune demande en attente.</div>:
                pending.map(u=><UserRow key={u.id} u={u} actions={u=>(
                  <>
                    <button onClick={()=>update(u.id,{statut:"approuve"})} style={{...btnP,padding:"6px 14px",fontSize:11}}>✓ Approuver</button>
                    <button onClick={()=>update(u.id,{statut:"refuse"})}   style={{...btnW,padding:"6px 12px",fontSize:11}}>✕ Refuser</button>
                  </>
                )}/>)
              }
            </div>

            {/* Approved */}
            <div style={{marginBottom:28}}>
              <div style={{color:C.success,fontSize:14,fontWeight:700,marginBottom:12}}>✅ Comptes approuvés ({approved.length})</div>
              {approved.length===0?<div style={{color:C.muted,fontSize:13}}>Aucun compte approuvé.</div>:
                approved.map(u=><UserRow key={u.id} u={u} actions={u=>(
                  <>
                    <button onClick={()=>setResetTarget(u)} style={{background:"#7c3aed20",color:"#a78bfa",border:"1px solid #7c3aed40",borderRadius:8,padding:"6px 12px",fontSize:11,cursor:"pointer"}}>🔑 Réinit. MDP</button>
                    <button onClick={()=>update(u.id,{statut:"refuse"})} style={{...btnW,padding:"6px 12px",fontSize:11}}>Suspendre</button>
                    <button onClick={()=>remove(u.id)} style={{background:"#ef444410",color:"#ef4444",border:"1px solid #ef444430",borderRadius:8,padding:"6px 10px",fontSize:11,cursor:"pointer"}}>🗑</button>
                  </>
                )}/>)
              }
            </div>

            {refused.length>0&&(
              <div>
                <div style={{color:"#ef4444",fontSize:14,fontWeight:700,marginBottom:12}}>🚫 Comptes refusés ({refused.length})</div>
                {refused.map(u=><UserRow key={u.id} u={u} actions={u=>(
                  <>
                    <button onClick={()=>setResetTarget(u)} style={{background:"#7c3aed20",color:"#a78bfa",border:"1px solid #7c3aed40",borderRadius:8,padding:"6px 12px",fontSize:11,cursor:"pointer"}}>🔑 Réinit. MDP</button>
                    <button onClick={()=>update(u.id,{statut:"approuve"})} style={{...btnS,padding:"6px 12px",fontSize:11,color:C.success,borderColor:"#22c55e40"}}>Réactiver</button>
                    <button onClick={()=>remove(u.id)} style={{background:"#ef444410",color:"#ef4444",border:"1px solid #ef444430",borderRadius:8,padding:"6px 10px",fontSize:11,cursor:"pointer"}}>🗑</button>
                  </>
                )}/>)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN APP SHELL  (patients, visites, soins, facturation…)
   — Les données viennent de Supabase, pas du state local —
───────────────────────────────────────────────────────────── */
function MainApp({currentUser, onLogout, onAdminPanel}) {
  const [tab,setTab]           = useState("Tableau de bord");
  const [patients,setPatients] = useState([]);
  const [tarifs,setTarifs]     = useState([]);
  const [factures,setFactures] = useState([]);
  const [loading,setLoading]   = useState(true);

  // Load all data on mount
  useEffect(()=>{
    (async()=>{
      setLoading(true);
      const [p,t,f,fl] = await Promise.all([
        supabase.from("patients").select("*").order("nom"),
        supabase.from("tarifs").select("*").eq("actif",true).order("categorie"),
        supabase.from("factures").select("*").order("date",{ascending:false}),
        supabase.from("facture_lignes").select("*"),
      ]);
      // Attach facture_lignes to factures
      const facts = (f.data||[]).map(fac=>({
        ...fac, lignes:(fl.data||[]).filter(l=>l.facture_id===fac.id)
      }));
      // Load related data for each patient
      const pats = await Promise.all((p.data||[]).map(async pat=>{
        const [v,vit,sa] = await Promise.all([
          supabase.from("visites").select("*").eq("patient_id",pat.id).order("date",{ascending:false}),
          supabase.from("vitaux").select("*").eq("patient_id",pat.id).order("date",{ascending:false}),
          supabase.from("soins_appliques").select("*").eq("patient_id",pat.id).order("date",{ascending:false}),
        ]);
        return {...pat, visites:v.data||[], vitaux:vit.data||[], soinsAppliques:sa.data||[]};
      }));
      setPatients(pats);
      setTarifs(t.data||[]);
      setFactures(facts);
      setLoading(false);
    })();
  },[]);

  const refreshPatient = async (id) => {
    const [p,v,vit,sa] = await Promise.all([
      supabase.from("patients").select("*").eq("id",id).single(),
      supabase.from("visites").select("*").eq("patient_id",id).order("date",{ascending:false}),
      supabase.from("vitaux").select("*").eq("patient_id",id).order("date",{ascending:false}),
      supabase.from("soins_appliques").select("*").eq("patient_id",id).order("date",{ascending:false}),
    ]);
    const updated = {...p.data, visites:v.data||[], vitaux:vit.data||[], soinsAppliques:sa.data||[]};
    setPatients(prev=>prev.map(x=>x.id===id?updated:x));
    return updated;
  };

  const TABS = ["Tableau de bord","Patients","Soins appliqués","Dossier médical","Planning","Facturation"];
  const TICO = {"Tableau de bord":"⊡","Patients":"⊕","Soins appliqués":"📋","Dossier médical":"⊞","Planning":"◷","Facturation":"◈"};
  const initials = `${currentUser.prenom?.[0]||""}${currentUser.nom?.[0]||"A"}`.toUpperCase();

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans','Segoe UI',sans-serif",color:C.text,display:"flex"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap'); *{box-sizing:border-box;} input,select,textarea{font-family:inherit;color:#e2eaf4;} ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-thumb{background:#243447;border-radius:3px}`}</style>

      {/* Sidebar */}
      <div style={{width:220,background:C.card,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",padding:"26px 0",flexShrink:0}}>
        <div style={{padding:"0 20px 24px",borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:30,height:30,background:"linear-gradient(135deg,#00c2a8,#0ea5e9)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>🩺</div>
            <span style={{color:C.text,fontSize:19,fontFamily:"Georgia,serif"}}>e<span style={{color:C.accent}}>-Soins</span></span>
          </div>
          <div style={{color:C.muted,fontSize:11,marginTop:4}}>Infirmier à domicile</div>
        </div>
        <nav style={{padding:"16px 10px",flex:1}}>
          {TABS.map(t=>(
            <div key={t} onClick={()=>setTab(t)}
              style={{padding:"9px 13px",marginBottom:3,borderRadius:9,cursor:"pointer",display:"flex",alignItems:"center",gap:9,
                background:tab===t?C.accentSoft:"transparent",border:`1px solid ${tab===t?C.accentBorder:"transparent"}`,
                color:tab===t?C.accent:C.muted,fontWeight:tab===t?700:400,fontSize:13,transition:"all .15s"}}>
              <span>{TICO[t]}</span>{t}
            </div>
          ))}
          {currentUser.role==="admin"&&(
            <div onClick={onAdminPanel} style={{padding:"9px 13px",marginTop:8,borderRadius:9,cursor:"pointer",display:"flex",alignItems:"center",gap:9,background:"#7c3aed18",border:"1px solid #7c3aed30",color:"#a78bfa",fontWeight:600,fontSize:13}}>
              <span>⚙</span>Admin
            </div>
          )}
        </nav>
        <div style={{padding:"16px 20px",borderTop:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <div style={{width:34,height:34,background:C.accent,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"#0f1923",fontWeight:800,fontSize:13,flexShrink:0}}>{initials}</div>
            <div>
              <div style={{color:C.text,fontSize:12,fontWeight:600}}>{currentUser.prenom} {currentUser.nom}</div>
              <div style={{color:C.success,fontSize:10}}>● En service</div>
            </div>
          </div>
          <button onClick={onLogout} style={{...btnS,width:"100%",padding:"7px",fontSize:11,textAlign:"center"}}>Déconnexion</button>
        </div>
      </div>

      {/* Main content */}
      <div style={{flex:1,padding:"28px 30px",overflowY:"auto"}}>
        <div style={{maxWidth:880}}>
          <div style={{color:C.muted,fontSize:11,marginBottom:18,textTransform:"uppercase",letterSpacing:1,fontWeight:600}}>{tab}</div>
          {loading ? <Spinner/> : (
            <>
              {tab==="Tableau de bord" && <Dashboard patients={patients}/>}
              {tab==="Patients"        && <Patients patients={patients} setPatients={setPatients} currentUser={currentUser} refreshPatient={refreshPatient}/>}
              {tab==="Soins appliqués" && <SoinsAppliques patients={patients} refreshPatient={refreshPatient}/>}
              {tab==="Dossier médical" && <DossierMedical patients={patients} refreshPatient={refreshPatient}/>}
              {tab==="Planning"        && <Planning patients={patients}/>}
              {tab==="Facturation"     && <Facturation patients={patients} tarifs={tarifs} setTarifs={setTarifs} factures={factures} setFactures={setFactures} currentUser={currentUser}/>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DASHBOARD
───────────────────────────────────────────────────────────── */
function Dashboard({patients}) {
  const td      = today();
  const allV    = patients.flatMap(p=>p.visites);
  const allSA   = patients.flatMap(p=>p.soinsAppliques||[]);
  const critiques   = patients.filter(p=>p.statut==="critique");
  const visitesToday= allV.filter(v=>v.date===td);
  const revenu  = allV.reduce((s,v)=>s+(v.paye||0),0);
  const solde   = allV.reduce((s,v)=>s+(v.cout-v.paye||0),0);

  return (
    <div>
      <div style={{fontFamily:"Georgia,serif",fontSize:26,color:C.text,marginBottom:22}}>Bonjour 👋 <span style={{color:C.accent}}>Infirmier(e)</span></div>
      <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:24}}>
        <StatCard label="Patients"          value={patients.length} sub="enregistrés"/>
        <StatCard label="Visites aujourd'hui" value={visitesToday.length} sub={td} accent="#7c3aed"/>
        <StatCard label="Soins enregistrés"  value={allSA.length} sub="au total" accent="#0ea5e9"/>
        <StatCard label="Revenus encaissés"  value={fmt(revenu)} accent="#22c55e"/>
        <StatCard label="Solde à recouvrir"  value={fmt(solde)}  accent="#f59e0b"/>
      </div>
      {critiques.length>0&&(
        <div style={{background:"#ef444410",border:"1px solid #ef444440",borderRadius:14,padding:"14px 18px",marginBottom:20}}>
          <div style={{color:"#ef4444",fontWeight:700,marginBottom:8,fontSize:13}}>⚠ Alertes patients critiques</div>
          {critiques.map(p=><div key={p.id} style={{color:C.text,fontSize:13,marginBottom:4}}><strong>{p.prenom} {p.nom}</strong> — {p.diagnostic}</div>)}
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div>
          <div style={{color:C.text,fontWeight:700,marginBottom:10,fontSize:14}}>Dernières visites</div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {patients.flatMap(p=>p.visites.map(v=>({...v,patient:`${p.prenom} ${p.nom}`}))).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map((v,i)=>(
              <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{color:C.text,fontWeight:600,fontSize:12}}>{v.patient}</div>
                  <div style={{color:C.muted,fontSize:11}}>{v.soin} — {v.date}</div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{color:C.accent,fontSize:11,fontWeight:700}}>{fmt(v.cout)}</span>
                  <Badge statut={v.statut_visite||v.statutVisite}/>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={{color:C.text,fontWeight:700,marginBottom:10,fontSize:14}}>Derniers soins appliqués</div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {patients.flatMap(p=>(p.soinsAppliques||[]).map(s=>({...s,patient:`${p.prenom} ${p.nom}`}))).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map((s,i)=>(
              <div key={i} style={{background:C.card,border:"1px solid #0ea5e930",borderRadius:10,padding:"10px 14px"}}>
                <div style={{color:C.text,fontWeight:600,fontSize:12}}>{s.patient}</div>
                <div style={{color:"#0ea5e9",fontSize:11,marginTop:2}}>{s.type_soin} — {s.date}</div>
                {s.observations&&<div style={{color:C.muted,fontSize:11,marginTop:3,fontStyle:"italic"}}>{s.observations.slice(0,60)}{s.observations.length>60?"…":""}</div>}
              </div>
            ))}
            {patients.flatMap(p=>p.soinsAppliques||[]).length===0&&<div style={{color:C.muted,fontSize:12}}>Aucun soin enregistré.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PATIENTS
───────────────────────────────────────────────────────────── */
function PatientForm({initial, onSave, onClose}) {
  const [f,setF] = useState(initial ? {...initial} : {nom:"",prenom:"",sexe:"F",ddn:"",adresse:"",telephone:"",contact:"",groupe_sanguin:"A+",antecedents:"",statut:"stable",diagnostic:"",traitement:"",allergies:""});
  const set = (k,v)=>setF(p=>({...p,[k]:v}));
  const ok = f.prenom.trim()&&f.nom.trim();
  return (
    <Modal title={initial?`Modifier — ${initial.prenom} ${initial.nom}`:"Nouveau patient"} onClose={onClose} wide>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 18px"}}>
        <Field label="Prénom *" half><input style={iS} value={f.prenom} onChange={e=>set("prenom",e.target.value)} placeholder="Marie"/></Field>
        <Field label="Nom *" half><input style={iS} value={f.nom} onChange={e=>set("nom",e.target.value)} placeholder="Dupont"/></Field>
        <Field label="Sexe" half><select style={iS} value={f.sexe} onChange={e=>set("sexe",e.target.value)}><option value="F">Féminin</option><option value="M">Masculin</option></select></Field>
        <Field label="Date de naissance" half><input type="date" style={iS} value={f.ddn||""} onChange={e=>set("ddn",e.target.value)}/></Field>
        <Field label="Téléphone" half><input style={iS} value={f.telephone||""} onChange={e=>set("telephone",e.target.value)} placeholder="06 00 00 00 00"/></Field>
        <Field label="Groupe sanguin" half><select style={iS} value={f.groupe_sanguin||"A+"} onChange={e=>set("groupe_sanguin",e.target.value)}>{GROUPES.map(g=><option key={g}>{g}</option>)}</select></Field>
        <Field label="Statut" half><select style={iS} value={f.statut} onChange={e=>set("statut",e.target.value)}><option value="stable">Stable</option><option value="critique">Critique</option></select></Field>
        <Field label="Personne de contact" half><input style={iS} value={f.contact||""} onChange={e=>set("contact",e.target.value)} placeholder="Nom – téléphone"/></Field>
        <div style={{gridColumn:"span 2",marginBottom:14}}><label style={lS}>Adresse</label><input style={iS} value={f.adresse||""} onChange={e=>set("adresse",e.target.value)} placeholder="Rue, ville, code postal"/></div>
        <div style={{gridColumn:"span 2",marginBottom:14}}><label style={lS}>Antécédents médicaux</label><textarea style={{...iS,height:58,resize:"vertical"}} value={f.antecedents||""} onChange={e=>set("antecedents",e.target.value)} placeholder="Diabète, HTA…"/></div>
        <div style={{gridColumn:"span 2",marginBottom:14}}><label style={lS}>Diagnostic</label><input style={iS} value={f.diagnostic||""} onChange={e=>set("diagnostic",e.target.value)}/></div>
        <div style={{gridColumn:"span 2",marginBottom:14}}><label style={lS}>Traitement prescrit</label><input style={iS} value={f.traitement||""} onChange={e=>set("traitement",e.target.value)}/></div>
        <div style={{gridColumn:"span 2",marginBottom:14}}><label style={lS}>Allergies</label><input style={iS} value={f.allergies||""} onChange={e=>set("allergies",e.target.value)}/></div>
      </div>
      {!ok&&<div style={{color:C.warn,fontSize:12,marginBottom:8}}>* Prénom et nom obligatoires</div>}
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button style={btnS} onClick={onClose}>Annuler</button>
        <button style={{...btnP,opacity:ok?1:0.45}} onClick={()=>{if(ok){onSave(f);onClose();}}}>
          {initial?"Enregistrer les modifications":"Créer le patient"}
        </button>
      </div>
    </Modal>
  );
}

function Patients({patients, setPatients, currentUser, refreshPatient}) {
  const [search,setSearch]   = useState("");
  const [selected,setSelected] = useState(null);
  const [showForm,setShowForm] = useState(false);
  const [editTarget,setEditTarget] = useState(null);
  const [saving,setSaving]   = useState(false);

  const filtered = patients.filter(p=>`${p.nom} ${p.prenom} ${p.telephone||""}`.toLowerCase().includes(search.toLowerCase()));

  const savePatient = async (f) => {
    setSaving(true);
    if (editTarget) {
      await supabase.from("patients").update(f).eq("id",editTarget.id);
      const updated = await refreshPatient(editTarget.id);
      if (selected?.id===editTarget.id) setSelected(updated);
    } else {
      const {data} = await supabase.from("patients").insert({...f,created_by:currentUser.id}).select().single();
      if (data) { const p={...data,visites:[],vitaux:[],soinsAppliques:[]}; setPatients(prev=>[...prev,p]); }
    }
    setSaving(false);
  };

  const deletePatient = async (id) => {
    if(!window.confirm("Supprimer ce patient et toutes ses données ?")) return;
    await supabase.from("patients").delete().eq("id",id);
    setPatients(prev=>prev.filter(p=>p.id!==id));
    if(selected?.id===id) setSelected(null);
  };

  return (
    <div>
      {(showForm||editTarget)&&<PatientForm initial={editTarget} onSave={savePatient} onClose={()=>{setShowForm(false);setEditTarget(null);}}/>}
      <div style={{display:"flex",gap:16}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",gap:10,marginBottom:14}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Rechercher patient…" style={{...iS,flex:1}}/>
            <button style={btnP} onClick={()=>{setEditTarget(null);setShowForm(true);}}>+ Nouveau</button>
          </div>
          {filtered.length===0&&<div style={{color:C.muted,fontSize:13,textAlign:"center",marginTop:24}}>Aucun patient trouvé.</div>}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {filtered.map(p=>(
              <div key={p.id} onClick={()=>setSelected(p)}
                style={{background:selected?.id===p.id?C.accentSoft:C.card,border:`1px solid ${selected?.id===p.id?C.accent:C.border}`,borderRadius:12,padding:"13px 16px",cursor:"pointer",transition:"all .15s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{color:C.text,fontWeight:700,fontSize:14}}>{p.prenom} {p.nom}</div>
                    <div style={{color:C.muted,fontSize:12,marginTop:2}}>{p.telephone||"—"} · {p.groupe_sanguin} · {p.ddn||"—"}</div>
                    <div style={{color:C.muted,fontSize:11,marginTop:1}}>{p.diagnostic||"Aucun diagnostic"}</div>
                  </div>
                  <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
                    <Badge statut={p.statut}/>
                    <button onClick={e=>{e.stopPropagation();setEditTarget(p);setShowForm(true);}} style={{...btnS,padding:"5px 11px",fontSize:11,color:C.accent,borderColor:C.accentBorder}}>✏ Modifier</button>
                    <button onClick={e=>{e.stopPropagation();deletePatient(p.id);}} style={{...btnW,padding:"5px 10px",fontSize:11}}>🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {selected&&(
          <div style={{width:285,background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:18,flexShrink:0,alignSelf:"flex-start"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{color:C.accent,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Fiche patient</div>
              <button onClick={()=>{setEditTarget(selected);setShowForm(true);}} style={{...btnS,padding:"4px 10px",fontSize:11,color:C.accent,borderColor:C.accentBorder}}>✏ Éditer</button>
            </div>
            {[["Nom",`${selected.prenom} ${selected.nom}`],["Sexe",selected.sexe==="F"?"Féminin":"Masculin"],["Naissance",selected.ddn||"—"],["Tél.",selected.telephone||"—"],["Groupe",selected.groupe_sanguin],["Contact",selected.contact||"—"],["Adresse",selected.adresse||"—"],["Allergies",selected.allergies||"—"],["Antécédents",selected.antecedents||"—"],["Diagnostic",selected.diagnostic||"—"],["Traitement",selected.traitement||"—"]].map(([k,v])=>(
              <div key={k} style={{marginBottom:8}}>
                <div style={{color:C.muted,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:0.4}}>{k}</div>
                <div style={{color:C.text,fontSize:12,marginTop:1}}>{v}</div>
              </div>
            ))}
            {selected.visites?.length>0&&(
              <div style={{marginTop:14}}>
                <div style={{color:C.muted,fontSize:10,fontWeight:700,textTransform:"uppercase",marginBottom:7}}>Dernières visites</div>
                {selected.visites.slice(0,3).map((v,i)=>(
                  <div key={i} style={{background:C.cardAlt,borderRadius:8,padding:"7px 10px",marginBottom:5}}>
                    <div style={{color:C.text,fontSize:11,fontWeight:600}}>{v.soin}</div>
                    <div style={{color:C.muted,fontSize:10,marginTop:2}}>{v.date} · {fmt(v.cout)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SOINS APPLIQUÉS
───────────────────────────────────────────────────────────── */
function SoinsAppliques({patients, refreshPatient}) {
  const [selPatient,setSelPatient] = useState(null);
  const [showForm,setShowForm]     = useState(false);
  const [editSoin,setEditSoin]     = useState(null);

  const EMPTY_SOIN = {date:today(),heure:"",type_soin:"",description:"",produits:"",douleur:"",reaction:"",observations:"",prochaine:""};
  const [f,setF] = useState(EMPTY_SOIN);
  const set = (k,v)=>setF(p=>({...p,[k]:v}));

  const saveSoin = async () => {
    if (!f.date||!f.type_soin) return;
    if (editSoin) {
      await supabase.from("soins_appliques").update(f).eq("id",editSoin.id);
    } else {
      await supabase.from("soins_appliques").insert({...f,patient_id:selPatient.id});
    }
    const updated = await refreshPatient(selPatient.id);
    setSelPatient(updated);
    setShowForm(false); setEditSoin(null); setF(EMPTY_SOIN);
  };

  const deleteSoin = async (id) => {
    if(!window.confirm("Supprimer ce soin ?")) return;
    await supabase.from("soins_appliques").delete().eq("id",id);
    const updated = await refreshPatient(selPatient.id);
    setSelPatient(updated);
  };

  if (!selPatient) return (
    <div>
      <div style={{color:C.text,fontFamily:"Georgia,serif",fontSize:18,marginBottom:16}}>Soins appliqués — Choisir un patient</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {patients.map(p=>(
          <div key={p.id} onClick={()=>setSelPatient(p)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{color:C.text,fontWeight:700}}>{p.prenom} {p.nom}</div>
              <div style={{color:C.muted,fontSize:12}}>{(p.soinsAppliques||[]).length} soin(s) enregistré(s)</div>
            </div>
            <Badge statut={p.statut}/>
          </div>
        ))}
      </div>
    </div>
  );

  const SoinFormModal = () => (
    <Modal title={editSoin?"Modifier le soin":`Soin appliqué — ${selPatient.prenom} ${selPatient.nom}`} onClose={()=>{setShowForm(false);setEditSoin(null);setF(EMPTY_SOIN);}} wide>
      <div style={{background:"#00c2a808",border:`1px solid ${C.accentBorder}`,borderRadius:12,padding:"12px 16px",marginBottom:18}}>
        <div style={{color:C.accent,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8}}>Journal de soin infirmier</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 18px"}}>
        <Field label="Date *" half><input type="date" style={iS} value={f.date} onChange={e=>set("date",e.target.value)}/></Field>
        <Field label="Heure" half><input type="time" style={iS} value={f.heure} onChange={e=>set("heure",e.target.value)}/></Field>
        <Field label="Type de soin *" half>
          <select style={iS} value={f.type_soin} onChange={e=>set("type_soin",e.target.value)}>
            <option value="">— Sélectionner —</option>
            {SOINS_TYPES.map(s=><option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Réaction" half>
          <select style={iS} value={f.reaction} onChange={e=>set("reaction",e.target.value)}>
            <option value="">— Sélectionner —</option>
            {["Aucune","Légère douleur","Anxiété","Malaise","Refus partiel"].map(r=><option key={r}>{r}</option>)}
          </select>
        </Field>
        <div style={{gridColumn:"span 2",marginBottom:14}}><label style={lS}>Description</label><textarea style={{...iS,height:68,resize:"vertical"}} value={f.description} onChange={e=>set("description",e.target.value)} placeholder="Décrivez le soin réalisé…"/></div>
        <div style={{gridColumn:"span 2",marginBottom:14}}><label style={lS}>Produits / matériel</label><input style={iS} value={f.produits} onChange={e=>set("produits",e.target.value)} placeholder="Compresses, désinfectant…"/></div>
        <Field label="Douleur" half>
          <select style={iS} value={f.douleur} onChange={e=>set("douleur",e.target.value)}>
            <option value="">—</option>
            {["Aucune (0)","Légère (1-3)","Modérée (4-6)","Sévère (7-9)","Insupportable (10)"].map(d=><option key={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Prochain soin" half><input type="date" style={iS} value={f.prochaine} onChange={e=>set("prochaine",e.target.value)}/></Field>
        <div style={{gridColumn:"span 2",marginBottom:14}}><label style={lS}>Observations</label><textarea style={{...iS,height:58,resize:"vertical"}} value={f.observations} onChange={e=>set("observations",e.target.value)} placeholder="État général, recommandations…"/></div>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button style={btnS} onClick={()=>{setShowForm(false);setEditSoin(null);setF(EMPTY_SOIN);}}>Annuler</button>
        <button style={{...btnP,opacity:f.date&&f.type_soin?1:0.45}} onClick={saveSoin}>{editSoin?"Enregistrer":"Enregistrer le soin"}</button>
      </div>
    </Modal>
  );

  return (
    <div>
      {(showForm||editSoin)&&<SoinFormModal/>}
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:20}}>
        <button onClick={()=>setSelPatient(null)} style={btnS}>← Retour</button>
        <div style={{color:C.text,fontSize:18,fontFamily:"Georgia,serif"}}>{selPatient.prenom} {selPatient.nom}</div>
        <Badge statut={selPatient.statut}/>
        <div style={{flex:1}}/>
        <button style={btnP} onClick={()=>{setEditSoin(null);setF(EMPTY_SOIN);setShowForm(true);}}>+ Enregistrer un soin</button>
      </div>
      {(selPatient.soinsAppliques||[]).length===0?(
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"40px 20px",textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:12}}>📋</div>
          <div style={{color:C.text,fontSize:14,fontWeight:600}}>Aucun soin enregistré</div>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {[...(selPatient.soinsAppliques||[])].sort((a,b)=>b.date.localeCompare(a.date)).map((s,i)=>(
            <div key={s.id||i} style={{background:C.card,border:"1px solid #0ea5e930",borderRadius:14,padding:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:8}}>
                    <span style={{background:"#0ea5e920",color:"#0ea5e9",border:"1px solid #0ea5e940",borderRadius:8,padding:"3px 10px",fontSize:12,fontWeight:700}}>{s.type_soin}</span>
                    <span style={{color:C.muted,fontSize:12}}>{s.date}{s.heure?` à ${s.heure}`:""}</span>
                    {s.prochaine&&<span style={{color:C.warn,fontSize:11}}>→ Prochain : {s.prochaine}</span>}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 24px"}}>
                    {s.description&&<div style={{gridColumn:"span 2"}}><div style={{color:C.muted,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Description</div><div style={{color:C.text,fontSize:13,marginTop:2}}>{s.description}</div></div>}
                    {s.produits&&<div><div style={{color:C.muted,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Produits</div><div style={{color:C.text,fontSize:12,marginTop:2}}>{s.produits}</div></div>}
                    {s.douleur&&<div><div style={{color:C.muted,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Douleur</div><div style={{color:C.text,fontSize:12,marginTop:2}}>{s.douleur}</div></div>}
                    {s.reaction&&<div><div style={{color:C.muted,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Réaction</div><div style={{color:s.reaction==="Aucune"?C.success:C.warn,fontSize:12,marginTop:2}}>{s.reaction}</div></div>}
                    {s.observations&&<div style={{gridColumn:"span 2"}}><div style={{color:C.muted,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Observations</div><div style={{color:C.text,fontSize:12,marginTop:2,fontStyle:"italic"}}>{s.observations}</div></div>}
                  </div>
                </div>
                <div style={{display:"flex",gap:7,marginLeft:16,flexShrink:0}}>
                  <button onClick={()=>{setEditSoin(s);setF({...s});setShowForm(true);}} style={{...btnS,padding:"5px 10px",fontSize:11,color:C.accent,borderColor:C.accentBorder}}>✏</button>
                  <button onClick={()=>deleteSoin(s.id)} style={{...btnW,padding:"5px 10px",fontSize:11}}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DOSSIER MÉDICAL
───────────────────────────────────────────────────────────── */
function DossierMedical({patients, refreshPatient}) {
  const [sel,setSel]   = useState(null);
  const [showV,setShowV] = useState(false);
  const [fv,setFv]     = useState({date:today(),heure:"",ta:"",temp:"",glycemie:"",spo2:"",poids:"",commentaire:""});

  const saveVital = async () => {
    if (!fv.date) return;
    await supabase.from("vitaux").insert({...fv,patient_id:sel.id});
    const updated = await refreshPatient(sel.id);
    setSel(updated);
    setShowV(false); setFv({date:today(),heure:"",ta:"",temp:"",glycemie:"",spo2:"",poids:"",commentaire:""});
  };

  if (!sel) return (
    <div>
      <div style={{color:C.muted,fontSize:13,marginBottom:12}}>Sélectionnez un patient :</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {patients.map(p=>(
          <div key={p.id} onClick={()=>setSel(p)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <span style={{color:C.text,fontWeight:600}}>{p.prenom} {p.nom}</span>
              <span style={{color:C.muted,fontSize:12,marginLeft:12}}>{p.diagnostic||"Aucun diagnostic"}</span>
            </div>
            <Badge statut={p.statut}/>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      {showV&&(
        <Modal title="Ajouter des signes vitaux" onClose={()=>setShowV(false)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 18px"}}>
            <Field label="Date *" half><input type="date" style={iS} value={fv.date} onChange={e=>setFv(p=>({...p,date:e.target.value}))}/></Field>
            <Field label="Heure" half><input type="time" style={iS} value={fv.heure} onChange={e=>setFv(p=>({...p,heure:e.target.value}))}/></Field>
            <Field label="T.A." half><input style={iS} value={fv.ta} onChange={e=>setFv(p=>({...p,ta:e.target.value}))} placeholder="120/80"/></Field>
            <Field label="Température (°C)" half><input type="number" step="0.1" style={iS} value={fv.temp} onChange={e=>setFv(p=>({...p,temp:e.target.value}))} placeholder="36.7"/></Field>
            <Field label="Glycémie (g/L)" half><input type="number" step="0.1" style={iS} value={fv.glycemie} onChange={e=>setFv(p=>({...p,glycemie:e.target.value}))} placeholder="1.0"/></Field>
            <Field label="SpO2 (%)" half><input type="number" style={iS} value={fv.spo2} onChange={e=>setFv(p=>({...p,spo2:e.target.value}))} placeholder="98"/></Field>
            <Field label="Poids (kg)" half><input type="number" step="0.1" style={iS} value={fv.poids} onChange={e=>setFv(p=>({...p,poids:e.target.value}))} placeholder="70"/></Field>
          </div>
          <div style={{marginBottom:14}}><label style={lS}>Commentaire</label><textarea style={{...iS,height:64,resize:"vertical"}} value={fv.commentaire} onChange={e=>setFv(p=>({...p,commentaire:e.target.value}))} placeholder="Observations…"/></div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button style={btnS} onClick={()=>setShowV(false)}>Annuler</button>
            <button style={{...btnP,opacity:fv.date?1:0.45}} onClick={saveVital}>Enregistrer</button>
          </div>
        </Modal>
      )}
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:20}}>
        <button onClick={()=>setSel(null)} style={btnS}>← Retour</button>
        <div style={{color:C.text,fontSize:18,fontFamily:"Georgia,serif"}}>{sel.prenom} {sel.nom}</div>
        <Badge statut={sel.statut}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        {[["Diagnostic",sel.diagnostic],["Traitement",sel.traitement],["Allergies",sel.allergies],["Antécédents",sel.antecedents]].map(([k,v])=>(
          <div key={k} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
            <div style={{color:C.accent,fontSize:10,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6}}>{k}</div>
            <div style={{color:C.text,fontSize:13}}>{v||"—"}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{color:C.text,fontWeight:700,fontSize:14}}>Signes vitaux</div>
        <button style={{...btnP,fontSize:11,padding:"7px 14px"}} onClick={()=>setShowV(true)}>+ Ajouter</button>
      </div>
      {sel.vitaux?.length===0?<div style={{color:C.muted,fontSize:13}}>Aucun signe vital.</div>:(
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{background:C.cardAlt}}>
              {["Date","Heure","T.A.","Temp.","Glycémie","SpO2","Poids","Commentaire"].map(h=>(
                <th key={h} style={{color:C.muted,padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:600,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(sel.vitaux||[]).map((v,i)=>(
                <tr key={i} style={{borderTop:`1px solid ${C.border}`}}>
                  <td style={{padding:"10px 14px",color:C.text,whiteSpace:"nowrap"}}>{v.date}</td>
                  <td style={{padding:"10px 14px",color:C.accent}}>{v.heure||"—"}</td>
                  <td style={{padding:"10px 14px",color:C.text}}>{v.ta||"—"}</td>
                  <td style={{padding:"10px 14px",color:C.text}}>{v.temp?`${v.temp}°C`:"—"}</td>
                  <td style={{padding:"10px 14px",color:C.text}}>{v.glycemie||"—"}</td>
                  <td style={{padding:"10px 14px",color:C.text}}>{v.spo2?`${v.spo2}%`:"—"}</td>
                  <td style={{padding:"10px 14px",color:C.text}}>{v.poids?`${v.poids} kg`:"—"}</td>
                  <td style={{padding:"10px 14px",color:C.muted,fontStyle:"italic",maxWidth:180}}>{v.commentaire||"—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PLANNING
───────────────────────────────────────────────────────────── */
function Planning({patients}) {
  const all = patients.flatMap(p=>p.visites.map(v=>({...v,patient:`${p.prenom} ${p.nom}`}))).sort((a,b)=>a.date.localeCompare(b.date));
  return (
    <div>
      <div style={{color:C.text,fontWeight:700,marginBottom:16,fontSize:16,fontFamily:"Georgia,serif"}}>Planning des visites</div>
      {all.length===0?<div style={{color:C.muted,fontSize:13}}>Aucune visite planifiée.</div>:(
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{background:C.cardAlt}}>
              {["Patient","Date","Heure","Soin","Coût","Statut"].map(h=>(
                <th key={h} style={{color:C.muted,padding:"11px 14px",textAlign:"left",fontSize:11,fontWeight:600,textTransform:"uppercase"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {all.map((v,i)=>(
                <tr key={i} style={{borderTop:`1px solid ${C.border}`,background:i%2===0?"transparent":"#ffffff04"}}>
                  <td style={{padding:"11px 14px",color:C.text,fontWeight:600}}>{v.patient}</td>
                  <td style={{padding:"11px 14px",color:C.text}}>{v.date}</td>
                  <td style={{padding:"11px 14px",color:C.accent}}>{v.heure||"—"}</td>
                  <td style={{padding:"11px 14px",color:C.text}}>{v.soin}</td>
                  <td style={{padding:"11px 14px",color:C.text}}>{fmt(v.cout)}</td>
                  <td style={{padding:"11px 14px"}}><Badge statut={v.statut_visite||v.statutVisite}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   FACTURATION
───────────────────────────────────────────────────────────── */
function Facturation({patients, tarifs, setTarifs, factures, setFactures, currentUser}) {
  const [subTab,setSubTab]     = useState("factures");
  const [showNewInv,setShowNewInv] = useState(false);
  const [showTarif,setShowTarif]  = useState(false);
  const [editTarif,setEditTarif]  = useState(null);
  const [viewFact,setViewFact]    = useState(null);

  const allVisiteRows = patients.flatMap(p=>p.visites.map(v=>({patient:`${p.prenom} ${p.nom}`,...v,solde:v.cout-v.paye})));
  const tc=allVisiteRows.reduce((s,r)=>s+r.cout,0), tp=allVisiteRows.reduce((s,r)=>s+r.paye,0);
  const factTotal=factures.reduce((s,f)=>s+(f.total_ttc||0),0);
  const getP = (id)=>patients.find(p=>p.id===parseInt(id));

  const saveTarif = async (t) => {
    if (editTarif) {
      await supabase.from("tarifs").update(t).eq("id",editTarif.id);
      setTarifs(prev=>prev.map(x=>x.id===editTarif.id?{...t,id:editTarif.id}:x));
    } else {
      const {data}=await supabase.from("tarifs").insert(t).select().single();
      if(data) setTarifs(prev=>[...prev,data]);
    }
    setEditTarif(null);
  };

  const deleteTarif = async (id) => {
    if(!window.confirm("Supprimer ce tarif ?")) return;
    await supabase.from("tarifs").update({actif:false}).eq("id",id);
    setTarifs(prev=>prev.filter(t=>t.id!==id));
  };

  const saveFacture = async (f) => {
    const {data:fac}=await supabase.from("factures").insert({
      patient_id:f.patientId, infirmier_id:currentUser.id,
      date:f.date, mode:f.mode, paye:f.paye, total_ttc:f.totalTTC, notes:f.notes
    }).select().single();
    if (!fac) return;
    const lignesData = f.lignes.map(l=>({...l,facture_id:fac.id}));
    await supabase.from("facture_lignes").insert(lignesData);
    setFactures(prev=>[{...fac,lignes:f.lignes},...prev]);
  };

  const SubBtn = ({id,label}) => (
    <button onClick={()=>setSubTab(id)} style={{...(subTab===id?btnP:btnS),padding:"8px 20px",fontSize:12}}>{label}</button>
  );

  const viewF = factures.find(f=>f.id===viewFact);

  // TarifModal inline
  const TarifFormModal = () => {
    const [ft,setFt] = useState(editTarif?{...editTarif}:{nom:"",categorie:"Acte infirmier",prix:"",tva:"0",description:""});
    const st=(k,v)=>setFt(p=>({...p,[k]:v}));
    return (
      <Modal title={editTarif?"Modifier le tarif":"Nouveau tarif"} onClose={()=>{setShowTarif(false);setEditTarif(null);}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <div style={{gridColumn:"span 2",marginBottom:14}}><label style={lS}>Nom *</label><input style={iS} value={ft.nom} onChange={e=>st("nom",e.target.value)} placeholder="Ex: Injection IM"/></div>
          <div style={{marginBottom:14}}><label style={lS}>Catégorie</label><select style={iS} value={ft.categorie} onChange={e=>st("categorie",e.target.value)}>{["Acte infirmier","Consommable","Frais","Autre"].map(c=><option key={c}>{c}</option>)}</select></div>
          <div style={{marginBottom:14}}><label style={lS}>Prix HT (€) *</label><input type="number" step="0.01" style={iS} value={ft.prix} onChange={e=>st("prix",e.target.value)} placeholder="0.00"/></div>
          <div style={{marginBottom:14}}><label style={lS}>TVA (%)</label><select style={iS} value={ft.tva} onChange={e=>st("tva",e.target.value)}>{["0","5.5","10","20"].map(t=><option key={t}>{t}</option>)}</select></div>
          <div style={{gridColumn:"span 2",marginBottom:14}}><label style={lS}>Description</label><input style={iS} value={ft.description||""} onChange={e=>st("description",e.target.value)} placeholder="Description courte…"/></div>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button style={btnS} onClick={()=>{setShowTarif(false);setEditTarif(null);}}>Annuler</button>
          <button style={{...btnP,opacity:ft.nom&&ft.prix?1:0.45}} onClick={()=>{if(ft.nom&&ft.prix){saveTarif({...ft,prix:parseFloat(ft.prix)||0,tva:parseFloat(ft.tva)||0});setShowTarif(false);}}}>Enregistrer</button>
        </div>
      </Modal>
    );
  };

  // New invoice inline
  const NewInvModal = () => {
    const [pId,setPId]     = useState("");
    const [date,setDate]   = useState(today());
    const [mode,setMode]   = useState("Espèces");
    const [paye,setPaye]   = useState("");
    const [notes,setNotes] = useState("");
    const [lignes,setLignes] = useState([{tarifId:"",nom:"",qte:1,prix:0,tva:0,total:0,description:""}]);
    const setL=(i,k,v)=>setLignes(prev=>{const a=[...prev];a[i]={...a[i],[k]:v};return a;});
    const applyT=(i,tid)=>{const t=tarifs.find(t=>String(t.id)===String(tid));if(t)setLignes(prev=>{const a=[...prev];a[i]={...a[i],tarifId:tid,nom:t.nom,prix:t.prix,tva:t.tva,total:t.prix*a[i].qte,description:t.description||""};return a;});else setL(i,"tarifId",tid);};
    const applyQ=(i,q)=>setLignes(prev=>{const a=[...prev];const n=parseFloat(q)||1;a[i]={...a[i],qte:n,total:a[i].prix*n};return a;});
    const totTTC=lignes.reduce((s,l)=>s+(l.total*(1+l.tva/100)),0);
    const ok=pId&&date&&lignes.some(l=>l.nom);
    return (
      <Modal title="Créer une facture" onClose={()=>setShowNewInv(false)} wide>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <div style={{marginBottom:14}}><label style={lS}>Patient *</label><select style={iS} value={pId} onChange={e=>setPId(e.target.value)}><option value="">— Choisir —</option>{patients.map(p=><option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}</select></div>
          <div style={{marginBottom:14}}><label style={lS}>Date *</label><input type="date" style={iS} value={date} onChange={e=>setDate(e.target.value)}/></div>
          <div style={{marginBottom:14}}><label style={lS}>Mode de paiement</label><select style={iS} value={mode} onChange={e=>setMode(e.target.value)}>{MODES.map(m=><option key={m}>{m}</option>)}</select></div>
          <div style={{marginBottom:14}}><label style={lS}>Montant payé (€)</label><input type="number" step="0.01" style={iS} value={paye} onChange={e=>setPaye(e.target.value)} placeholder="0.00"/></div>
        </div>
        <div style={{marginBottom:10}}>
          <div style={{color:C.text,fontSize:13,fontWeight:700,marginBottom:10}}>Lignes de facturation</div>
          {lignes.map((l,i)=>(
            <div key={i} style={{background:C.cardAlt,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",marginBottom:8}}>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr auto",gap:"0 10px",alignItems:"end"}}>
                <div><label style={lS}>Depuis le catalogue</label><select style={iS} value={l.tarifId} onChange={e=>applyT(i,e.target.value)}><option value="">— Sélectionner —</option>{tarifs.map(t=><option key={t.id} value={t.id}>{t.nom} ({fmt(t.prix)})</option>)}</select></div>
                <div><label style={lS}>Désignation</label><input style={iS} value={l.nom} onChange={e=>setL(i,"nom",e.target.value)} placeholder="Nom libre"/></div>
                <div><label style={lS}>Qté</label><input type="number" min="1" style={iS} value={l.qte} onChange={e=>applyQ(i,e.target.value)}/></div>
                <button onClick={()=>setLignes(prev=>prev.filter((_,j)=>j!==i))} style={{...btnW,padding:"8px 10px",fontSize:12,alignSelf:"flex-end"}}>✕</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0 10px",marginTop:8}}>
                <div><label style={lS}>Prix HT (€)</label><input type="number" step="0.01" style={iS} value={l.prix} onChange={e=>{const p=parseFloat(e.target.value)||0;setLignes(prev=>{const a=[...prev];a[i]={...a[i],prix:p,total:p*a[i].qte};return a;})}}/></div>
                <div><label style={lS}>TVA (%)</label><select style={iS} value={l.tva} onChange={e=>setL(i,"tva",parseFloat(e.target.value)||0)}>{[0,5.5,10,20].map(t=><option key={t}>{t}</option>)}</select></div>
                <div><label style={lS}>Total HT</label><div style={{...iS,color:C.accent,fontWeight:700}}>{fmt(l.total)}</div></div>
              </div>
            </div>
          ))}
          <button onClick={()=>setLignes(prev=>[...prev,{tarifId:"",nom:"",qte:1,prix:0,tva:0,total:0,description:""}])} style={{...btnS,fontSize:12,padding:"7px 16px"}}>+ Ajouter une ligne</button>
        </div>
        <div style={{background:"#00c2a810",border:`1px solid ${C.accentBorder}`,borderRadius:10,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <span style={{color:C.muted,fontSize:13}}>Total TTC estimé</span>
          <span style={{color:C.accent,fontSize:18,fontWeight:800}}>{fmt(totTTC)}</span>
        </div>
        <div style={{marginBottom:14}}><label style={lS}>Notes</label><input style={iS} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Informations complémentaires…"/></div>
        {!ok&&<div style={{color:C.warn,fontSize:12,marginBottom:8}}>* Patient, date et au moins une ligne obligatoires</div>}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button style={btnS} onClick={()=>setShowNewInv(false)}>Annuler</button>
          <button style={{...btnP,opacity:ok?1:0.45}} onClick={()=>{if(ok){saveFacture({patientId:pId,date,mode,paye:parseFloat(paye)||0,notes,lignes:lignes.filter(l=>l.nom),totalTTC:totTTC});setShowNewInv(false);}}}>Créer la facture</button>
        </div>
      </Modal>
    );
  };

  // Invoice preview modal
  const InvPreview = () => {
    const fac=viewF; if(!fac) return null;
    const p=getP(fac.patient_id);
    const num=`FAC-${String(fac.id).slice(-6).padStart(4,"0")}`;
    const prixHT=fac.lignes.reduce((s,l)=>s+l.total,0);
    const prixTTC=fac.lignes.reduce((s,l)=>s+(l.total*(1+(l.tva||0)/100)),0);
    return (
      <div style={{position:"fixed",inset:0,background:"#000d",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
        <div style={{background:"#fff",borderRadius:16,width:640,maxWidth:"96vw",maxHeight:"94vh",overflowY:"auto",color:"#1a1a2e",fontFamily:"'DM Sans',sans-serif"}}>
          <div style={{background:C.bg,borderRadius:"16px 16px 0 0",padding:"12px 20px",display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button onClick={()=>window.print()} style={{...btnS,fontSize:12,padding:"6px 14px"}}>🖨 Imprimer</button>
            <button onClick={()=>setViewFact(null)} style={{...btnS,fontSize:12,padding:"6px 12px"}}>✕</button>
          </div>
          <div style={{padding:"32px 40px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:32}}>
              <div>
                <div style={{fontSize:26,fontFamily:"Georgia,serif",color:"#00c2a8",fontWeight:700}}>🩺 e-Soins</div>
                <div style={{fontSize:12,color:"#666",marginTop:4}}>Soins infirmiers à domicile</div>
                <div style={{fontSize:12,color:"#666"}}>{currentUser?.prenom} {currentUser?.nom}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{background:"#0f1923",color:"#00c2a8",borderRadius:8,padding:"8px 16px",fontSize:14,fontWeight:700}}>FACTURE</div>
                <div style={{fontSize:13,fontWeight:700,marginTop:8}}>{num}</div>
                <div style={{fontSize:12,color:"#666"}}>Date : {fac.date}</div>
              </div>
            </div>
            <div style={{background:"#f8fafc",borderRadius:10,padding:"14px 18px",marginBottom:24}}>
              <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",color:"#999",letterSpacing:0.5,marginBottom:6}}>Facturé à</div>
              <div style={{fontSize:14,fontWeight:700}}>{p?.prenom} {p?.nom}</div>
              <div style={{fontSize:12,color:"#666",marginTop:2}}>{p?.adresse||"—"}</div>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,marginBottom:20}}>
              <thead><tr style={{background:"#0f1923",color:"#e2eaf4"}}>
                {["Description","Qté","Prix HT","TVA","Total TTC"].map(h=>(
                  <th key={h} style={{padding:"10px 12px",textAlign:h==="Description"?"left":"right",fontSize:11,fontWeight:600}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {fac.lignes.map((l,i)=>(
                  <tr key={i} style={{borderBottom:"1px solid #e5e7eb",background:i%2===0?"#fff":"#f8fafc"}}>
                    <td style={{padding:"10px 12px"}}><div style={{fontWeight:600,color:"#1a1a2e"}}>{l.nom}</div>{l.description&&<div style={{fontSize:11,color:"#999"}}>{l.description}</div>}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",color:"#444"}}>{l.qte}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",color:"#444"}}>{fmt(l.prix)}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",color:"#888"}}>{l.tva||0}%</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:"#1a1a2e"}}>{fmt(l.total*(1+(l.tva||0)/100))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:20}}>
              <div style={{minWidth:220}}>
                <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:13,color:"#555"}}><span>Sous-total HT</span><span>{fmt(prixHT)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:13,color:"#555"}}><span>TVA</span><span>{fmt(prixTTC-prixHT)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",marginTop:6,background:"#0f1923",borderRadius:8,fontSize:15,fontWeight:700,color:"#e2eaf4"}}>
                  <span>TOTAL TTC</span><span style={{color:"#00c2a8"}}>{fmt(prixTTC)}</span>
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:20,fontSize:12,color:"#666",borderTop:"1px solid #e5e7eb",paddingTop:16}}>
              <div><strong>Mode : </strong>{fac.mode||"—"}</div>
              <div><strong>Payé : </strong><span style={{color:"#22c55e",fontWeight:700}}>{fmt(fac.paye)}</span></div>
              <div><strong>Solde : </strong><span style={{color:prixTTC-fac.paye>0?"#f59e0b":"#22c55e",fontWeight:700}}>{fmt(prixTTC-fac.paye)}</span></div>
            </div>
            <div style={{marginTop:20,fontSize:11,color:"#bbb",textAlign:"center"}}>Merci pour votre confiance — e-Soins</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {showNewInv&&<NewInvModal/>}
      {(showTarif||editTarif)&&<TarifFormModal/>}
      {viewFact&&<InvPreview/>}
      <div style={{display:"flex",gap:14,marginBottom:22,flexWrap:"wrap"}}>
        <StatCard label="Visites facturées" value={fmt(tc)}/>
        <StatCard label="Encaissé" value={fmt(tp)} accent="#22c55e"/>
        <StatCard label="Factures créées" value={factures.length} sub={`total ${fmt(factTotal)}`} accent="#0ea5e9"/>
        <StatCard label="Solde restant" value={fmt(tc-tp)} accent="#f59e0b"/>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        <button onClick={()=>setSubTab("factures")} style={{...(subTab==="factures"?btnP:btnS),padding:"8px 20px",fontSize:12}}>📄 Factures</button>
        <button onClick={()=>setSubTab("tarifs")}   style={{...(subTab==="tarifs"?btnP:btnS),padding:"8px 20px",fontSize:12}}>💰 Catalogue tarifs</button>
      </div>

      {subTab==="factures"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{color:C.text,fontWeight:700,fontSize:15}}>Factures émises</div>
            <button style={btnP} onClick={()=>setShowNewInv(true)}>+ Nouvelle facture</button>
          </div>
          {factures.length===0?(
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"40px 20px",textAlign:"center"}}>
              <div style={{fontSize:32,marginBottom:10}}>📄</div>
              <div style={{color:C.text,fontSize:14,fontWeight:600}}>Aucune facture</div>
              <div style={{color:C.muted,fontSize:12,marginTop:4}}>Cliquez sur "+ Nouvelle facture" pour en créer une.</div>
            </div>
          ):(
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{background:C.cardAlt}}>
                  {["N°","Patient","Date","Total TTC","Payé","Solde",""].map(h=>(
                    <th key={h} style={{color:C.muted,padding:"11px 14px",textAlign:"left",fontSize:11,fontWeight:600,textTransform:"uppercase"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {factures.map((f,i)=>{
                    const p=getP(f.patient_id);
                    const s=(f.total_ttc||0)-f.paye;
                    return (
                      <tr key={i} style={{borderTop:`1px solid ${C.border}`}}>
                        <td style={{padding:"11px 14px",color:C.accent,fontWeight:700,fontSize:11}}>FAC-{String(f.id).slice(-4).padStart(4,"0")}</td>
                        <td style={{padding:"11px 14px",color:C.text,fontWeight:600}}>{p?.prenom} {p?.nom}</td>
                        <td style={{padding:"11px 14px",color:C.muted}}>{f.date}</td>
                        <td style={{padding:"11px 14px",color:C.text,fontWeight:700}}>{fmt(f.total_ttc)}</td>
                        <td style={{padding:"11px 14px",color:"#22c55e"}}>{fmt(f.paye)}</td>
                        <td style={{padding:"11px 14px",color:s>0?"#f59e0b":"#22c55e",fontWeight:700}}>{fmt(s)}</td>
                        <td style={{padding:"11px 14px"}}><button onClick={()=>setViewFact(f.id)} style={{...btnS,padding:"5px 12px",fontSize:11,color:C.accent,borderColor:C.accentBorder}}>🖨 Voir</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {subTab==="tarifs"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{color:C.text,fontWeight:700,fontSize:15}}>Catalogue tarifs et produits</div>
            <button style={btnP} onClick={()=>{setEditTarif(null);setShowTarif(true);}}>+ Nouveau tarif</button>
          </div>
          {["Acte infirmier","Consommable","Frais","Autre"].map(cat=>{
            const items=tarifs.filter(t=>t.categorie===cat);
            if(!items.length) return null;
            return (
              <div key={cat} style={{marginBottom:22}}>
                <div style={{color:C.accent,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>{cat}</div>
                <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr style={{background:C.cardAlt}}>
                      {["Nom","Description","Prix HT","TVA","Prix TTC",""].map(h=>(
                        <th key={h} style={{color:C.muted,padding:"9px 14px",textAlign:"left",fontSize:11,fontWeight:600,textTransform:"uppercase"}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {items.map((t,i)=>(
                        <tr key={i} style={{borderTop:`1px solid ${C.border}`}}>
                          <td style={{padding:"10px 14px",color:C.text,fontWeight:600}}>{t.nom}</td>
                          <td style={{padding:"10px 14px",color:C.muted,fontSize:12}}>{t.description||"—"}</td>
                          <td style={{padding:"10px 14px",color:C.text}}>{fmt(t.prix)}</td>
                          <td style={{padding:"10px 14px",color:C.muted}}>{t.tva}%</td>
                          <td style={{padding:"10px 14px",color:C.accent,fontWeight:700}}>{fmt(t.prix*(1+t.tva/100))}</td>
                          <td style={{padding:"10px 14px"}}>
                            <div style={{display:"flex",gap:6}}>
                              <button onClick={()=>{setEditTarif(t);setShowTarif(true);}} style={{...btnS,padding:"4px 10px",fontSize:11,color:C.accent,borderColor:C.accentBorder}}>✏</button>
                              <button onClick={()=>deleteTarif(t.id)} style={{...btnW,padding:"4px 10px",fontSize:11}}>🗑</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ROOT APP
───────────────────────────────────────────────────────────── */
export default function App() {
  const [screen,setScreen]         = useState("login");
  const [currentUser,setCurrentUser] = useState(null);

  const handleLogin  = (u) => { setCurrentUser(u); setScreen(u.role==="admin"?"admin":"app"); };
  const handleLogout = () => { setCurrentUser(null); setScreen("login"); };

  if (screen==="login")    return <LoginPage onLogin={handleLogin} onGoRegister={()=>setScreen("register")}/>;
  if (screen==="register") return <RegisterPage onGoLogin={()=>setScreen("login")}/>;
  if (screen==="admin")    return <AdminPanel currentUser={currentUser} onBack={()=>setScreen("app")}/>;
  return <MainApp currentUser={currentUser} onLogout={handleLogout} onAdminPanel={()=>setScreen("admin")}/>;
}
