'use client';

import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'cyan' | 'violet' | 'emerald' | 'amber';
  withHudCorners?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  onClick,
  style = {}
}) => {
  return (
    <div
      onClick={onClick}
      style={style}
      data-spotlight
      className={`
        relative overflow-hidden transition-all duration-300 ease-out
        bg-[#0B1220]/65 backdrop-blur-2xl border border-white/10 border-t-white/25
        rounded-none hover:border-[#00BCF2]/60 hover:bg-[#071426]/85 shadow-2xl hover:shadow-[0_20px_48px_rgba(0,188,242,0.25)]
        hover:-translate-y-1
        ${className}
      `}
    >
      {/* Top Specular Glass Highlight Line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-80 transition-opacity pointer-events-none" />

      {/* Card Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
