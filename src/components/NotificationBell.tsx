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
import { Bell, Check, CheckCheck } from 'lucide-react';
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioInitialized = useRef(false);

  // Initialize audio on first user interaction with web audio API
  const initializeAudio = useCallback(() => {
    if (!audioInitialized.current) {
      audioInitialized.current = true;
    }
  }, []);

  // Play notification sound twice using simple beep with Web Audio API
  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playBeep = (delay: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800; // Hz - notification sound
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + delay + 0.3);
        
        oscillator.start(audioContext.currentTime + delay);
        oscillator.stop(audioContext.currentTime + delay + 0.3);
      };
      
      // Play twice
      playBeep(0);
      playBeep(0.5);
    } catch (e) {
      console.error('Error playing notification sound:', e);
    }
  }, []);

  // Initialize audio on component mount and user interaction
  useEffect(() => {
    const handleInteraction = () => {
      initializeAudio();
      document.removeEventListener('click', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);
    
    return () => {
      document.removeEventListener('click', handleInteraction);
      audioRef.current = null;
    };
  }, [initializeAudio]);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();
    fetchUnreadMessages();

    // Subscribe to realtime notifications
    const notifChannel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Play notification sound twice
          playNotificationSound();
        }
      )
      .subscribe();

    // Subscribe to new messages for real-time unread count and create notification
    const msgChannel = supabase
      .channel('messages-unread')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          fetchUnreadMessages();
          playNotificationSound();
          
          // Create notification for new message with sender name
          const newMsg = payload.new as { sender_id: string; content: string };
          if (newMsg.sender_id) {
            try {
              // Get sender profile to show name
              const { data: senderProfile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('user_id', newMsg.sender_id)
                .single();
              
              const senderName = senderProfile?.full_name || 'Người dùng';
              
              // Check if notification already exists to avoid duplicates
              const { data: existingNotif } = await supabase
                .from('notifications')
                .select('id')
                .eq('user_id', user.id)
                .eq('type', 'new_message')
                .eq('related_id', newMsg.sender_id)
                .eq('is_read', false)
                .limit(1);
              
              if (!existingNotif || existingNotif.length === 0) {
                await supabase.from('notifications').insert({
                  user_id: user.id,
                  type: 'new_message',
                  title: 'Tin nhắn mới',
                  message: `Bạn đã nhận được tin nhắn mới từ ${senderName}`,
                  related_id: newMsg.sender_id,
                });
              }
            } catch (e) {
              console.error('Error creating message notification:', e);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(msgChannel);
    };
  }, [user]);

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
