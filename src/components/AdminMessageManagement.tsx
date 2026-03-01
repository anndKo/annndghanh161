import { useState } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2, MessageSquare, User } from 'lucide-react';

interface ArchivedMessage {
  id: string;
  original_message_id: string | null;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_recalled: boolean;
  created_at: string;
}

interface AdminMessageManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdminMessageManagement = ({ open, onOpenChange }: AdminMessageManagementProps) => {
  const { toast } = useToast();
  const [userId1, setUserId1] = useState('');
  const [userId2, setUserId2] = useState('');
  const [messages, setMessages] = useState<ArchivedMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const resolveUserId = async (shortId: string): Promise<string | null> => {
    const cleanId = shortId.trim().toLowerCase();
    const { data } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .limit(100);

    const match = (data || []).find(
      (p: any) => p.user_id.slice(0, 8).toLowerCase() === cleanId
    );
    return match?.user_id || null;
  };

  const handleSearch = async () => {
    if (!userId1.trim() || !userId2.trim()) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng nhập mã cả 2 người dùng' });
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const [fullId1, fullId2] = await Promise.all([
        resolveUserId(userId1),
        resolveUserId(userId2),
      ]);

      if (!fullId1 || !fullId2) {
        toast({ variant: 'destructive', title: 'Lỗi', description: 'Không tìm thấy người dùng với mã đã nhập' });
        setMessages([]);
        setLoading(false);
        return;
      }

      // Fetch profiles for display
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', [fullId1, fullId2]);

      const profileMap: Record<string, string> = {};
      (profilesData || []).forEach((p: any) => {
        profileMap[p.user_id] = p.full_name;
      });
      setProfiles(profileMap);

      // Fetch archived messages between these 2 users
      const { data: archiveData, error } = await supabase
        .from('message_archives')
        .select('*')
        .or(
          `and(sender_id.eq.${fullId1},receiver_id.eq.${fullId2}),and(sender_id.eq.${fullId2},receiver_id.eq.${fullId1})`
        )
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Also fetch current messages table for any not yet archived
      const { data: currentData } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${fullId1},receiver_id.eq.${fullId2}),and(sender_id.eq.${fullId2},receiver_id.eq.${fullId1})`
        )
        .order('created_at', { ascending: true });

      // Merge: use archive as base, add any current messages not in archive
      const archivedIds = new Set((archiveData || []).map((m: any) => m.original_message_id));
      const extraMessages = (currentData || [])
        .filter((m: any) => !archivedIds.has(m.id))
        .map((m: any) => ({
          id: m.id,
          original_message_id: m.id,
          sender_id: m.sender_id,
          receiver_id: m.receiver_id,
          content: m.content,
          is_recalled: false,
          created_at: m.created_at,
        }));

      const allMessages = [...(archiveData || []), ...extraMessages].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      setMessages(allMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể tải tin nhắn' });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Quản lý tin nhắn
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <User className="w-3 h-3" /> Mã người dùng 1
              </Label>
              <Input
                placeholder="VD: A1B2C3D4"
                value={userId1}
                onChange={(e) => setUserId1(e.target.value.toUpperCase())}
                maxLength={8}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <User className="w-3 h-3" /> Mã người dùng 2
              </Label>
              <Input
                placeholder="VD: E5F6G7H8"
                value={userId2}
                onChange={(e) => setUserId2(e.target.value.toUpperCase())}
                maxLength={8}
              />
            </div>
          </div>

          <Button onClick={handleSearch} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
            Tìm kiếm tin nhắn
          </Button>
        </div>

        {searched && (
          <div className="flex-1 min-h-0 mt-2">
            {Object.keys(profiles).length > 0 && (
              <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                {Object.entries(profiles).map(([id, name], i) => (
                  <span key={id}>
                    {i > 0 && ' ↔ '}
                    <span className="font-medium text-foreground">{name}</span>
                    <span className="text-xs ml-1">({id.slice(0, 8).toUpperCase()})</span>
                  </span>
                ))}
              </div>
            )}
            
            <Badge variant="outline" className="mb-2">
              {messages.length} tin nhắn
            </Badge>

            <ScrollArea className="h-[350px] border rounded-lg p-3">
              {messages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Không có tin nhắn nào</p>
              ) : (
                <div className="space-y-2">
                  {messages.map((msg) => (
                    <div key={msg.id} className="text-sm border-b border-border pb-2 last:border-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-xs">
                          {profiles[msg.sender_id] || msg.sender_id.slice(0, 8)}
                        </span>
                        <span className="text-xs text-muted-foreground">→</span>
                        <span className="font-medium text-xs">
                          {profiles[msg.receiver_id] || msg.receiver_id.slice(0, 8)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                      <p className={`text-sm ${msg.is_recalled ? 'italic text-muted-foreground line-through' : ''}`}>
                        {msg.is_recalled && '🔄 [Đã thu hồi] '}
                        {msg.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdminMessageManagement;
