"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const client = getSupabaseBrowserClient();

    async function finalize() {
      if (!client) {
        router.replace("/auth");
        return;
      }

      await client.auth.getSession();
      if (isMounted) {
        router.replace("/");
      }
    }

    void finalize();
    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <main className="native-page mx-auto w-full max-w-md px-4">
      <p className="text-sm text-[#6A5E52]">Finalizando login...</p>
    </main>
  );
}
