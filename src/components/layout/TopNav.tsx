"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import GradientText from "@/components/ui/GradientText";

const links = [
  { label: "素材生成", href: "/generate" },
  { label: "品牌洗稿", href: "/rewrite" },
  { label: "风格DNA", href: "/style" },
  { label: "设置", href: "/settings" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 inset-x-0 h-[64px] z-50 bg-surface/90 backdrop-blur-sm border-b border-border">
      <div className="h-full flex items-center justify-between pl-[55px] pr-[55px]">
        <Link href="/" className="-ml-0.5 overflow-visible" style={{ transform: "scaleY(0.92)", transformOrigin: "center", lineHeight: 1.3 }}>
          <GradientText
            colors={["#1700a6", "#2563eb", "#007cc2", "#4816ff"]}
            animationSpeed={2}
            className="font-['Outfit'] font-extrabold text-[28px] tracking-tight"
          >
            Clever-Puppy
          </GradientText>
        </Link>

        <div className="flex items-center gap-1">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-2 py-1 text-[16px] font-medium rounded-md transition-colors duration-150 ${
                  active
                    ? "text-amber"
                    : "text-muted/70 hover:text-ink"
                }`}
              >
                {link.label}
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2.5 h-0.5 bg-amber rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
