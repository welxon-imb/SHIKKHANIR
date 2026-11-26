import React, { useEffect, useRef } from 'react';
import { ORIGINAL_LOGO_SRC } from './BrandLogo';

interface HeroSectionProps {
  onLogoTap: (e: React.MouseEvent) => void;
  heroBannerUrl?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onLogoTap, heroBannerUrl }) => {
  const heroRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const bgRef = useRef<HTMLDivElement | null>(null);
  const customBanner = heroBannerUrl?.trim();

  // Subtle vanilla JS responsive depth interaction (respects prefers-reduced-motion)
  useEffect(() => {
    if (customBanner) return;
    const heroEl = heroRef.current;
    if (!heroEl || typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let rafId = 0;
    const handlePointerMove = (evt: PointerEvent) => {
      if (evt.pointerType !== 'mouse' || window.innerWidth < 1024) return;
      const rect = heroEl.getBoundingClientRect();
      const nx = (evt.clientX - rect.left) / rect.width - 0.5;
      const ny = (evt.clientY - rect.top) / rect.height - 0.5;
      window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        if (stageRef.current) {
          stageRef.current.style.transform = `translate3d(${(nx * -6).toFixed(1)}px, ${(4 + ny * -4).toFixed(1)}px, 0)`;
        }
        if (bgRef.current) {
          bgRef.current.style.transform = `translate3d(${(nx * 5).toFixed(1)}px, ${(ny * 3).toFixed(1)}px, 0)`;
        }
      });
    };

    const handlePointerLeave = () => {
      window.cancelAnimationFrame(rafId);
      if (stageRef.current) {
        stageRef.current.style.transform = '';
      }
      if (bgRef.current) {
        bgRef.current.style.transform = '';
      }
    };

    heroEl.addEventListener('pointermove', handlePointerMove);
    heroEl.addEventListener('pointerleave', handlePointerLeave);
    return () => {
      window.cancelAnimationFrame(rafId);
      heroEl.removeEventListener('pointermove', handlePointerMove);
      heroEl.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [customBanner]);

  if (customBanner) {
    return (
      <section
        aria-label="শিক্ষানীর কোচিং সেন্টার — ব্যানার"
        className="shk-hero-custom-wrap"
      >
        <img
          src={customBanner}
          alt="শিক্ষানীর কোচিং সেন্টার হোমপেজ ব্যানার"
          className="shk-hero-custom-img"
          referrerPolicy="no-referrer"
        />
      </section>
    );
  }

  return (
    <section
      ref={heroRef}
      aria-label="শিক্ষানীর কোচিং সেন্টার — পরিচিতি"
      className="shk-hero"
    >
      {/* Sky Atmospheric Glows & Curves */}
      <div className="shk-hero-sky-glow" aria-hidden="true" />
      <div className="shk-hero-left-arc" aria-hidden="true" />

      {/* Left Edge Deep Navy & Royal Blue Decorative Sweep */}
      <svg
        className="shk-hero-left-edge"
        viewBox="0 0 180 640"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="shkLeftNavy" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#051838" />
            <stop offset="55%" stopColor="#0e45a8" />
            <stop offset="100%" stopColor="#1462e0" />
          </linearGradient>
        </defs>
        <path
          d="M0,0 L125,0 C35,145 12,355 92,640 L0,640 Z"
          fill="url(#shkLeftNavy)"
          opacity="0.95"
        />
        <path
          d="M125,0 C40,145 20,355 102,640 L84,640 C6,355 28,145 112,0 Z"
          fill="#6ec2ff"
          opacity="0.65"
        />
      </svg>

      {/* Subtle Halftone Textures */}
      <div className="shk-hero-dots-left" aria-hidden="true" />
      <div className="shk-hero-dots-bottom" aria-hidden="true" />

      {/* Flying Birds in Upper Sky */}
      <svg className="shk-hero-birds" viewBox="0 0 140 70" fill="none" aria-hidden="true">
        <path d="M12 24 C20 14, 28 16, 33 25 C37 16, 45 13, 55 20 C44 19, 37 23, 33 30 C28 23, 21 20, 12 24 Z" fill="#0e2a54" opacity="0.82" />
        <path d="M58 14 C65 6, 72 8, 76 15 C80 7, 87 4, 96 10 C86 10, 80 13, 76 19 C72 13, 66 11, 58 14 Z" fill="#0e2a54" opacity="0.78" />
        <path d="M88 32 C93 26, 98 28, 101 33 C104 27, 110 25, 116 30 C109 29, 105 32, 101 36 C98 32, 93 30, 88 32 Z" fill="#0e2a54" opacity="0.7" />
        <path d="M72 34 C76 30, 80 31, 82 35 C85 31, 89 30, 93 33 C88 33, 84 34, 82 38 C80 34, 77 33, 72 34 Z" fill="#0e2a54" opacity="0.58" />
      </svg>

      {/* Architectural Campus Building & Trees Backdrop (Right Side) */}
      <div ref={bgRef} className="shk-hero-campus-bg shk-hero-parallax" aria-hidden="true">
        <svg viewBox="0 0 720 400" fill="none" className="w-full h-full">
          <defs>
            <linearGradient id="shkBldgWall" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#eff7ff" />
              <stop offset="100%" stopColor="#bfd9f5" />
            </linearGradient>
            <linearGradient id="shkBldgSide" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d2e6fc" />
              <stop offset="100%" stopColor="#99c0eb" />
            </linearGradient>
            <linearGradient id="shkWindow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2663c7" />
              <stop offset="100%" stopColor="#5898f2" />
            </linearGradient>
            <linearGradient id="shkTreeGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6cd448" />
              <stop offset="100%" stopColor="#207d2c" />
            </linearGradient>
          </defs>

          {/* Perspective Campus Building */}
          <polygon points="210,165 650,70 650,335 210,335" fill="url(#shkBldgWall)" />
          <polygon points="165,180 210,165 210,335 165,335" fill="url(#shkBldgSide)" />
          <polygon points="204,162 658,62 664,74 204,174" fill="#89b5e6" />

          {/* Perspective Window Grid */}
          {[0, 1, 2].map((row) =>
            [0, 1, 2, 3, 4, 5, 6].map((col) => {
              const x = 235 + col * 58;
              const topY = 178 - col * 11 + row * 48;
              return (
                <polygon
                  key={`${row}-${col}`}
                  points={`${x},${topY} ${x + 36},${topY - 7} ${x + 36},${topY + 26} ${x},${topY + 32}`}
                  fill="url(#shkWindow)"
                  opacity="0.78"
                />
              );
            })
          )}

          {/* Campus Trees Right & Midground */}
          <circle cx="670" cy="240" r="65" fill="url(#shkTreeGreen)" opacity="0.88" />
          <circle cx="620" cy="275" r="52" fill="#2d9435" opacity="0.82" />
          <circle cx="205" cy="300" r="46" fill="url(#shkTreeGreen)" opacity="0.72" />
          <circle cx="155" cy="322" r="38" fill="#3fa83f" opacity="0.65" />
        </svg>
      </div>

      {/* Glossy White/Blue Tabletop Surface */}
      <div className="shk-hero-tabletop" aria-hidden="true" />

      {/* Main Content Container (Strictly No Header/Navbar/Buttons/Phone/Email) */}
      <div className="shk-hero-inner">
        {/* Top-Right Campus Location Pill from Reference */}
        <div className="shk-hero-top-row">
          <div className="shk-location-wrap">
            <div className="shk-location-pill">
              <svg className="w-6 h-7 sm:w-7 sm:h-8 shrink-0" viewBox="0 0 28 34" fill="none" aria-hidden="true">
                <path
                  d="M14 1C7.37 1 2 6.37 2 13C2 21.8 14 33 14 33C14 33 26 21.8 26 13C26 6.37 20.63 1 14 1Z"
                  fill="#ef1c1c"
                />
                <circle cx="14" cy="13" r="4.8" fill="#ffffff" />
              </svg>
              <div className="text-left">
                <span className="shk-location-title">হাজরাহাট বাজার</span>
                <span className="shk-location-sub">মিরপুর, কুষ্টিয়া, বাংলাদেশ</span>
              </div>
            </div>
            {/* Small Golden Wing Flourish under Location Pill */}
            <svg className="w-24 sm:w-28 h-3.5 mt-1" viewBox="0 0 120 14" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="shkWingGold" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#b57a0d" />
                  <stop offset="50%" stopColor="#f5cd5c" />
                  <stop offset="100%" stopColor="#b57a0d" />
                </linearGradient>
              </defs>
              <path
                d="M4,8 C28,2 48,4 60,11 C72,4 92,2 116,8 C94,6 74,8 60,13 C46,8 26,6 4,8 Z"
                fill="url(#shkWingGold)"
              />
            </svg>
          </div>
        </div>

        {/* Center-Stage Panoramic Reference Composition */}
        <div className="shk-hero-main-layout">
          <div className="shk-hero-left-panel">
            <div className="shk-hero-identity-row">
              {/* 1. Left Institution Emblem (Golden Laurel + Mortarboard + Original Logo) */}
              <button
                type="button"
                onClick={onLogoTap}
                aria-label="শিক্ষানীর অফিসিয়াল লোগো"
                className="shk-crest-btn"
              >
                <div className="shk-crest-glow" aria-hidden="true" />

                {/* Golden Laurel Wreath SVG */}
                <svg className="shk-crest-wreath" viewBox="0 0 240 240" fill="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="shkGoldLeaf" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#ffe589" />
                      <stop offset="50%" stopColor="#d49b1a" />
                      <stop offset="100%" stopColor="#8c5b04" />
                    </linearGradient>
                  </defs>
                  {/* Left Wreath Leaves */}
                  {[130, 148, 166, 184, 202, 220, 238, 254].map((deg, idx) => {
                    const rad = (deg * Math.PI) / 180;
                    const cx = 120 + Math.cos(rad) * 96;
                    const cy = 122 + Math.sin(rad) * 96;
                    return (
                      <ellipse
                        key={`L-${idx}`}
                        cx={cx}
                        cy={cy}
                        rx="11"
                        ry="5.5"
                        transform={`rotate(${deg - 65} ${cx} ${cy})`}
                        fill="url(#shkGoldLeaf)"
                      />
                    );
                  })}
                  {/* Right Wreath Leaves */}
                  {[50, 32, 14, -4, -22, -40, -58, -74].map((deg, idx) => {
                    const rad = (deg * Math.PI) / 180;
                    const cx = 120 + Math.cos(rad) * 96;
                    const cy = 122 + Math.sin(rad) * 96;
                    return (
                      <ellipse
                        key={`R-${idx}`}
                        cx={cx}
                        cy={cy}
                        rx="11"
                        ry="5.5"
                        transform={`rotate(${deg + 65} ${cx} ${cy})`}
                        fill="url(#shkGoldLeaf)"
                      />
                    );
                  })}
                  {/* Bottom crossed stems */}
                  <path d="M84 214 Q120 230 156 214" stroke="url(#shkGoldLeaf)" strokeWidth="4" strokeLinecap="round" />
                </svg>

                {/* Exact Unaltered Original Logo Inside Gold Ring */}
                <div className="shk-crest-seal">
                  <img
                    src={ORIGINAL_LOGO_SRC}
                    alt="শিক্ষানীর (SHIKKHANIR) আসল লোগো"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* 3D Mortarboard Graduation Cap Perched on Crest */}
                <svg className="shk-crest-cap" viewBox="0 0 180 95" fill="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="shkCapTop" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#334155" />
                      <stop offset="50%" stopColor="#111827" />
                      <stop offset="100%" stopColor="#020617" />
                    </linearGradient>
                    <linearGradient id="shkCapTassel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffe17d" />
                      <stop offset="100%" stopColor="#c9850c" />
                    </linearGradient>
                  </defs>
                  {/* Cap Crown */}
                  <path d="M48 44 L48 64 C66 74 114 74 132 64 L132 44 Z" fill="#0f172a" stroke="#d49b1a" strokeWidth="1.5" />
                  {/* Cap Mortarboard Diamond */}
                  <polygon points="90,8 172,34 90,60 8,34" fill="url(#shkCapTop)" stroke="#64748b" strokeWidth="1.2" />
                  {/* Center Button & Hanging Golden Tassel */}
                  <circle cx="90" cy="33" r="3.5" fill="#f5cd5c" />
                  <path d="M90 33 L32 44 L29 66" stroke="url(#shkCapTassel)" strokeWidth="2.8" strokeLinecap="round" />
                  <path d="M25 65 L33 65 L35 84 L23 84 Z" fill="url(#shkCapTassel)" />
                </svg>
              </button>

              {/* Vertical Golden Divider */}
              <div className="shk-hero-divider" aria-hidden="true" />

              {/* 2. Brand Title & Upper Swoosh */}
              <div className="shk-hero-brand">
                <h1 className="shk-hero-title-main">
                  শিক্ষানীর
                  <span className="shk-hero-title-sub">কোচিং সেন্টার</span>
                </h1>

                {/* Upper Golden Tapered Swoosh */}
                <svg className="shk-hero-swoosh-upper" viewBox="0 0 440 24" fill="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="shkSwoosh1" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#b57a0d" stopOpacity="0.15" />
                      <stop offset="30%" stopColor="#e8b838" />
                      <stop offset="65%" stopColor="#ffe07d" />
                      <stop offset="100%" stopColor="#b57a0d" stopOpacity="0.2" />
                    </linearGradient>
                  </defs>
                  <path d="M10,20 C120,2 280,14 430,2 C295,21 135,11 10,20 Z" fill="url(#shkSwoosh1)" />
                </svg>
              </div>
            </div>

            {/* Slogan Spanning Cleanly Under Crest + Title (Matches Reference Composition) */}
            <div className="shk-hero-slogan-row">
              <p className="shk-hero-slogan">— “শিক্ষাই হোক সফলতার চাবিকাঠি” —</p>

              {/* Lower Golden Tapered Swoosh */}
              <svg className="shk-hero-swoosh-lower" viewBox="0 0 480 28" fill="none" aria-hidden="true">
                <defs>
                  <linearGradient id="shkSwoosh2" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#b57a0d" stopOpacity="0.1" />
                    <stop offset="35%" stopColor="#d49b1a" />
                    <stop offset="70%" stopColor="#ffe38a" />
                    <stop offset="100%" stopColor="#b57a0d" stopOpacity="0.15" />
                  </linearGradient>
                </defs>
                <path d="M6,24 C140,2 320,18 474,4 C328,25 148,13 6,24 Z" fill="url(#shkSwoosh2)" />
              </svg>
            </div>
          </div>

          {/* 3. Right Education Graphics (Stacked Books + Mortarboard + Branded Pencil Holder) */}
          <div ref={stageRef} className="shk-hero-stage shk-hero-parallax">
            {/* Stacked Hardcover Books + Mortarboard Cap */}
            <div className="shk-books-stack">
              <svg viewBox="0 0 360 280" fill="none" className="w-full h-auto" aria-hidden="true">
                <defs>
                  <linearGradient id="shkBookNavy" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#123d7a" />
                    <stop offset="55%" stopColor="#082046" />
                    <stop offset="100%" stopColor="#041129" />
                  </linearGradient>
                  <linearGradient id="shkBookRoyal" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#2668db" />
                    <stop offset="100%" stopColor="#0d3882" />
                  </linearGradient>
                  <linearGradient id="shkPageCream" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fffdf7" />
                    <stop offset="60%" stopColor="#ebe2d0" />
                    <stop offset="100%" stopColor="#cbbda3" />
                  </linearGradient>
                  <linearGradient id="shkGoldBand" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ffe794" />
                    <stop offset="50%" stopColor="#d69c1c" />
                    <stop offset="100%" stopColor="#8a5a05" />
                  </linearGradient>
                  <linearGradient id="shkHeroCap" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#334155" />
                    <stop offset="55%" stopColor="#111827" />
                    <stop offset="100%" stopColor="#030712" />
                  </linearGradient>
                </defs>

                {/* Soft Contact Shadow on Tabletop */}
                <ellipse cx="185" cy="264" rx="165" ry="12" fill="#0f2942" opacity="0.22" />

                {/* BOTTOM BOOK */}
                <path d="M18,214 L334,214 L344,258 L18,258 C8,258 4,248 4,236 C4,224 8,214 18,214 Z" fill="url(#shkBookNavy)" />
                <path d="M40,218 L338,218 L338,254 L40,254 C31,246 31,226 40,218 Z" fill="url(#shkPageCream)" />
                <line x1="42" y1="227" x2="335" y2="227" stroke="#c8b99e" strokeWidth="1" />
                <line x1="40" y1="236" x2="335" y2="236" stroke="#c8b99e" strokeWidth="1" />
                <line x1="42" y1="245" x2="335" y2="245" stroke="#c8b99e" strokeWidth="1" />
                <rect x="22" y="216" width="8" height="40" rx="2" fill="url(#shkGoldBand)" />
                <rect x="6" y="220" width="26" height="4" rx="1.5" fill="url(#shkGoldBand)" />
                <rect x="6" y="248" width="26" height="4" rx="1.5" fill="url(#shkGoldBand)" />

                {/* MIDDLE BOOK */}
                <path d="M48,168 L322,168 L330,212 L48,212 C38,212 34,202 34,190 C34,178 38,168 48,168 Z" fill="url(#shkBookRoyal)" />
                <path d="M68,172 L324,172 L324,208 L68,208 C60,200 60,180 68,172 Z" fill="url(#shkPageCream)" />
                <line x1="70" y1="181" x2="320" y2="181" stroke="#c8b99e" strokeWidth="1" />
                <line x1="68" y1="190" x2="320" y2="190" stroke="#c8b99e" strokeWidth="1" />
                <line x1="70" y1="199" x2="320" y2="199" stroke="#c8b99e" strokeWidth="1" />
                <rect x="52" y="170" width="7" height="40" rx="2" fill="url(#shkGoldBand)" />
                <rect x="37" y="174" width="24" height="3.5" rx="1.5" fill="url(#shkGoldBand)" />
                <rect x="37" y="202" width="24" height="3.5" rx="1.5" fill="url(#shkGoldBand)" />

                {/* TOP BOOK */}
                <path d="M66,126 L308,126 L316,166 L66,166 C56,166 52,157 52,146 C52,135 56,126 66,126 Z" fill="url(#shkBookNavy)" />
                <path d="M84,130 L310,130 L310,162 L84,162 C77,154 77,138 84,130 Z" fill="url(#shkPageCream)" />
                <line x1="86" y1="138" x2="306" y2="138" stroke="#c8b99e" strokeWidth="1" />
                <line x1="84" y1="146" x2="306" y2="146" stroke="#c8b99e" strokeWidth="1" />
                <line x1="86" y1="154" x2="306" y2="154" stroke="#c8b99e" strokeWidth="1" />
                <rect x="69" y="128" width="7" height="36" rx="2" fill="url(#shkGoldBand)" />
                <rect x="55" y="132" width="23" height="3.5" rx="1.5" fill="url(#shkGoldBand)" />
                <rect x="55" y="156" width="23" height="3.5" rx="1.5" fill="url(#shkGoldBand)" />

                {/* GRADUATION CAP ON TOP OF BOOK STACK */}
                {/* Crown Cylinder */}
                <path d="M116,74 L116,122 C145,134 225,134 252,120 L252,74 Z" fill="#0f172a" />
                <path d="M116,74 L116,122 C136,128 158,131 178,131 L178,74 Z" fill="#1e293b" opacity="0.55" />
                {/* Mortarboard Square Top */}
                <polygon points="184,16 322,64 184,104 54,60" fill="url(#shkHeroCap)" stroke="#475569" strokeWidth="1.5" />
                <polygon points="184,100 322,64 322,69 184,109 54,65 54,60" fill="#090d16" />
                {/* Center Button & Flowing Gold Tassel */}
                <ellipse cx="184" cy="58" rx="6" ry="3.5" fill="#f5cd5c" />
                <path d="M184,58 L254,82 L254,174" stroke="url(#shkGoldBand)" strokeWidth="4" strokeLinecap="round" />
                <ellipse cx="254" cy="176" rx="6.5" ry="5" fill="#f5cd5c" />
                <path d="M248,180 L260,180 L265,244 C258,247 250,247 243,244 Z" fill="url(#shkGoldBand)" />
                <line x1="251" y1="183" x2="249" y2="242" stroke="#8a5a05" strokeWidth="1" />
                <line x1="255" y1="183" x2="255" y2="244" stroke="#8a5a05" strokeWidth="1" />
                <line x1="259" y1="183" x2="261" y2="242" stroke="#8a5a05" strokeWidth="1" />
              </svg>
            </div>

            {/* White Cylindrical Pencil Holder Cup with Unaltered Brand Logo */}
            <div className="shk-pencil-cup">
              <svg viewBox="0 0 140 220" fill="none" className="w-full h-auto" aria-hidden="true">
                <defs>
                  <linearGradient id="shkCupBody" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#e2e8f0" />
                    <stop offset="28%" stopColor="#ffffff" />
                    <stop offset="76%" stopColor="#f8fafc" />
                    <stop offset="100%" stopColor="#cbd5e1" />
                  </linearGradient>
                </defs>

                {/* Cup Shadow */}
                <ellipse cx="70" cy="212" rx="54" ry="8" fill="#0f2942" opacity="0.22" />

                {/* Pencils & Pens Rising from Cup */}
                {/* Left blue pencil */}
                <g transform="rotate(-14 38 92)">
                  <rect x="30" y="34" width="11" height="90" fill="#1d4ed8" />
                  <polygon points="30,34 41,34 35.5,14" fill="#fde68a" />
                  <polygon points="33.5,21 37.5,21 35.5,14" fill="#1e293b" />
                </g>
                {/* Mid-left navy pen */}
                <g transform="rotate(-5 56 84)">
                  <rect x="49" y="24" width="12" height="96" rx="2" fill="#0f2942" />
                  <rect x="52" y="20" width="6" height="6" fill="#d49b1a" />
                </g>
                {/* Center yellow pencil */}
                <g transform="rotate(3 72 80)">
                  <rect x="65" y="28" width="11" height="96" fill="#eab308" />
                  <polygon points="65,28 76,28 70.5,10" fill="#fde68a" />
                  <polygon points="68.5,16 72.5,16 70.5,10" fill="#0f172a" />
                </g>
                {/* Mid-right royal pencil */}
                <g transform="rotate(10 90 85)">
                  <rect x="83" y="30" width="10" height="94" fill="#2563eb" />
                  <polygon points="83,30 93,30 88,13" fill="#fde68a" />
                  <polygon points="86.5,19 89.5,19 88,13" fill="#0f172a" />
                </g>
                {/* Far-right charcoal pen */}
                <g transform="rotate(18 104 96)">
                  <rect x="97" y="42" width="11" height="86" rx="2" fill="#1e293b" />
                  <rect x="99" y="38" width="7" height="5" fill="#cbd5e1" />
                </g>

                {/* Cup Opening Inside */}
                <ellipse cx="70" cy="86" rx="48" ry="11" fill="#1e293b" />

                {/* White Cylindrical Cup Body */}
                <path
                  d="M20,86 L23,200 C23,210 117,210 117,200 L120,86 C120,96 20,96 20,86 Z"
                  fill="url(#shkCupBody)"
                  stroke="#cbd5e1"
                  strokeWidth="1.2"
                />
                <ellipse cx="70" cy="86" rx="50" ry="11.5" fill="none" stroke="#ffffff" strokeWidth="2.5" />
              </svg>

              {/* Unaltered Brand Logo Badge on Pencil Holder Cup */}
              <div className="shk-cup-logo-seal">
                <img
                  src={ORIGINAL_LOGO_SRC}
                  alt="শিক্ষানীর কাপ লোগো"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sweeping Navy + Royal Blue + Champagne Gold Waves */}
      <svg
        className="shk-hero-bottom-waves"
        viewBox="0 0 1440 175"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="shkWaveNavy" x1="0" y1="0" x2="1" y2="0.4">
            <stop offset="0%" stopColor="#041533" />
            <stop offset="48%" stopColor="#08285e" />
            <stop offset="100%" stopColor="#041533" />
          </linearGradient>
          <linearGradient id="shkWaveRoyal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0f5ae0" />
            <stop offset="55%" stopColor="#2679ff" />
            <stop offset="100%" stopColor="#0b46b5" />
          </linearGradient>
          <linearGradient id="shkWaveGold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a66f09" />
            <stop offset="22%" stopColor="#ffd966" />
            <stop offset="52%" stopColor="#d49b1a" />
            <stop offset="78%" stopColor="#ffe58c" />
            <stop offset="100%" stopColor="#a66f09" />
          </linearGradient>
        </defs>

        {/* Outer Gold Ribbon Sweep */}
        <path
          d="M0,25 C340,70 680,152 1440,142 L1440,175 L0,175 Z"
          fill="url(#shkWaveGold)"
        />
        {/* Royal Blue Middle Ribbon */}
        <path
          d="M0,45 C360,86 700,158 1440,150 L1440,175 L0,175 Z"
          fill="url(#shkWaveRoyal)"
        />
        {/* Deep Navy Lower Wave */}
        <path
          d="M0,62 C350,98 690,164 1440,160 L1440,175 L0,175 Z"
          fill="url(#shkWaveNavy)"
        />
        {/* Subtle Etched Open Book Watermark in Bottom-Left Navy Wave */}
        <g transform="translate(86, 112) scale(0.95)" opacity="0.22" stroke="#93c5fd" strokeWidth="2" fill="none">
          <path d="M40,12 C26,6 10,8 2,14 L2,46 C12,40 27,39 40,46 C53,39 68,40 78,46 L78,14 C70,8 54,6 40,12 Z" />
          <line x1="40" y1="12" x2="40" y2="46" />
        </g>
      </svg>

      {/* Top-Left Crisp Green Leaf Branch */}
      <svg className="shk-hero-foliage-tl" viewBox="0 0 220 150" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="shkLeafA" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#9ef038" />
            <stop offset="100%" stopColor="#1e7d22" />
          </linearGradient>
        </defs>
        <path d="M0,0 C45,28 96,42 150,30" stroke="#2c6b1b" strokeWidth="3.5" fill="none" />
        <ellipse cx="42" cy="36" rx="28" ry="12" transform="rotate(-24 42 36)" fill="url(#shkLeafA)" />
        <ellipse cx="78" cy="18" rx="24" ry="10" transform="rotate(14 78 18)" fill="#5cc92b" />
        <ellipse cx="102" cy="48" rx="26" ry="11" transform="rotate(-12 102 48)" fill="url(#shkLeafA)" />
        <ellipse cx="145" cy="24" rx="24" ry="10" transform="rotate(18 145 24)" fill="#7ce034" />
        <ellipse cx="26" cy="72" rx="25" ry="10" transform="rotate(-48 26 72)" fill="#3b9d25" />
        <ellipse cx="64" cy="78" rx="23" ry="10" transform="rotate(-28 64 78)" fill="#74db35" />
      </svg>

      {/* Bottom-Left Soft Foreground Foliage */}
      <svg className="shk-hero-foliage-bl" viewBox="0 0 160 120" fill="none" aria-hidden="true">
        <ellipse cx="30" cy="86" rx="34" ry="16" transform="rotate(-38 30 86)" fill="#3fa829" />
        <ellipse cx="68" cy="100" rx="30" ry="14" transform="rotate(-16 68 100)" fill="#6fd436" />
        <ellipse cx="18" cy="48" rx="28" ry="12" transform="rotate(-62 18 48)" fill="#2a861d" />
      </svg>

      {/* Bottom-Right Soft Foreground Foliage */}
      <svg className="shk-hero-foliage-br" viewBox="0 0 160 120" fill="none" aria-hidden="true">
        <ellipse cx="128" cy="84" rx="34" ry="16" transform="rotate(36 128 84)" fill="#3fa829" />
        <ellipse cx="90" cy="98" rx="30" ry="14" transform="rotate(16 90 98)" fill="#6fd436" />
        <ellipse cx="140" cy="46" rx="26" ry="12" transform="rotate(62 140 46)" fill="#2a861d" />
      </svg>
    </section>
  );
};
