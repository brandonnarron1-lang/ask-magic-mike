import type { Metadata } from "next";
import { BlackDiamondHeader } from "../../components/black-diamond/BlackDiamondHeader";
import { Footer } from "../../components/black-diamond/BlackDiamondShell";
import { AccountWorkspace } from "../../components/consumer/AccountWorkspace";
import { consumerRuntimeReady } from "../../../src/lib/consumer/runtime";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Your private comparison | Ask Magic Mike",robots:{index:false,follow:false},referrer:"no-referrer"};
export default function ConsumerAccountPage(){return <main className="min-h-screen bg-[#050505] text-[#f4ead4]"><section className="px-5 py-6 sm:px-8 lg:px-10"><div className="mx-auto max-w-7xl"><BlackDiamondHeader/></div></section><section id="page-content" tabIndex={-1} className="mx-auto min-w-0 max-w-7xl space-y-8 px-5 py-8 [overflow-wrap:anywhere] sm:px-8 lg:px-10"><header><p className="amm-eyebrow">Your comparison</p><h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">Save your next move, privately.</h1></header><AccountWorkspace enabled={consumerRuntimeReady()}/></section><Footer/></main>;}
