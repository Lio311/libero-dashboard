import { useEffect, useState } from 'react';
import { format, addMonths, startOfMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import { Table } from '../components/Table';
import { supabase } from '../lib/supabase';

export const BannersPage = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Generate next 12 months starting from current month
            const currentDate = startOfMonth(new Date());
            const next12Months = Array.from({ length: 12 }, (_, i) => {
                const date = addMonths(currentDate, i);
                return {
                    month: format(date, 'MMMM yyyy', { locale: he }),
                    rawDate: date // Keep raw date for sorting/comparison if needed
                };
            });

            // Fetch existing data from DB
            const { data: dbData, error } = await supabase
                .from('banner_schedule')
                .select('*');

            if (error) throw error;

            // Merge DB data with generated months
            const mergedData = next12Months.map(monthObj => {
                const existingRecord = dbData?.find(record => record.month === monthObj.month);
                return {
                    ...monthObj,
                    id: existingRecord?.id || monthObj.month, // Use month as temp ID if no DB ID
                    banner1: existingRecord?.banner1 || '',
                    banner2: existingRecord?.banner2 || '',
                    banner3: existingRecord?.banner3 || '',
                    replacement_date: existingRecord?.replacement_date || '',
                    request_date: existingRecord?.request_date || '',
                    performed_by: existingRecord?.performed_by || ''
                };
            });

            setData(mergedData);
        } catch (error) {
            console.error('Error fetching banners:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (newData: any[]) => {
        // Find ALL changed items, not just the first one
        const changedItems = newData.filter((item, index) => {
            const original = data[index];
            return JSON.stringify(item) !== JSON.stringify(original);
        });

        if (changedItems.length > 0) {
            try {
                // Process all changes concurrently
                await Promise.all(changedItems.map(async (changedItem) => {
                    const itemToSave = {
                        month: changedItem.month,
                        banner1: changedItem.banner1,
                        banner2: changedItem.banner2,
                        banner3: changedItem.banner3,
                        replacement_date: changedItem.replacement_date,
                        request_date: changedItem.request_date,
                        performed_by: changedItem.performed_by
                    };

                    // Check if ID is a number (real DB ID) or string (temp ID)
                    if (changedItem.id && typeof changedItem.id === 'number') {
                        const { error } = await supabase
                            .from('banner_schedule')
                            .update(itemToSave)
                            .eq('id', changedItem.id);
                        if (error) throw error;
                    } else {
                        const { data: insertedData, error } = await supabase
                            .from('banner_schedule')
                            .insert(itemToSave)
                            .select();

                        if (error) throw error;

                        if (insertedData) {
                            // Update the ID in the newData array so subsequent saves work correctly
                            const index = newData.findIndex(i => i.month === changedItem.month);
                            if (index !== -1) {
                                newData[index].id = insertedData[0].id;
                            }
                        }
                    }
                }));

                // Update local state with all changes
                setData(newData);
            } catch (error: any) {
                console.error('Error saving banners:', error);
            }
        }
    };

    const getRowClassName = (row: any) => {
        if (row.performed_by === 'בוצע') return '!bg-green-100';
        return '';
    };

    if (loading) return <div className="text-center p-10">טוען נתונים...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-900">ניהול באנרים</h1>

            <Table
                title="ניהול באנרים"
                data={data}
                onSave={handleSave}
                rowClassName={getRowClassName}
                columns={[
                    { header: 'חודש', accessor: 'month', className: 'font-bold text-slate-900 min-w-[120px]' },
                    { header: 'באנר 1', accessor: 'banner1', className: 'min-w-[150px]', editable: true },
                    { header: 'באנר 2', accessor: 'banner2', className: 'min-w-[150px]', editable: true },
                    { header: 'באנר 3', accessor: 'banner3', className: 'min-w-[150px]', editable: true },
                    { header: 'תאריך החלפה', accessor: 'replacement_date', editable: true, type: 'date' },
                    { header: 'תאריך הגשת בקשה לגרפיקאי', accessor: 'request_date', editable: true, type: 'date' },
                    {
                        header: 'סטטוס',
                        accessor: 'performed_by',
                        editable: true,
                        type: 'select',
                        options: ['בוצע', 'לא בוצע']
                    },
                ]}
            />
        </div>
    );
};

export default BannersPage;
