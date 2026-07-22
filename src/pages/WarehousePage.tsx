import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Package, Search, AlertTriangle, X, Clock, Hash, UserCheck, Trash2 } from 'lucide-react';

interface ShipmentEntry {
    id: number;
    shipment_number: string;
    entered_at: string;
    is_self_pickup: boolean;
    is_collected: boolean;
}

interface DuplicateInfo {
    shipment_number: string;
    entered_at: string;
}

export function WarehousePage() {
    const [shipmentNumber, setShipmentNumber] = useState('');
    const [isSelfPickup, setIsSelfPickup] = useState(false);
    const [recentEntries, setRecentEntries] = useState<ShipmentEntry[]>([]);
    const [selfPickupEntries, setSelfPickupEntries] = useState<ShipmentEntry[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [inputError, setInputError] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

    const fetchRecentEntries = useCallback(async () => {
        const { data, error } = await supabase
            .from('warehouse_shipments')
            .select('*')
            .order('entered_at', { ascending: false })
            .limit(10);

        if (!error && data) {
            setRecentEntries(data);
        }
    }, []);

    const fetchSelfPickupEntries = useCallback(async () => {
        const { data, error } = await supabase
            .from('warehouse_shipments')
            .select('*')
            .eq('is_self_pickup', true)
            .eq('is_collected', false)
            .order('entered_at', { ascending: false });

        if (!error && data) {
            setSelfPickupEntries(data);
        }
    }, []);

    useEffect(() => {
        fetchRecentEntries();
        fetchSelfPickupEntries();
    }, [fetchRecentEntries, fetchSelfPickupEntries]);

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('he-IL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString('he-IL', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const isOverdue = (enteredAt: string) => {
        const entered = new Date(enteredAt);
        const now = new Date();
        const diffMs = now.getTime() - entered.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays > 7;
    };

    const handleShipmentNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Allow only digits
        if (value === '' || /^\d+$/.test(value)) {
            setShipmentNumber(value);
            setInputError('');
        } else {
            setInputError('ניתן להזין מספרים בלבד');
        }
    };


    const handleDelete = async (id: number) => {
        const { error } = await supabase
            .from('warehouse_shipments')
            .delete()
            .eq('id', id);

        if (!error) {
            setDeleteConfirm(null);
            setSuccessMessage('הרשומה נמחקה בהצלחה');
            await fetchRecentEntries();
            await fetchSelfPickupEntries();
            setTimeout(() => setSuccessMessage(''), 3000);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = shipmentNumber.trim();
        if (!trimmed) return;

        if (!/^\d+$/.test(trimmed)) {
            setInputError('ניתן להזין מספרים בלבד');
            return;
        }

        setIsSubmitting(true);
        setSuccessMessage('');
        setDuplicateInfo(null);
        setInputError('');

        try {
            // Check for duplicates
            const { data: existing, error: searchError } = await supabase
                .from('warehouse_shipments')
                .select('shipment_number, entered_at')
                .eq('shipment_number', trimmed)
                .order('entered_at', { ascending: false })
                .limit(1);

            if (searchError) throw searchError;

            if (existing && existing.length > 0) {
                setDuplicateInfo(existing[0]);
                setIsSubmitting(false);
                return;
            }

            // Insert new entry
            const { error: insertError } = await supabase
                .from('warehouse_shipments')
                .insert({
                    shipment_number: trimmed,
                    is_self_pickup: isSelfPickup,
                    is_collected: false,
                });

            if (insertError) throw insertError;

            setShipmentNumber('');
            setIsSelfPickup(false);
            setSuccessMessage(`מספר משלוח ${trimmed} נוסף בהצלחה!${isSelfPickup ? ' (איסוף עצמי)' : ''}`);
            await fetchRecentEntries();
            await fetchSelfPickupEntries();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" dir="rtl">
            <div className="max-w-6xl mx-auto p-4 py-8">
                {/* Header */}
                <div className="bg-gradient-to-l from-indigo-600 to-blue-600 rounded-2xl shadow-xl p-6 text-white text-center mb-6">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <Package className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold">מחסן - מעקב משלוחים</h1>
                    <p className="mt-2 opacity-90 text-sm">הזן מספר משלוח לרישום במערכת</p>
                </div>

                {/* Input Form */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-slate-100">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={shipmentNumber}
                                    onChange={handleShipmentNumberChange}
                                    placeholder="הזן מספר משלוח (מספרים בלבד)..."
                                    className={`w-full pr-10 pl-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg ${inputError ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : 'border-slate-200'}`}
                                    autoFocus
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting || !shipmentNumber.trim()}
                                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                                {isSubmitting ? '...' : 'הוסף'}
                            </button>
                        </div>
                        {inputError && (
                            <p className="text-red-500 text-sm font-medium">{inputError}</p>
                        )}
                        {/* Self Pickup Checkbox */}
                        <label className="flex items-center gap-3 cursor-pointer select-none group">
                            <input
                                type="checkbox"
                                checked={isSelfPickup}
                                onChange={(e) => setIsSelfPickup(e.target.checked)}
                                className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 border-slate-300"
                            />
                            <span className="flex items-center gap-2 text-slate-700 font-medium group-hover:text-orange-600 transition-colors">
                                <UserCheck className="w-5 h-5 text-orange-500" />
                                איסוף עצמי
                            </span>
                        </label>
                    </form>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-4 mb-6 flex items-center gap-2 animate-fade-in">
                        <span className="text-xl">✅</span>
                        <span className="font-medium">{successMessage}</span>
                    </div>
                )}

                {/* Duplicate Warning Popup */}
                {duplicateInfo && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDuplicateInfo(null)}>
                        <div
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-bounce-in"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-red-600 p-5 text-white flex items-center gap-3">
                                <AlertTriangle className="w-8 h-8 flex-shrink-0" />
                                <div>
                                    <h3 className="text-lg font-bold">שים לב! כפילות</h3>
                                    <p className="text-red-100 text-sm">יש לבצע בירור</p>
                                </div>
                                <button
                                    onClick={() => setDuplicateInfo(null)}
                                    className="mr-auto p-1 hover:bg-red-700 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 text-center space-y-4">
                                <p className="text-slate-700 text-lg leading-relaxed">
                                    מספר משלוח <strong className="text-red-600">{duplicateInfo.shipment_number}</strong> הוזן כבר
                                </p>
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                                    <div className="flex items-center justify-center gap-2 text-red-700">
                                        <span className="font-medium">בתאריך:</span>
                                        <span className="font-bold">{formatDate(duplicateInfo.entered_at)}</span>
                                    </div>
                                    <div className="flex items-center justify-center gap-2 text-red-700">
                                        <span className="font-medium">בשעה:</span>
                                        <span className="font-bold">{formatTime(duplicateInfo.entered_at)}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDuplicateInfo(null)}
                                    className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 active:scale-95 transition-all mt-2"
                                >
                                    הבנתי
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Two Column Layout: Recent Entries + Self Pickup */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Entries Table - Left */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden order-2 lg:order-1">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <h2 className="font-bold text-slate-700 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-blue-500" />
                                10 משלוחים אחרונים
                            </h2>
                        </div>

                        {recentEntries.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>אין רשומות עדיין</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {recentEntries.map((entry, index) => (
                                    <div
                                        key={entry.id}
                                        className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Hash className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                <span className="font-bold text-slate-800 truncate">{entry.shipment_number}</span>
                                                {entry.is_self_pickup && (
                                                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                                                        איסוף עצמי
                                                    </span>
                                                )}
                                                {entry.is_collected && (
                                                    <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                                                        נאסף ✓
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-left text-sm text-slate-500 flex-shrink-0">
                                            <div>{formatDate(entry.entered_at)}</div>
                                            <div className="text-slate-400">{formatTime(entry.entered_at)}</div>
                                        </div>
                                        {/* Delete Button */}
                                        {deleteConfirm === entry.id ? (
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <button
                                                    onClick={() => handleDelete(entry.id)}
                                                    className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg font-bold hover:bg-red-700 active:scale-95 transition-all"
                                                >
                                                    אישור
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(null)}
                                                    className="px-3 py-1.5 bg-slate-200 text-slate-600 text-xs rounded-lg font-bold hover:bg-slate-300 active:scale-95 transition-all"
                                                >
                                                    ביטול
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setDeleteConfirm(entry.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all flex-shrink-0"
                                                title="מחק רשומה"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Self Pickup Table - Right */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden order-1 lg:order-2">
                        <div className="px-6 py-4 border-b border-orange-100 bg-orange-50">
                            <h2 className="font-bold text-orange-700 flex items-center gap-2">
                                <UserCheck className="w-5 h-5 text-orange-500" />
                                איסוף עצמי — ממתינים לאיסוף
                            </h2>
                        </div>

                        {selfPickupEntries.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>אין משלוחים לאיסוף עצמי</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {selfPickupEntries.map((entry) => {
                                    const overdue = isOverdue(entry.entered_at);
                                    return (
                                        <div
                                            key={entry.id}
                                            className={`flex items-center gap-4 px-6 py-4 transition-colors ${overdue ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-50'}`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${overdue ? 'bg-red-200 text-red-700' : 'bg-orange-100 text-orange-600'}`}>
                                                📦
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Hash className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                    <span className={`font-bold truncate ${overdue ? 'text-red-700' : 'text-slate-800'}`}>
                                                        {entry.shipment_number}
                                                    </span>
                                                </div>
                                                <div className={`text-xs mt-1 ${overdue ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                                                    {overdue ? '⚠️ עברו 7 ימים — יש לברר!' : `${formatDate(entry.entered_at)} ${formatTime(entry.entered_at)}`}
                                                </div>
                                            </div>
                                            <div className="text-left text-sm text-slate-500 flex-shrink-0">
                                                <div>{formatDate(entry.entered_at)}</div>
                                                <div className="text-slate-400">{formatTime(entry.entered_at)}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes bounce-in {
                    0% { transform: scale(0.9); opacity: 0; }
                    50% { transform: scale(1.02); }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-bounce-in {
                    animation: bounce-in 0.3s ease-out;
                }
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
