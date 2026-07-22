import { useEffect, useState } from 'react';
import { Table } from '../components/Table';
import { supabase } from '../lib/supabase';
import { checkAndSendReminders } from '../lib/reminderService';

export const MarketingTasksPage = () => {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data, error } = await supabase
                .from('marketing_tasks')
                .select('*')
                .order('id', { ascending: true });

            if (error) throw error;
            if (data) {
                setTasks(data);
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (newData: any[]) => {
        const changedItems = newData.filter((item, index) => {
            const original = tasks[index];
            return JSON.stringify(item) !== JSON.stringify(original);
        });

        if (changedItems.length > 0) {
            const { error } = await supabase
                .from('marketing_tasks')
                .upsert(changedItems)
                .select();

            if (error) {
                console.error('Error saving task:', error);
            } else {
                setTasks(newData);
            }
        }
    };

    const handleAdd = async () => {
        const newTask = {
            task_name: 'משימה חדשה',
            status: 'בתכנון',
            urgency: 'בינונית',
            execution_date: '',
            details: ''
        };

        const { data, error } = await supabase
            .from('marketing_tasks')
            .insert(newTask)
            .select();

        if (error) {
            console.error('Error adding task:', error);
        } else if (data) {
            setTasks([...tasks, data[0]]);
        }
    };

    const handleSendReminders = async () => {
        if (confirm('האם לשלוח תזכורות במייל עכשיו?')) {
            await checkAndSendReminders(true); // Force send
        }
    };

    const handleDelete = async (id: number | string) => {
        const { error } = await supabase.from('marketing_tasks').delete().eq('id', id);
        if (error) {
            console.error('Error deleting task:', error);
            alert('שגיאה במחיקת משימה');
        } else {
            setTasks(prev => prev.filter(item => item.id !== id));
        }
    };

    const getRowClassName = (row: any) => {
        if (row.status === 'בוצע') return '!bg-green-100';

        if (row.execution_date) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const execDate = new Date(row.execution_date);
            const diffTime = execDate.getTime() - today.getTime();
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
                <h1 className="text-3xl font-bold text-slate-900">ניהול משימות שיווק</h1>
                <button
                    onClick={handleSendReminders}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                    שלח תזכורות
                </button>
            </div>

            <Table
                title="ניהול משימות שיווק"
                data={tasks}
                onSave={handleSave}
                onAdd={handleAdd}
                onDelete={handleDelete}
                rowClassName={getRowClassName}
                columns={[
                    { header: '#', accessor: 'id', className: 'w-12' },
                    { header: 'שם המשימה', accessor: 'task_name', editable: true },
                    { header: 'תאריך ביצוע', accessor: 'execution_date', editable: true, type: 'date' },
                    {
                        header: 'סטטוס',
                        accessor: 'status',
                        editable: true,
                        type: 'select',
                        options: ['בתכנון', 'בביצוע', 'בוצע', 'בוטל']
                    },
                    {
                        header: 'דחיפות',
                        accessor: 'urgency',
                        editable: true,
                        type: 'select',
                        options: ['גבוהה', 'בינונית', 'נמוכה']
                    },
                    { header: 'פירוט המשימה', accessor: 'details', editable: true },
                ]}
            />
        </div>
    );
};

export default MarketingTasksPage;
