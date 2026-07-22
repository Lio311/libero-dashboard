import React, { useState, useEffect } from 'react';
import { Lock, ArrowLeft } from 'lucide-react';

interface PasswordGateProps {
    children: React.ReactNode;
}

export const PasswordGate = ({ children }: PasswordGateProps) => {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [error, setError] = useState(false);

    const CORRECT_PASSWORD = 'tal1542026';

    useEffect(() => {
        const stored = sessionStorage.getItem('coupon_access_granted');
        if (stored === 'true') {
            setIsAuthenticated(true);
        }
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password.trim().toLowerCase() === CORRECT_PASSWORD.toLowerCase()) {
            setIsAuthenticated(true);
            sessionStorage.setItem('coupon_access_granted', 'true');
            setError(false);
        } else {
            setError(true);
            setPassword('');
        }
    };

    if (isAuthenticated) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4 md:p-6" dir="rtl">
            <div className="max-w-md w-full bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-2xl shadow-black/5 border border-black/[0.05] p-6 md:p-10 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-[#0071e3]/[0.05] rounded-[1.5rem] flex items-center justify-center mx-auto mb-8">
                    <Lock className="text-[#0071e3]" size={36} />
                </div>
                
                <h1 className="text-3xl font-bold text-slate-900 mb-3">כניסה מאובטחת</h1>
                <p className="text-[#6d6d6d] mb-10 text-lg font-medium">אנא הזן את הסיסמה כדי לצפות בנתונים</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative group">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="הזן סיסמה..."
                            className={`w-full px-6 py-4 bg-[#f5f5f7] border ${error ? 'border-red-500' : 'border-black/[0.05]'} rounded-2xl text-center text-xl font-bold text-[#1d1d1f] focus:outline-none focus:ring-4 focus:ring-[#0071e3]/10 transition-all placeholder:text-[#6d6d6d]/40`}
                            autoFocus
                        />
                        {error && (
                            <p className="text-red-500 text-sm font-bold mt-2 animate-bounce">סיסמה שגויה, נסה שוב</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 bg-[#1d1d1f] text-white rounded-2xl text-lg font-black hover:bg-[#000000] active:scale-[0.98] transition-all shadow-xl shadow-black/10"
                    >
                        כניסה למערכת
                    </button>
                </form>

                <div className="mt-12 flex items-center justify-center gap-2 text-[#6d6d6d]">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-xs font-bold uppercase tracking-widest opacity-60">Secure Access Point</span>
                </div>
            </div>
        </div>
    );
};
