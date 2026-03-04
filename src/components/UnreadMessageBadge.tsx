import { useState, useEffect, useRef, useCallback } from 'react';
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
  const audioEnabledRef = useRef(false);

  // Play notification sound
  const playSound = useCallback(() => {
    if (!audioEnabledRef.current) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const play = (delay: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 600;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.25);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.25);
      };
      play(0);
      play(0.35);
      setTimeout(() => ctx.close().catch(() => {}), 1000);
    } catch (e) {
      console.error('Sound error:', e);
    }
  }, []);

  // Enable audio on first user interaction
  useEffect(() => {
    const enable = () => { audioEnabledRef.current = true; };
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach(e => document.addEventListener(e, enable, { once: true }));
    return () => { events.forEach(e => document.removeEventListener(e, enable)); };
  }, []);

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
            playSound();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload: any) => {
          // When messages are marked as read (by current user reading them)
          if (payload.new.receiver_id === user.id && payload.new.is_read && !payload.old?.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Also listen for custom event when user reads messages in MessagingSystem
    const handleMessagesRead = () => {
      fetchUnread();
    };
    window.addEventListener('messagesRead', handleMessagesRead);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      window.removeEventListener('messagesRead', handleMessagesRead);
    };
  }, [user, playSound]);

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
