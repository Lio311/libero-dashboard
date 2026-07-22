import { useState, useEffect } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths
} from 'date-fns';
import { he } from 'date-fns/locale';
import { ChevronRight, ChevronLeft, Plus, Trash2, Edit2 } from 'lucide-react';
import clsx from 'clsx';
import { Modal } from '../components/Modal';
import { Table } from '../components/Table';
import { supabase } from '../lib/supabase';

interface CalendarEvent {
    id: number;
    date: Date;
    influencerId: number;
    channel: string;
    products: string;
}

export const CalendarPage = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [influencers, setInfluencers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [newEvent, setNewEvent] = useState({
        id: 0,
        influencerId: '',
        channel: '',
        products: ''
    });
    const [newInfluencerName, setNewInfluencerName] = useState('');
    const [isAddingInfluencer, setIsAddingInfluencer] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [eventsRes, influencersRes] = await Promise.all([
                supabase.from('events').select('*'),
                supabase.from('influencers').select('*')
            ]);

            if (eventsRes.data) {
                const formattedEvents = eventsRes.data.map(event => ({
                    id: event.id,
                    date: new Date(event.date),
                    influencerId: event.influencer_id,
                    channel: event.channel,
                    products: event.products
                }));
                setEvents(formattedEvents);
            }

            if (influencersRes.data) {
                setInfluencers(influencersRes.data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const weekDays = [
        { full: 'יום ראשון', short: "א'" },
        { full: 'יום שני', short: "ב'" },
        { full: 'יום שלישי', short: "ג'" },
        { full: 'יום רביעי', short: "ד'" },
        { full: 'יום חמישי', short: "ה'" },
        { full: 'יום שישי', short: "ו'" },
        { full: 'יום שבת', short: "ש'" }
    ];

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const handleDayClick = (day: Date) => {
        setSelectedDate(day);
        setNewEvent({ id: 0, influencerId: '', channel: '', products: '' });
        setIsModalOpen(true);
    };

    const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => {
        e.stopPropagation();
        setSelectedDate(event.date);
        setNewEvent({
            id: event.id,
            influencerId: String(event.influencerId),
            channel: event.channel,
            products: event.products
        });
        setIsModalOpen(true);
    };

    const handleSaveEvent = async () => {
        if (!selectedDate || !newEvent.influencerId) return;

        const eventData = {
            date: selectedDate.toISOString(),
            influencer_id: Number(newEvent.influencerId),
            channel: newEvent.channel,
            products: newEvent.products
        };

        try {
            if (newEvent.id) {
                const { error } = await supabase
                    .from('events')
                    .update(eventData)
                    .eq('id', newEvent.id);

                if (error) throw error;

                setEvents(events.map(ev => ev.id === newEvent.id ? {
                    ...ev,
                    date: selectedDate,
                    influencerId: Number(newEvent.influencerId),
                    channel: newEvent.channel,
                    products: newEvent.products
                } : ev));
            } else {
                const { data, error } = await supabase
                    .from('events')
                    .insert(eventData)
                    .select();

                if (error) throw error;

                if (data) {
                    const newEventData = {
                        id: data[0].id,
                        date: new Date(data[0].date),
                        influencerId: data[0].influencer_id,
                        channel: data[0].channel,
                        products: data[0].products
                    };
                    setEvents([...events, newEventData]);
                }
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving event:', error);
        }
    };

    const handleDeleteEvent = async (id?: number) => {
        const idToDelete = id || newEvent.id;
        if (idToDelete) {
            try {
                const { error } = await supabase
                    .from('events')
                    .delete()
                    .eq('id', idToDelete);

                if (error) throw error;

                setEvents(events.filter(ev => ev.id !== idToDelete));
                setIsModalOpen(false);
            } catch (error) {
                console.error('Error deleting event:', error);
            }
        }
    };

    const handleAddInfluencer = async () => {
        if (!newInfluencerName) return;

        try {
            const { data, error } = await supabase
                .from('influencers')
                .insert({ name: newInfluencerName })
                .select();

            if (error) throw error;

            if (data) {
                setInfluencers([...influencers, data[0]]);
                setNewEvent({ ...newEvent, influencerId: String(data[0].id) });
                setNewInfluencerName('');
                setIsAddingInfluencer(false);
            }
        } catch (error) {
            console.error('Error adding influencer:', error);
        }
    };

    const getInfluencer = (id: number) => influencers.find(i => i.id === id);

    // Helper to get random color based on ID (consistent)
    const getInfluencerColor = (id: number) => {
        const colors = [
            'bg-yellow-200 text-yellow-800',
            'bg-purple-200 text-purple-800',
            'bg-red-200 text-red-800',
            'bg-blue-200 text-blue-800',
            'bg-green-200 text-green-800',
            'bg-pink-200 text-pink-800',
            'bg-indigo-200 text-indigo-800',
            'bg-teal-200 text-teal-800',
        ];
        return colors[id % colors.length];
    };

    // Prepare data for the Table
    const tableData = events.map(event => ({
        id: event.id,
        dateStr: format(event.date, 'dd/MM/yyyy'),
        influencerName: getInfluencer(event.influencerId)?.name || 'לא ידוע',
        channel: event.channel,
        products: event.products,
        originalEvent: event
    })).sort((a, b) => b.originalEvent.date.getTime() - a.originalEvent.date.getTime());

    if (loading) return <div className="text-center p-10">טוען נתונים...</div>;

    return (
        <div className="space-y-8 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-slate-900">לוח שנה</h1>
                <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                    <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <span className="text-lg font-medium min-w-[150px] text-center">
                        {format(currentDate, 'MMMM yyyy', { locale: he })}
                    </span>
                    <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                    {weekDays.map((day) => (
                        <div key={day.full} className="p-4 text-center font-medium text-slate-600">
                            <span className="hidden md:inline">{day.full}</span>
                            <span className="md:hidden">{day.short}</span>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 auto-rows-fr">
                    {days.map((day) => {
                        const dayEvents = events.filter(e => isSameDay(e.date, day));
                        return (
                            <div
                                key={day.toString()}
                                onClick={() => handleDayClick(day)}
                                className={clsx(
                                    "border-b border-l border-slate-100 p-2 min-h-[120px] flex flex-col gap-1 transition-colors hover:bg-slate-50/50 cursor-pointer group relative",
                                    !isSameMonth(day, monthStart) && "bg-slate-50/50 text-slate-400"
                                )}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={clsx(
                                        "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                                        isSameDay(day, new Date()) ? "bg-primary text-white" : "text-slate-700"
                                    )}>
                                        {format(day, 'd')}
                                    </span>
                                    <Plus className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[100px]">
                                    {dayEvents.map((event, i) => {
                                        const influencer = getInfluencer(event.influencerId);
                                        return (
                                            <div
                                                key={i}
                                                onClick={(e) => handleEventClick(e, event)}
                                                className={clsx("group/event relative text-xs p-1.5 rounded-md font-medium truncate shadow-sm hover:opacity-80 transition-opacity cursor-pointer", getInfluencerColor(event.influencerId))}
                                            >
                                                {influencer?.name}

                                                {/* Hover Tooltip */}
                                                <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover/event:opacity-100 group-hover/event:visible transition-all pointer-events-none">
                                                    <div className="font-bold mb-1 text-sm">{influencer?.name}</div>
                                                    <div className="text-slate-300 mb-0.5">ערוץ: {event.channel}</div>
                                                    <div className="text-slate-300">מוצרים: {event.products}</div>
                                                    <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Event Management Table */}
            <div className="mt-8">
                <Table
                    title="ניהול אירועים"
                    data={tableData}
                    onAdd={() => {
                        setSelectedDate(new Date());
                        setNewEvent({ id: 0, influencerId: '', channel: '', products: '' });
                        setIsModalOpen(true);
                    }}
                    onRowClick={(row) => handleEventClick({ stopPropagation: () => { } } as any, row.originalEvent)}
                    columns={[
                        { header: 'תאריך', accessor: 'dateStr' },
                        { header: 'משפיען', accessor: 'influencerName' },
                        { header: 'ערוץ', accessor: 'channel' },
                        { header: 'מוצרים', accessor: 'products' },
                        {
                            header: 'פעולות',
                            className: '!text-center',
                            accessor: (row) => (
                                <div className="flex gap-2 justify-center">
                                    <button
                                        onClick={(e) => handleEventClick(e, row.originalEvent)}
                                        className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteEvent(row.id);
                                        }}
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )
                        }
                    ]}
                />
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`${newEvent.id ? 'עריכת' : 'הוספת'} אירוע - ${selectedDate ? format(selectedDate, 'dd/MM/yyyy') : ''}`}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">תאריך</label>
                        <input
                            type="date"
                            value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                            onChange={(e) => {
                                if (e.target.value) {
                                    const [y, m, d] = e.target.value.split('-').map(Number);
                                    setSelectedDate(new Date(y, m - 1, d));
                                }
                            }}
                            className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">משפיען</label>
                        {!isAddingInfluencer ? (
                            <div className="flex gap-2">
                                <select
                                    value={newEvent.influencerId}
                                    onChange={(e) => {
                                        if (e.target.value === 'new') {
                                            setIsAddingInfluencer(true);
                                        } else {
                                            setNewEvent({ ...newEvent, influencerId: e.target.value });
                                        }
                                    }}
                                    className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary"
                                >
                                    <option value="">בחר משפיען...</option>
                                    {influencers.map(inf => (
                                        <option key={inf.id} value={inf.id}>{inf.name}</option>
                                    ))}
                                    <option value="new" className="font-bold text-primary">+ הוסף משפיען חדש</option>
                                </select>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="שם המשפיען החדש"
                                    value={newInfluencerName}
                                    onChange={(e) => setNewInfluencerName(e.target.value)}
                                    className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary"
                                    autoFocus
                                />
                                <button
                                    onClick={handleAddInfluencer}
                                    className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90"
                                >
                                    הוסף
                                </button>
                                <button
                                    onClick={() => setIsAddingInfluencer(false)}
                                    className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-200"
                                >
                                    ביטול
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">ערוץ פרסום</label>
                        <input
                            type="text"
                            value={newEvent.channel}
                            onChange={(e) => setNewEvent({ ...newEvent, channel: e.target.value })}
                            placeholder="לדוגמה: אינסטגרם, טיקטוק"
                            className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">בשמים שפורסמו</label>
                        <input
                            type="text"
                            value={newEvent.products}
                            onChange={(e) => setNewEvent({ ...newEvent, products: e.target.value })}
                            placeholder="לדוגמה: JANY, KV"
                            className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div className="pt-4 flex justify-between gap-3">
                        {newEvent.id ? (
                            <button
                                onClick={() => handleDeleteEvent()}
                                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            >
                                מחק אירוע
                            </button>
                        ) : <div></div>}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                ביטול
                            </button>
                            <button
                                onClick={handleSaveEvent}
                                disabled={!newEvent.influencerId}
                                className="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-xl shadow-sm shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                שמור אירוע
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CalendarPage;
