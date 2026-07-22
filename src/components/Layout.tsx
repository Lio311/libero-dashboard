import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';

export const Layout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };
    const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const d = touchStart - touchEnd;
        if (d > 50 && touchStart > window.innerWidth - 70) setIsMobileMenuOpen(true);
        if (d < -50 && isMobileMenuOpen) setIsMobileMenuOpen(false);
    };

    return (
        <div
            className="flex h-screen text-[#1d1d1f] overflow-hidden"
            style={{ background: '#f5f5f7' }}
            dir="rtl"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <main className="flex-1 overflow-y-auto relative flex flex-col">
                {/* Mobile header */}
                <div className="md:hidden px-4 py-3 border-b border-black/[0.08] bg-white/80 backdrop-blur-xl flex items-center justify-between sticky top-0 z-20">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 text-[#1d1d1f]/60 hover:bg-black/[0.04] rounded-lg transition-colors"
                    >
                        <Menu size={20} />
                    </button>
                    <img src="/logo.png" alt="Logo" className="h-7 w-auto object-contain" />
                    <div className="w-9" />
                </div>

                <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full page-fade-in">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
