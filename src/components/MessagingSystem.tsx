import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MessageCircle,
  Send,
  Search,
  ArrowLeft,
  User,
  Loader2,
  Paperclip,
  Image,
  FileText,
  Download,
  X,
  CreditCard,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  file_url?: string;
  file_type?: string;
  file_name?: string;
}

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
  role?: string;
}

interface Conversation {
  user_id: string;
  full_name: string;
  email: string;
  last_message: string;
  unread_count: number;
  last_message_time: string;
  role?: string;
}

interface SelectedUserWithRole {
  user_id: string;
  full_name: string;
  role?: string;
}

interface MessagingSystemProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultReceiverId?: string;
  defaultReceiverName?: string;
  autoMessage?: string;
}

const MessagingSystem = ({
  open,
  onOpenChange,
  defaultReceiverId,
  defaultReceiverName,
  autoMessage,
}: MessagingSystemProps) => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioInitialized = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<SelectedUserWithRole | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState<'conversations' | 'chat' | 'search'>('conversations');
  // Cache for profiles and roles to speed up loading
  const profileCache = useRef<Map<string, { full_name: string; email: string }>>(new Map());
  const roleCache = useRef<Map<string, string>>(new Map());

  // Payment dialog state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [sendingPayment, setSendingPayment] = useState(false);

  // Initialize audio on first user interaction
  const initializeAudio = useCallback(() => {
    if (!audioInitialized.current) {
      audioInitialized.current = true;
    }
  }, []);

  // Play notification sound twice using Web Audio API
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
    if (open && user) {
      fetchConversations();
      
      if (defaultReceiverId && defaultReceiverName) {
        setSelectedUser({ user_id: defaultReceiverId, full_name: defaultReceiverName });
        setView('chat');
      }
    }
  }, [open, user, defaultReceiverId, defaultReceiverName]);

  // Auto-send message when autoMessage is provided
  useEffect(() => {
    if (autoMessage && selectedUser && user && view === 'chat') {
      const sendAutoMessage = async () => {
        try {
          await supabase.from('messages').insert({
            sender_id: user.id,
            receiver_id: selectedUser.user_id,
            content: autoMessage,
          });
        } catch (error) {
          console.error('Error sending auto message:', error);
        }
      };
      sendAutoMessage();
    }
  }, [autoMessage, selectedUser, user, view]);

  useEffect(() => {
    if (selectedUser && user) {
      fetchMessages().then(() => {
        // Scroll to bottom after messages load
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 100);
      });

      // Subscribe to new messages with improved realtime
      const channel = supabase
        .channel(`messages-realtime-${user.id}-${selectedUser.user_id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            const newMsg = payload.new as Message;
            // Check if message is relevant to this conversation
            if (
              (newMsg.sender_id === selectedUser.user_id && newMsg.receiver_id === user.id) ||
              (newMsg.sender_id === user.id && newMsg.receiver_id === selectedUser.user_id)
            ) {
              setMessages(prev => {
                // Avoid duplicates
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              
              if (newMsg.sender_id !== user.id) {
                playNotificationSound();
                
                // Create notification for new message
                (async () => {
                  try {
                    await supabase.from('notifications').insert({
                      user_id: user.id,
                      type: 'new_message',
                      title: 'Tin nhắn mới',
                      message: `${selectedUser.full_name} đã gửi tin nhắn cho bạn`,
                      related_id: newMsg.sender_id,
                    });
                  } catch (e) {
                    console.error('Error creating notification:', e);
                  }
                })();
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedUser, user]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive (not on initial load)
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch all messages in a single query with limit for performance
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Extract unique partner IDs
      const partnerIds = [...new Set(
        (messagesData || []).map(msg => 
          msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
        )
      )];

      if (partnerIds.length === 0) {
        setConversations([]);
        return;
      }

      // Batch fetch all profiles and roles at once (MUCH faster than individual queries)
      const [profilesResult, rolesResult] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, email').in('user_id', partnerIds),
        supabase.from('user_roles').select('user_id, role').in('user_id', partnerIds)
      ]);

      // Build lookup maps and update cache
      const profileMap = new Map<string, { full_name: string; email: string }>();
      const roleMap = new Map<string, string>();

      (profilesResult.data || []).forEach(p => {
        profileMap.set(p.user_id, { full_name: p.full_name, email: p.email });
        profileCache.current.set(p.user_id, { full_name: p.full_name, email: p.email });
      });
      (rolesResult.data || []).forEach(r => {
        roleMap.set(r.user_id, r.role);
        roleCache.current.set(r.user_id, r.role);
      });

      // Build conversations in single pass (no async calls inside loop)
      const conversationMap = new Map<string, Conversation>();
      for (const msg of messagesData || []) {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        
        if (!conversationMap.has(partnerId)) {
          const profile = profileMap.get(partnerId);
          if (profile) {
            conversationMap.set(partnerId, {
              user_id: partnerId,
              full_name: profile.full_name,
              email: profile.email,
              last_message: msg.content,
              unread_count: msg.receiver_id === user.id && !msg.is_read ? 1 : 0,
              last_message_time: msg.created_at,
              role: roleMap.get(partnerId) || 'student',
            });
          }
        } else {
          const conv = conversationMap.get(partnerId)!;
          if (msg.receiver_id === user.id && !msg.is_read) {
            conv.unread_count += 1;
          }
        }
      }

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!user || !selectedUser) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser.user_id}),and(sender_id.eq.${selectedUser.user_id},receiver_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', selectedUser.user_id)
        .eq('receiver_id', user.id)
        .eq('is_read', false);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search by user ID (short ID format)
  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      // Search by short ID (first 8 characters of user_id) or name/email
      const searchUpper = searchQuery.toUpperCase();
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .neq('user_id', user?.id)
        .limit(20);

      if (error) throw error;

      // Filter by short ID or name - exclude current user's email from display
      const filtered = (data || []).filter(profile => {
        const shortId = profile.user_id.slice(0, 8).toUpperCase();
        return (
          shortId.includes(searchUpper) ||
          profile.full_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });

      const limitedResults = filtered.slice(0, 10);
      
      // Fetch roles for all search results to display badges
      if (limitedResults.length > 0) {
        const userIds = limitedResults.map(p => p.user_id);
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);
        
        const roleMap = new Map<string, string>();
        (rolesData || []).forEach(r => {
          roleMap.set(r.user_id, r.role);
          roleCache.current.set(r.user_id, r.role);
        });
        
        // Add role to each result
        const resultsWithRole = limitedResults.map(p => ({
          ...p,
          role: roleMap.get(p.user_id) || 'student',
        }));
        
        setSearchResults(resultsWithRole);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const sendMessage = async (content?: string, fileUrl?: string, fileType?: string, fileName?: string) => {
    if (!user || !selectedUser) return;
    
    const messageContent = content || newMessage.trim();
    if (!messageContent && !fileUrl) return;

    try {
      const messageData: any = {
        sender_id: user.id,
        receiver_id: selectedUser.user_id,
        content: messageContent || (fileUrl ? `[Đã gửi ${fileType === 'image' ? 'ảnh' : 'tệp'}]` : ''),
      };

      const { error } = await supabase.from('messages').insert(messageData);

      if (error) throw error;
      setNewMessage('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể gửi tin nhắn',
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedUser) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      // Upload to assignments bucket (reusing existing bucket)
      const { data, error } = await supabase.storage
        .from('assignments')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('assignments')
        .getPublicUrl(fileName);

      const isImage = file.type.startsWith('image/');
      
      // Send message with file info embedded in content
      const fileMessage = isImage 
        ? `[IMAGE:${urlData.publicUrl}]` 
        : `[FILE:${urlData.publicUrl}:${file.name}]`;
      
      await sendMessage(fileMessage);
      
      toast({
        title: 'Đã tải lên',
        description: isImage ? 'Ảnh đã được gửi' : 'Tệp đã được gửi',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể tải tệp lên',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendPaymentRequest = async () => {
    if (!paymentAmount || !paymentFile || !user || !selectedUser) return;

    setSendingPayment(true);
    try {
      const fileExt = paymentFile.name.split('.').pop();
      const fileName = `payments/${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('assignments')
        .upload(fileName, paymentFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('assignments')
        .getPublicUrl(fileName);

      // Send payment request message with special format
      const paymentMessage = `[PAYMENT:${urlData.publicUrl}:${paymentAmount}]`;
      await sendMessage(paymentMessage);

      toast({
        title: 'Đã gửi',
        description: 'Yêu cầu thanh toán đã được gửi',
      });

      setShowPaymentDialog(false);
      setPaymentAmount('');
      setPaymentFile(null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể gửi yêu cầu thanh toán',
      });
    } finally {
      setSendingPayment(false);
    }
  };

  const handlePaymentResponse = async (response: 'pay' | 'reject' | 'consult') => {
    if (!user || !selectedUser) return;
    
    const responseText = response === 'pay' 
      ? '💰 Tôi xác nhận đã thanh toán' 
      : response === 'reject' 
        ? '❌ Tôi từ chối thanh toán' 
        : '💬 Tôi cần tư vấn thêm';
    
    await sendMessage(responseText);
  };

  const handleSelectUser = async (userProfile: UserProfile | Conversation) => {
    // Get role if not already available
    let userRole = userProfile.role;
    if (!userRole) {
      // Check cache first
      userRole = roleCache.current.get(userProfile.user_id);
      if (!userRole) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userProfile.user_id)
          .single();
        userRole = roleData?.role || 'student';
        roleCache.current.set(userProfile.user_id, userRole);
      }
    }
    
    setSelectedUser({
      user_id: userProfile.user_id,
      full_name: userProfile.full_name,
      role: userRole,
    });
    setView('chat');
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleBack = () => {
    setSelectedUser(null);
    setMessages([]);
    setView('conversations');
    fetchConversations();
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // Parse special message content
  const renderMessageContent = (msg: Message) => {
    const content = msg.content;
    const isOwn = msg.sender_id === user?.id;

    // Check for payment request
    const paymentMatch = content.match(/\[PAYMENT:(.+):(\d+)\]/);
    if (paymentMatch) {
      const imageUrl = paymentMatch[1];
      const amount = parseInt(paymentMatch[2]);
      
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium">💳 Yêu cầu thanh toán</p>
          <img src={imageUrl} alt="QR thanh toán" className="max-w-full rounded-lg max-h-48 object-contain" />
          <p className="text-sm font-bold">{formatPrice(amount)}</p>
          {!isOwn && (
            <div className="flex flex-wrap gap-2 mt-2">
              <Button size="sm" variant="default" onClick={() => handlePaymentResponse('pay')}>
                💰 Thanh toán
              </Button>
              <Button size="sm" variant="outline" onClick={() => handlePaymentResponse('reject')}>
                ❌ Từ chối
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handlePaymentResponse('consult')}>
                💬 Tư vấn
              </Button>
            </div>
          )}
        </div>
      );
    }

    // Check for image
    const imageMatch = content.match(/\[IMAGE:(.+)\]/);
    if (imageMatch) {
      return (
        <img 
          src={imageMatch[1]} 
          alt="Ảnh" 
          className="max-w-full rounded-lg max-h-64 object-contain cursor-pointer"
          onClick={() => window.open(imageMatch[1], '_blank')}
        />
      );
    }

    // Check for file
    const fileMatch = content.match(/\[FILE:(.+):(.+)\]/);
    if (fileMatch) {
      return (
        <a 
          href={fileMatch[1]} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-2 bg-background/50 rounded-lg hover:bg-background/80"
        >
          <FileText className="w-8 h-8 text-blue-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{fileMatch[2]}</p>
            <p className="text-xs opacity-70">Nhấn để tải</p>
          </div>
          <Download className="w-4 h-4" />
        </a>
      );
    }

    // Regular text message
    return <p className="text-sm whitespace-pre-wrap">{content}</p>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[600px] max-h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            {view !== 'conversations' && (
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <DialogTitle className="flex-1">
              {view === 'conversations' && 'Tin nhắn'}
              {view === 'search' && 'Tìm người dùng'}
              {view === 'chat' && (
                <div 
                  className="cursor-pointer"
                  onClick={() => {
                    if (selectedUser?.role === 'admin') {
                      toast({ 
                        title: '🔰 Admin đã xác minh', 
                        description: 'Đây là Admin đã được hệ thống xác minh. Bạn có thể tin tưởng thông tin từ tài khoản này.' 
                      });
                    } else if (selectedUser?.role === 'tutor') {
                      toast({ 
                        title: '🎓 Gia sư đã xác minh', 
                        description: 'Đây là Gia sư đã được hệ thống xác minh. Bạn có thể tin tưởng thông tin từ tài khoản này.' 
                      });
                    }
                  }}
                >
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${
                    selectedUser?.role === 'admin' 
                      ? 'bg-blue-900 text-white' 
                      : selectedUser?.role === 'tutor' 
                        ? 'bg-orange-100 text-orange-800' 
                        : ''
                  }`}>
                    {selectedUser?.role === 'admin' ? 'ADMIN 🔰' : selectedUser?.full_name}
                    {selectedUser?.role === 'tutor' && ' 🎓'}
                  </span>
                  {(selectedUser?.role === 'admin' || selectedUser?.role === 'tutor') && (
                    <p className="text-xs font-normal text-muted-foreground mt-0.5">
                      Bấm để xem xác minh
                    </p>
                  )}
                  <p className="text-xs font-normal text-muted-foreground">
                    ID: {selectedUser?.user_id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              )}
            </DialogTitle>
          </div>
        </DialogHeader>

        {view === 'conversations' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="p-4 border-b border-border flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo ID hoặc tên..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value) setView('search');
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Chưa có cuộc trò chuyện nào</p>
                  <p className="text-sm mt-1">Tìm theo ID để bắt đầu</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {conversations.map((conv) => {
                    const isAdmin = conv.role === 'admin';
                    const isTutor = conv.role === 'tutor';
                    
                    return (
                      <div
                        key={conv.user_id}
                        className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleSelectUser(conv)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isAdmin ? 'bg-blue-900 text-white' : isTutor ? 'bg-orange-100' : 'bg-primary/10'
                          }`}>
                            <User className={`w-5 h-5 ${isAdmin ? 'text-white' : isTutor ? 'text-orange-600' : 'text-primary'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div 
                                className={`flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer ${
                                  isAdmin ? 'bg-blue-900 text-white' : isTutor ? 'bg-orange-100 text-orange-800' : ''
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isAdmin) {
                                    toast({ title: '🔰 Admin', description: 'Đây là Admin đã được kiểm duyệt' });
                                  } else if (isTutor) {
                                    toast({ title: '🎓 Gia sư', description: 'Đây là Gia sư đã được kiểm duyệt' });
                                  }
                                }}
                              >
                                <span className="font-medium truncate">
                                  {isAdmin ? 'ADMIN 🔰' : conv.full_name}
                                </span>
                                {isTutor && <span>🎓</span>}
                              </div>
                              {conv.unread_count > 0 && (
                                <Badge variant="destructive" className="text-xs flex-shrink-0">
                                  {conv.unread_count}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              ID: {conv.user_id.slice(0, 8).toUpperCase()}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {conv.last_message}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'search' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="p-4 border-b border-border flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo ID (VD: AB12CD34) hoặc tên..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {searching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'Không tìm thấy người dùng với ID này' : 'Nhập ID hoặc tên để tìm kiếm'}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {searchResults.map((profile) => {
                    const isAdmin = profile.role === 'admin';
                    const isTutor = profile.role === 'tutor';
                    
                    return (
                      <div
                        key={profile.user_id}
                        className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleSelectUser(profile)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isAdmin ? 'bg-blue-900 text-white' : isTutor ? 'bg-orange-100' : 'bg-primary/10'
                          }`}>
                            <User className={`w-5 h-5 ${isAdmin ? 'text-white' : isTutor ? 'text-orange-600' : 'text-primary'}`} />
                          </div>
                          <div>
                            <div 
                              className={`flex items-center gap-1 px-2 py-0.5 rounded ${
                                isAdmin ? 'bg-blue-900 text-white' : isTutor ? 'bg-orange-100 text-orange-800' : ''
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isAdmin) {
                                  toast({ title: '🔰 Admin', description: 'Đây là Admin đã được kiểm duyệt' });
                                } else if (isTutor) {
                                  toast({ title: '🎓 Gia sư', description: 'Đây là Gia sư đã được kiểm duyệt' });
                                }
                              }}
                            >
                              <span className="font-medium">
                                {isAdmin ? 'ADMIN 🔰' : profile.full_name}
                              </span>
                              {isTutor && <span>🎓</span>}
                            </div>
                            <p className="text-xs text-primary font-mono mt-0.5">
                              ID: {profile.user_id.slice(0, 8).toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'chat' && selectedUser && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Bắt đầu cuộc trò chuyện
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.sender_id === user?.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {renderMessageContent(msg)}
                        <p
                          className={`text-xs mt-1 ${
                            msg.sender_id === user?.id
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input - stays above keyboard on mobile */}
            <div className="p-4 border-t border-border space-y-2 bg-background sticky bottom-0 pb-safe">
              {/* File input */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
                onChange={handleFileUpload}
              />
              
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2 items-center"
              >
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                </Button>
                
                {/* Admin payment button */}
                {role === 'admin' && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setShowPaymentDialog(true)}
                  >
                    <CreditCard className="w-4 h-4" />
                  </Button>
                )}
                
                <Input
                  placeholder="Nhập tin nhắn..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim() || uploading}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gửi yêu cầu thanh toán</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ảnh QR / Hóa đơn</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setPaymentFile(e.target.files?.[0] || null)}
              />
              {paymentFile && (
                <p className="text-sm text-muted-foreground">{paymentFile.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Số tiền (VND)</Label>
              <Input
                type="number"
                placeholder="150000"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)} className="flex-1">
                Hủy
              </Button>
              <Button 
                onClick={handleSendPaymentRequest} 
                disabled={!paymentFile || !paymentAmount || sendingPayment}
                className="flex-1"
              >
                {sendingPayment ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Gửi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default MessagingSystem;
