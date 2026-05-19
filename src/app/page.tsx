import ModuleCard from "@/components/home/ModuleCard";

const modules = [
  {
    icon: "🪄",
    title: "素材生成",
    subtitle: "上传品牌资料，AI 提炼信息并生成爆文",
    href: "/generate",
  },
  {
    icon: "📝",
    title: "风格 DNA",
    subtitle: "管理你的写作风格档案",
    href: "/style",
  },
  {
    icon: "⚙️",
    title: "设置",
    subtitle: "管理 API 密钥与模型配置",
    href: "/settings",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-6">
      <div className="w-full max-w-4xl">
        {/* Hero */}
        <header className="mb-10 text-center">
          <h1 className="text-[60px] font-bold text-ink tracking-tight">
            Clever-Puppy
          </h1>
          <p className="mt-2 text-[14px] text-muted">
            你的小红书写作外脑
          </p>
        </header>

        {/* Module Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {modules.map((m) => (
            <ModuleCard key={m.href} {...m} />
          ))}
        </div>
      </div>
    </div>
  );
}
