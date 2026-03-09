"use client";

import React from "react";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";
import LiveTicker from "./LiveTicker";
import { ChatPanel } from "./Part3Components";
import { chatMessages } from "@/data/mockData";
import { MessageSquare } from "lucide-react";

const CHAT_STORAGE_KEY = "cashive-chat-open";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [chatOpen, setChatOpen] = React.useState(false);

  React.useEffect(() => {
    const saved = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved === "true") setChatOpen(true);
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem(CHAT_STORAGE_KEY, String(chatOpen));
  }, [chatOpen]);

  const sidebarWidth = sidebarCollapsed ? 76 : 240;
  const chatWidth = chatOpen ? 320 : 0;

  return (
    <div className="min-h-screen bg-bg-deepest honeycomb-bg relative">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      <TopNav onMenuToggle={() => setMobileMenuOpen((v) => !v)} sidebarWidth={sidebarWidth} />

      {/* Global LiveTicker — between TopNav and main content */}
      <div
        className="fixed top-16 z-20 transition-all duration-300"
        style={{
          left: "var(--ticker-left, 0px)",
          right: "var(--ticker-right, 0px)",
        }}
      >
        <style>{`
          @media (min-width: 1024px) {
            div[class*="fixed top-16"] { --ticker-left: ${sidebarWidth}px; }
          }
          @media (min-width: 1280px) {
            div[class*="fixed top-16"] { --ticker-right: ${chatWidth}px; }
          }
        `}</style>
        <LiveTicker />
      </div>

      <main
        className="min-h-screen pb-20 transition-all duration-300 lg:pb-8"
        style={{
          paddingTop: "calc(64px + 36px)", /* TopNav (64px) + LiveTicker (36px) */
          marginLeft: "var(--sidebar-offset, 0px)",
          marginRight: "var(--chat-offset, 0px)",
        }}
      >
        <style>{`
          @media (min-width: 1024px) {
            main { --sidebar-offset: ${sidebarWidth}px; }
          }
          @media (min-width: 1280px) {
            main { --chat-offset: ${chatWidth}px; }
          }
        `}</style>
        <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-6 lg:px-8">{children}</div>
      </main>

      {!chatOpen ? (
        <>
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="fixed bottom-24 right-4 z-[41] flex h-11 w-11 items-center justify-center rounded-full border border-accent-gold/30 bg-bg-surface text-accent-gold shadow-[0_8px_24px_rgba(245,166,35,0.18)] transition-all hover:scale-105 md:bottom-6 md:right-6 xl:hidden"
          >
            <MessageSquare className="w-5 h-5 animate-chat-pulse" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />
          </button>
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="fixed right-0 top-1/2 z-[41] hidden -translate-y-1/2 rounded-l-2xl border border-r-0 border-accent-gold/30 bg-accent-gold px-2 py-5 text-bg-deepest shadow-[0_8px_24px_rgba(245,166,35,0.28)] transition-transform hover:scale-[1.02] xl:flex xl:flex-col xl:items-center xl:gap-2"
          >
            <MessageSquare className="w-5 h-5 animate-chat-pulse" />
            <span className="text-xs font-bold [writing-mode:vertical-rl] rotate-180">Chat</span>
          </button>
        </>
      ) : null}

      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} messages={chatMessages} />
    </div>
  );
}
