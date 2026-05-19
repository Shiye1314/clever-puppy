"use client";

import React from "react";

type StarBorderProps<T extends React.ElementType> = React.ComponentPropsWithoutRef<T> & {
  as?: T;
  className?: string;
  children?: React.ReactNode;
  color?: string;
  speed?: React.CSSProperties["animationDuration"];
};

const StarBorder = <T extends React.ElementType = "button">({
  as,
  className = "",
  color = "#60a5fa",
  speed = "5s",
  children,
  ...rest
}: StarBorderProps<T>) => {
  const Component = as || "button";

  return (
    <Component
      className={`relative inline-block rounded-lg ${className}`}
      {...(rest as React.ComponentPropsWithoutRef<T>)}
    >
      {/* 顶部扫光 */}
      <div
        className="absolute w-[300%] h-[50%] opacity-70 top-[-11px] left-[-250%] rounded-full animate-star-movement-top z-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed,
        }}
      />
      {/* 底部扫光 */}
      <div
        className="absolute w-[300%] h-[50%] opacity-70 bottom-[-11px] right-[-250%] rounded-full animate-star-movement-bottom z-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed,
        }}
      />
      {/* 内容区 */}
      <span className="relative z-[1]">
        {children}
      </span>
    </Component>
  );
};

export default StarBorder;
