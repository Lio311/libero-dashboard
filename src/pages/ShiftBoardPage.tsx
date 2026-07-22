import { useState, useEffect } from 'react';

import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { ChevronRight, ChevronLeft, Clock, Trash2, Pencil, X } from 'lucide-react';

interface Shift {
    id: number;
    employee_name: string;
    start_time: string;
    end_time: string;
    is_vacation: boolean;
    category?: 'store' | 'warehouse';
}

export function ShiftBoardPage() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [shifts, setShifts] = useState<Shift[]>([]);

    // Edit State
    const [editingShift, setEditingShift] = useState<Shift | null>(null);
    const [editStartTime, setEditStartTime] = useState('');
    const [editEndTime, setEditEndTime] = useState('');
    const [editIsVacation, setEditIsVacation] = useState(false);

    useEffect(() => {
        fetchShifts();
    }, [currentMonth]);

    const fetchShifts = async () => {
        const start = startOfMonth(currentMonth).toISOString();
        const end = endOfMonth(currentMonth).toISOString();

        const { data, error } = await supabase
            .from('shifts')
            .select('*')
            .gte('start_time', start)
            .lte('start_time', end);

        if (error) {
            console.error('Error fetching shifts:', error);
        } else {
            setShifts(data || []);
        }
    };

    const handleDeleteShift = async (id: number) => {
        if (!confirm('האם אתה בטוח שברצונך למחוק משמרת זו?')) return;

        const { error } = await supabase.from('shifts').delete().eq('id', id);
        if (!error) {
            fetchShifts();
        }
    };

    const handleEditClick = (shift: Shift) => {
        setEditingShift(shift);
        setEditStartTime(format(new Date(shift.start_time), 'HH:mm'));
        setEditEndTime(format(new Date(shift.end_time), 'HH:mm'));
        setEditIsVacation(shift.is_vacation);
    };

    const handleUpdateShift = async () => {
        if (!editingShift) return;

        try {
            // Reconstruct full dates from original shift dates + new times
            const startDateTime = new Date(editingShift.start_time);
            const [startHour, startMinute] = editStartTime.split(':').map(Number);
            startDateTime.setHours(startHour, startMinute);

            const endDateTime = new Date(editingShift.end_time);
            const [endHour, endMinute] = editEndTime.split(':').map(Number);
            endDateTime.setHours(endHour, endMinute);

            const { error } = await supabase
                .from('shifts')
                .update({
                    start_time: startDateTime.toISOString(),
                    end_time: endDateTime.toISOString(),
                    is_vacation: editIsVacation
                })
                .eq('id', editingShift.id);

            if (error) throw error;

            setEditingShift(null);
            fetchShifts();
        } catch (error) {
            console.error('Error updating shift:', error);
        }
    };

    const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 }),
    });

    const getShiftsForDay = (date: Date) => {
        return shifts.filter(shift => isSameDay(new Date(shift.start_time), date));
    };

    const employeeColors: Record<string, string> = {
        'אריאל': 'bg-blue-100 text-blue-800 border-blue-200',
        'אבישי': 'bg-green-100 text-green-800 border-green-200',
        'יוליה': 'bg-purple-100 text-purple-800 border-purple-200',
        'יהודה': 'bg-orange-100 text-orange-800 border-orange-200',
        'אור-דוד': 'bg-sky-100 text-sky-800 border-sky-200',
        'ישראל': 'bg-red-100 text-red-800 border-red-200',
        'עדיאל': 'bg-teal-100 text-teal-800 border-teal-200',
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-gray-900">לוח משמרות</h1>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-lg shadow p-1">
                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-md">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <span className="font-semibold px-4 min-w-[150px] text-center">
                        {format(currentMonth, 'MMMM yyyy', { locale: he })}
                    </span>
                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-md">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                    {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'].map((day) => (
                        <div key={day} className="py-3 text-center text-sm font-semibold text-gray-600">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-px">
                    {days.map((day) => {
                        const dayShifts = getShiftsForDay(day);
                        const isCurrentMonth = isSameMonth(day, currentMonth);

                        return (
                            <div
                                key={day.toISOString()}
                                className={`min-h-[140px] bg-white p-2 ${!isCurrentMonth ? 'bg-gray-50/50' : ''
                                    }`}
                            >
                                <div className={`text-sm font-medium mb-2 ${isSameDay(day, new Date())
                                    ? 'w-6 h-6 flex items-center justify-center bg-blue-600 text-white rounded-full ml-auto'
                                    : 'text-gray-500 text-left ml-auto w-max'
                                    }`}>
                                    {format(day, 'd')}
                                </div>

                                <div className="space-y-1.5">
                                    {dayShifts.map((shift) => (
                                        <div
                                            key={shift.id}
                                            className={`group relative text-xs p-2 rounded-md border shadow-sm transition-all hover:shadow-md ${shift.is_vacation
                                                ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                                                : employeeColors[shift.employee_name] || 'bg-gray-100 text-gray-800'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-1">
                                                    <span className="font-bold">{shift.employee_name}</span>
                                                    {shift.category === 'store' && <span className="text-[10px] bg-white/50 px-1 rounded">חנות</span>}
                                                    {shift.category === 'warehouse' && <span className="text-[10px] bg-white/50 px-1 rounded">מחסן</span>}
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/50 rounded backdrop-blur-sm">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEditClick(shift); }}
                                                        className="p-1 hover:bg-blue-100 text-blue-600 rounded"
                                                        title="ערוך"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteShift(shift.id); }}
                                                        className="p-1 hover:bg-red-100 text-red-600 rounded"
                                                        title="מחק"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>

                                            {shift.is_vacation ? (
                                                <div className="mt-1 flex items-center gap-1 opacity-75">
                                                    <span>🏖️ חופש</span>
                                                </div>
                                            ) : (
                                                <div className="mt-1 flex items-center gap-1 opacity-75 dir-ltr">
                                                    <Clock className="w-3 h-3" />
                                                    {format(new Date(shift.start_time), 'HH:mm')} - {format(new Date(shift.end_time), 'HH:mm')}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Edit Modal */}
            {editingShift && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg">עריכת משמרת - {editingShift.employee_name}</h3>
                            <button onClick={() => setEditingShift(null)} className="p-1 hover:bg-gray-200 rounded-full">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                                <input
                                    type="checkbox"
                                    id="edit-vacation"
                                    checked={editIsVacation}
                                    onChange={(e) => setEditIsVacation(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="edit-vacation" className="text-gray-700 font-medium select-none">
                                    אני בחופש ביום זה 🏖️
                                </label>
                            </div>

                            {!editIsVacation && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">התחלה</label>
                                        <input
                                            type="time"
                                            value={editStartTime}
                                            onChange={(e) => setEditStartTime(e.target.value)}
                                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">סיום</label>
                                        <input
                                            type="time"
                                            value={editEndTime}
                                            onChange={(e) => setEditEndTime(e.target.value)}
                                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={() => setEditingShift(null)}
                                    className="flex-1 py-2 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
                                >
                                    ביטול
                                </button>
                                <button
                                    onClick={handleUpdateShift}
                                    className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                                >
                                    שמור שינויים
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
