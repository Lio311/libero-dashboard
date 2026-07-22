import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // 1. Admin/Hardcoded Login
        if (username === 'admin' && password === 'libero2020') {
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('userRole', 'admin');
            localStorage.setItem('userName', 'Lior Zafrir');
            window.location.href = '/';
            return;
        }

        if (username === 'Tal' && password === 'libero2023') {
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('userRole', 'store_manager');
            localStorage.setItem('userName', 'Tal');
            window.location.href = '/store-reviews';
            return;
        }

        // 2. Bonus Employee Login (from DB)
        try {
            const { data, error } = await supabase
                .from('bonus_employees')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .single();

            if (error || !data) {
                setError('שם משתמש או סיסמה שגויים');
                return;
            }

            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('userRole', 'bonus_employee');
            localStorage.setItem('userId', data.id.toString());
            localStorage.setItem('userName', data.full_name);
            window.location.href = '/bonus-dashboard';
        } catch (err) {
            console.error('Login error:', err);
            setError('שגיאה בתהליך ההתחברות');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                        <Lock size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">התחברות למערכת</h1>
                    <p className="text-slate-500 mt-2">אנא הזן את פרטי ההתחברות שלך</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            שם משתמש
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="הזן שם משתמש"
                            dir="rtl"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            סיסמה
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="הזן סיסמה"
                            dir="rtl"
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-primary/20"
                    >
                        התחבר
                    </button>
                </form>
            </div>
        </div>
    );
};
