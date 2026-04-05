import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MessageCircle,
  Send,
  Search,
  ArrowLeft,
  User,
  Loader2,
  Paperclip,
  FileText,
  Download,
  X,
  CreditCard,
  Pin,
  PinOff,
  Flag,
  MoreVertical,
  Reply,
  Pencil,
  Trash2,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import ConversationReportDialog from '@/components/ConversationReportDialog';
import ImageViewer from '@/components/ImageViewer';
import UserAvatar from '@/components/UserAvatar';
import { formatPriceInput, parsePriceInput } from '@/lib/formatPrice';
import { numberToVietnameseWords } from '@/lib/numberToWords';

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
  is_edited?: boolean;
  is_recalled?: boolean;
  reply_to_id?: string;
  reply_to_content?: string;
  reply_to_sender_name?: string;
}

interface UserProfile {
  user_id: string;
  full_name: string;
  username: string;
  role?: string;
  avatar_url?: string | null;
}

interface Conversation {
  user_id: string;
  full_name: string;
  username: string;
  last_message: string;
  unread_count: number;
  last_message_time: string;
  role?: string;
  last_is_recalled?: boolean;
  avatar_url?: string | null;
}

interface SelectedUserWithRole {
  user_id: string;
  full_name: string;
  role?: string;
  avatar_url?: string | null;
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
  const inputRef = useRef<HTMLInputElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<SelectedUserWithRole | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(new Map());
  const [view, setView] = useState<'conversations' | 'chat' | 'search'>('conversations');
  const [pinnedUserIds, setPinnedUserIds] = useState<Set<string>>(new Set());
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const profileCache = useRef<Map<string, { full_name: string; username: string }>>(new Map());
  const roleCache = useRef<Map<string, string>>(new Map());

  // Edit state
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  // Reply state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Payment dialog state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [sendingPayment, setSendingPayment] = useState(false);

  // Payment response dialogs
  const [showPayBillDialog, setShowPayBillDialog] = useState(false);
  const [payBillFile, setPayBillFile] = useState<File | null>(null);
  const [uploadingBill, setUploadingBill] = useState(false);
  const [payBillAgreed, setPayBillAgreed] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Admin confirm payment dialog
  const [showAdminConfirmDialog, setShowAdminConfirmDialog] = useState(false);
  const [adminConfirmClassCode, setAdminConfirmClassCode] = useState('');

  // Student refund dialog
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundContent, setRefundContent] = useState('');
  const [refundFiles, setRefundFiles] = useState<File[]>([]);
  const [sendingRefund, setSendingRefund] = useState(false);

  // Highlighted message for scroll-to-reply
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);

  // Image viewer state - gallery mode
  const [viewImages, setViewImages] = useState<string[]>([]);
  const [viewImageIndex, setViewImageIndex] = useState(0);

  // Staging preview
  const [stagingPreviewUrl, setStagingPreviewUrl] = useState<string | null>(null);

  // Initialize audio on first user interaction
  const initializeAudio = useCallback(() => {
    if (!audioInitialized.current) {
      audioInitialized.current = true;
    }
  }, []);

  const playNotificationSound = useCallback(() => {
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
      playBeep(0);
      playBeep(0.5);
    } catch (e) {
      console.error('Error playing notification sound:', e);
    }
  }, []);

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
    if (!open) {
      setSelectedUser(null);
      setMessages([]);
      setView('conversations');
      setSearchQuery('');
      setSearchResults([]);
      setEditingMessage(null);
      setReplyingTo(null);
    }
  }, [open]);

  useEffect(() => {
    if (open && user) {
      fetchConversations();
      fetchPinnedConversations();
      if (defaultReceiverId && defaultReceiverName) {
        const fetchReceiverRole = async () => {
          let receiverRole = roleCache.current.get(defaultReceiverId);
          if (!receiverRole) {
            const { data: roleData } = await supabase
              .from('user_roles').select('role').eq('user_id', defaultReceiverId).single();
            receiverRole = roleData?.role || 'student';
            roleCache.current.set(defaultReceiverId, receiverRole);
          }
          setSelectedUser({ user_id: defaultReceiverId, full_name: defaultReceiverName, role: receiverRole });
          setView('chat');
        };
        fetchReceiverRole();
      }
    }
  }, [open, user, defaultReceiverId, defaultReceiverName]);

  // Realtime subscription for conversation list updates
  useEffect(() => {
    if (!open || !user) return;
    const channel = supabase
      .channel(`conversations-realtime-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' },
        (payload: any) => {
          const msg = payload.new as Message;
          if (msg && (msg.sender_id === user.id || msg.receiver_id === user.id)) {
            // Only refresh conversation list when NOT in chat view to avoid scroll reset
            if (view === 'conversations') {
              fetchConversations();
            }
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, user, view]);

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

  const lastMsgIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedUser && user) {
      // Fetch messages without setting loading to avoid scroll reset
      const loadMessages = async () => {
        try {
          const { data, error } = await supabase
            .from('messages').select('*')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser.user_id}),and(sender_id.eq.${selectedUser.user_id},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: true });
          if (error) throw error;
          setMessages(data || []);
          // Mark as read and dispatch event for badge update
          supabase.from('messages').update({ is_read: true })
            .eq('sender_id', selectedUser.user_id).eq('receiver_id', user.id).eq('is_read', false).then(() => {
              window.dispatchEvent(new Event('messagesRead'));
            });
          // Scroll to bottom after messages render
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
          }, 100);
        } catch (error) {
          console.error('Error fetching messages:', error);
        }
      };
      loadMessages();

      const channel = supabase
        .channel(`messages-realtime-${user.id}-${selectedUser.user_id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload: any) => {
            const newMsg = payload.new as Message;
            if (
              (newMsg.sender_id === selectedUser.user_id && newMsg.receiver_id === user.id) ||
              (newMsg.sender_id === user.id && newMsg.receiver_id === selectedUser.user_id)
            ) {
              setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              // Scroll to bottom for new messages
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
              if (newMsg.sender_id !== user.id) {
                playNotificationSound();
              }
            }
          }
        )
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' },
          (payload: any) => {
            const updatedMsg = payload.new as Message;
            setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedUser, user]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  const getMessagePreview = (msg: any, partnerId: string, partnerName: string): string => {
    if (msg.is_recalled) return 'Tin nhắn đã được thu hồi';
    const content = msg.content || '';
    const isSentByMe = msg.sender_id === user?.id;
    const imagesMatch = content.match(/\[IMAGES:(.+)\]/);
    if (imagesMatch) {
      const count = imagesMatch[1].split('|').length;
      return isSentByMe ? `Bạn đã gửi ${count} ảnh` : `${partnerName} đã gửi ${count} ảnh`;
    }
    if (content.match(/\[IMAGE:.+\]/)) return isSentByMe ? 'Bạn đã gửi 1 ảnh' : `${partnerName} đã gửi 1 ảnh`;
    if (content.match(/\[FILE:.+:.+\]/)) return isSentByMe ? 'Bạn đã gửi 1 tệp' : `${partnerName} đã gửi 1 tệp`;
    if (content.match(/\[PAYMENT:.+:\d+\]/)) return isSentByMe ? 'Bạn đã gửi yêu cầu thanh toán' : `${partnerName} đã gửi yêu cầu thanh toán`;
    if (content.match(/\[BILL:.+\]/)) return isSentByMe ? 'Bạn đã gửi xác nhận thanh toán' : `${partnerName} đã gửi xác nhận thanh toán`;
    return content;
  };

  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: messagesData, error } = await supabase
        .from('messages').select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false }).limit(500);

      if (error) throw error;

      const partnerIds = [...new Set(
        (messagesData || []).map((msg: any) => msg.sender_id === user.id ? msg.receiver_id : msg.sender_id)
      )];

      if (partnerIds.length === 0) { setConversations([]); return; }

      const [profilesResult, rolesResult] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', partnerIds),
        supabase.from('user_roles').select('user_id, role').in('user_id', partnerIds)
      ]);

      const profileMap = new Map<string, { full_name: string; username: string; avatar_url?: string | null }>();
      const roleMap = new Map<string, string>();
      (profilesResult.data || []).forEach((p: any) => {
        const profile = { full_name: p.full_name, username: p.full_name, avatar_url: p.avatar_url };
        profileMap.set(p.user_id, profile);
        profileCache.current.set(p.user_id, profile);
      });
      (rolesResult.data || []).forEach((r: any) => {
        roleMap.set(r.user_id, r.role);
        roleCache.current.set(r.user_id, r.role);
      });

      const conversationMap = new Map<string, Conversation>();
      for (const msg of messagesData || []) {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!conversationMap.has(partnerId)) {
          const profile = profileMap.get(partnerId);
          if (profile) {
            const previewContent = getMessagePreview(msg, partnerId, profile.full_name);
            conversationMap.set(partnerId, {
              user_id: partnerId,
              full_name: profile.full_name,
              username: profile.username,
              last_message: previewContent,
              unread_count: msg.receiver_id === user.id && !msg.is_read ? 1 : 0,
              last_message_time: msg.created_at,
              role: roleMap.get(partnerId) || 'student',
              last_is_recalled: msg.is_recalled,
              avatar_url: profile.avatar_url,
            });
          }
        } else {
          const conv = conversationMap.get(partnerId)!;
          if (msg.receiver_id === user.id && !msg.is_read) {
            conv.unread_count += 1;
          }
        }
      }

      const convArray = Array.from(conversationMap.values());
      convArray.sort((a, b) => {
        const aPinned = pinnedUserIds.has(a.user_id) ? 1 : 0;
        const bPinned = pinnedUserIds.has(b.user_id) ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;
        return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
      });
      setConversations(convArray);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPinnedConversations = async () => {
    if (!user) return;
    const { data } = await supabase.from('pinned_conversations').select('pinned_user_id').eq('user_id', user.id);
    setPinnedUserIds(new Set((data || []).map((p: any) => p.pinned_user_id)));
  };

  const togglePin = async (partnerId: string) => {
    if (!user) return;
    if (pinnedUserIds.has(partnerId)) {
      await supabase.from('pinned_conversations').delete().eq('user_id', user.id).eq('pinned_user_id', partnerId);
      setPinnedUserIds(prev => { const n = new Set(prev); n.delete(partnerId); return n; });
      toast({ title: 'Đã bỏ ghim' });
    } else {
      await supabase.from('pinned_conversations').insert({ user_id: user.id, pinned_user_id: partnerId });
      setPinnedUserIds(prev => new Set(prev).add(partnerId));
      toast({ title: 'Đã ghim cuộc trò chuyện' });
    }
    fetchConversations();
  };

  const fetchMessages = async () => {
    if (!user || !selectedUser) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages').select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser.user_id}),and(sender_id.eq.${selectedUser.user_id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages(data || []);
      await supabase.from('messages').update({ is_read: true })
        .eq('sender_id', selectedUser.user_id).eq('receiver_id', user.id).eq('is_read', false);
      window.dispatchEvent(new Event('messagesRead'));
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const searchUpper = searchQuery.toUpperCase();
      const { data, error } = await supabase.from('profiles').select('user_id, full_name, avatar_url').neq('user_id', user?.id).limit(20);
      if (error) throw error;
      const filtered = (data || []).filter((p: any) => {
        const shortId = p.user_id.slice(0, 8).toUpperCase();
        const name = (p.full_name || '').toLowerCase();
        return shortId.includes(searchUpper) || name.includes(searchQuery.toLowerCase());
      });
      const limitedResults = filtered.slice(0, 10);
      if (limitedResults.length > 0) {
        const userIds = limitedResults.map((p: any) => p.user_id);
        const { data: rolesData } = await supabase.from('user_roles').select('user_id, role').in('user_id', userIds);
        const roleMap = new Map<string, string>();
        (rolesData || []).forEach((r: any) => { roleMap.set(r.user_id, r.role); roleCache.current.set(r.user_id, r.role); });
        setSearchResults(limitedResults.map((p: any) => ({
          user_id: p.user_id, full_name: p.full_name, username: p.full_name, role: roleMap.get(p.user_id) || 'student', avatar_url: p.avatar_url,
        })));
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
      // If editing
      if (editingMessage) {
        const { error } = await supabase.from('messages')
          .update({ content: messageContent, is_edited: true })
          .eq('id', editingMessage.id)
          .eq('sender_id', user.id);
        if (error) throw error;
        setEditingMessage(null);
        setNewMessage('');
        return;
      }

      const messageData: any = {
        sender_id: user.id,
        receiver_id: selectedUser.user_id,
        content: messageContent || (fileUrl ? `[Đã gửi ${fileType === 'image' ? 'ảnh' : 'tệp'}]` : ''),
      };

      // If replying
      if (replyingTo) {
        messageData.reply_to_id = replyingTo.id;
        messageData.reply_to_content = replyingTo.is_recalled ? 'Tin nhắn đã được thu hồi' : replyingTo.content.slice(0, 100);
        messageData.reply_to_sender_name = replyingTo.sender_id === user.id 
          ? 'Bạn' 
          : selectedUser.full_name;
      }

      const { data: insertedMsg, error } = await supabase.from('messages').insert(messageData).select().single();
      if (error) throw error;
      
      // Append locally immediately (realtime will deduplicate)
      if (insertedMsg) {
        setMessages(prev => {
          if (prev.some(m => m.id === insertedMsg.id)) return prev;
          return [...prev, insertedMsg as Message];
        });
        // Scroll to bottom after DOM update
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
      
      setNewMessage('');
      setReplyingTo(null);
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể gửi tin nhắn' });
    }
  };

  const handleRecallMessage = async (msg: Message) => {
    if (!user || msg.sender_id !== user.id) return;
    try {
      const { error } = await supabase.from('messages')
        .update({ is_recalled: true, content: 'Tin nhắn đã được thu hồi' })
        .eq('id', msg.id).eq('sender_id', user.id);
      if (error) throw error;
      toast({ title: 'Đã thu hồi tin nhắn' });
    } catch {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể thu hồi' });
    }
  };

  const handleEditMessage = (msg: Message) => {
    setEditingMessage(msg);
    setReplyingTo(null);
    setNewMessage(msg.content);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleReplyMessage = (msg: Message) => {
    setReplyingTo(msg);
    setEditingMessage(null);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMsgId(msgId);
      setTimeout(() => setHighlightedMsgId(null), 2000);
    }
  };

  const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => ALLOWED_TYPES.includes(f.type));
    const invalidFiles = files.filter(f => !ALLOWED_TYPES.includes(f.type));
    if (invalidFiles.length > 0) {
      toast({ variant: 'destructive', title: 'Định dạng không hỗ trợ', description: 'Chỉ cho phép ảnh, Word, Excel, PPT.' });
    }
    if (validFiles.length > 0) {
      setPendingFiles(prev => [...prev, ...validFiles]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFileWithProgress = async (file: File): Promise<{ url: string; isImage: boolean; name: string } | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const fileKey = file.name + file.size;

    try {
      // Use XMLHttpRequest for progress tracking
      return await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const url = `${supabaseUrl}/storage/v1/object/assignments/${fileName}`;

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(prev => new Map(prev).set(fileKey, pct));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const { data: urlData } = supabase.storage.from('assignments').getPublicUrl(fileName);
            resolve({ url: urlData.publicUrl, isImage: file.type.startsWith('image/'), name: file.name });
          } else {
            reject(new Error('Upload failed'));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload error')));

        xhr.open('POST', url);
        xhr.setRequestHeader('Authorization', `Bearer ${supabaseKey}`);
        xhr.setRequestHeader('apikey', supabaseKey);
        xhr.setRequestHeader('x-upsert', 'true');
        xhr.send(file);
      });
    } catch {
      return null;
    }
  };

  const handleSendWithFiles = async () => {
    if (!user || !selectedUser) return;
    if (!newMessage.trim() && pendingFiles.length === 0) return;

    setUploading(true);
    try {
      const imageUrls: string[] = [];
      const fileMessages: string[] = [];

      // Upload all files in parallel
      const results = await Promise.all(pendingFiles.map(file => uploadFileWithProgress(file)));
      for (const result of results) {
        if (result) {
          if (result.isImage) {
            imageUrls.push(result.url);
          } else {
            fileMessages.push(`[FILE:${result.url}:${result.name}]`);
          }
        }
      }

      // Send images as a single message if multiple
      if (imageUrls.length > 0) {
        if (imageUrls.length === 1) {
          await sendMessage(`[IMAGE:${imageUrls[0]}]`);
        } else {
          await sendMessage(`[IMAGES:${imageUrls.join('|')}]`);
        }
      }

      // Send each file as separate message
      for (const fm of fileMessages) {
        await sendMessage(fm);
      }

      // Send text message if any (and no files, or alongside files)
      if (newMessage.trim() && pendingFiles.length === 0) {
        await sendMessage();
      } else if (newMessage.trim() && pendingFiles.length > 0) {
        await sendMessage(newMessage.trim());
      }

      setPendingFiles([]);
      setUploadProgress(new Map());
    } catch {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể gửi tin nhắn' });
    } finally {
      setUploading(false);
    }
  };

  const handleSendPaymentRequest = async () => {
    if (!paymentAmount || !paymentFile || !user || !selectedUser) return;
    setSendingPayment(true);
    try {
      const fileExt = paymentFile.name.split('.').pop();
      const fileName = `payments/${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('assignments').upload(fileName, paymentFile);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('assignments').getPublicUrl(fileName);
      const amount = parsePriceInput(paymentAmount);
      const paymentMessage = `[PAYMENT:${urlData.publicUrl}:${amount}]`;
      await sendMessage(paymentMessage);
      toast({ title: 'Đã gửi', description: 'Yêu cầu thanh toán đã được gửi' });
      setShowPaymentDialog(false);
      setPaymentAmount('');
      setPaymentFile(null);
    } catch {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể gửi yêu cầu thanh toán' });
    } finally {
      setSendingPayment(false);
    }
  };

  const handlePayBillUpload = async () => {
    if (!payBillFile || !user || !selectedUser || !payBillAgreed) return;
    setUploadingBill(true);
    try {
      const fileExt = payBillFile.name.split('.').pop();
      const fileName = `bills/${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('assignments').upload(fileName, payBillFile);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('assignments').getPublicUrl(fileName);
      await sendMessage(`💰 Tôi xác nhận đã thanh toán\n[BILL:${urlData.publicUrl}]`);
      toast({ title: 'Đã gửi xác nhận thanh toán' });
      setShowPayBillDialog(false);
      setPayBillFile(null);
      setPayBillAgreed(false);
    } catch {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể tải bill lên' });
    } finally {
      setUploadingBill(false);
    }
  };

  const handlePaymentReject = async () => {
    if (!user || !selectedUser) return;
    const reason = rejectReason.trim();
    const msg = reason 
      ? `❌ Tôi từ chối thanh toán\n[REJECT_REASON:${reason}]` 
      : '❌ Tôi từ chối thanh toán';
    await sendMessage(msg);
    setShowRejectDialog(false);
    setRejectReason('');
  };

  const handleAdminConfirmPayment = async () => {
    if (!user || !selectedUser || !adminConfirmClassCode.trim()) return;
    const msg = `[PAYMENT_CONFIRMED:${adminConfirmClassCode.trim()}]`;
    await sendMessage(msg);
    toast({ title: 'Đã xác nhận thanh toán' });
    setShowAdminConfirmDialog(false);
    setAdminConfirmClassCode('');
  };

  const handleSendRefund = async () => {
    if (!user || !selectedUser || !refundContent.trim()) return;
    setSendingRefund(true);
    try {
      // Upload refund images
      const imageUrls: string[] = [];
      for (const file of refundFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `refunds/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('assignments').upload(fileName, file);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('assignments').getPublicUrl(fileName);
          imageUrls.push(urlData.publicUrl);
        }
      }
      const imagesTag = imageUrls.length > 0 ? `\n[REFUND_IMAGES:${imageUrls.join('|')}]` : '';
      await sendMessage(`[REFUND_REQUEST]\n💸 Yêu cầu hoàn tiền\n\n📝 Nội dung: ${refundContent.trim()}${imagesTag}`);
      toast({ title: 'Đã gửi yêu cầu hoàn tiền' });
      setShowRefundDialog(false);
      setRefundContent('');
      setRefundFiles([]);
    } catch {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể gửi yêu cầu' });
    } finally {
      setSendingRefund(false);
    }
  };

  const handleSelectUser = async (userProfile: UserProfile | Conversation) => {
    let userRole = userProfile.role;
    if (!userRole) {
      userRole = roleCache.current.get(userProfile.user_id);
      if (!userRole) {
        const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', userProfile.user_id).single();
        userRole = roleData?.role || 'student';
        roleCache.current.set(userProfile.user_id, userRole);
      }
    }
    setSelectedUser({ user_id: userProfile.user_id, full_name: userProfile.full_name, role: userRole });
    setView('chat');
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleBack = () => {
    setSelectedUser(null);
    setMessages([]);
    setView('conversations');
    setEditingMessage(null);
    setReplyingTo(null);
    fetchConversations();
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const renderMessageContent = (msg: Message) => {
    if (msg.is_recalled) {
      return <p className="text-sm italic text-muted-foreground">Tin nhắn đã được thu hồi</p>;
    }

    const content = msg.content;
    const isOwn = msg.sender_id === user?.id;

    // Payment confirmed by admin
    const confirmMatch = content.match(/\[PAYMENT_CONFIRMED:(.+)\]/);
    if (confirmMatch) {
      const classCode = confirmMatch[1];
      return (
        <div className="bg-green-500/10 border-2 border-green-500/30 rounded-xl p-4 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
          <p className="text-sm font-bold text-green-600">✅ Đã xác nhận thanh toán</p>
          <p className="text-xs text-muted-foreground">Lớp: <span className="font-mono font-bold">{classCode}</span></p>
          <p className="text-xs text-green-600/80">Thanh toán đã được Admin xác nhận thành công!</p>
        </div>
      );
    }

    // Refund request
    const refundMatch = content.match(/\[REFUND_REQUEST\]/);
    if (refundMatch) {
      const cleanContent = content.replace(/\[REFUND_REQUEST\]/, '').replace(/\[REFUND_IMAGES:.+\]/, '').trim();
      const refundImagesMatch = content.match(/\[REFUND_IMAGES:(.+)\]/);
      const refundImageUrls = refundImagesMatch ? refundImagesMatch[1].split('|') : [];
      return (
        <div className="space-y-2 border-2 border-orange-400/30 bg-orange-50/10 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-orange-500" />
            <p className="text-sm font-bold text-orange-600">Yêu cầu hoàn tiền</p>
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">{cleanContent}</p>
          {refundImageUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-1.5 max-w-[240px]">
              {refundImageUrls.map((url, i) => (
                <img key={i} src={url} alt={`Minh chứng ${i + 1}`}
                  className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border border-border"
                  onClick={() => { setViewImages(refundImageUrls); setViewImageIndex(i); }} />
              ))}
            </div>
          )}
        </div>
      );
    }

    const paymentMatch = content.match(/\[PAYMENT:(.+):(\d+)\]/);
    if (paymentMatch) {
      const imageUrl = paymentMatch[1];
      const amount = parseInt(paymentMatch[2]);
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium">💳 Yêu cầu thanh toán</p>
          <img src={imageUrl} alt="QR thanh toán" 
            className="max-w-full rounded-lg max-h-48 object-contain cursor-pointer"
            onClick={() => { setViewImages([imageUrl]); setViewImageIndex(0); }} />
          <p className="text-sm font-bold">{formatPrice(amount)}</p>
          <p className="text-[11px] italic text-muted-foreground capitalize">{numberToVietnameseWords(amount)}</p>
          {!isOwn && (
            <div className="flex flex-wrap gap-2 mt-2">
              <Button size="sm" variant="default" onClick={() => setShowPayBillDialog(true)}>
                <Upload className="w-3 h-3 mr-1" />
                Thanh toán
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowRejectDialog(true)}>❌ Từ chối</Button>
              <Button size="sm" variant="secondary" onClick={() => sendMessage('💬 Tôi cần tư vấn thêm')}>💬 Tư vấn</Button>
            </div>
          )}
        </div>
      );
    }

    // Bill image - with admin confirm & student refund buttons
    const billMatch = content.match(/\[BILL:(.+)\]/);
    if (billMatch && !content.includes('[REFUND_')) {
      const billUrl = billMatch[1];
      const textPart = content.replace(/\[BILL:.+\]/, '').trim();
      return (
        <div className="space-y-2">
          {textPart && <p className="text-sm whitespace-pre-wrap break-words">{textPart}</p>}
          <div className="relative max-w-[240px]">
            <img src={billUrl} alt="Bill thanh toán" 
              className="max-w-full rounded-lg max-h-48 object-contain cursor-pointer border border-border"
              onClick={() => { setViewImages([billUrl]); setViewImageIndex(0); }} />
            <Badge className="absolute top-1 left-1 text-[10px]">Bill</Badge>
          </div>
          {/* Admin sees confirm button on received bill */}
          {!isOwn && role === 'admin' && (
            <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowAdminConfirmDialog(true)}>
              <CheckCircle2 className="w-3 h-3 mr-1" /> Xác nhận thanh toán
            </Button>
          )}
          {/* Student sees refund button on own sent bill */}
          {isOwn && role === 'student' && (
            <Button size="sm" variant="outline" className="text-orange-600 border-orange-300" onClick={() => setShowRefundDialog(true)}>
              <RotateCcw className="w-3 h-3 mr-1" /> Hoàn tiền
            </Button>
          )}
        </div>
      );
    }

    // Reject reason
    const rejectMatch = content.match(/\[REJECT_REASON:(.+)\]/);
    if (rejectMatch) {
      const reason = rejectMatch[1];
      const textPart = content.replace(/\[REJECT_REASON:.+\]/, '').trim();
      return (
        <div className="space-y-2">
          {textPart && <p className="text-sm whitespace-pre-wrap break-words">{textPart}</p>}
          <div className="border-2 border-destructive/40 bg-destructive/10 rounded-lg p-2.5">
            <p className="text-xs font-semibold text-destructive mb-1">📋 Lý do từ chối:</p>
            <p className="text-sm text-destructive/90">{reason}</p>
          </div>
        </div>
      );
    }

    // Multiple images
    const imagesMatch = content.match(/\[IMAGES:(.+)\]/);
    if (imagesMatch) {
      const urls = imagesMatch[1].split('|');
      return (
        <div className="grid grid-cols-3 gap-1.5 max-w-[240px]">
          {urls.map((url, i) => (
            <img key={i} src={url} alt={`Ảnh ${i + 1}`}
              className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border-2 border-border/60"
              onClick={() => { setViewImages(urls); setViewImageIndex(i); }} />
          ))}
        </div>
      );
    }

    const imageMatch = content.match(/\[IMAGE:(.+)\]/);
    if (imageMatch) {
      return (
        <img src={imageMatch[1]} alt="Ảnh" className="max-w-full rounded-lg max-h-64 object-contain cursor-pointer border-2 border-border/60"
          onClick={() => { setViewImages([imageMatch[1]]); setViewImageIndex(0); }} />
      );
    }

    const fileMatch = content.match(/\[FILE:(.+):(.+)\]/);
    if (fileMatch) {
      return (
        <a href={fileMatch[1]} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 p-2 bg-background/50 rounded-lg hover:bg-background/80 max-w-[260px] overflow-hidden">
          <FileText className="w-8 h-8 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-sm font-medium truncate max-w-[180px]">{fileMatch[2]}</p>
            <p className="text-xs opacity-70">Nhấn để tải</p>
          </div>
          <Download className="w-4 h-4 flex-shrink-0" />
        </a>
      );
    }

    return <p className="text-sm whitespace-pre-wrap break-words overflow-hidden">{content}</p>;
  };

  // Render reply block inside a sent message
  const renderReplyBlock = (msg: Message) => {
    if (!msg.reply_to_id) return null;
    return (
      <div
        className="flex items-start gap-1.5 mb-1.5 cursor-pointer group/reply"
        onClick={() => scrollToMessage(msg.reply_to_id!)}
      >
        <div className="w-0.5 min-h-[28px] rounded-full bg-white/40 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold opacity-80 truncate">{msg.reply_to_sender_name}</p>
          <p className="text-[11px] opacity-60 truncate leading-tight">{msg.reply_to_content}</p>
        </div>
      </div>
    );
  };

  // 3-dot menu for each message
  const renderMessageMenu = (msg: Message, isOwn: boolean) => {
    if (msg.is_recalled) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1.5 rounded-full hover:bg-muted/60 transition-colors duration-150 opacity-50 hover:opacity-100 flex-shrink-0">
            <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align={isOwn ? 'end' : 'start'} 
          className="min-w-[150px] animate-in fade-in-0 zoom-in-95 duration-150 p-1.5"
        >
          <DropdownMenuItem onClick={() => handleReplyMessage(msg)} className="gap-2.5 text-sm py-2.5 px-3 rounded-md">
            <Reply className="w-4 h-4" /> Trả lời
          </DropdownMenuItem>
          {isOwn && (
            <>
              <DropdownMenuItem onClick={() => handleEditMessage(msg)} className="gap-2.5 text-sm py-2.5 px-3 rounded-md">
                <Pencil className="w-4 h-4" /> Chỉnh sửa
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleRecallMessage(msg)} className="gap-2.5 text-sm py-2.5 px-3 rounded-md text-destructive">
                <Trash2 className="w-4 h-4" /> Thu hồi
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Swipe-to-reply logic for mobile
  const swipeRef = useRef<{ startX: number; startY: number; msgId: string | null }>({ startX: 0, startY: 0, msgId: null });

  const handleTouchStart = useCallback((e: React.TouchEvent, msg: Message) => {
    if (msg.is_recalled) return;
    const touch = e.touches[0];
    swipeRef.current = { startX: touch.clientX, startY: touch.clientY, msgId: msg.id };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent, msg: Message) => {
    if (msg.is_recalled || swipeRef.current.msgId !== msg.id) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - swipeRef.current.startX;
    const dy = Math.abs(touch.clientY - swipeRef.current.startY);
    if (Math.abs(dx) > 60 && dy < 40) {
      handleReplyMessage(msg);
    }
    swipeRef.current = { startX: 0, startY: 0, msgId: null };
  }, []);

  return (
    <>
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
                <div className="cursor-pointer"
                  onClick={() => {
                    if (selectedUser?.role === 'admin') {
                      toast({ title: '🔰 Admin đã xác minh', description: 'Đây là Admin đã được hệ thống xác minh.' });
                    } else if (selectedUser?.role === 'tutor') {
                      toast({ title: '🎓 Gia sư đã xác minh', description: 'Đây là Gia sư đã được hệ thống xác minh.' });
                    }
                  }}
                >
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${
                    selectedUser?.role === 'admin' ? 'bg-blue-900 text-white' : selectedUser?.role === 'tutor' ? 'bg-orange-100 text-orange-800' : ''
                  }`}>
                    {selectedUser?.role === 'admin' ? 'ADMIN 🔰' : selectedUser?.full_name}
                    {selectedUser?.role === 'tutor' && ' 🎓'}
                  </span>
                  {(selectedUser?.role === 'admin' || selectedUser?.role === 'tutor') && (
                    <p className="text-xs font-normal text-muted-foreground mt-0.5">Bấm để xem xác minh</p>
                  )}
                  <p className="text-xs font-normal text-muted-foreground">
                    ID: {selectedUser?.user_id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              )}
            </DialogTitle>
            {view === 'chat' && selectedUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="flex-shrink-0 mr-6">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => togglePin(selectedUser.user_id)}>
                    {pinnedUserIds.has(selectedUser.user_id) ? (
                      <><PinOff className="w-4 h-4 mr-2" />Bỏ ghim</>
                    ) : (
                      <><Pin className="w-4 h-4 mr-2" />Ghim cuộc trò chuyện</>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setReportDialogOpen(true)} className="text-destructive">
                    <Flag className="w-4 h-4 mr-2" />Báo cáo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </DialogHeader>

        {/* Conversations View */}
        {view === 'conversations' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="p-4 border-b border-border flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Tìm theo ID hoặc tên..." value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value) setView('search'); }}
                  className="pl-10" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
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
                    const isPinned = pinnedUserIds.has(conv.user_id);
                    return (
                      <div key={conv.user_id}
                        className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${isPinned ? 'bg-muted/30' : ''}`}
                        onClick={() => handleSelectUser(conv)}>
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            userId={conv.user_id}
                            avatarUrl={conv.avatar_url}
                            fullName={conv.full_name}
                            size="md"
                            className={isAdmin ? 'ring-blue-900' : isTutor ? 'ring-orange-400' : ''}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer ${
                                isAdmin ? 'bg-blue-900 text-white' : isTutor ? 'bg-orange-100 text-orange-800' : ''
                              }`} onClick={(e) => {
                                e.stopPropagation();
                                if (isAdmin) toast({ title: '🔰 Admin', description: 'Đây là Admin đã được kiểm duyệt' });
                                else if (isTutor) toast({ title: '🎓 Gia sư', description: 'Đây là Gia sư đã được kiểm duyệt' });
                              }}>
                                <span className="font-medium truncate">{isAdmin ? 'ADMIN 🔰' : conv.full_name}</span>
                                {isTutor && <span>🎓</span>}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {isPinned && <Pin className="w-3 h-3 text-primary" />}
                                {conv.unread_count > 0 && <Badge variant="destructive" className="text-xs">{conv.unread_count}</Badge>}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">ID: {conv.user_id.slice(0, 8).toUpperCase()}</p>
                            <p className={`text-sm truncate ${conv.last_is_recalled ? 'italic text-muted-foreground' : 'text-muted-foreground'}`}>
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

        {/* Search View */}
        {view === 'search' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="p-4 border-b border-border flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Tìm theo ID (VD: AB12CD34) hoặc tên..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" autoFocus />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {searching ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
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
                      <div key={profile.user_id} className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleSelectUser(profile)}>
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            userId={profile.user_id}
                            avatarUrl={profile.avatar_url}
                            fullName={profile.full_name}
                            size="md"
                            className={isAdmin ? 'ring-blue-900' : isTutor ? 'ring-orange-400' : ''}
                          />
                          <div>
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${
                              isAdmin ? 'bg-blue-900 text-white' : isTutor ? 'bg-orange-100 text-orange-800' : ''
                            }`} onClick={(e) => {
                              e.stopPropagation();
                              if (isAdmin) toast({ title: '🔰 Admin', description: 'Đây là Admin đã được kiểm duyệt' });
                              else if (isTutor) toast({ title: '🎓 Gia sư', description: 'Đây là Gia sư đã được kiểm duyệt' });
                            }}>
                              <span className="font-medium">{isAdmin ? 'ADMIN 🔰' : profile.full_name}</span>
                              {isTutor && <span>🎓</span>}
                            </div>
                            <p className="text-xs text-primary font-mono mt-0.5">ID: {profile.user_id.slice(0, 8).toUpperCase()}</p>
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

        {/* Chat View */}
        {view === 'chat' && selectedUser && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Bắt đầu cuộc trò chuyện</div>
              ) : (
                <div className="space-y-2">
                  {messages.map((msg) => {
                    const isOwn = msg.sender_id === user?.id;
                    const isHighlighted = highlightedMsgId === msg.id;
                    return (
                      <div key={msg.id} id={`msg-${msg.id}`}
                        className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} transition-all duration-300 ${
                          isHighlighted ? 'scale-[1.02]' : ''
                        }`}
                        onTouchStart={(e) => handleTouchStart(e, msg)}
                        onTouchEnd={(e) => handleTouchEnd(e, msg)}
                      >
                        <div className={`flex items-center gap-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className={`max-w-[70vw] sm:max-w-[75%] rounded-2xl px-3 py-2 transition-all duration-200 overflow-hidden break-words [word-break:break-word] ${
                            msg.is_recalled
                              ? 'bg-muted/50 border border-border'
                              : isOwn
                                ? 'bg-primary/90 text-primary-foreground'
                                : 'bg-accent text-accent-foreground border border-border/40'
                          } ${isHighlighted ? 'ring-2 ring-primary/50 shadow-lg' : ''}`}
                          >
                            {renderReplyBlock(msg)}
                            {renderMessageContent(msg)}
                            <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                              {msg.is_edited && !msg.is_recalled && (
                                <span className={`text-[10px] ${isOwn ? 'text-primary-foreground/50' : 'text-muted-foreground/70'}`}>
                                  Đã chỉnh sửa
                                </span>
                              )}
                              <p className={`text-[10px] ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                                {formatTime(msg.created_at)}
                              </p>
                            </div>
                          </div>
                          {renderMessageMenu(msg, isOwn)}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Edit / Reply bar */}
            {(editingMessage || replyingTo) && (
              <div className="px-4 pt-2 border-t border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-10 rounded-full bg-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary">
                      {editingMessage ? '✏️ Đang chỉnh sửa tin nhắn...' : `↩️ Trả lời ${replyingTo!.sender_id === user?.id ? 'Bạn' : selectedUser.full_name}`}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {editingMessage ? editingMessage.content.slice(0, 60) : replyingTo!.content.slice(0, 60)}
                    </p>
                  </div>
                  <button onClick={() => { setEditingMessage(null); setReplyingTo(null); setNewMessage(''); }}
                    className="p-1 rounded-full hover:bg-muted transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            )}

            {/* Pending Files Preview */}
            {pendingFiles.length > 0 && (
              <div className="px-3 pt-2 border-t border-border bg-muted/20">
              <div className="flex gap-2 mb-2 overflow-x-auto max-h-[130px] pb-1 scrollbar-hide">
                  {pendingFiles.map((file, idx) => {
                    const fileKey = file.name + file.size;
                    const progress = uploadProgress.get(fileKey);
                    const isImage = file.type.startsWith('image/');
                    const previewUrl = isImage ? URL.createObjectURL(file) : '';
                    return (
                      <div key={idx} className="relative rounded-lg border border-border bg-background p-1.5 flex-shrink-0 w-[80px]">
                        {isImage ? (
                          <img src={previewUrl} alt={file.name}
                            className="w-full h-[72px] object-cover rounded cursor-pointer"
                            onClick={() => setStagingPreviewUrl(previewUrl)} />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-[72px]">
                            <FileText className="w-5 h-5 text-primary" />
                            <p className="text-[8px] text-muted-foreground truncate w-full text-center mt-0.5">{file.name}</p>
                          </div>
                        )}
                        {progress !== undefined && (
                          <div className="absolute inset-0 bg-black/40 rounded flex flex-col items-center justify-center">
                            <p className="text-white text-[10px] font-bold">{progress}%</p>
                            <Progress value={progress} className="w-3/4 h-1 mt-0.5" />
                          </div>
                        )}
                        {!uploading && (
                          <button onClick={() => removePendingFile(idx)}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs z-10 shadow-md">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="p-2 border-t border-border bg-background sticky bottom-0 pb-safe" style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
              <input ref={fileInputRef} type="file" className="hidden" multiple
                accept="image/jpeg,image/png,image/gif,image/webp,image/bmp,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={handleFileSelect} />
              <div className="flex gap-1.5 items-end">
                <Button type="button" variant="ghost" size="icon" className="flex-shrink-0 h-9 w-9"
                  onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                </Button>
                {role === 'admin' && (
                  <Button type="button" variant="ghost" size="icon" className="flex-shrink-0 h-9 w-9"
                    onClick={() => setShowPaymentDialog(true)}>
                    <CreditCard className="w-4 h-4" />
                  </Button>
                )}
                <Textarea
                  ref={textareaRef}
                  placeholder="Nhập tin nhắn..."
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    // Auto-resize textarea
                    const el = e.target;
                    el.style.height = 'auto';
                    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                  }}
                  onKeyDown={(e) => {
                    // On desktop: Enter sends, Shift+Enter newline
                    // On mobile: Enter always inserts newline (user must tap Send button)
                    const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
                      e.preventDefault();
                      handleSendWithFiles();
                    }
                  }}
                  className="flex-1 rounded-2xl min-h-[36px] max-h-[120px] py-2 px-3 text-sm resize-none overflow-y-auto scrollbar-thin"
                  rows={1}
                  style={{ scrollbarWidth: 'thin' }}
                />
                <Button type="button" size="icon" className="flex-shrink-0 h-9 w-9 rounded-full"
                  onClick={() => handleSendWithFiles()}
                  disabled={(!newMessage.trim() && pendingFiles.length === 0) || uploading}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Payment Request Dialog (Admin sends) */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gửi yêu cầu thanh toán</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ảnh QR / Hóa đơn</Label>
              <Input type="file" accept="image/*" onChange={(e) => setPaymentFile(e.target.files?.[0] || null)} />
              {paymentFile && <p className="text-sm text-muted-foreground truncate max-w-full">{paymentFile.name}</p>}
            </div>
            <div className="space-y-2">
              <Label>Số tiền (VND)</Label>
              <Input 
                type="text" 
                placeholder="150,000" 
                value={paymentAmount} 
                onChange={(e) => setPaymentAmount(formatPriceInput(e.target.value))} 
              />
              {paymentAmount && (
                <p className="text-xs text-muted-foreground italic capitalize">
                  {numberToVietnameseWords(parsePriceInput(paymentAmount))}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)} className="flex-1">Hủy</Button>
              <Button onClick={handleSendPaymentRequest} disabled={!paymentFile || !paymentAmount || sendingPayment} className="flex-1">
                {sendingPayment ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Gửi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay Bill Upload Dialog - with payment terms */}
      <Dialog open={showPayBillDialog} onOpenChange={(v) => { setShowPayBillDialog(v); if (!v) { setPayBillFile(null); setPayBillAgreed(false); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Xác nhận thanh toán & hoàn tiền</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Payment Terms Block */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-muted/60 px-4 py-2.5 font-semibold text-sm flex items-center gap-2">
                📋 Điều khoản thanh toán và hoàn tiền
              </div>
              <div className="max-h-[200px] overflow-y-auto px-4 py-3 text-sm text-muted-foreground space-y-2 scrollbar-thin">
                <p className="font-medium text-foreground">1. Quy định thanh toán</p>
                <p>• Học viên thanh toán học phí theo hướng dẫn của Admin sau khi đăng ký lớp thành công.</p>
                <p>• Thanh toán được xác nhận khi Admin nhận được bill/biên lai hợp lệ.</p>
                <p>• Học phí đã thanh toán sẽ được ghi nhận vào hệ thống trong vòng 24 giờ làm việc.</p>
                
                <p className="font-medium text-foreground mt-3">2. Chính sách hoàn tiền</p>
                <p>• Học viên có quyền yêu cầu hoàn tiền trong vòng 7 ngày kể từ ngày thanh toán nếu chưa tham gia buổi học nào.</p>
                <p>• Nếu đã tham gia ít nhất 1 buổi học, học phí sẽ được tính theo số buổi đã học và hoàn lại phần còn lại (nếu có).</p>
                <p>• Yêu cầu hoàn tiền cần kèm lý do rõ ràng và minh chứng (nếu có).</p>
                <p>• Admin sẽ xem xét và phản hồi yêu cầu hoàn tiền trong vòng 3–5 ngày làm việc.</p>
                <p>• Hoàn tiền sẽ được chuyển lại qua phương thức thanh toán ban đầu.</p>
                
                <p className="font-medium text-foreground mt-3">3. Lưu ý</p>
                <p>• Hệ thống không chịu trách nhiệm với các giao dịch ngoài nền tảng.</p>
                <p>• Mọi tranh chấp sẽ được giải quyết dựa trên bằng chứng từ hai bên.</p>
                <p>• Bằng việc bấm "Chấp nhận điều khoản", bạn đồng ý với toàn bộ các điều khoản trên.</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox id="agreeTerms" checked={payBillAgreed} onCheckedChange={(v) => setPayBillAgreed(!!v)} />
              <label htmlFor="agreeTerms" className="text-sm cursor-pointer leading-tight font-medium">
                Tôi đã đọc và chấp nhận điều khoản thanh toán và hoàn tiền
              </label>
            </div>

            {payBillAgreed && (
              <>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input type="file" id="billUpload" accept="image/*" className="hidden"
                    onChange={(e) => setPayBillFile(e.target.files?.[0] || null)} />
                  <label htmlFor="billUpload" className="cursor-pointer">
                    {payBillFile ? (
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <Upload className="w-5 h-5" />
                        <span className="text-sm font-medium truncate max-w-[200px] inline-block">{payBillFile.name}</span>
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        <Upload className="w-8 h-8 mx-auto mb-2" />
                        <span className="text-sm">Nhấn để tải bill lên</span>
                      </div>
                    )}
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setShowPayBillDialog(false); setPayBillFile(null); setPayBillAgreed(false); }} className="flex-1">Hủy</Button>
                  <Button onClick={handlePayBillUpload} disabled={!payBillFile || uploadingBill} className="flex-1">
                    {uploadingBill ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    Gửi xác nhận
                  </Button>
                </div>
              </>
            )}

            {!payBillAgreed && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setShowPayBillDialog(false); setPayBillFile(null); setPayBillAgreed(false); }} className="flex-1">
                  Đóng
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Payment Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Từ chối thanh toán</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Lý do từ chối (tùy chọn)</Label>
              <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối..." rows={3} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectReason(''); }} className="flex-1">Hủy</Button>
              <Button variant="destructive" onClick={handlePaymentReject} className="flex-1">
                ❌ Xác nhận từ chối
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Confirm Payment Dialog */}
      <Dialog open={showAdminConfirmDialog} onOpenChange={setShowAdminConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Xác nhận thanh toán
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="font-medium text-green-700">Người dùng đã thanh toán</p>
              <p className="text-sm text-muted-foreground mt-1">Nhập mã lớp để xác nhận thanh toán cho lớp đó</p>
            </div>
            <div className="space-y-2">
              <Label>Mã lớp</Label>
              <Input placeholder="VD: CL12345" value={adminConfirmClassCode} onChange={(e) => setAdminConfirmClassCode(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowAdminConfirmDialog(false); setAdminConfirmClassCode(''); }} className="flex-1">Hủy</Button>
              <Button onClick={handleAdminConfirmPayment} disabled={!adminConfirmClassCode.trim()} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle2 className="w-4 h-4 mr-1" /> Xác nhận
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Student Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={(v) => { setShowRefundDialog(v); if (!v) { setRefundContent(''); setRefundFiles([]); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-orange-500" />
              Yêu cầu hoàn tiền
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nội dung yêu cầu</Label>
              <Textarea value={refundContent} onChange={(e) => setRefundContent(e.target.value)}
                placeholder="Mô tả lý do hoàn tiền..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Ảnh minh chứng (tối đa 5 ảnh)</Label>
              <Input type="file" accept="image/*" multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []).slice(0, 5 - refundFiles.length);
                  setRefundFiles(prev => [...prev, ...files].slice(0, 5));
                }} />
              {refundFiles.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {refundFiles.map((f, i) => (
                    <div key={i} className="relative">
                      <img src={URL.createObjectURL(f)} alt="" className="w-16 h-16 object-cover rounded-lg border border-border" />
                      <button onClick={() => setRefundFiles(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowRefundDialog(false); setRefundContent(''); setRefundFiles([]); }} className="flex-1">Hủy</Button>
              <Button onClick={handleSendRefund} disabled={!refundContent.trim() || sendingRefund} className="flex-1">
                {sendingRefund ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Gửi yêu cầu
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>

    {selectedUser && (
      <ConversationReportDialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}
        reportedUserId={selectedUser.user_id} reportedUserName={selectedUser.full_name} />
    )}

    {/* Fullscreen Image Viewer - Gallery Mode */}
    <ImageViewer
      images={viewImages}
      initialIndex={viewImageIndex}
      alt="Ảnh"
      open={viewImages.length > 0}
      onOpenChange={(open) => { if (!open) { setViewImages([]); setViewImageIndex(0); } }}
    />

    {/* Staging file preview */}
    {stagingPreviewUrl && (
      <Dialog open={!!stagingPreviewUrl} onOpenChange={() => setStagingPreviewUrl(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
          <div className="relative flex items-center justify-center min-h-[50vh]">
            <Button variant="ghost" size="icon"
              className="absolute top-3 right-3 z-50 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setStagingPreviewUrl(null)}>
              <X className="w-5 h-5" />
            </Button>
            <img src={stagingPreviewUrl} alt="Preview" className="max-w-full max-h-[90vh] object-contain" />
          </div>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
};

export default MessagingSystem;
