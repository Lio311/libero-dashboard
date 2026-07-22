import { useState } from 'react';
import { Table } from '../components/Table';
import { MonthNavigator } from '../components/MonthNavigator';
import { useInfluencerPage } from '../hooks/useInfluencerPage';

const isPerVideo = (row: any) => (row.payment_type || 'שכר בסיס').includes('סרטון');
const isBaseSalary = (row: any) => !isPerVideo(row);

const channelIcons: Record<string, React.ReactNode> = {
    'טיקטוק': <span title="טיקטוק" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-black text-white text-[9px] font-bold">TT</span>,
    'פייסבוק': <span title="פייסבוק" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-bold">FB</span>,
    'אינסטגרם': <span title="אינסטגרם" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white text-[9px] font-bold">IG</span>,
    'וואטסאפ': <span title="וואטסאפ" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-[9px] font-bold">WA</span>,
};

export const InfluencersPage = () => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const {
        influencers, coupons, loading, computeDays,
        handleSaveInfluencers, handleAddInfluencer, handleDeleteInfluencer,
        handleSaveCoupons, handleAddCoupon, handleDeleteCoupon,
    } = useInfluencerPage({ influencerTable: 'influencers', couponTable: 'coupons', currentDate });

    const calculateCost = (row: any): number | null => {
        const sales = Number(row.sales);
        if (sales === 0) return null;
        if (isPerVideo(row)) {
            return (Number(row.video_count || 0) * Number(row.price_per_video || 0)) / sales;
        }
        return (Number(row.base_salary) + sales * (Number(row.bonus_percent) / 100)) / sales;
    };

    const influencerColumns: any[] = [
        { header: 'שם', accessor: 'name', editable: true, className: 'min-w-[90px]' },
        { header: 'קופון', accessor: 'coupon', editable: true, className: 'min-w-[80px]' },
        { header: 'ערוצים', accessor: 'channels', editable: true, type: 'multiselect' as const, options: ['טיקטוק', 'פייסבוק', 'אינסטגרם', 'וואטסאפ'], optionIcons: channelIcons, className: 'min-w-[60px]' },
        { header: 'מוצרים', accessor: 'products', editable: true, className: 'min-w-[110px]' },
        { header: 'סוג תשלום', accessor: 'payment_type', editable: true, type: 'toggle' as const, options: ['שכר בסיס', 'תשלום סרטון'], align: 'center' as const, className: 'min-w-[85px]' },
        { header: 'שכר בסיס ₪', accessor: 'base_salary', editable: true, type: 'number' as const, shouldDisable: isPerVideo, className: 'min-w-[100px]' },
        { header: 'בונוס %', accessor: 'bonus_percent', editable: true, type: 'number' as const, shouldDisable: isPerVideo, className: 'min-w-[70px]' },
        { header: 'מס׳ סרטונים', accessor: 'video_count', editable: true, type: 'number' as const, shouldDisable: isBaseSalary, className: 'min-w-[70px]' },
        { header: 'מחיר לסרטון ₪', accessor: 'price_per_video', editable: true, type: 'number' as const, shouldDisable: isBaseSalary, className: 'min-w-[90px]' },
        { header: 'מכירות ₪', accessor: 'sales', editable: true, type: 'number' as const, className: 'min-w-[90px]' },
        {
            header: 'עלות %', align: 'center' as const, className: 'min-w-[60px]',
            accessor: (row: any) => {
                const cost = calculateCost(row);
                if (cost === null) return <span className="text-slate-400">-</span>;
                return <span className={cost <= 0.25 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>{(cost * 100).toFixed(1)}%</span>;
            }
        },
    ];

    if (loading) return <div className="text-center p-10">טוען נתונים...</div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-slate-900">משפיענים ליברו</h1>
                <MonthNavigator currentDate={currentDate} onDateChange={setCurrentDate} />
            </div>
            <Table title="משפיענים ליברו" data={influencers} onSave={handleSaveInfluencers} onAdd={handleAddInfluencer} onDelete={handleDeleteInfluencer} columns={influencerColumns} />
            <Table
                title="ניהול קודי קופון" data={coupons} onSave={handleSaveCoupons} onAdd={handleAddCoupon} onDelete={handleDeleteCoupon}
                rowClassName={(row: any) => row.active === 'פעיל' ? '!bg-green-50' : row.active === 'מבוטל' ? '!bg-red-50' : ''}
                columns={[
                    { header: 'שם הקוד', accessor: 'code', editable: true, className: 'min-w-[110px]' },
                    { header: 'ערוצי פרסום', accessor: 'channel', editable: true },
                    { header: 'תאריך התחלה', accessor: 'start_date', editable: true, type: 'date' },
                    { header: 'תאריך סיום', accessor: 'end_date', editable: true, type: 'date' },
                    { header: 'ימי פעילות', align: 'center' as const, accessor: (row: any) => computeDays(row.start_date, row.end_date) || row.days || 0 },
                    { header: 'כמות שימושים', accessor: 'views', editable: true, type: 'number', align: 'center' as const },
                    { header: 'שווי שימוש', accessor: 'sales', render: (row: any) => `₪${Number(row.sales).toLocaleString()}`, editable: true, type: 'number' as const },
                    { header: 'סטטוס', accessor: 'active', className: 'font-medium', editable: true, type: 'select', options: ['פעיל', 'מבוטל'], align: 'center' as const },
                ]}
            />
        </div>
    );
};
