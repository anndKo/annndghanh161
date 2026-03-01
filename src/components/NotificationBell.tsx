import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Bell, CheckCheck } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import TutorComplaintDialog from './TutorComplaintDialog';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_id?: string;
  user_id?: string;
}

const NotificationBell = () => {
  const { user, role } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [complaintNotificationId, setComplaintNotificationId] = useState<string | undefined>();
  const audioEnabledRef = useRef(false);
  const channelRef = useRef<any>(null);

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
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.3);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.3);
      };
      play(0);
      play(0.5);
      setTimeout(() => ctx.close().catch(() => {}), 1200);
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

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter((n: any) => !n.is_read).length);
    }
  }, [user]);


  // Main effect: setup realtime subscriptions
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // Cleanup old channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `notif-bell-${user.id}-${Date.now()}`;
    const notifChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          const newNotif = payload.new as Notification;

          setNotifications((prev) => {
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev].slice(0, 50);
          });

          if (!newNotif.is_read) {
            setUnreadCount((prev) => prev + 1);
          }
          playSound();
        }
      )
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR') {
          // Retry after error
          setTimeout(() => fetchNotifications(), 3000);
        }
      });

    channelRef.current = notifChannel;

    // Periodic refresh as fallback (every 30s)
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => {
      clearInterval(interval);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, fetchNotifications, playSound]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(diff / 86400000)} ngày trước`;
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) markAsRead(notification.id);
    if (notification.type === 'payment_confirmed' && role === 'tutor') {
      setComplaintNotificationId(notification.id);
      setComplaintOpen(true);
      setOpen(false);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h4 className="font-semibold text-sm">Thông báo</h4>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                Đọc tất cả
              </Button>
            )}
          </div>
          <div className="max-h-[350px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                Chưa có thông báo
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                      !notification.is_read ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{notification.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        {notification.type === 'payment_confirmed' && role === 'tutor' && (
                          <p className="text-xs text-primary mt-0.5">Bấm để khiếu nại</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <TutorComplaintDialog
        open={complaintOpen}
        onOpenChange={setComplaintOpen}
        notificationId={complaintNotificationId}
      />
    </>
  );
};

export default NotificationBell;
