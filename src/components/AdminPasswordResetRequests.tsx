import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X, Phone, Mail, Clock, User, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface PasswordResetRequest {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  content: string;
  status: string;
  admin_response: string | null;
  created_at: string;
}

interface AdminPasswordResetRequestsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdminPasswordResetRequests = ({ open, onOpenChange }: AdminPasswordResetRequestsProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      fetchRequests();
    }
  }, [open]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('password_reset_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (requestId: string, status: 'resolved' | 'rejected') => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from('password_reset_requests')
        .update({
          status,
          admin_response: responseText[requestId] || null,
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: status === 'resolved' ? 'Đã xử lý' : 'Đã từ chối',
        description: 'Yêu cầu đã được cập nhật',
      });

      fetchRequests();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message || 'Không thể cập nhật yêu cầu',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Chờ xử lý</Badge>;
      case 'resolved':
        return <Badge className="bg-success"><Check className="w-3 h-3 mr-1" />Đã xử lý</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Từ chối</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Yêu cầu đặt lại mật khẩu
            {pendingRequests.length > 0 && (
              <Badge variant="destructive">{pendingRequests.length}</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Xem và xử lý các yêu cầu đặt lại mật khẩu từ người dùng
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <RefreshCw className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Chưa có yêu cầu nào</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Chờ xử lý ({pendingRequests.length})</h4>
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <Card key={request.id} className="border-orange-200 bg-orange-50/50">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <User className="w-4 h-4" />
                            {request.full_name}
                          </CardTitle>
                          {getStatusBadge(request.status)}
                        </div>
                        <CardDescription className="text-xs">
                          {format(new Date(request.created_at), "dd/MM/yyyy 'lúc' HH:mm", { locale: vi })}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span>{request.phone}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{request.email}</span>
                          </div>
                        </div>
                        <div className="p-2 bg-background rounded text-sm">
                          {request.content}
                        </div>
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Ghi chú xử lý (không bắt buộc)..."
                            value={responseText[request.id] || ''}
                            onChange={(e) => setResponseText(prev => ({ ...prev, [request.id]: e.target.value }))}
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(request.id, 'resolved')}
                              disabled={processingId === request.id}
                            >
                              {processingId === request.id ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                              ) : (
                                <Check className="w-4 h-4 mr-1" />
                              )}
                              Đã xử lý
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(request.id, 'rejected')}
                              disabled={processingId === request.id}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Từ chối
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Processed Requests */}
            {processedRequests.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Đã xử lý ({processedRequests.length})</h4>
                <div className="space-y-2">
                  {processedRequests.slice(0, 10).map((request) => (
                    <Card key={request.id} className="bg-muted/30">
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{request.full_name}</p>
                            <p className="text-xs text-muted-foreground">{request.email}</p>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(request.status)}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(request.created_at), 'dd/MM/yyyy', { locale: vi })}
                            </p>
                          </div>
                        </div>
                        {request.admin_response && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            Ghi chú: {request.admin_response}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdminPasswordResetRequests;
