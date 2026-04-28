import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useMaintenance = () => {
    const [maintenance, setMaintenance] = useState({
        isActive: false,
        message: '',
        loading: true
    });

    useEffect(() => {
        // 1. Initial Fetch
        const fetchMaintenanceMode = async () => {
            try {
                const { data, error } = await supabase
                    .from('app_settings')
                    .select('is_maintenance_mode, maintenance_message')
                    .single();

                if (error) throw error;

                setMaintenance({
                    isActive: data.is_maintenance_mode,
                    message: data.maintenance_message,
                    loading: false
                });
            } catch (error) {
                console.error('Error fetching maintenance mode:', error);
                setMaintenance(prev => ({ ...prev, loading: false }));
            }
        };

        fetchMaintenanceMode();

        // 2. Realtime Subscription
        const channel = supabase
            .channel('app_settings_changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'app_settings',
                    filter: 'id=eq.1'
                },
                (payload) => {
                    setMaintenance({
                        isActive: payload.new.is_maintenance_mode,
                        message: payload.new.maintenance_message,
                        loading: false
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return maintenance;
};
