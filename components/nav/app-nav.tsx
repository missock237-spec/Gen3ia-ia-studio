"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { logout, useAuth } from "@/lib/firebase/auth-client";

const MAIN=[
 {href:"/dashboard",label:"Accueil",icon:"⌂"},
 {href:"/studio",label:"Agent",icon:"✦"},
 {href:"/live",label:"Live",icon:"◉"},
 {href:"/marketplace",label:"Marketplace",icon:"◇"},
];
const WORK=[
 {href:"/storage",label:"Fichiers",icon:"□"},
 {href:"/studio/schedules",label:"Tâches planifiées",icon:"◷"},
 {href:"/team",label:"Équipes",icon:"◎"},
];
const SYSTEM=[
 {href:"/developer",label:"Développeur",icon:"⌘"},
 {href:"/billing",label:"Crédits & facturation",icon:"₣"},
];

export function AppNav(){
 const pathname=usePathname(),router=useRouter();
 const {user}=useAuth();
 const [open,setOpen]=useState(false);\n useEffect(()=>{const handler=()=>setOpen(true);window.addEventListener("gen3ia:open-nav",handler);return()=>window.removeEventListener("gen3ia:open-nav",handler)},[]);
 if(pathname==="/") return null;
 const name=user?.displayName?.trim()||user?.email?.split("@")[0]||"Compte";
 const initial=name.charAt(0).toUpperCase();
 const active=(href:string)=>pathname===href||pathname.startsWith(href+"/");
 const NavGroup=({title,items}:{title:string;items:typeof MAIN})=><div className="space-y-1">
   <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[.16em] text-neutral-400">{title}</p>
   {items.map(item=><Link key={item.href} href={item.href} onClick={()=>setOpen(false)} className={`g3-side-link ${active(item.href)?"is-active":""}`}>
     <span className="g3-side-icon">{item.icon}</span><span>{item.label}</span>
   </Link>)}
 </div>;
 return <aside className={`g3-sidebar ${open?"is-open":""}`}>
   <div className="flex h-full flex-col">
    <div className="flex h-16 items-center border-b border-black/[.06] px-4">
      <Link href="/dashboard" className="flex items-center gap-2.5">
       <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-neutral-950 text-[11px] font-black text-white">G3</span>
       <span className="text-[15px] font-bold tracking-[-.02em]">Gen3ia</span>
      </Link>
      <button className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-neutral-400 hover:bg-neutral-100 lg:hidden" onClick={()=>setOpen(false)} aria-label="Fermer">×</button>
    </div>
    <div className="flex-1 space-y-6 overflow-y-auto px-2.5 py-4">
      <Link href="/studio" className="g3-new-task" onClick={()=>setOpen(false)}><span>+</span> Nouvelle tâche <kbd>⌘K</kbd></Link>
      <NavGroup title="Espace de travail" items={MAIN}/>
      <NavGroup title="Travail" items={WORK}/>
      <NavGroup title="Plateforme" items={SYSTEM}/>
    </div>
    <div className="border-t border-black/[.06] p-2.5">
      <button onClick={()=>setOpen(v=>!v)} className="flex w-full items-center gap-2.5 rounded-xl p-2 text-left hover:bg-white">
       <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-900 text-xs font-bold text-white">{initial}</span>
       <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{name}</span><span className="block truncate text-[10px] text-neutral-400">{user?.email||"Session Gen3ia"}</span></span>
       <span className="text-neutral-400">⋯</span>
      </button>
      {open&&<div className="mt-1 rounded-xl border border-black/[.07] bg-white p-1 shadow-xl">
       <Link href="/team" className="block rounded-lg px-3 py-2 text-xs hover:bg-neutral-50">Paramètres & équipe</Link>
       <button className="w-full rounded-lg px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50" onClick={async()=>{await logout();router.push("/login")}}>Se déconnecter</button>
      </div>}
    </div>
   </div>
 </aside>;
}
