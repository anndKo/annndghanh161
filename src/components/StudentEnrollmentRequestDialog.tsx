import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X, PlayCircle, GraduationCap, Clock, Image, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface EnrollmentRequest {
  id: string;
  student_id: string;
  class_id: string | null;
  request_type: string;
  status: string;
  content: string | null;
  amount: number | null;
  payment_image_url: string | null;
  trial_expires_at: string | null;
  enrollment_days: number | null;
  created_at: string;
  is_viewed?: boolean;
  classes?: {
    id: string;
    name: string;
    display_id: string | null;
  } | null;
}

interface StudentEnrollmentRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestHandled?: () => void;
}

const StudentEnrollmentRequestDialog = ({ 
  open, 
  onOpenChange,
  onRequestHandled 
}: StudentEnrollmentRequestDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Accept form state
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<EnrollmentRequest | null>(null);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (open && user) {
      fetchRequests();
    }
  }, [open, user]);

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('enrollment_requests')
        .select(`
          *,
          classes (id, name, display_id)
        `)
        .eq('student_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptClick = async (request: EnrollmentRequest) => {
    // Mark as viewed
    await supabase
      .from('enrollment_requests')
      .update({ is_viewed: true } as any)
      .eq('id', request.id);
      
    setSelectedRequest(request);
    setPhone('');
    setAddress('');
    setAcceptDialogOpen(true);
  };

  const handleAccept = async () => {
    if (!selectedRequest || !phone || !address) return;

    setProcessingId(selectedRequest.id);
    try {
      // Update request with student info and status
      const { error: updateError } = await supabase
        .from('enrollment_requests')
        .update({
          status: 'student_accepted',
          student_phone: phone,
          student_address: address,
        })
        .eq('id', selectedRequest.id);

      if (updateError) throw updateError;

      // Get admin users
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      // Notify all admins
      if (adminRoles && adminRoles.length > 0) {
        const notifications = adminRoles.map(admin => ({
          user_id: admin.user_id,
          type: 'enrollment_accepted',
          title: selectedRequest.request_type === 'trial' ? 'Học viên chấp nhận học thử' : 'Học viên chấp nhận học thật',
          message: `Học viên đã chấp nhận yêu cầu ${selectedRequest.request_type === 'trial' ? 'học thử' : 'học thật'}. SĐT: ${phone}, Địa chỉ: ${address}. Vui lòng duyệt.`,
          related_id: selectedRequest.id,
        }));

        await supabase.from('notifications').insert(notifications);
      }

      toast({
        title: 'Đã xác nhận',
        description: 'Yêu cầu của bạn đã được gửi đến Admin để duyệt',
      });

      setAcceptDialogOpen(false);
      fetchRequests();
      onRequestHandled?.();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from('enrollment_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Đã từ chối',
        description: 'Bạn đã từ chối yêu cầu này',
      });

      fetchRequests();
      onRequestHandled?.();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yêu cầu đăng ký học</DialogTitle>
            <DialogDescription>
              Các yêu cầu học thử/học thật từ Admin
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Không có yêu cầu nào</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <Card key={request.id} className={!request.is_viewed ? 'ring-2 ring-primary' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {request.request_type === 'trial' ? (
                          <PlayCircle className="w-5 h-5 text-blue-500" />
                        ) : (
                          <GraduationCap className="w-5 h-5 text-green-500" />
                        )}
                        <CardTitle className="text-base">
                          {request.request_type === 'trial' ? 'Học thử' : 'Học thật'}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        {!request.is_viewed && (
                          <Badge variant="destructive" className="text-xs">
                            <EyeOff className="w-3 h-3 mr-1" />
                            Chưa xem
                          </Badge>
                        )}
                        <Badge variant={request.request_type === 'trial' ? 'secondary' : 'default'}>
                          {request.request_type === 'trial' ? 'Học thử' : 'Học thật'}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription>
                      {format(new Date(request.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {request.classes && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Lớp: </span>
                        <span className="font-medium">
                          {request.classes.display_id || request.classes.id.slice(0, 8)} - {request.classes.name}
                        </span>
                      </div>
                    )}
                    
                    {request.amount && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Số tiền: </span>
                        <span className="font-medium text-primary">{formatPrice(request.amount)}</span>
                      </div>
                    )}
                    
                    {request.request_type === 'trial' && request.trial_expires_at && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Hết hạn học thử: </span>
                        <span className="font-medium">
                          {format(new Date(request.trial_expires_at), 'dd/MM/yyyy', { locale: vi })}
                        </span>
                      </div>
                    )}
                    
                    {request.request_type === 'real' && request.enrollment_days && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Thời hạn học thật: </span>
                        <span className="font-medium text-primary">{request.enrollment_days} ngày</span>
                      </div>
                    )}
                    
                    {request.content && (
                      <div className="text-sm bg-muted p-3 rounded-lg">
                        <p className="text-muted-foreground mb-1">Nội dung:</p>
                        <p>{request.content}</p>
                      </div>
                    )}
                    
                    {request.payment_image_url && (
                      <div className="text-sm">
                        <a 
                          href={request.payment_image_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline"
                        >
                          <Image className="w-4 h-4" />
                          Xem ảnh chứng minh
                        </a>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleAcceptClick(request)}
                        disabled={processingId === request.id}
                      >
                        {processingId === request.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Chấp nhận
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(request.id)}
                        disabled={processingId === request.id}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Từ chối
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Accept confirmation dialog with phone/address */}
      <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận thông tin</DialogTitle>
            <DialogDescription>
              Vui lòng nhập số điện thoại và địa chỉ của bạn để hoàn tất
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="acceptPhone">Số điện thoại *</Label>
              <Input
                id="acceptPhone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0909 xxx xxx"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="acceptAddress">Địa chỉ *</Label>
              <Input
                id="acceptAddress"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Số nhà, đường, phường, quận, thành phố"
              />
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleAccept}
                disabled={!phone || !address || processingId !== null}
              >
                {processingId ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Xác nhận
              </Button>
              <Button
                variant="outline"
                onClick={() => setAcceptDialogOpen(false)}
              >
                Hủy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StudentEnrollmentRequestDialog;
