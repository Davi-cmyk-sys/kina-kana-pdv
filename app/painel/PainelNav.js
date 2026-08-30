"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PainelNav({ secoes }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto px-4 pb-3 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {secoes.map((secao) => {
        const ativo = pathname === secao.href;
        return (
          <Link
            key={secao.href}
            href={secao.href}
            className={
              "flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition " +
              (ativo
                ? "bg-white text-[#1f6f3e] shadow-sm"
                : "bg-white/15 text-white hover:bg-white/25")
            }
          >
            <span>{secao.icone}</span>
            {secao.label}
          </Link>
        );
      })}
    </nav>
  );
}
