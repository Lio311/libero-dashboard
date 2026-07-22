import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { PackageCheck, Search, AlertTriangle, X, Clock, Hash, CheckCircle2, Trash2 } from 'lucide-react';

interface ShipmentEntry {
    id: number;
    shipment_number: string;
    entered_at: string;
    is_self_pickup: boolean;
    is_collected: boolean;
}

export function PackageDeliveryPage() {
    const [shipmentNumber, setShipmentNumber] = useState('');
    const [recentDeliveries, setRecentDeliveries] = useState<ShipmentEntry[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [inputError, setInputError] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

    const fetchRecentDeliveries = useCallback(async () => {
        const { data, error } = await supabase
            .from('warehouse_shipments')
            .select('*')
            .eq('is_collected', true)
            .order('entered_at', { ascending: false })
            .limit(10);

        if (!error && data) {
            setRecentDeliveries(data);
        }
    }, []);

    useEffect(() => {
        fetchRecentDeliveries();
    }, [fetchRecentDeliveries]);

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

    const handleShipmentNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
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
            await fetchRecentDeliveries();
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
        setErrorMessage('');
        setInputError('');

        try {
            // Find the shipment in warehouse_shipments
            const { data: existing, error: searchError } = await supabase
                .from('warehouse_shipments')
                .select('*')
                .eq('shipment_number', trimmed)
                .order('entered_at', { ascending: false })
                .limit(1);

            if (searchError) throw searchError;

            if (!existing || existing.length === 0) {
                setErrorMessage(`מספר משלוח ${trimmed} לא נמצא במערכת. יש להזין אותו קודם בעמוד המחסן.`);
                setIsSubmitting(false);
                return;
            }

            const shipment = existing[0];

            if (!shipment.is_self_pickup) {
                setErrorMessage(`מספר משלוח ${trimmed} לא הוגדר כאיסוף עצמי. ניתן לסמן מסירה רק למשלוחים שהוגדרו כאיסוף עצמי.`);
                setIsSubmitting(false);
                return;
            }

            if (shipment.is_collected) {
                setErrorMessage(`מספר משלוח ${trimmed} כבר סומן כנמסר בתאריך ${formatDate(shipment.entered_at)}`);
                setIsSubmitting(false);
                return;
            }

            // Mark as collected
            const { error: updateError } = await supabase
                .from('warehouse_shipments')
                .update({ is_collected: true })
                .eq('id', shipment.id);

            if (updateError) throw updateError;

            setShipmentNumber('');
            setSuccessMessage(`מספר משלוח ${trimmed} סומן כנמסר בהצלחה! ✓`);
            await fetchRecentDeliveries();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error:', err);
            setErrorMessage('אירעה שגיאה. אנא נסה שנית.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50" dir="rtl">
            <div className="max-w-lg mx-auto p-4 py-8">
                {/* Header */}
                <div className="bg-gradient-to-l from-emerald-600 to-green-600 rounded-2xl shadow-xl p-6 text-white text-center mb-6">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <PackageCheck className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold">מסירת חבילות</h1>
                    <p className="mt-2 opacity-90 text-sm">הזן מספר משלוח לסימון כנמסר</p>
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
                                    className={`w-full pr-10 pl-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-lg ${inputError ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : 'border-slate-200'}`}
                                    autoFocus
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting || !shipmentNumber.trim()}
                                className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                                {isSubmitting ? '...' : 'נמסר ✓'}
                            </button>
                        </div>
                        {inputError && (
                            <p className="text-red-500 text-sm font-medium">{inputError}</p>
                        )}
                    </form>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-4 mb-6 flex items-center gap-2 animate-fade-in">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium">{successMessage}</span>
                    </div>
                )}

                {/* Error Message */}
                {errorMessage && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 flex items-center gap-2 animate-fade-in">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium">{errorMessage}</span>
                        <button onClick={() => setErrorMessage('')} className="mr-auto p-1 hover:bg-red-100 rounded-lg">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Recent Deliveries Table */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-green-100 bg-green-50">
                        <h2 className="font-bold text-green-700 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-green-500" />
                            10 מסירות אחרונות
                        </h2>
                    </div>

                    {recentDeliveries.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            <PackageCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>אין מסירות עדיין</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {recentDeliveries.map((entry, index) => (
                                <div
                                    key={entry.id}
                                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
                                >
                                    <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
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
            </div>

            <style>{`
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
