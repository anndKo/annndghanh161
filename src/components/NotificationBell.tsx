import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
}

const NotificationBell = () => {
  const { user, role } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [open, setOpen] = useState(false);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [complaintNotificationId, setComplaintNotificationId] = useState<string | undefined>();
  const audioContextRef = useRef<AudioContext | null>(null);
  const canPlayAudio = useRef(false);
  const channelsRef = useRef<{ notif: any; msg: any }>({ notif: null, msg: null });
  const lastFetchRef = useRef<number>(0);

  // Play notification sound twice using simple beep with Web Audio API
  const playNotificationSound = useCallback(() => {
    if (!canPlayAudio.current) {
      console.log('Audio not ready - user interaction required');
      return;
    }
    
    try {
      // Create new AudioContext each time for better reliability
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playBeep = (delay: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + delay + 0.3);
        
        oscillator.start(audioContext.currentTime + delay);
        oscillator.stop(audioContext.currentTime + delay + 0.3);
      };
      
      // Play twice
      playBeep(0);
      playBeep(0.5);
      
      // Close context after sounds complete
      setTimeout(() => {
        audioContext.close().catch(() => {});
      }, 1000);
    } catch (e) {
      console.error('Error playing notification sound:', e);
    }
  }, []);

  // Initialize audio permission on first user interaction
  useEffect(() => {
    const handleInteraction = () => {
      canPlayAudio.current = true;
      console.log('Audio enabled via user interaction');
    };
    
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach(event => document.addEventListener(event, handleInteraction, { once: true }));
    
    return () => {
      events.forEach(event => document.removeEventListener(event, handleInteraction));
    };
  }, []);

  // Fetch initial data and set up realtime subscriptions
  useEffect(() => {
    if (!user) return;

    console.log('Setting up notification channels for user:', user.id, 'role:', role);

    const fetchData = async () => {
      // Avoid duplicate fetches within 1 second
      const now = Date.now();
      if (now - lastFetchRef.current < 1000) return;
      lastFetchRef.current = now;

      await Promise.all([fetchNotifications(), fetchUnreadMessages()]);
    };

    fetchData();

    // Clean up existing channels
    if (channelsRef.current.notif) {
      supabase.removeChannel(channelsRef.current.notif);
    }
    if (channelsRef.current.msg) {
      supabase.removeChannel(channelsRef.current.msg);
    }

    // Subscribe to realtime notifications - listen for INSERT events
    const notifChannel = supabase
      .channel(`notif-bell-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔔 New notification received:', payload.new);
          const newNotification = payload.new as Notification;
          
          setNotifications(prev => {
            // Avoid duplicates
            if (prev.some(n => n.id === newNotification.id)) return prev;
            return [newNotification, ...prev];
          });
          
          setUnreadCount(prev => prev + 1);
          playNotificationSound();
        }
      )
      .subscribe((status) => {
        console.log('Notification channel status:', status);
      });

    // Subscribe to new messages - create notification immediately
    const msgChannel = supabase
      .channel(`msg-bell-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('📩 New message received for notification bell:', payload.new);
          
          // Update unread messages count
          setUnreadMessages(prev => prev + 1);
          
          // Play sound immediately
          playNotificationSound();
          
          // Get sender info and create notification
          const newMsg = payload.new as { sender_id: string; content: string; id: string };
          
          try {
            // Get sender profile
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', newMsg.sender_id)
              .single();
            
            const senderName = senderProfile?.full_name || 'Người dùng';
            
            // Create notification for new message
            const { data: newNotif, error } = await supabase
              .from('notifications')
              .insert({
                user_id: user.id,
                type: 'new_message',
                title: 'Tin nhắn mới',
                message: `Bạn nhận được tin nhắn từ ${senderName}`,
                related_id: newMsg.sender_id,
              })
              .select()
              .single();
            
            if (error) {
              console.error('Error creating message notification:', error);
            } else {
              console.log('✅ Created message notification:', newNotif);
              // The notification INSERT will be caught by the notif channel
              // and will update the UI automatically
            }
          } catch (e) {
            console.error('Error in message notification handler:', e);
          }
        }
      )
      .subscribe((status) => {
        console.log('Message channel status:', status);
      });

    channelsRef.current = { notif: notifChannel, msg: msgChannel };

    return () => {
      console.log('Cleaning up notification channels');
      if (channelsRef.current.notif) {
        supabase.removeChannel(channelsRef.current.notif);
      }
      if (channelsRef.current.msg) {
        supabase.removeChannel(channelsRef.current.msg);
      }
    };
  }, [user, role, playNotificationSound]);

  const fetchUnreadMessages = async () => {
    if (!user) return;

    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('is_read', false);

    setUnreadMessages(count || 0);
  };

  const fetchNotifications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    // If tutor clicks on payment_confirmed notification, open complaint dialog
    if (notification.type === 'payment_confirmed' && role === 'tutor') {
      setComplaintNotificationId(notification.id);
      setComplaintOpen(true);
      setOpen(false);
    }
  };

  const totalUnread = unreadCount + unreadMessages;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {totalUnread > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {totalUnread > 9 ? '9+' : totalUnread}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h4 className="font-semibold">Thông báo</h4>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Đọc tất cả
              </Button>
            )}
          </div>
          <ScrollArea className="h-[300px]">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                Chưa có thông báo
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                      !notification.is_read ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        {notification.type === 'payment_confirmed' && role === 'tutor' && (
                          <p className="text-xs text-primary mt-1">Bấm để khiếu nại</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
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
