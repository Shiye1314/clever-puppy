import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF8F5",
        ink: "#2C2416",
        amber: "#C8922B",
        "amber-light": "#E8C560",
        muted: "#8C8579",
        border: "#E5E0D8",
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
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(200, 146, 43, 0)" },
          "50%": { boxShadow: "0 0 0 4px rgba(200, 146, 43, 0.12)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
