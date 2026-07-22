import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

interface UseInfluencerPageOptions {
    influencerTable: string;
    couponTable: string;
    currentDate: Date;
}

// Fields that reset to 0 when carrying forward to a new month
const INFLUENCER_MONTHLY_FIELDS = ['sales'];
const COUPON_MONTHLY_FIELDS = ['views', 'sales'];

async function fetchWithCarryForward(
    tableName: string,
    currentMonth: string,
    monthlyResetFields: string[]
): Promise<any[]> {
    const { data: allData, error } = await supabase
        .from(tableName)
        .select('*')
        .order('month', { ascending: true });

    if (error || !allData) return [];

    // 1. Find source_ids that were soft-deleted on or before currentMonth
    const deletedSourceIds = new Set<number>(
        allData
            .filter(r => r.deleted_month && r.deleted_month <= currentMonth)
            .map(r => r.source_id ?? r.id)
    );

    // 2. Keep only active (non-deleted) records
    const activeData = allData.filter(r => !deletedSourceIds.has(r.source_id ?? r.id));

    // 3. Group by source_id — prefer currentMonth row, else pick latest earlier month
    const bySourceId = new Map<number, any & { _isCurrent: boolean }>();

    for (const row of activeData) {
        const sid: number = row.source_id ?? row.id;

        if (row.month === currentMonth) {
            // Current month always wins
            bySourceId.set(sid, { ...row, source_id: sid, _isCurrent: true });
        } else if (row.month < currentMonth) {
            const existing = bySourceId.get(sid);
            if (!existing || (!existing._isCurrent && row.month > existing.month)) {
                bySourceId.set(sid, { ...row, source_id: sid, _isCurrent: false });
            }
        }
    }

    // 4. Auto-insert carry-forward rows for currentMonth
    const toInsert: any[] = [];
    for (const [, row] of bySourceId) {
        if (!row._isCurrent) {
            const { _isCurrent, id, ...rest } = row;
            toInsert.push({
                ...rest,
                month: currentMonth,
                deleted_month: null,
                ...Object.fromEntries(monthlyResetFields.map(f => [f, 0])),
            });
        }
    }

    if (toInsert.length > 0) {
        const { data: inserted } = await supabase
            .from(tableName)
            .insert(toInsert)
            .select();

        if (inserted) {
            for (const row of inserted) {
                const sid: number = row.source_id ?? row.id;
                bySourceId.set(sid, { ...row, source_id: sid, _isCurrent: true });
            }
        }
    }

    return [...bySourceId.values()].map(({ _isCurrent, ...row }) => row);
}

export function useInfluencerPage({ influencerTable, couponTable, currentDate }: UseInfluencerPageOptions) {
    const [influencers, setInfluencers] = useState<any[]>([]);
    const [coupons, setCoupons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const currentMonth = format(currentDate, 'yyyy-MM');

    useEffect(() => {
        let isActive = true;
        const fetch = async () => {
            setLoading(true);
            try {
                const [inf, coup] = await Promise.all([
                    fetchWithCarryForward(influencerTable, currentMonth, INFLUENCER_MONTHLY_FIELDS),
                    fetchWithCarryForward(couponTable, currentMonth, COUPON_MONTHLY_FIELDS),
                ]);
                if (!isActive) return;
                setInfluencers(inf);
                setCoupons(coup);
            } catch (e) {
                console.error('Error fetching data:', e);
            } finally {
                if (isActive) setLoading(false);
            }
        };
        fetch();
        return () => { isActive = false; };
    }, [currentMonth, influencerTable, couponTable]);
    // --- Influencer handlers ---
    // Only send columns that exist in the DB — prevents 400 errors from unknown fields
    const KNOWN_COLS = [
        'id', 'name', 'coupon', 'channels', 'products',
        'base_salary', 'bonus_percent', 'sales',
        'video_count', 'price_per_video', 'payment_type',
        'month', 'source_id', 'deleted_month', 'created_at',
    ];

    const handleSaveInfluencers = async (newData: any[]) => {
        console.log(`[SAVE] called for ${influencerTable}`, { newDataLen: newData.length, influencersLen: influencers.length });

        const changedItems = newData.filter(item => {
            const oldItem = influencers.find(r => r.id === item.id);
            if (!oldItem) return true;
            return KNOWN_COLS.some(key => key in item && String(item[key]) !== String(oldItem[key]));
        });

        if (changedItems.length === 0) { console.log(`[SAVE] no changes`); return; }

        // Strip to known columns only
        const payload = changedItems.map(item => {
            const clean: Record<string, any> = {};
            for (const key of KNOWN_COLS) {
                if (key in item) clean[key] = item[key];
            }
            clean.month = currentMonth;
            return clean;
        });
        console.log(`[SAVE] upserting ${payload.length} rows to ${influencerTable}`);

        const { data: result, error } = await supabase
            .from(influencerTable)
            .upsert(payload)
            .select();

        if (!error) {
            console.log(`[SAVE] ✅ success`, result);
            setInfluencers(newData);
        } else {
            console.error(`[SAVE] ❌ failed:`, error);
        }
    };

    const handleAddInfluencer = async () => {
        const { data, error } = await supabase
            .from(influencerTable)
            .insert({
                name: 'חדש', coupon: '', channels: '', products: '',
                base_salary: 0, sales: 0, bonus_percent: 0,
                video_count: 0, price_per_video: 0,
                payment_type: 'שכר בסיס',
                month: currentMonth, source_id: null, deleted_month: null,
            })
            .select();

        if (error || !data) { console.error(error); return; }

        // Set source_id = id for brand-new records
        const newId = data[0].id;
        await supabase.from(influencerTable).update({ source_id: newId }).eq('id', newId);
        setInfluencers(prev => [...prev, { ...data[0], source_id: newId }]);
    };

    const handleDeleteInfluencer = async (id: number | string) => {
        const row = influencers.find(r => r.id === id);
        if (!row) return;

        // Soft-delete: set deleted_month so future months skip this source_id
        const { error } = await supabase
            .from(influencerTable)
            .update({ deleted_month: currentMonth })
            .eq('id', id);

        if (!error) setInfluencers(prev => prev.filter(r => r.id !== id));
        else console.error(error);
    };

    // --- Coupon handlers ---
    const computeDays = (start: string, end: string) => {
        if (!start || !end) return 0;
        return Math.max(0, Math.round(
            (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
        ));
    };

    const handleSaveCoupons = async (newData: any[]) => {
        const changedItems = newData.filter((item, i) =>
            JSON.stringify(item) !== JSON.stringify(coupons[i])
        );
        if (changedItems.length === 0) return;

        const { error } = await supabase
            .from(couponTable)
            .upsert(changedItems.map(item => ({
                ...item,
                month: currentMonth,
                days: computeDays(item.start_date, item.end_date),
            })))
            .select();

        if (!error) setCoupons(newData);
        else console.error(`Error saving ${couponTable}:`, error);
    };

    const handleAddCoupon = async () => {
        const { data, error } = await supabase
            .from(couponTable)
            .insert({
                code: 'new', channel: '', start_date: '', end_date: '',
                days: 0, views: 0, sales: 0, active: 'פעיל',
                month: currentMonth, source_id: null, deleted_month: null,
            })
            .select();

        if (error || !data) { console.error(error); return; }

        const newId = data[0].id;
        await supabase.from(couponTable).update({ source_id: newId }).eq('id', newId);
        setCoupons(prev => [...prev, { ...data[0], source_id: newId }]);
    };

    const handleDeleteCoupon = async (id: number | string) => {
        const { error } = await supabase
            .from(couponTable)
            .update({ deleted_month: currentMonth })
            .eq('id', id);

        if (!error) setCoupons(prev => prev.filter(r => r.id !== id));
        else console.error(error);
    };

    return {
        influencers, setInfluencers,
        coupons, setCoupons,
        loading, computeDays,
        handleSaveInfluencers, handleAddInfluencer, handleDeleteInfluencer,
        handleSaveCoupons, handleAddCoupon, handleDeleteCoupon,
    };
}
