import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, CheckCircle2, Clock, MessageSquare } from 'lucide-react';

interface SupportResponseViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string | null;
}

const SupportResponseViewer = ({ open, onOpenChange, requestId }: SupportResponseViewerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    if (open && requestId) {
      const fetchRequest = async () => {
        setLoading(true);
        const { data } = await supabase
          .from('support_requests')
          .select('*')
          .eq('id', requestId)
          .single();
        setRequest(data);
        setLoading(false);
      };
      fetchRequest();
    }
  }, [open, requestId]);

  const handleReply = async () => {
    if (!request || !replyContent.trim() || !user) return;
    setReplying(true);

    // Update the existing request with user's follow-up by appending to content
    const { error } = await supabase.from('support_requests').update({
      content: `${request.content}\n\n--- Phản hồi từ người dùng (${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}) ---\n${replyContent.trim()}`,
      status: 'pending',
    }).eq('id', request.id);

    if (error) {
      toast({ title: 'Lỗi gửi phản hồi', description: error.message, variant: 'destructive' });
    } else {
      // Send notification to all admins
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminRoles) {
        const notifications = adminRoles.map((ar: any) => ({
          user_id: ar.user_id,
          type: 'support_followup',
          title: 'Phản hồi hỗ trợ mới',
          message: `Người dùng đã phản hồi lại yêu cầu "${request.subject}". Bấm để xem.`,
          related_id: request.id,
        }));
        await supabase.from('notifications').insert(notifications);
      }

      toast({ title: 'Đã gửi phản hồi!', description: 'Admin sẽ xem xét sớm nhất.' });
      setReplyContent('');
      // Refresh request data
      const { data } = await supabase
        .from('support_requests')
        .select('*')
        .eq('id', requestId)
        .single();
      setRequest(data);
    }
    setReplying(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="w-5 h-5 text-primary" />
            Phản hồi hỗ trợ
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[55vh]">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : request ? (
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{request.subject}</h3>
                {request.status === 'responded' ? (
                  <Badge className="bg-success text-success-foreground text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Đã phản hồi</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs"><Clock className="w-3 h-3 mr-1" />Chờ xử lý</Badge>
                )}
              </div>

              {/* User's original message */}
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Yêu cầu của bạn:</p>
                <p className="text-sm whitespace-pre-wrap">{request.content}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(request.created_at).toLocaleDateString('vi-VN')} {new Date(request.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {/* Admin response */}
              {request.admin_response && (
                <div className="bg-accent rounded-lg p-3">
                  <p className="text-xs font-medium text-accent-foreground mb-1">Phản hồi từ Admin:</p>
                  <p className="text-sm whitespace-pre-wrap">{request.admin_response}</p>
                  {request.responded_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(request.responded_at).toLocaleDateString('vi-VN')} {new Date(request.responded_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              )}

              {/* Reply section - always show when admin has responded */}
              {request.admin_response && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm font-medium">Phản hồi lại cho Admin:</p>
                  <Textarea
                    placeholder="Nhập nội dung phản hồi..."
                    value={replyContent}
                    onChange={e => setReplyContent(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={handleReply} disabled={replying || !replyContent.trim()} className="w-full">
                    {replying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    Gửi phản hồi lại
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-muted-foreground">Không tìm thấy yêu cầu.</div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default SupportResponseViewer;
