"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

export default function TabsLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const client = getSupabaseBrowserClient();

    async function checkSession() {
      if (!client) {
        if (isMounted) setIsReady(true);
        return;
      }

      const { data } = await client.auth.getSession();
      if (!data.session) {
        router.replace("/auth");
        return;
      }

      if (isMounted) setIsReady(true);
    }

    void checkSession();
    return () => {
      isMounted = false;
    };
  }, [router]);

  if (!isReady) {
    return (
      <div className="native-app-shell mx-auto flex w-full max-w-md flex-col px-4 pt-5">
        <p className="text-sm text-[#6A5E52]">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="native-app-shell mx-auto flex w-full max-w-md flex-col">
      <main className="native-tab-main flex-1 px-4 pt-5">{children}</main>
      <BottomNav />
    </div>
  );
}
