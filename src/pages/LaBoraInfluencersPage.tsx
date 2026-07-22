import { useState, useEffect } from 'react';
import { Table } from '../components/Table';
import { MonthNavigator } from '../components/MonthNavigator';
import { useInfluencerPage } from '../hooks/useInfluencerPage';
import { supabase } from '../lib/supabase';

const isPerVideo = (row: any) => (row.payment_type || 'שכר בסיס').includes('סרטון');
const isBaseSalary = (row: any) => !isPerVideo(row);

const channelIcons: Record<string, React.ReactNode> = {
    'טיקטוק': <span title="טיקטוק" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-black text-white text-[9px] font-bold">TT</span>,
    'פייסבוק': <span title="פייסבוק" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-bold">FB</span>,
    'אינסטגרם': <span title="אינסטגרם" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white text-[9px] font-bold">IG</span>,
    'וואטסאפ': <span title="וואטסאפ" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-[9px] font-bold">WA</span>,
};

const PAYMENT_STATUS_OPTIONS = ['לא שולם', 'שולם', 'שולם חלקית'] as const;
type PaymentStatus = typeof PAYMENT_STATUS_OPTIONS[number];

// Compute influencer payout.
// When vat=true: commission is calculated on net sales (gross / 1.18)
const computePay = (row: any, vat: boolean) => {
    const grossSales = Number(row.sales || 0);
    const netSales = vat ? grossSales / 1.18 : grossSales;
    if (isPerVideo(row)) {
        const videoTotal = Number(row.video_count || 0) * Number(row.price_per_video || 0);
        return { base: videoTotal, commission: 0, total: videoTotal };
    }
    const base = Number(row.base_salary || 0);
    const commission = netSales * (Number(row.bonus_percent || 0) / 100);
    return { base, commission, total: base + commission };
};

export const LaBoraInfluencersPage = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    // Live influencer data — updated on every cell edit (syncs payment table in real time)
    const [liveInfluencers, setLiveInfluencers] = useState<any[]>([]);

    const {
        influencers, coupons, loading, computeDays,
        handleSaveInfluencers, handleAddInfluencer, handleDeleteInfluencer,
        handleSaveCoupons, handleAddCoupon, handleDeleteCoupon,
    } = useInfluencerPage({ influencerTable: 'labora_influencers', couponTable: 'labora_coupons', currentDate });

    // Sync liveInfluencers from DB whenever influencers state changes
    useEffect(() => { setLiveInfluencers(influencers); }, [influencers]);

    // Save a payment field change (vat_included, payment_status, payment_notes) directly to DB
    const handlePaymentFieldChange = async (id: number | string, field: string, value: any) => {
        // Optimistic update to live state
        setLiveInfluencers(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
        // Persist to DB
        await supabase.from('labora_influencers').update({ [field]: value }).eq('id', id);
    };

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
            header: 'עמלה %',
            align: 'center' as const,
            className: 'min-w-[70px]',
            accessor: (row: any) => {
                const cost = calculateCost(row);
                if (cost === null) return <span className="text-slate-300">—</span>;
                return <span className={cost <= 0.25 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>{(cost * 100).toFixed(1)}%</span>;
            }
        },
    ];

    if (loading) return <div className="text-center p-10">טוען נתונים...</div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-slate-900">משפיענים לה בורה</h1>
                <MonthNavigator currentDate={currentDate} onDateChange={setCurrentDate} />
            </div>

            {/* Influencer table — onDataChange keeps payment table in sync with live edits */}
            <Table
                title="משפיענים לה בורה"
                data={influencers}
                onSave={handleSaveInfluencers}
                onAdd={handleAddInfluencer}
                onDelete={handleDeleteInfluencer}
                columns={influencerColumns}
                onDataChange={(newData: any[]) => setLiveInfluencers(newData)}
            />

            {/* Payment Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-800">טבלת תשלום למשפיעניות</h2>
                    <span className="text-xs text-slate-400">נתונים נשאבים אוטומטית • נשמרים ב-DB</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right" dir="rtl">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap">שם המשפיענית</th>
                                <th className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap text-center">שכר בסיס ₪</th>
                                <th className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap text-center">עמלות ₪</th>
                                <th className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap text-center">סה"כ ₪</th>
                                <th className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap text-center">מע"מ</th>
                                <th className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap text-center">סה"כ לתשלום ₪</th>
                                <th className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap text-center">
                                    <span className="text-amber-600">בונוס טל 5%</span>
                                </th>
                                <th className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap text-center">סטטוס תשלום</th>
                                <th className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap">הערות</th>
                            </tr>
                        </thead>
                        <tbody>
                            {liveInfluencers.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400">אין משפיעניות. הוסף שורות בטבלה למעלה.</td>
                                </tr>
                            )}
                            {liveInfluencers.map(inf => {
                                const vat = !!inf.vat_included;
                                const paymentStatus: PaymentStatus = (inf.payment_status as PaymentStatus) || 'לא שולם';
                                const notes: string = inf.payment_notes || '';
                                const pay = computePay(inf, vat);
                                const talBonus = pay.total * 0.05;

                                const statusColor =
                                    paymentStatus === 'שולם' ? 'bg-green-100 text-green-700 border-green-200' :
                                        paymentStatus === 'לא שולם' ? 'bg-red-100 text-red-700 border-red-200' :
                                            'bg-amber-100 text-amber-700 border-amber-200';

                                return (
                                    <tr key={inf.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        {/* Name */}
                                        <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{inf.name}</td>
                                        {/* Base salary */}
                                        <td className="px-4 py-3 text-center text-slate-700 whitespace-nowrap">
                                            ₪{pay.base.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                                        </td>
                                        {/* Commission */}
                                        <td className="px-4 py-3 text-center text-slate-700 whitespace-nowrap">
                                            ₪{pay.commission.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                                        </td>
                                        {/* Total before VAT adjustment */}
                                        <td className="px-4 py-3 text-center font-semibold text-slate-800 whitespace-nowrap">
                                            ₪{pay.total.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                                        </td>
                                        {/* VAT toggle — RTL-correct pattern matching ToggleCell */}
                                        <td className="px-4 py-3 text-center whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => handlePaymentFieldChange(inf.id, 'vat_included', !vat)}
                                                className={`relative inline-flex h-[22px] w-[88px] items-center rounded-full transition-all focus:outline-none ${vat ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                            >
                                                <div className={`absolute h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-all z-10 ${vat ? 'right-0.5' : 'right-[calc(100%-1rem-0.125rem)]'}`} />
                                                <span className={`absolute w-full text-[9px] font-bold text-center pointer-events-none select-none ${vat ? 'text-white pr-5' : 'text-slate-600 pl-5'}`}>
                                                    {vat ? 'עם מע"מ' : 'ללא מע"מ'}
                                                </span>
                                            </button>
                                        </td>
                                        {/* Total to pay */}
                                        <td className="px-4 py-3 text-center font-bold text-indigo-700 whitespace-nowrap">
                                            ₪{pay.total.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                                            {vat && <span className="text-[10px] text-indigo-400 mr-1">(נטו)</span>}
                                        </td>
                                        {/* Tal bonus 5% */}
                                        <td className="px-4 py-3 text-center font-semibold text-amber-600 whitespace-nowrap">
                                            ₪{talBonus.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                                        </td>
                                        {/* Payment status */}
                                        <td className="px-4 py-3 text-center whitespace-nowrap">
                                            <select
                                                value={paymentStatus}
                                                onChange={e => handlePaymentFieldChange(inf.id, 'payment_status', e.target.value)}
                                                className={`rounded-full border px-3 py-1 text-xs font-medium cursor-pointer focus:outline-none ${statusColor}`}
                                            >
                                                {PAYMENT_STATUS_OPTIONS.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </td>
                                        {/* Notes */}
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={notes}
                                                onChange={e => handlePaymentFieldChange(inf.id, 'payment_notes', e.target.value)}
                                                placeholder="הוסף הערה..."
                                                className="w-full min-w-[140px] border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        {liveInfluencers.length > 0 && (
                            <tfoot>
                                <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-800">
                                    <td className="px-4 py-3">סה"כ</td>
                                    <td className="px-4 py-3 text-center">
                                        ₪{liveInfluencers.reduce((s, inf) => s + computePay(inf, !!inf.vat_included).base, 0).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        ₪{liveInfluencers.reduce((s, inf) => s + computePay(inf, !!inf.vat_included).commission, 0).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        ₪{liveInfluencers.reduce((s, inf) => s + computePay(inf, !!inf.vat_included).total, 0).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                                    </td>
                                    <td className="px-4 py-3" />
                                    <td className="px-4 py-3 text-center text-indigo-700">
                                        ₪{liveInfluencers.reduce((s, inf) => s + computePay(inf, !!inf.vat_included).total, 0).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                                    </td>
                                    <td className="px-4 py-3 text-center text-amber-600">
                                        ₪{liveInfluencers.reduce((s, inf) => s + computePay(inf, !!inf.vat_included).total * 0.05, 0).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                                    </td>
                                    <td className="px-4 py-3" />
                                    <td className="px-4 py-3" />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Coupon table */}
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
