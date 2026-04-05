import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2, Send, Clock, CheckCircle2, Search, MessageSquare, HelpCircle,
  AlertTriangle, Phone, FileText, Filter
} from 'lucide-react';

interface SupportRequest {
  id: string;
  user_id: string;
  category: string;
  subject: string;
  content: string;
  status: string;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
}

const categoryLabels: Record<string, string> = {
  help_center: 'Trung tâm trợ giúp',
  contact_support: 'Liên hệ hỗ trợ',
  support_request: 'Yêu cầu hỗ trợ',
  report_violation: 'Báo cáo vi phạm',
  complaint: 'Khiếu nại dịch vụ',
};

const categoryIcons: Record<string, React.ReactNode> = {
  help_center: <HelpCircle className="w-4 h-4" />,
  contact_support: <Phone className="w-4 h-4" />,
  support_request: <FileText className="w-4 h-4" />,
  report_violation: <AlertTriangle className="w-4 h-4" />,
  complaint: <MessageSquare className="w-4 h-4" />,
};

interface AdminSupportManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdminSupportManagement = ({ open, onOpenChange }: AdminSupportManagementProps) => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [response, setResponse] = useState('');
  const [responding, setResponding] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    const { data: requestsData } = await supabase
      .from('support_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (requestsData) {
      const userIds = [...new Set((requestsData as any[]).map((r: any) => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      const profileMap = new Map((profiles as any[] || []).map((p: any) => [p.user_id, p]));

      const enriched = (requestsData as any[]).map((r: any) => ({
        ...r,
        user_name: profileMap.get(r.user_id)?.full_name || 'Không rõ',
        user_email: profileMap.get(r.user_id)?.email || '',
      }));

      setRequests(enriched);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchRequests();
  }, [open]);

  const handleRespond = async () => {
    if (!selectedRequest || !response.trim()) return;
    setResponding(true);

    const { error } = await supabase
      .from('support_requests')
      .update({
        admin_response: response.trim(),
        status: 'responded',
        responded_at: new Date().toISOString(),
      })
      .eq('id', selectedRequest.id);

    if (error) {
      toast({ title: 'Lỗi phản hồi', description: error.message, variant: 'destructive' });
    } else {
      await supabase.from('notifications').insert({
        user_id: selectedRequest.user_id,
        type: 'support_response',
        title: 'Phản hồi hỗ trợ',
        message: `Yêu cầu "${selectedRequest.subject}" đã được phản hồi. Bấm để xem chi tiết.`,
        related_id: selectedRequest.id,
      });

      toast({ title: 'Đã gửi phản hồi!' });
      setResponse('');
      setSelectedRequest(null);
      fetchRequests();
    }
    setResponding(false);
  };

  const filtered = requests.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterCategory !== 'all' && r.category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.subject.toLowerCase().includes(q) || r.content.toLowerCase().includes(q) ||
        r.user_name?.toLowerCase().includes(q) || r.user_email?.toLowerCase().includes(q);
    }
    return true;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary" className="text-xs"><Clock className="w-3 h-3 mr-1" />Chờ xử lý</Badge>;
      case 'responded': return <Badge className="bg-success text-success-foreground text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Đã phản hồi</Badge>;
      default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Quản lý hỗ trợ khách hàng
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-xs">{pendingCount} chờ xử lý</Badge>
            )}
          </DialogTitle>
          <DialogDescription>Xem và phản hồi các yêu cầu hỗ trợ từ người dùng.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-0 flex-1 min-h-0">
          <div className="md:w-[380px] border-r flex flex-col">
            <div className="p-3 border-b space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="pending">Chờ xử lý</SelectItem>
                    <SelectItem value="responded">Đã phản hồi</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả loại</SelectItem>
                    <SelectItem value="help_center">Trợ giúp</SelectItem>
                    <SelectItem value="contact_support">Liên hệ</SelectItem>
                    <SelectItem value="support_request">Yêu cầu</SelectItem>
                    <SelectItem value="report_violation">Báo cáo</SelectItem>
                    <SelectItem value="complaint">Khiếu nại</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ScrollArea className="flex-1 max-h-[50vh] md:max-h-[60vh]">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Không có yêu cầu nào.
                </div>
              ) : (
                <div className="divide-y">
                  {filtered.map(req => (
                    <div
                      key={req.id}
                      className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedRequest?.id === req.id ? 'bg-accent' : ''
                      } ${req.status === 'pending' ? 'border-l-2 border-l-primary' : ''}`}
                      onClick={() => { setSelectedRequest(req); setResponse(req.admin_response || ''); }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {categoryIcons[req.category]}
                          <span className="font-medium text-sm truncate">{req.subject}</span>
                        </div>
                        {statusBadge(req.status)}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{req.content}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-muted-foreground">{req.user_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(req.created_at).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            {selectedRequest ? (
              <>
                <div className="p-4 border-b">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold">{selectedRequest.subject}</h3>
                    {statusBadge(selectedRequest.status)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{selectedRequest.user_name}</span>
                    <span>{selectedRequest.user_email}</span>
                    <Badge variant="outline" className="text-xs">
                      {categoryIcons[selectedRequest.category]}
                      <span className="ml-1">{categoryLabels[selectedRequest.category]}</span>
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(selectedRequest.created_at).toLocaleDateString('vi-VN')} {new Date(selectedRequest.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <ScrollArea className="flex-1 p-4 max-h-[30vh]">
                  <div className="space-y-4">
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Nội dung từ người dùng:</p>
                      <p className="text-sm whitespace-pre-wrap">{selectedRequest.content}</p>
                    </div>

                    {selectedRequest.admin_response && selectedRequest.status === 'responded' && (
                      <div className="bg-accent rounded-lg p-4">
                        <p className="text-xs font-medium text-accent-foreground mb-1">Phản hồi của Admin:</p>
                        <p className="text-sm whitespace-pre-wrap">{selectedRequest.admin_response}</p>
                        {selectedRequest.responded_at && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(selectedRequest.responded_at).toLocaleDateString('vi-VN')} {new Date(selectedRequest.responded_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="p-4 border-t space-y-3">
                  <Textarea
                    placeholder="Nhập phản hồi cho người dùng..."
                    value={response}
                    onChange={e => setResponse(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={handleRespond} disabled={responding || !response.trim()} className="w-full">
                    {responding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    {selectedRequest.status === 'responded' ? 'Cập nhật phản hồi' : 'Gửi phản hồi'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Chọn một yêu cầu để xem chi tiết</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminSupportManagement;
