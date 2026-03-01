import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { Loader2, Check, X, Phone, Mail, Clock, User, RefreshCw, KeyRound } from 'lucide-react';
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
  const [newPasswords, setNewPasswords] = useState<Record<string, string>>({});
  const [changingPasswordId, setChangingPasswordId] = useState<string | null>(null);

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

  const handleChangePassword = async (request: PasswordResetRequest) => {
    const newPassword = newPasswords[request.id];
    if (!newPassword || newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Mật khẩu mới phải có ít nhất 6 ký tự',
      });
      return;
    }

    setProcessingId(request.id);
    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            email: request.email,
            new_password: newPassword,
            request_id: request.id,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed');

      toast({
        title: 'Đã đổi mật khẩu',
        description: `Mật khẩu của ${request.full_name} đã được cập nhật`,
      });

      setNewPasswords(prev => {
        const copy = { ...prev };
        delete copy[request.id];
        return copy;
      });
      setChangingPasswordId(null);
      fetchRequests();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message || 'Không thể đổi mật khẩu',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from('password_reset_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Đã từ chối',
        description: 'Yêu cầu đã bị từ chối',
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
                          {changingPasswordId === request.id ? (
                            <div className="space-y-2">
                              <Label className="flex items-center gap-1 text-sm">
                                <KeyRound className="w-3 h-3" />
                                Mật khẩu mới
                              </Label>
                              <Input
                                type="text"
                                placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)..."
                                value={newPasswords[request.id] || ''}
                                onChange={(e) => setNewPasswords(prev => ({ ...prev, [request.id]: e.target.value }))}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleChangePassword(request)}
                                  disabled={processingId === request.id}
                                >
                                  {processingId === request.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                  ) : (
                                    <Check className="w-4 h-4 mr-1" />
                                  )}
                                  Xác nhận đổi
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setChangingPasswordId(null)}
                                >
                                  Hủy
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => setChangingPasswordId(request.id)}
                                disabled={processingId === request.id}
                              >
                                <KeyRound className="w-4 h-4 mr-1" />
                                Đổi mật khẩu
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(request.id)}
                                disabled={processingId === request.id}
                              >
                                {processingId === request.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                ) : (
                                  <X className="w-4 h-4 mr-1" />
                                )}
                                Từ chối
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

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
