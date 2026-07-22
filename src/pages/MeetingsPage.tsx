import { useEffect, useState } from 'react';

import { Table } from '../components/Table';
import { supabase } from '../lib/supabase';

export const MeetingsPage = () => {
    const [meetings, setMeetings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data, error } = await supabase
                .from('meetings')
                .select('*')
                .order('id', { ascending: true });

            if (error) throw error;
            if (data) setMeetings(data);
        } catch (error) {
            console.error('Error fetching meetings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (newData: any[]) => {
        const changedItems = newData.filter((item, index) => {
            const original = meetings[index];
            return JSON.stringify(item) !== JSON.stringify(original);
        });

        if (changedItems.length > 0) {
            console.log('Saving changes:', changedItems);
            const { error } = await supabase
                .from('meetings')
                .upsert(changedItems)
                .select();

            if (error) {
                console.error('Error saving meeting:', error);
            } else {
                setMeetings(newData);
            }
        }
    };

    const handleAdd = async () => {
        const newMeeting = {
            title: 'פגישה חדשה',
            date: '',
            time: '',
            participants: '',
            location: '',
            description: ''
        };

        const { data, error } = await supabase
            .from('meetings')
            .insert(newMeeting)
            .select();

        if (error) {
            console.error('Error adding meeting:', error);
        } else if (data) {
            setMeetings([...meetings, data[0]]);
        }
    };

    const handleDelete = async (id: number | string) => {
        const { error } = await supabase.from('meetings').delete().eq('id', id);
        if (error) {
            console.error('Error deleting meeting:', error);
            alert('שגיאה במחיקת פגישה');
        } else {
            setMeetings(prev => prev.filter(item => item.id !== id));
        }
    };

    if (loading) return <div className="text-center p-10">טוען נתונים...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-900">פגישות</h1>

            <Table
                title="פגישות"
                data={meetings}
                onSave={handleSave}
                onAdd={handleAdd}
                onDelete={handleDelete}
                columns={[
                    { header: '#', accessor: 'id', className: 'w-12' },
                    { header: 'שם הפגישה', accessor: 'title', editable: true },
                    {
                        header: 'יום',
                        accessor: 'date',
                        editable: true,
                        type: 'select',
                        options: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
                    },
                    { header: 'שעה', accessor: 'time', editable: true },
                    { header: 'נוכחים', accessor: 'participants', editable: true },
                    { header: 'מיקום', accessor: 'location', editable: true },
                    { header: 'תיאור', accessor: 'description', editable: true },
                ]}
            />
        </div>
    );
};

export default MeetingsPage;
