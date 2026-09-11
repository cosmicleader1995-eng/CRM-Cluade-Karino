import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeColor?: string;
  color?: string;
}

interface ScrollableTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  theme?: 'dark' | 'nude' | 'it';
  className?: string;
}

export const ScrollableTabs: React.FC<ScrollableTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  theme = 'dark',
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  const checkScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    
    // In RTL, scrollLeft can be 0 or negative depending on browser
    const scrollWidth = el.scrollWidth;
    const clientWidth = el.clientWidth;
    const maxScroll = scrollWidth - clientWidth;
    
    if (maxScroll <= 5) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const currentScroll = Math.abs(el.scrollLeft);
    setCanScrollRight(currentScroll > 5);
    setCanScrollLeft(currentScroll < maxScroll - 5);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    
    // Enable horizontal mouse wheel scrolling
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        // In RTL, adjust scrollLeft
        el.scrollLeft -= e.deltaY;
        checkScroll();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      window.removeEventListener('resize', checkScroll);
      el.removeEventListener('wheel', onWheel);
    };
  }, [tabs]);

  const handleScrollClick = (direction: 'left' | 'right') => {
    const el = containerRef.current;
    if (!el) return;
    const scrollAmount = 240;
    // In RTL direction: left scrolls forward in RTL, right scrolls back
    const sign = direction === 'left' ? -1 : 1;
    el.scrollBy({ left: sign * scrollAmount, behavior: 'smooth' });
    setTimeout(checkScroll, 250);
  };

  // Mouse Drag to Scroll
  const handleMouseDown = (e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    setIsDragging(true);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeftState(el.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    containerRef.current.scrollLeft = scrollLeftState - walk;
    checkScroll();
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className={`relative flex items-center group/nav ${className}`}>
      
      {/* Scroll Right Button (Start in RTL) - Visible on mobile & desktop */}
      <button
        type="button"
        aria-label="اسکرول به راست"
        onClick={() => handleScrollClick('right')}
        className={`${canScrollRight ? 'flex' : 'hidden'} shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full items-center justify-center transition-all z-20 mr-1 cursor-pointer active:scale-90 shadow-md ${
          theme === 'nude' 
            ? 'bg-[#9C6644] text-white hover:bg-[#7F4F24] opacity-100 ring-2 ring-[#9C6644]/20' 
            : 'bg-amber-500 text-slate-950 hover:bg-amber-400 opacity-100 ring-2 ring-amber-500/20'
        }`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Tabs Container */}
      <div
        ref={containerRef}
        onScroll={checkScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-1 w-full select-none cursor-grab active:cursor-grabbing scroll-smooth touch-pan-x`}
      >
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (theme === 'nude') {
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                className={`min-h-[44px] px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-white text-[#2B1810] border-2 border-[#9C6644] shadow-md font-black scale-[1.01]'
                    : 'bg-[#FAF7F2] text-[#6F4E37] hover:text-[#2B1810] hover:bg-[#F5EDE2] border border-[#E6DAC8]'
                }`}
              >
                {Icon && <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#9C6644]' : 'text-[#8D5B4C]'}`} />}
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge !== '' && (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-black ${
                    tab.badgeColor || (isActive ? 'bg-[#9C6644] text-white' : 'bg-[#E6DAC8] text-[#5C4033]')
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          }

          if (theme === 'it') {
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                className={`min-h-[44px] px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20 font-extrabold scale-[1.02]'
                    : 'bg-[#0a1829] text-slate-400 hover:text-slate-200 hover:bg-[#0e223b] border border-slate-800'
                }`}
              >
                {Icon && <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : tab.color || 'text-blue-400'}`} />}
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge !== '' && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-black bg-blue-900/60 text-blue-200 border border-blue-400/30">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          }

          // Dark / Consultant Default Theme
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`min-h-[44px] px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 font-extrabold scale-[1.02]'
                  : 'bg-[#0d1d33] text-slate-300 hover:text-white hover:bg-[#132b4a] border border-slate-800'
              }`}
            >
              {Icon && <Icon className="w-4 h-4 shrink-0" />}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge !== '' && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-black ${
                  tab.badgeColor || (isActive ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-amber-300 border border-amber-500/30')
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Scroll Left Button (End in RTL) - Visible on mobile & desktop */}
      <button
        type="button"
        aria-label="اسکرول به چپ"
        onClick={() => handleScrollClick('left')}
        className={`${canScrollLeft ? 'flex' : 'hidden'} shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full items-center justify-center transition-all z-20 ml-1 cursor-pointer active:scale-90 shadow-md ${
          theme === 'nude' 
            ? 'bg-[#9C6644] text-white hover:bg-[#7F4F24] opacity-100 ring-2 ring-[#9C6644]/20' 
            : 'bg-amber-500 text-slate-950 hover:bg-amber-400 opacity-100 ring-2 ring-amber-500/20'
        }`}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

    </div>
  );
};
