import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAFBFC",
        ink: "#171717",
        amber: "#2563EB",
        "amber-light": "#60A5FA",
        muted: "#737373",
        border: "#E5E5E5",
      },
      fontFamily: {
        serif: ["Noto Serif SC", "Georgia", "serif"],
        sans: ["PingFang SC", "Microsoft YaHei", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "Inter", "monospace"],
      },
      lineHeight: {
        relaxed: "1.8",
      },
      animation: {
        "flow-line": "flowLine 1.5s ease-in-out infinite",
        "breathe": "breathe 2s ease-in-out infinite",
      },
      keyframes: {
        flowLine: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        breathe: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(37, 99, 235, 0)" },
          "50%": { boxShadow: "0 0 0 4px rgba(37, 99, 235, 0.12)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
