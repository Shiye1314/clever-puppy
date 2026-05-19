"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/generate", label: "素材生成" },
  { href: "/style", label: "风格DNA" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 border-b border-border bg-paper/95 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between px-6">
        <Link href="/" className="font-serif text-lg font-medium text-ink tracking-wide">
          Clever-Puppy
        </Link>

        <nav className="flex items-center gap-8">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm transition-colors duration-200 ${
                  isActive
                    ? "text-amber font-medium"
                    : "text-muted hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/settings"
          className={`text-sm transition-colors duration-200 ${
            pathname === "/settings" ? "text-amber" : "text-muted hover:text-ink"
          }`}
        >
          设置
        </Link>
      </div>
    </header>
  );
}
