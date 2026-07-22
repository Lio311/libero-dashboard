import { useEffect, useState } from 'react';
import { Table } from '../components/Table';
import { supabase } from '../lib/supabase';

export const CampaignsPage = () => {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .order('id', { ascending: true });

            if (error) throw error;
            if (data) setCampaigns(data);
        } catch (error) {
            console.error('Error fetching campaigns:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCampaigns = async (newData: any[]) => {
        const changedItems = newData.filter((item, index) => {
            const original = campaigns[index];
            return JSON.stringify(item) !== JSON.stringify(original);
        });

        if (changedItems.length > 0) {
            const { error } = await supabase
                .from('campaigns')
                .upsert(changedItems)
                .select();

            if (error) {
                console.error('Error saving campaign:', error);
            } else {
                setCampaigns(newData);
            }
        }
    };

    const handleDeleteCampaign = async (id: number | string) => {
        const { error } = await supabase.from('campaigns').delete().eq('id', id);
        if (error) {
            console.error('Error deleting campaign:', error);
            alert('שגיאה במחיקת קמפיין');
        } else {
            setCampaigns(prev => prev.filter(item => item.id !== id));
        }
    };

    const handleAddCampaign = async () => {
        const newCampaign = {
            link: '',
            source: '',
            type: '',
            content: '',
            start_date: '',
            clicks: 0,
            sales: 0,
            budget: 0
        };

        const { data, error } = await supabase
            .from('campaigns')
            .insert(newCampaign)
            .select();

        if (error) {
            console.error('Error adding campaign:', error);
        } else if (data) {
            setCampaigns([...campaigns, data[0]]);
        }
    };

    if (loading) return <div className="text-center p-10">טוען נתונים...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-900">ניהול קמפיינים</h1>

            <Table
                title="ניהול קמפיינים"
                data={campaigns}
                onSave={handleSaveCampaigns}
                onAdd={handleAddCampaign}
                onDelete={handleDeleteCampaign}
                columns={[
                    { header: '#', accessor: 'id', className: 'w-12' },
                    { header: 'ערוץ פרסום', accessor: 'source', editable: true },
                    { header: 'סוג הקמפיין', accessor: 'type', editable: true },
                    { header: 'תוכן הפרסום', accessor: 'content', editable: true },
                    { header: 'תאריך התחלה', accessor: 'start_date', editable: true },
                    { header: 'קליקים', accessor: 'clicks', editable: true },
                    { header: 'מכירות', accessor: 'sales', editable: true },
                    { header: 'תקציב שיווק', accessor: 'budget', render: (row) => `₪${row.budget}`, editable: true },
                ]}
            />
        </div>
    );
};
