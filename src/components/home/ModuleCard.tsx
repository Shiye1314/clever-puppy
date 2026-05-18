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
      className={`paper-card p-8 transition-all duration-300 group ${
        disabled
          ? "opacity-40 cursor-not-allowed"
          : "cursor-pointer hover:border-amber hover:shadow-[0_2px_24px_rgba(200,146,43,0.06)]"
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <h2 className="font-serif text-xl text-ink mt-4 mb-1">{title}</h2>
      <p className="text-sm text-muted">{subtitle}</p>
    </div>
  );

  if (disabled) return Card;
  return <Link href={href}>{Card}</Link>;
}
