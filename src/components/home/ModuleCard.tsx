import Link from "next/link";

interface Props {
  icon: string;
  title: string;
  subtitle: string;
  href: string;
  disabled?: boolean;
}

export default function ModuleCard({ icon, title, subtitle, href, disabled }: Props) {
  const Card = (
    <div
      className={`rounded-[16px] border border-border bg-paper p-8 transition-all duration-200 ${
        disabled
          ? "opacity-40 cursor-not-allowed"
          : "cursor-pointer hover:border-amber hover:bg-amber/[0.02]"
      }`}
    >
      <span className="text-[60px] leading-none">{icon}</span>
      <h2 className="mt-5 text-[40px] font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-[32px] leading-relaxed text-muted">{subtitle}</p>
    </div>
  );

  if (disabled) return Card;
  return <Link href={href}>{Card}</Link>;
}
