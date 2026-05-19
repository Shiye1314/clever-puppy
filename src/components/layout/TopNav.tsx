"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "素材生成", href: "/generate" },
  { label: "风格DNA", href: "/style" },
  { label: "设置", href: "/settings" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 inset-x-0 h-[135px] z-50 bg-surface/90 backdrop-blur-sm border-b border-border">
      <div className="h-full flex items-center justify-between pl-[234px] pr-8">
        <Link href="/" className="font-serif font-bold text-[52px] text-ink tracking-tight leading-none" style={{ transform: "scaleY(1.125)", transformOrigin: "center" }}>
          Clever - Puppy
        </Link>

        <div className="flex items-center gap-1">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3.5 py-1.5 text-[32px] font-medium rounded-md transition-colors duration-150 ${
                  active
                    ? "text-amber"
                    : "text-muted/70 hover:text-ink"
                }`}
              >
                {link.label}
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-amber rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
