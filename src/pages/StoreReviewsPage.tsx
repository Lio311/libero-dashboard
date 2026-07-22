import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Save, FileCheck, Trophy, TrendingUp, Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Pencil, Trash2, StickyNote } from 'lucide-react';
import { MonthNavigator } from '../components/MonthNavigator';

const EMPLOYEES = ['אריאל', 'אבישי', 'יוליה', 'יהודה', 'אור-דוד'];

const INITIAL_FORM_STATE = {
    cleanliness_score: '',
    warehouse_organization_score: '',
    shelf_arrangement_score: '',
    floor_cleanliness_score: '',
    stock_in_display_score: '',
    drawer_order_score: '',
    cash_register_score: '',
    employee_appearance_score: '',
    opening_on_time_score: '',
    whatsapp_response_score: '',
    phone_response_score: '',
    story_photo_score: '',
    music_score: '',
    morning_employee: [] as string[],
    evening_employee: [] as string[],
    notes: ''
};

export function StoreReviewsPage() {
    const [activeTab, setActiveTab] = useState<'form' | 'analytics'>('form');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Calendar State
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Analytics Data
    const [analyticsData, setAnalyticsData] = useState<any[]>([]);
    const [selectedReview, setSelectedReview] = useState<any | null>(null);

    // Form State
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);

    // Calculate total score live
    const calculateTotal = () => {
        const scores = [
            formData.cleanliness_score, formData.warehouse_organization_score, formData.shelf_arrangement_score,
            formData.floor_cleanliness_score, formData.stock_in_display_score, formData.drawer_order_score,
            formData.cash_register_score, formData.employee_appearance_score, formData.opening_on_time_score,
            formData.whatsapp_response_score, formData.phone_response_score, formData.story_photo_score,
            formData.music_score
        ].map(s => Number(s) || 0);

        const sum = scores.reduce((a, b) => a + b, 0);
        const count = scores.length; // Assuming all 12 fields are scored 1-10
        return count === 0 ? 0 : Math.round((sum / (count * 10)) * 100); // Normalize to 100
    };

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleEmployee = (shift: 'morning_employee' | 'evening_employee', employee: string) => {
        setFormData(prev => {
            const current = prev[shift] as string[];
            if (current.includes(employee)) {
                return { ...prev, [shift]: current.filter(e => e !== employee) };
            } else {
                return { ...prev, [shift]: [...current, employee] };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const totalScore = calculateTotal();

            // Sanitize data: Convert empty strings to null for numeric fields
            // Convert employee arrays to comma-separated strings
            const sanitizedData = Object.fromEntries(
                Object.entries(formData).map(([key, value]) => {
                    if (key.endsWith('_score')) {
                        return [key, value === '' ? null : Number(value)];
                    }
                    if (key === 'morning_employee' || key === 'evening_employee') {
                        return [key, (value as string[]).join(', ')];
                    }
                    return [key, value];
                })
            );

            const { error } = await supabase.from('store_reviews').upsert({
                review_date: selectedDate,
                ...sanitizedData,
                total_score: totalScore
            }, { onConflict: 'review_date' });

            if (error) throw error;

            setSuccessMessage('הביקורת נשמרה בהצלחה!');
            setFormData(INITIAL_FORM_STATE);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error saving review:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'analytics') {
            fetchAnalytics();
        }
    }, [activeTab, currentMonth]);

    const handlePointClick = (payload: any) => {
        // Handle different payload structures from Recharts
        const data = payload?.payload || payload;
        if (data && data.fullData) {
            setSelectedReview(data.fullData);
        }
    };

    const handleDeleteReview = async () => {
        if (!selectedReview) return;
        if (!confirm('האם אתה בטוח שברצונך למחוק ביקורת זו?')) return;

        try {
            const { error } = await supabase
                .from('store_reviews')
                .delete()
                .eq('id', selectedReview.id);

            if (error) throw error;

            setSelectedReview(null);
            fetchAnalytics();
        } catch (error) {
            console.error('Error deleting review:', error);
        }
    };

    const handleEditReview = () => {
        if (!selectedReview) return;

        // Populate form with existing data (converting numbers to strings)
        const newFormData: any = { ...INITIAL_FORM_STATE };
        Object.keys(newFormData).forEach(key => {
            if (key in selectedReview) {
                const val = selectedReview[key];
                if (key === 'morning_employee' || key === 'evening_employee') {
                    newFormData[key] = val ? String(val).split(', ').filter(Boolean) : [];
                } else {
                    newFormData[key] = val === null ? '' : String(val);
                }
            }
        });

        setFormData(newFormData);
        setSelectedDate(selectedReview.review_date);
        setSelectedReview(null);
        setActiveTab('form');
    };

    const fetchAnalytics = async () => {
        const start = startOfMonth(currentMonth).toISOString();
        const end = endOfMonth(currentMonth).toISOString();

        const { data, error } = await supabase
            .from('store_reviews')
            .select('*')
            .gte('review_date', start)
            .lte('review_date', end)
            .order('review_date', { ascending: true });

        if (!error && data) {
            // Fill in missing days
            const days = eachDayOfInterval({ start: new Date(start), end: new Date(end) });
            const chartData = days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const entry = data.find(d => d.review_date === dateStr);
                return {
                    date: format(day, 'd/M'),
                    score: entry ? entry.total_score : null,
                    fullData: entry || null
                };
            });
            setAnalyticsData(chartData);
        }
    };

    const renderScoreInput = (field: string, label: string) => (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <label className="text-gray-700 font-medium">{label}</label>
            <input
                type="number"
                min="1"
                max="10"
                value={formData[field as keyof typeof formData] as string}
                onChange={(e) => handleInputChange(field, e.target.value)}
                className="w-20 p-2 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="1-10"
            />
        </div>
    );

    const renderEmployeeSelect = (shift: 'morning_employee' | 'evening_employee', label: string) => (
        <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <div className="relative">
                <select
                    onChange={(e) => {
                        if (e.target.value) {
                            toggleEmployee(shift, e.target.value);
                            e.target.value = ''; // Reset select after selection
                        }
                    }}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white mb-2"
                    defaultValue=""
                >
                    <option value="" disabled>בחר עובד/ת</option>
                    {EMPLOYEES.filter(emp => !formData[shift].includes(emp)).map(name => (
                        <option key={name} value={name}>{name}</option>
                    ))}
                </select>

                <div className="flex flex-wrap gap-2">
                    {formData[shift].map((emp: string) => (
                        <div key={emp} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                            <span>{emp}</span>
                            <button
                                type="button"
                                onClick={() => toggleEmployee(shift, emp)}
                                className="hover:text-blue-600 focus:outline-none"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">ביקורת חנות</h1>
                    <p className="text-gray-500 mt-1">ניהול ומעקב אחר איכות תפעול החנות</p>
                </div>

                <div className="flex p-1 bg-gray-100 rounded-lg">
                    <button
                        onClick={() => setActiveTab('form')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'form' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        טופס ביקורת
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'analytics' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        נתונים וגרפים
                    </button>
                </div>
            </div>

            {activeTab === 'form' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <form onSubmit={handleSubmit} className="p-6 space-y-8">
                        <div className="flex flex-wrap items-end gap-6 pb-6 border-b">
                            <div className="flex-1 min-w-[200px] relative">
                                <label className="block text-sm font-medium text-gray-700 mb-2">תאריך הביקורת</label>
                                <button
                                    type="button"
                                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                                    className={`w-full p-2.5 bg-white border rounded-lg flex items-center gap-2 transition-all ${isCalendarOpen ? 'ring-2 ring-blue-500 border-transparent' : 'border-gray-300 hover:border-blue-400'
                                        }`}
                                >
                                    <CalendarIcon className="w-5 h-5 text-gray-500" />
                                    <span className="flex-1 text-right text-gray-900">
                                        {format(new Date(selectedDate), 'd בMMMM yyyy', { locale: he })}
                                    </span>
                                </button>

                                {isCalendarOpen && (
                                    <div className="absolute top-full mt-2 right-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 animate-fade-in w-[320px]">
                                        <div className="flex items-center justify-between mb-4">
                                            <button
                                                type="button"
                                                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                                className="p-1 hover:bg-gray-100 rounded-full text-gray-600"
                                            >
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                            <div className="font-bold text-gray-900 text-lg">
                                                {format(currentMonth, 'MMMM yyyy', { locale: he })}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                                className="p-1 hover:bg-gray-100 rounded-full text-gray-600"
                                            >
                                                <ChevronLeft className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-7 mb-2">
                                            {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((day) => (
                                                <div key={day} className="text-center text-xs font-bold text-gray-400 py-1">
                                                    {day}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-7 gap-1">
                                            {eachDayOfInterval({
                                                start: startOfMonth(currentMonth),
                                                end: endOfMonth(currentMonth)
                                            }).map((date, idx) => {
                                                const isSelected = isSameDay(date, new Date(selectedDate));
                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedDate(format(date, 'yyyy-MM-dd'));
                                                            setIsCalendarOpen(false);
                                                        }}
                                                        className={`aspect-square rounded-full text-sm font-medium flex items-center justify-center transition-all ${isSelected
                                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                                            : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                                                            }`}
                                                    >
                                                        {format(date, 'd')}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {renderEmployeeSelect('morning_employee', 'עובד בוקר')}
                            {renderEmployeeSelect('evening_employee', 'עובד ערב')}
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 text-right">
                            {/* Category: Cleanliness & Order */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                                    <FileCheck className="w-5 h-5 text-blue-600" />
                                    ניקיון וסדר
                                </h3>
                                {renderScoreInput('cleanliness_score', 'סדר וניקיון במדפים')}
                                {renderScoreInput('warehouse_organization_score', 'ניקיון וארגון מחסן')}
                                {renderScoreInput('shelf_arrangement_score', 'סידור מדפים ופייסים')}
                                {renderScoreInput('floor_cleanliness_score', 'ניקיון רצפה')}
                                {renderScoreInput('stock_in_display_score', 'מלאי בתצוגה')}
                                {renderScoreInput('drawer_order_score', 'סדר במגירות')}
                            </div>

                            {/* Category: Money */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-yellow-600" />
                                    כספים וקופה
                                </h3>
                                {renderScoreInput('cash_register_score', 'פתיחה וסגירת קופה')}
                            </div>

                            {/* Category: Communication */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-green-600" />
                                    תקשורת ומענה
                                </h3>
                                {renderScoreInput('employee_appearance_score', 'ייצוגיות העובדים')}
                                {renderScoreInput('opening_on_time_score', 'פתיחה בזמן')}
                                {renderScoreInput('whatsapp_response_score', 'מענה בוואטסאפ')}
                                {renderScoreInput('phone_response_score', 'מענה לטלפון / זמינות')}
                                {renderScoreInput('story_photo_score', 'צילום סטורי')}
                                {renderScoreInput('music_score', 'מוזיקה בחנות')}
                            </div>
                        </div>

                        {/* Notes Section */}
                        <div className="pt-6 border-t">
                            <label className="block text-sm font-medium text-gray-700 mb-2">הערות נוספות</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => handleInputChange('notes', e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                                placeholder="הערות לסיכום יום, דגשים למחרת, וכו'..."
                            />
                        </div>

                        {/* Actions & Summary */}
                        <div className="pt-6 border-t flex items-center justify-between">
                            <div className="text-xl font-bold">
                                ציון יומי משוקלל: <span className={`${calculateTotal() > 80 ? 'text-green-600' : calculateTotal() > 50 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>{calculateTotal()}/100</span>
                            </div>

                            <div className="flex items-center gap-4">
                                {successMessage && <span className="text-green-600 font-medium animate-pulse">{successMessage}</span>}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                                >
                                    שמור ביקורת
                                    <Save className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold">מגמת ציונים חודשית</h3>
                        <MonthNavigator currentDate={currentMonth} onDateChange={setCurrentMonth} />
                    </div>
                    <div className="text-center text-sm text-gray-500 mb-6 flex items-center justify-center gap-2">
                        <span>לחץ על נקודה בגרף לעריכה או מחיקה</span>
                        <Pencil className="w-3 h-3" />
                    </div>
                    <div className="h-[400px] w-full dir-ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analyticsData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" />
                                <YAxis domain={[0, 100]} width={40} />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="score"
                                    stroke="#2563eb"
                                    strokeWidth={3}
                                    name="ציון יומי"
                                    dot={{
                                        r: 6,
                                        fill: '#2563eb',
                                        strokeWidth: 2,
                                        cursor: 'pointer',
                                        onClick: (_: any, payload: any) => handlePointClick(payload)
                                    }}
                                    activeDot={{
                                        r: 8,
                                        fill: '#2563eb',
                                        cursor: 'pointer',
                                        onClick: (_: any, payload: any) => handlePointClick(payload)
                                    }}
                                    connectNulls
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Notes List */}
                    <div className="mt-8 border-t pt-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <StickyNote className="w-5 h-5 text-gray-600" />
                            הערות ביקורת
                        </h3>
                        <div className="space-y-3">
                            {analyticsData
                                .filter(item => item.fullData && item.fullData.notes)
                                .map((item, idx) => (
                                    <div key={idx} className="flex items-start justify-between bg-gray-50 p-4 rounded-lg border border-gray-100">
                                        <div className="font-bold text-gray-900 whitespace-nowrap min-w-[100px] text-right border-l pl-4 ml-4">
                                            {format(new Date(item.fullData.review_date), 'd/M/yyyy')}
                                        </div>
                                        <div className="text-gray-700 flex-1 text-right">
                                            {item.fullData.notes}
                                        </div>
                                    </div>
                                ))}
                            {analyticsData.filter(item => item.fullData && item.fullData.notes).length === 0 && (
                                <p className="text-center text-gray-500 py-4">אין הערות לחודש זה</p>
                            )}
                        </div>
                    </div>

                    {/* Edit/Delete Selection Modal */}
                    {selectedReview && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in text-right">
                                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                                    <button onClick={() => setSelectedReview(null)} className="p-1 hover:bg-gray-200 rounded-full">
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                    <h3 className="font-bold text-lg">ניהול ביקורת</h3>
                                </div>

                                <div className="p-6 space-y-4">
                                    <div className="text-center mb-6">
                                        <div className="text-gray-500 text-sm mb-1">
                                            {format(new Date(selectedReview.review_date), 'd בMMMM yyyy', { locale: he })}
                                        </div>
                                        <div className="text-4xl font-bold text-blue-600 mb-2">
                                            {selectedReview.total_score}
                                        </div>
                                        <div className="inline-block bg-blue-50 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mb-4">
                                            ציון משוקלל
                                        </div>
                                        {selectedReview.notes && (
                                            <div className="text-gray-600 bg-gray-50 p-3 rounded-lg text-sm">
                                                {selectedReview.notes}
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={handleDeleteReview}
                                            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-red-100 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-200 transition-all group"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                                <Trash2 className="w-5 h-5" />
                                            </div>
                                            <span className="font-bold">מחיקה</span>
                                        </button>

                                        <button
                                            onClick={handleEditReview}
                                            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:border-blue-200 transition-all group"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                                <Pencil className="w-5 h-5" />
                                            </div>
                                            <span className="font-bold">עריכה</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
