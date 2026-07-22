import { NavLink } from 'react-router-dom';
import {
    Users, Image, Video, Megaphone, CalendarCheck,
    ClipboardList, Layout, Target, Calendar,
    Sparkles, Warehouse, PackageCheck, CreditCard, UserCheck, Ticket, TrendingUp
} from 'lucide-react';

import clsx from 'clsx';

const navItems = [
    { to: '/inventory-analysis', icon: TrendingUp, label: 'ניתוח מלאי חכם' },
    { to: '/libero-coupons', icon: Ticket, label: 'סיכום קופונים ליברו' },
    { to: '/labura-coupons', icon: Ticket, label: 'סיכום קופונים לה בורה' },
    { to: '/velour-coupons', icon: Ticket, label: 'סיכום קופונים וולור' },
    { to: '/influencers', icon: Users, label: 'משפיענים ליברו' },

    { to: '/velour-influencers', icon: Users, label: 'משפיענים וולור' },
    { to: '/la-bora-influencers', icon: Users, label: 'משפיענים לה בורה' },
    { to: '/campaigns', icon: Megaphone, label: 'ניהול קמפיינים' },
    { to: '/banners', icon: Image, label: 'ניהול באנרים' },
    { to: '/calendar', icon: Calendar, label: 'לוח שנה' },
    { to: '/shift-board', icon: CalendarCheck, label: 'לוח משמרות' },
    { to: '/store-reviews', icon: ClipboardList, label: 'ביקורת חנות' },
    { to: '/projects', icon: Layout, label: 'ניהול פרויקטים' },
    { to: '/marketing-tasks', icon: Target, label: 'ניהול משימות שיווק' },
    { to: '/meetings', icon: Video, label: 'פגישות' },
    { to: '/new-perfumes', icon: Sparkles, label: 'בשמים חדשים' },
    { to: '/public/perfume-generator', icon: Sparkles, label: 'מחולל תיאורי בשמים' },
    { to: '/public/warehouse', icon: Warehouse, label: 'מחסן' },
    { to: '/public/delivery', icon: PackageCheck, label: 'מסירת חבילות' },
    { to: '/bonus-dashboard', icon: CreditCard, label: 'בונוסים שלי', roles: ['bonus_employee'] },
    { to: '/admin/bonus-tracking', icon: UserCheck, label: 'מעקב בונוסים עובדים', roles: ['admin'] },
];

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
    const userRole = localStorage.getItem('userRole');
    const userName = localStorage.getItem('userName') || 'Lior Zafrir';

    const filteredNavItems = navItems.filter(item => {
        if (userRole === 'store_manager') return item.to === '/store-reviews';
        if (userRole === 'bonus_employee') return item.to.startsWith('/bonus-dashboard');
        if (item.roles && !item.roles.includes(userRole || '')) return false;
        return true;
    });

    const getInitials = (name: string) =>
        name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const getRoleLabel = (role: string | null) => {
        if (role === 'store_manager') return 'Store Manager';
        if (role === 'bonus_employee') return 'Employee';
        return 'Admin';
    };

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={clsx(
                    "fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            <aside className={clsx(
                "bg-white/90 backdrop-blur-xl border-l border-black/[0.06] h-screen flex flex-col z-50 transition-all duration-300",
                "fixed md:static w-56 top-0 right-0",
                isOpen ? "translate-x-0 visible" : "translate-x-full md:translate-x-0 invisible md:visible"
            )}>
                {/* Logo */}
                <div className="px-6 py-5 flex justify-center md:justify-start">
                    <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
                </div>

                <div className="mx-4 border-t border-black/[0.06]" />

                {/* Nav */}
                <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto border-transparent border-l">
                    {filteredNavItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => onClose?.()}
                            className={({ isActive }) =>
                                clsx(
                                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 text-sm group',
                                    isActive
                                        ? 'bg-[#0071e3] text-white font-medium shadow-sm'
                                        : 'text-[#1d1d1f]/70 hover:bg-black/[0.04] hover:text-[#1d1d1f]'
                                )
                            }
                        >
                            <item.icon className="w-[18px] h-[18px] flex-shrink-0 opacity-80" />
                            <span className="truncate">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="mx-4 border-t border-black/[0.06]" />

                {/* User */}
                <div className="p-4">
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-black/[0.03]">
                        <div className="w-7 h-7 rounded-full bg-[#1d1d1f] flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0">
                            {getInitials(userName)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#1d1d1f] truncate">{userName}</p>
                            <p className="text-[10px] text-[#6d6d6d] truncate">{getRoleLabel(userRole)}</p>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};
