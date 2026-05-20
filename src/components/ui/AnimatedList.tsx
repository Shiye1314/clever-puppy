"use client";

import { useRef, useEffect, type ReactNode } from "react";
import { motion, useInView } from "motion/react";

// 带动画入场的列表项包装器
export function AnimatedItem({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  index?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3, once: false });

  return (
    <motion.div
      ref={ref}
      initial={{ scale: 0.85, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.85, opacity: 0 }}
      transition={{ duration: 0.25, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// 滚动渐变遮罩（顶部 + 底部）
export function ScrollGradient({
  scrollRef,
  color = "#FAFBFC",
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  color?: string;
}) {
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const topOpacity = Math.min(scrollTop / 60, 1);
      const bottomDistance = scrollHeight - (scrollTop + clientHeight);
      const bottomOpacity = scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 60, 1);

      if (topRef.current) topRef.current.style.opacity = String(topOpacity);
      if (bottomRef.current) bottomRef.current.style.opacity = String(bottomOpacity);
    };

    handleScroll();
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [scrollRef]);

  return (
    <>
      <div
        ref={topRef}
        className="absolute top-0 left-0 right-0 h-[50px] pointer-events-none transition-opacity duration-300 z-10"
        style={{
          background: `linear-gradient(to bottom, ${color}, transparent)`,
          opacity: 0,
        }}
      />
      <div
        ref={bottomRef}
        className="absolute bottom-0 left-0 right-0 h-[80px] pointer-events-none transition-opacity duration-300 z-10"
        style={{
          background: `linear-gradient(to top, ${color}, transparent)`,
          opacity: 1,
        }}
      />
    </>
  );
}
