import React from 'react';

export const ORIGINAL_LOGO_SRC = '/assets/aistudio/58308189f4f51a82ecf9cadd15c397c1_5dfd1b78.jpg';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  subtitle?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  subtitle,
}) => {
  const sizeClass =
    size === 'sm'
      ? 'w-11 h-11'
      : size === 'lg'
        ? 'w-20 h-20'
        : size === 'xl'
          ? 'w-28 h-28'
          : 'w-14 h-14';

  return (
    <div className="inline-flex items-center gap-3 shrink-0">
      <div className={`${sizeClass} aspect-square shrink-0 rounded-full overflow-hidden bg-white border border-slate-200 shadow-xs`}>
        <img
          src={ORIGINAL_LOGO_SRC}
          alt="শিক্ষানীর (SHIKKHANIR) অফিসিয়াল লোগো"
          className="w-full h-full object-cover object-center translate-y-[0.35%] scale-[1.08] contrast-[1.18]"
          referrerPolicy="no-referrer"
        />
      </div>
      {showText && (
        <div className="leading-tight whitespace-nowrap shrink-0">
          <span className="block text-lg font-bold tracking-tight text-[#0F2942]">
            শিক্ষানীর
          </span>
          {subtitle ? (
            <span className="block text-[11px] font-medium text-slate-500">
              {subtitle}
            </span>
          ) : (
            <span className="block text-[10px] font-semibold tracking-widest text-[#C59B38]">
              SHIKKHANIR
            </span>
          )}
        </div>
      )}
    </div>
  );
};
