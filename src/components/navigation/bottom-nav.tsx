"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreateIcon, HomeIcon, LibraryIcon, UserIcon } from "@/components/icons/app-icons";
import { cn } from "@/lib/utils";

const items = [
  {
    href: "/",
    label: "Home",
    icon: HomeIcon,
  },
  {
    href: "/criar",
    label: "Criar",
    icon: CreateIcon,
  },
  {
    href: "/biblioteca",
    label: "Biblioteca",
    icon: LibraryIcon,
  },
  {
    href: "/perfil",
    label: "Perfil",
    icon: UserIcon,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="native-bottom-nav sticky bottom-0 z-40 border-t border-[#E7DCC8] bg-[#FFFCF7]/95 px-2 pt-2 backdrop-blur">
      <ul className="mx-auto flex max-w-md items-center justify-between gap-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-semibold transition",
                  isActive
                    ? "bg-[#F8E8E1] text-[#C66A3D]"
                    : "text-[#8C867D] hover:bg-[#F5F1E8]",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
