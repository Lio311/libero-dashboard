import { useState, useEffect } from 'react';
import { Loader2, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

interface Perfume {
    id: number;
    name: string;
    link: string;
    image_url: string;
    created_at: string;
}

const ITEMS_PER_PAGE = 18;

export function NewPerfumesPage() {
    const [perfumes, setPerfumes] = useState<Perfume[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchPerfumes();
    }, [page]);

    const fetchPerfumes = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/get-perfumes?page=${page}&limit=${ITEMS_PER_PAGE}`);

            if (!response.ok) {
                const text = await response.text();
                const preview = text.substring(0, 200).replace(/<[^>]*>/g, '').trim();
                throw new Error(`שגיאת שרת (${response.status}): ${preview || 'ריק'}`);
            }

            const data = await response.json();
            setPerfumes(data.data || []);
            setTotalCount(data.total || 0);
        } catch (err: any) {
            console.error('Error fetching perfumes:', err);
            setError(`שגיאה בטעינת הנתונים: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    return (
        <div className="p-6 max-w-[1600px] mx-auto" dir="rtl">

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : error ? (
                <div className="text-center text-red-500 py-12">
                    {error}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                        {perfumes.map((perfume) => (
                            <a
                                key={perfume.id}
                                href={perfume.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group block bg-slate-900 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 ease-in-out border border-slate-800"
                            >
                                <div className="aspect-square w-full overflow-hidden bg-white p-3 flex items-center justify-center relative">
                                    <img
                                        src={perfume.image_url}
                                        alt={perfume.name}
                                        className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-500"
                                        loading="lazy"
                                    />
                                    <ExternalLink className="absolute top-2 right-2 w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <div className="p-4 text-center">
                                    <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-2 min-h-[2.5rem]">
                                        {perfume.name}
                                    </h3>
                                </div>
                            </a>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-12 mb-8 text-slate-900">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-full hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>

                            <span className="font-bold text-lg">
                                עמוד {page} מתוך {totalPages}
                            </span>

                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 rounded-full hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                        </div>
                    )}

                    {!loading && perfumes.length === 0 && (
                        <div className="text-center text-gray-400 py-12">
                            לא נמצאו בשמים
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
