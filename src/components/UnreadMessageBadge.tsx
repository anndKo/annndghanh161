import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';

interface UnreadMessageBadgeProps {
  onClick: () => void;
}

const UnreadMessageBadge = ({ onClick }: UnreadMessageBadgeProps) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (!error && count !== null) {
        setUnreadCount(count);
      }
    };

    fetchUnread();

    // Listen for new messages and read status changes
    const channel = supabase
      .channel(`unread-msgs-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: any) => {
          if (payload.new.receiver_id === user.id && !payload.new.is_read) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload: any) => {
          if (payload.new.receiver_id === user.id && payload.new.is_read && !payload.old?.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user]);

  return (
    <Button variant="ghost" size="icon" onClick={onClick} title="Tin nhắn" className="relative">
      <MessageCircle className="w-5 h-5" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
};

export default UnreadMessageBadge;
