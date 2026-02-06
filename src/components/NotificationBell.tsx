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
  const [open, setOpen] = useState(false);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [complaintNotificationId, setComplaintNotificationId] = useState<string | undefined>();
  const canPlayAudio = useRef(false);
  const channelRef = useRef<any>(null);
  const messageChannelRef = useRef<any>(null);
  const profileCacheRef = useRef<Map<string, string>>(new Map());

  // Play notification sound using Web Audio API - reliable cross-browser
  const playNotificationSound = useCallback(() => {
    if (!canPlayAudio.current) {
      console.log('Audio not ready - user interaction required');
      return;
    }
    
    try {
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
      
      console.log('🔔 Notification sound played');
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

  // Fetch notifications from database
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!error && data) {
        setNotifications(data);
        const unread = data.filter(n => !n.is_read).length;
        setUnreadCount(unread);
        console.log('📬 Fetched notifications:', data.length, 'Unread:', unread);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user]);

  // Get sender name from cache or database
  const getSenderName = useCallback(async (senderId: string): Promise<string> => {
    // Check cache first
    if (profileCacheRef.current.has(senderId)) {
      return profileCacheRef.current.get(senderId)!;
    }

    try {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', senderId)
        .single();
      
      const name = data?.full_name || 'Người dùng';
      profileCacheRef.current.set(senderId, name);
      return name;
    } catch {
      return 'Người dùng';
    }
  }, []);

  // Create notification for new message
  const createMessageNotification = useCallback(async (senderId: string, messageContent: string) => {
    if (!user) return;

    const senderName = await getSenderName(senderId);
    
    // Insert notification
    const { data: newNotif, error } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'new_message',
        title: 'Tin nhắn mới',
        message: `${senderName}: ${messageContent.slice(0, 50)}${messageContent.length > 50 ? '...' : ''}`,
        related_id: senderId,
      })
      .select()
      .single();

    if (!error && newNotif) {
      console.log('✅ Created message notification:', newNotif);
      // Add to state immediately
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);
      playNotificationSound();
    } else if (error) {
      console.error('Error creating message notification:', error);
    }
  }, [user, getSenderName, playNotificationSound]);

  // Main effect - setup subscriptions and fetch data
  useEffect(() => {
    if (!user) return;

    console.log('🔔 Setting up notification system for user:', user.id, 'role:', role);

    // Fetch initial notifications
    fetchNotifications();

    // Cleanup previous channels
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    if (messageChannelRef.current) {
      supabase.removeChannel(messageChannelRef.current);
    }

    // Subscribe to notifications table - listen for INSERT events
    const notificationChannel = supabase
      .channel(`notifications-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔔 Realtime notification received:', payload.new);
          const newNotification = payload.new as Notification;
          
          // Add to state - avoid duplicates
          setNotifications(prev => {
            if (prev.some(n => n.id === newNotification.id)) return prev;
            return [newNotification, ...prev];
          });
          
          setUnreadCount(prev => prev + 1);
          playNotificationSound();
        }
      )
      .subscribe((status) => {
        console.log('📡 Notification channel status:', status);
      });

    // Subscribe to messages table - create notifications for new messages
    const messageChannel = supabase
      .channel(`messages-notify-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('📩 New message received:', payload.new);
          const newMsg = payload.new as { sender_id: string; content: string; id: string };
          
          // Create notification for this message
          await createMessageNotification(newMsg.sender_id, newMsg.content);
        }
      )
      .subscribe((status) => {
        console.log('📡 Message channel status:', status);
      });

    channelRef.current = notificationChannel;
    messageChannelRef.current = messageChannel;

    return () => {
      console.log('🧹 Cleaning up notification channels');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (messageChannelRef.current) {
        supabase.removeChannel(messageChannelRef.current);
      }
    };
  }, [user, role, fetchNotifications, createMessageNotification, playNotificationSound]);

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
