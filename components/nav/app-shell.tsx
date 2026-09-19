"use client";

import { usePathname } from "next/navigation";
import { AppNav } from "@/components/nav/app-nav";
import { ScrollTop } from "@/components/nav/scroll-top";

export function AppShell({children}:{children:React.ReactNode}){
 const pathname=usePathname();
 const isVitrine=pathname==="/";
 return <div className="g3-shell flex overflow-hidden">
   {!isVitrine&&<><AppNav/><button type="button" aria-label="Ouvrir le menu" onClick={()=>{window.dispatchEvent(new Event("gen3ia:open-nav"))}} className="g3-mobile-menu">☰</button></>}
   <main id="g3-scroll" className="g3-scroll min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
   <ScrollTop/>
 </div>;
}
