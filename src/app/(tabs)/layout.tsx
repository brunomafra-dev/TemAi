import type { ReactNode } from "react";
import { BottomNav } from "@/components/navigation/bottom-nav";

export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <main className="flex-1 px-4 pb-6 pt-5">{children}</main>
      <BottomNav />
    </div>
  );
}
