import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export const useRealtimeData = (tableName: string) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { data: initialData, error } = await supabase
          .from(tableName as any)
          .select('*');
        
        if (error) {
          throw error;
        }

        setData(initialData || []);
      } catch (error) {
        console.error('Error fetching initial data:', error);
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // Set up real-time subscription
    const channel = supabase
      .channel(`realtime-${tableName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
        },
        (payload) => {
          console.log('Real-time update:', payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              setData(prev => [...prev, payload.new]);
              toast({
                title: "New Data",
                description: `New ${tableName.slice(0, -1)} added`,
              });
              break;
            case 'UPDATE':
              setData(prev => prev.map(item => 
                item.id === payload.new?.id ? payload.new : item
              ));
              break;
            case 'DELETE':
              setData(prev => prev.filter(item => item.id !== payload.old?.id));
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName]);

  return { data, loading, setData };
};