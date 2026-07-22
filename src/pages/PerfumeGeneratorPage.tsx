import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Copy, Trash2, Loader2, Check, AlertCircle } from 'lucide-react';

// Using Vercel API functions for secure Gemini access
const geminiEndpoint = '/api/gemini-proxy';


interface HistoryItem {
    id: string;
    brand: string;
    name: string;
    title: string;
    body: string;
    timestamp: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetries = async (url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> => {
    try {
        const response = await fetch(url, options);
        if (!response.ok && response.status !== 401 && retries > 0) {
            await sleep(delay);
            return fetchWithRetries(url, options, retries - 1, delay * 2);
        }
        return response;
    } catch (err) {
        if (retries > 0) {
            await sleep(delay);
            return fetchWithRetries(url, options, retries - 1, delay * 2);
        }
        throw err;
    }
};

export const PerfumeGeneratorPage = () => {
    const [brand, setBrand] = useState('');
    const [name, setName] = useState('');
    const [type, setType] = useState('Eau de Parfum');
    const [volume, setVolume] = useState('');
    const [audience, setAudience] = useState('Unisex');
    const [length, setLength] = useState('Short');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [resultTitle, setResultTitle] = useState('');
    const [resultBody, setResultBody] = useState('');

    const [history, setHistory] = useState<HistoryItem[]>([]);

    const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
    const resultRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!document.getElementById('open-sans-font')) {
            const style = document.createElement('style');
            style.id = 'open-sans-font';
            style.innerHTML = `@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap');`;
            document.head.appendChild(style);
        }
    }, []);

    const handleCopy = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedStates(prev => ({ ...prev, [id]: true }));
            setTimeout(() => setCopiedStates(prev => ({ ...prev, [id]: false })), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const generateDescription = async () => {
        if (!brand || !name || !volume) {
            setError('אנא מלא את כל שדות החובה (מותג, שם בושם ונפח).');
            return;
        }

        setError(null);
        setLoading(true);

        try {
            const prompt = `
You are a professional perfume copywriter for a high-end luxury website writing in Hebrew.
AUTO-CORRECT TYPOS: Identify the correct official perfume/brand name if the user makes a typo.
Title Format: [Brand Name in Hebrew] [Perfume Name in Hebrew] [Type in Hebrew] [Brand Name English] [Perfume Name English] [Gender English] [Volume English] [Type English]
Volume Rule: Always use lowercase 'ml' (e.g., 100 ml).
Length Rule: If the user selects 'short', write exactly 4 punchy lines. If 'long', write 400-700 words describing top/heart/base notes, personality, and suitability.
CRITICAL FORMAT: Line 1 MUST be the Title. Line 2 onwards MUST be the Description. NO conversational intro/outro text.

User Request:
Brand: ${brand}
Perfume Name: ${name}
Type: ${type}
Volume: ${volume}
Target Audience: ${audience}
Length Setup: ${length === 'Short' ? 'short' : 'long'}
`;

            const payload = {
                contents: [{ parts: [{ text: prompt }] }],
                tools: [{ google_search: {} }]
            };

            const response = await fetchWithRetries(
                geminiEndpoint,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }
            );


            if (response.status === 401) {
                throw new Error('שגיאת אימות (401): מפתח ה-API אינו חוקי או חסר הרשאות מתאימות. אנא בדוק את הגדרת ה-API Key.');
            }

            if (!response.ok) {
                throw new Error(`שגיאת שרת: ${response.statusText}`);
            }

            const data = await response.json();
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!textResponse) {
                throw new Error('לא התקבל טקסט מהשרת.');
            }

            const lines = textResponse.trim().split('\n');
            const title = lines[0].replace(/\*/g, '').trim();
            const body = lines.slice(1).join('\n').trim();

            setResultTitle(title);
            setResultBody(body);

            const newItem: HistoryItem = {
                id: Date.now().toString(),
                brand,
                name,
                title,
                body,
                timestamp: Date.now()
            };

            setHistory(prev => [newItem, ...prev]);

            if (window.innerWidth < 1024) {
                setTimeout(() => {
                    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }

        } catch (err: any) {
            setError(err.message || 'אירעה שגיאה בעת יצירת התיאור. אנא נסה שוב.');
        } finally {
            setLoading(false);
        }
    };

    const loadHistoryItem = (item: HistoryItem) => {
        setBrand(item.brand);
        setName(item.name);
        setResultTitle(item.title);
        setResultBody(item.body);
        if (window.innerWidth < 1024) {
            setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }
    };

    const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setHistory(prev => prev.filter(item => item.id !== id));
    };

    return (
        <div dir="rtl" className="min-h-screen bg-gray-50 text-gray-900" style={{ fontFamily: "'Open Sans', sans-serif" }}>
            {/* HEADER */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-sky-100 p-2 rounded-xl text-sky-500 shadow-sm">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold leading-tight text-gray-900">מחולל תיאורי בשמים</h1>
                            <p className="text-xs text-gray-500 font-medium tracking-wide">AI LUXURY COPYWRITER</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* SIDEBAR FORM */}
                    <div className="w-full lg:w-1/3 flex flex-col gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="space-y-5">

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">מותג הבושם *</label>
                                    <input
                                        type="text"
                                        value={brand}
                                        onChange={(e) => setBrand(e.target.value)}
                                        placeholder="לדוגמה: Creed"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all text-[16px]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">שם הבושם *</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="לדוגמה: Aventus"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all text-[16px]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">ריכוז / סוג</label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all text-[16px]"
                                    >
                                        <option value="Parfum">Parfum</option>
                                        <option value="Eau de Parfum">Eau de Parfum</option>
                                        <option value="Eau de Toilette">Eau de Toilette</option>
                                        <option value="Extrait de Parfum">Extrait de Parfum</option>
                                        <option value="Eau de Cologne">Eau de Cologne</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">נפח *</label>
                                    <input
                                        type="text"
                                        value={volume}
                                        onChange={(e) => setVolume(e.target.value)}
                                        placeholder="לדוגמה: 100 ml"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all text-[16px]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">קהל יעד</label>
                                    <div className="flex gap-2">
                                        {['Unisex', 'Men', 'Women'].map(aud => (
                                            <button
                                                key={aud}
                                                onClick={() => setAudience(aud)}
                                                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${audience === aud ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                {aud === 'Unisex' ? 'יוניסקס' : aud === 'Men' ? 'גברים' : 'נשים'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">אורך תיאור</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setLength('Short')}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${length === 'Short' ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            קצר (4 שורות)
                                        </button>
                                        <button
                                            onClick={() => setLength('Long')}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${length === 'Long' ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            מלא (ארוך)
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm font-medium flex items-start gap-3 shadow-sm">
                                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                        <p className="leading-relaxed">{error}</p>
                                    </div>
                                )}

                                <button
                                    onClick={generateDescription}
                                    disabled={loading}
                                    className="w-full bg-sky-500 hover:bg-sky-600 active:scale-[0.98] text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-sky-500/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            מייצר קסם...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5" />
                                            חולל תיאור
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* HISTORY */}
                        {history.length > 0 && (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    היסטוריית יצירות
                                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{history.length}</span>
                                </h3>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                    {history.map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => loadHistoryItem(item)}
                                            className="group p-3.5 rounded-xl border border-gray-100 hover:border-sky-200 hover:bg-sky-50 cursor-pointer transition-all flex justify-between items-center"
                                        >
                                            <div className="overflow-hidden">
                                                <p className="font-semibold text-sm text-gray-900 truncate">{item.brand} - {item.name}</p>
                                                <p className="text-xs text-gray-500 truncate mt-0.5">{new Date(item.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                            <button
                                                onClick={(e) => deleteHistoryItem(item.id, e)}
                                                className="p-2 text-gray-300 hover:text-red-500 bg-white hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 shadow-sm"
                                                title="מחק"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* MAIN RESULTS AREA */}
                    <div className="w-full lg:w-2/3" ref={resultRef}>
                        <div className="bg-white p-6 lg:p-10 rounded-2xl shadow-sm border border-gray-100 min-h-[500px] flex flex-col relative overflow-hidden">

                            {!resultTitle && !loading ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
                                    <div className="bg-gray-50 p-6 rounded-full mb-6">
                                        <Sparkles className="w-12 h-12 text-gray-300" />
                                    </div>
                                    <h2 className="text-2xl font-semibold text-gray-700 mb-3">אזור התוצאות</h2>
                                    <p className="max-w-sm text-gray-500 leading-relaxed">הזן את פרטי הבושם בטופס ולחץ על כפתור היצירה כדי לקבל תיאור יוקרתי, שיווקי ומוכן לשימוש.</p>
                                </div>
                            ) : loading ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center">
                                    <Loader2 className="w-12 h-12 animate-spin text-sky-500 mb-6" />
                                    <p className="text-gray-600 font-semibold text-lg animate-pulse">רוקח מילים בניחוח יוקרתי, אנא המתן...</p>
                                </div>
                            ) : (
                                <div className="animate-in fade-in duration-500 flex-1 flex flex-col">

                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-gray-100 pb-6">
                                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                            <Check className="w-6 h-6 text-green-500" />
                                            התיאור מוכן
                                        </h2>
                                        <button
                                            onClick={() => handleCopy(`${resultTitle}\n\n${resultBody}`, 'all')}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors shrink-0 shadow-sm"
                                        >
                                            {copiedStates['all'] ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            {copiedStates['all'] ? 'הועתק בהצלחה!' : 'העתק הכל'}
                                        </button>
                                    </div>

                                    <div className="space-y-6 flex-1">
                                        {/* TITLE AREA */}
                                        <div className="group relative bg-sky-50/50 border border-sky-100 rounded-2xl p-6 transition-colors hover:bg-sky-50">
                                            <div className="pr-10">
                                                <label className="block text-xs font-bold text-sky-600 uppercase tracking-widest mb-2">כותרת מדויקת</label>
                                                <p className="font-bold text-xl text-sky-950 leading-snug">{resultTitle}</p>
                                            </div>
                                            <button
                                                onClick={() => handleCopy(resultTitle, 'title')}
                                                className="absolute top-6 right-4 p-2.5 text-sky-400 hover:text-sky-600 bg-white hover:bg-sky-100 rounded-xl transition-all shadow-sm"
                                                title="העתק כותרת"
                                            >
                                                {copiedStates['title'] ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>

                                        {/* BODY AREA */}
                                        <div className="group relative bg-gray-50 border border-gray-200 rounded-2xl p-6 min-h-[300px] transition-colors hover:bg-gray-100/80">
                                            <div className="pr-10">
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">גוף התיאור</label>
                                                <div className="whitespace-pre-wrap text-gray-800 leading-[1.8] text-[15px] font-medium">
                                                    {resultBody}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleCopy(resultBody, 'body')}
                                                className="absolute top-6 right-4 p-2.5 text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-200 rounded-xl transition-all shadow-sm"
                                                title="העתק תיאור"
                                            >
                                                {copiedStates['body'] ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            )}

                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};
