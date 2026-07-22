import { useEffect, useState } from 'react';
import { Table } from '../components/Table';
import { supabase } from '../lib/supabase';
import { checkAndSendReminders } from '../lib/reminderService';

export const ProjectsPage = () => {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .order('id', { ascending: true });

            if (error) throw error;
            if (data) {
                setProjects(data);
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (newData: any[]) => {
        const changedItems = newData.filter((item, index) => {
            const original = projects[index];
            return JSON.stringify(item) !== JSON.stringify(original);
        });

        if (changedItems.length > 0) {
            const { error } = await supabase
                .from('projects')
                .upsert(changedItems)
                .select();

            if (error) {
                console.error('Error saving project:', error);
            } else {
                setProjects(newData);
            }
        }
    };

    const handleAdd = async () => {
        const newProject = {
            name: 'פרויקט חדש',
            status: 'בתכנון',
            urgency: 'בינונית',
            due_date: '',
            team: '',
            notes: ''
        };

        const { data, error } = await supabase
            .from('projects')
            .insert(newProject)
            .select();

        if (error) {
            console.error('Error adding project:', error);
        } else if (data) {
            setProjects([...projects, data[0]]);
        }
    };

    const handleSendReminders = async () => {
        if (confirm('האם לשלוח תזכורות במייל עכשיו?')) {
            await checkAndSendReminders(true); // Force send
        }
    };

    const handleDelete = async (id: number | string) => {
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) {
            console.error('Error deleting project:', error);
            alert('שגיאה במחיקת פרויקט');
        } else {
            setProjects(prev => prev.filter(item => item.id !== id));
        }
    };

    const getRowClassName = (row: any) => {
        if (row.status === 'בוצע') return '!bg-green-100';

        if (row.due_date) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = new Date(row.due_date);
            const diffTime = dueDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 3) return '!bg-red-100';
        }

        if (row.urgency === 'גבוהה') return '!bg-orange-100';
        if (row.urgency === 'בינונית') return '!bg-yellow-100';

        return '';
    };

    if (loading) return <div className="text-center p-10">טוען נתונים...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-900">ניהול פרויקטים</h1>
                <button
                    onClick={handleSendReminders}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                    שלח תזכורות
                </button>
            </div>

            <Table
                title="ניהול פרויקטים"
                data={projects}
                onSave={handleSave}
                onAdd={handleAdd}
                onDelete={handleDelete}
                rowClassName={getRowClassName}
                columns={[
                    { header: '#', accessor: 'id', className: 'w-12' },
                    { header: 'שם הפרויקט', accessor: 'name', editable: true },
                    {
                        header: 'דחיפות',
                        accessor: 'urgency',
                        editable: true,
                        type: 'select',
                        options: ['גבוהה', 'בינונית', 'נמוכה']
                    },
                    {
                        header: 'סטטוס',
                        accessor: 'status',
                        editable: true,
                        type: 'select',
                        options: ['בתכנון', 'בביצוע', 'בוצע', 'בוטל']
                    },
                    { header: 'תאריך יעד', accessor: 'due_date', editable: true, type: 'date' },
                    { header: 'צוות', accessor: 'team', editable: true },
                    { header: 'הערות', accessor: 'notes', editable: true },
                ]}
            />
        </div>
    );
};

export default ProjectsPage;
