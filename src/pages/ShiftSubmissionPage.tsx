import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, addWeeks, isAfter, isBefore, startOfDay, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const STORE_EMPLOYEES = ['יהודה', 'אריאל', 'אבישי', 'יוליה', 'אור-דוד'];
const WAREHOUSE_EMPLOYEES = ['ישראל', 'עדיאל'];

type Category = 'store' | 'warehouse';

export function ShiftSubmissionPage() {
    const [selectedCategory, setSelectedCategory] = useState<Category>('store');
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDates, setSelectedDates] = useState<Date[]>([]);
    const [startTime, setStartTime] = useState('10:00');
    const [endTime, setEndTime] = useState('20:00');
    const [isVacation, setIsVacation] = useState(false);
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const currentEmployees = selectedCategory === 'warehouse' ? WAREHOUSE_EMPLOYEES : STORE_EMPLOYEES;

    const today = startOfDay(new Date());
    const minDate = addWeeks(today, 1);
    const maxDate = addMonths(today, 1);

    const daysInMonth = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 }),
    });

    const isDateSelectable = (date: Date) => {
        const isSaturday = date.getDay() === 6;
        return !isSaturday &&
            (isAfter(date, minDate) || isSameDay(date, minDate)) &&
            (isBefore(date, maxDate) || isSameDay(date, maxDate));
    };

    const handleDateClick = (date: Date) => {
        if (!isDateSelectable(date)) return;

        setSelectedDates(prev => {
            const exists = prev.some(d => isSameDay(d, date));
            if (exists) {
                return prev.filter(d => !isSameDay(d, date));
            } else {
                return [...prev, date];
            }
        });

        // Set default times based on the last selected date (or the current one if it's the first)
        // Note: Logic for Friday defaults might need adjustment if multiple days are mixed, 
        // but keeping it simple: if the clicked date is Friday, suggest Friday times.
        const dayOfWeek = date.getDay(); // 0 is Sunday, 5 is Friday
        if (dayOfWeek === 5) {
            setStartTime('09:30');
            setEndTime('13:00');
        } else if (selectedDates.length === 0) {
            // Only reset to default if it's the first selection
            setStartTime('10:00');
            setEndTime('20:00');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee || selectedDates.length === 0) {
            setStatus('error');
            setMessage('נא לבחור עובד ולפחות תאריך אחד');
            return;
        }

        // Validate all dates again just in case
        const invalidDates = selectedDates.filter(date => !isDateSelectable(date));
        if (invalidDates.length > 0) {
            setStatus('error');
            setMessage('חלק מהתאריכים שנבחרו אינם בטווח המותר');
            return;
        }

        setStatus('submitting');

        try {
            const shiftsToInsert = selectedDates.map(date => {
                const startDateTime = new Date(date);
                const [startHour, startMinute] = startTime.split(':').map(Number);
                startDateTime.setHours(startHour, startMinute);

                const endDateTime = new Date(date);
                const [endHour, endMinute] = endTime.split(':').map(Number);
                endDateTime.setHours(endHour, endMinute);

                return {
                    employee_name: selectedEmployee,
                    start_time: startDateTime.toISOString(),
                    end_time: endDateTime.toISOString(),
                    is_vacation: isVacation,
                    category: selectedCategory
                };
            });

            const { error } = await supabase.from('shifts').insert(shiftsToInsert);

            if (error) throw error;

            setStatus('success');
            setMessage(`הוגשו בהצלחה ${selectedDates.length} משמרות!`);

            // Reset form slightly but keep employee selected
            setSelectedDates([]);
            setIsVacation(false);
            setTimeout(() => setStatus('idle'), 3000);
        } catch (err) {
            console.error('Error submitting shifts:', err);
            setStatus('error');
            setMessage('אירעה שגיאה בשמירת המשמרות. אנא נסה שנית.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 direction-rtl" dir="rtl">
            <div className="max-w-md mx-auto p-4">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-blue-600 p-6 text-white text-center">
                        <h1 className="text-2xl font-bold">הגשת משמרות</h1>
                        <p className="mt-2 opacity-90">ניתן להגיש משמרות לטווח של שבוע ועד חודש מהיום</p>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Category Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">מחלקה</label>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <button
                                    type="button"
                                    onClick={() => { setSelectedCategory('store'); setSelectedEmployee(''); }}
                                    className={`p-3 rounded-xl border font-bold transition-all flex items-center justify-center gap-2 ${selectedCategory === 'store'
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-[1.02]'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <span>🏪</span>
                                    חנות
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setSelectedCategory('warehouse'); setSelectedEmployee(''); }}
                                    className={`p-3 rounded-xl border font-bold transition-all flex items-center justify-center gap-2 ${selectedCategory === 'warehouse'
                                        ? 'bg-orange-600 text-white border-orange-600 shadow-md transform scale-[1.02]'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <span>📦</span>
                                    מחסן
                                </button>
                            </div>
                        </div>

                        {/* Employee Selection */}
                        <div className={`transition-all duration-300 ${!selectedCategory ? 'opacity-50 grayscale pointer-events-none' : 'opacity-100'}`}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">שם העובד/ת</label>
                            <div className="grid grid-cols-3 gap-2">
                                {currentEmployees.map((name) => (
                                    <button
                                        key={name}
                                        type="button"
                                        onClick={() => setSelectedEmployee(name)}
                                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${selectedEmployee === name
                                            ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-200'
                                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        {name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Inline Calendar */}
                        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
                                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors">
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                                <div className="font-bold text-gray-900 text-lg">
                                    {format(currentMonth, 'MMMM yyyy', { locale: he })}
                                </div>
                                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors">
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-4">
                                <div className="grid grid-cols-7 mb-2">
                                    {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((day) => (
                                        <div key={day} className="text-center text-xs font-bold text-gray-400 py-1">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-7 gap-1">
                                    {daysInMonth.map((date, idx) => {
                                        const selectable = isDateSelectable(date);
                                        const isSelected = selectedDates.some(d => isSameDay(d, date));

                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    handleDateClick(date);
                                                }}
                                                disabled={!selectable}
                                                className={`aspect-square rounded-full text-sm font-medium flex items-center justify-center transition-all ${isSelected
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105'
                                                    : selectable
                                                        ? 'text-gray-700 hover:bg-blue-600 hover:text-white hover:scale-105'
                                                        : !isSameMonth(date, currentMonth)
                                                            ? 'text-gray-300 opacity-25'
                                                            : 'text-gray-300 cursor-not-allowed opacity-50'
                                                    }`}
                                            >
                                                {format(date, 'd')}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Time Settings */}
                        {selectedDates.length > 0 && (
                            <div className="animate-fade-in space-y-4">
                                <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                                    <span className="font-medium text-blue-900">
                                        נבחרו {selectedDates.length} ימים
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 mb-4">
                                    <input
                                        type="checkbox"
                                        id="vacation"
                                        checked={isVacation}
                                        onChange={(e) => setIsVacation(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor="vacation" className="text-gray-700 font-medium select-none">
                                        אני בחופש בימים אלו 🏖️
                                    </label>
                                </div>

                                {!isVacation && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">התחלה</label>
                                            <input
                                                type="time"
                                                value={startTime}
                                                onChange={(e) => setStartTime(e.target.value)}
                                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">סיום</label>
                                            <input
                                                type="time"
                                                value={endTime}
                                                onChange={(e) => setEndTime(e.target.value)}
                                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleSubmit}
                                    disabled={status === 'submitting'}
                                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {status === 'submitting' ? (
                                        'שולח...'
                                    ) : (
                                        <>
                                            שלח {selectedDates.length} משמרות
                                            <Check className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Status Messages */}
                        {status === 'success' && (
                            <div className="p-4 bg-green-50 text-green-700 rounded-xl flex items-center gap-2 animate-fade-in">
                                <Check className="w-5 h-5" />
                                <span>{message}</span>
                            </div>
                        )}
                        {status === 'error' && (
                            <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 animate-fade-in">
                                <AlertCircle className="w-5 h-5" />
                                <span>{message}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
