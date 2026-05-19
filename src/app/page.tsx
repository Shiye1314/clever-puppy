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
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center px-8">
      <div className="max-w-3xl w-full">
        <h1 className="font-serif text-4xl text-ink text-center mb-4 text-balance">
          Clever-Puppy
        </h1>
        <p className="text-muted text-center mb-16 text-sm">
          你的小红书写作外脑
        </p>
        <div className="grid grid-cols-3 gap-4">
          {modules.map((m) => (
            <ModuleCard key={m.href} {...m} />
          ))}
        </div>
      </div>
    </div>
  );
}
