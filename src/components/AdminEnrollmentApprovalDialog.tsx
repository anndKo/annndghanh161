import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { Button } from '@/components/ui/button';
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
import { Loader2, Check, X, PlayCircle, GraduationCap, Clock, Phone, MapPin, User } from 'lucide-react';
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
  student_phone: string | null;
  student_address: string | null;
  trial_expires_at: string | null;
  created_at: string;
  classes?: {
    id: string;
    name: string;
    display_id: string | null;
  } | null;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

interface AdminEnrollmentApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdminEnrollmentApprovalDialog = ({ 
  open, 
  onOpenChange 
}: AdminEnrollmentApprovalDialogProps) => {
  const { toast } = useToast();

  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchRequests();
    }
  }, [open]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('enrollment_requests')
        .select(`
          *,
          classes (id, name, display_id)
        `)
        .eq('status', 'student_accepted')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch student profiles
      const studentIds = [...new Set(data?.map(r => r.student_id) || [])];
      let profiles: Record<string, { full_name: string; email: string }> = {};
      
      if (studentIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', studentIds);
        
        profileData?.forEach(p => {
          profiles[p.user_id] = { full_name: p.full_name, email: p.email };
        });
      }

      const enrichedRequests = (data || []).map(r => ({
        ...r,
        profiles: profiles[r.student_id] || null,
      }));

      setRequests(enrichedRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: EnrollmentRequest) => {
    setProcessingId(request.id);
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('enrollment_requests')
        .update({ status: 'admin_approved' })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Add student to class if class_id exists
      if (request.class_id) {
        const enrollmentType = request.request_type === 'trial' ? 'trial' : 'real';
        
        // Check if enrollment exists
        const { data: existingEnrollment } = await supabase
          .from('enrollments')
          .select('id')
          .eq('student_id', request.student_id)
          .eq('class_id', request.class_id)
          .maybeSingle();

        if (existingEnrollment) {
          // Update existing enrollment
          await supabase
            .from('enrollments')
            .update({
              status: 'approved',
              enrollment_type: enrollmentType,
              trial_expires_at: request.trial_expires_at,
            })
            .eq('id', existingEnrollment.id);
        } else {
          // Create new enrollment
          await supabase
            .from('enrollments')
            .insert({
              student_id: request.student_id,
              class_id: request.class_id,
              status: 'approved',
              enrollment_type: enrollmentType,
              trial_expires_at: request.trial_expires_at,
            });
        }
      }

      // Notify student
      await supabase.from('notifications').insert({
        user_id: request.student_id,
        type: 'enrollment_approved',
        title: request.request_type === 'trial' ? 'Đã duyệt học thử' : 'Đã duyệt học thật',
        message: request.request_type === 'trial' 
          ? `Yêu cầu học thử của bạn đã được duyệt. Thời hạn học thử đến ${request.trial_expires_at ? format(new Date(request.trial_expires_at), 'dd/MM/yyyy', { locale: vi }) : 'N/A'}`
          : 'Yêu cầu học thật của bạn đã được duyệt. Bạn đã chính thức tham gia lớp học!',
        related_id: request.class_id,
      });

      toast({
        title: 'Đã duyệt',
        description: 'Học viên đã được thêm vào lớp',
      });

      fetchRequests();
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

  const handleReject = async (request: EnrollmentRequest) => {
    setProcessingId(request.id);
    try {
      const { error } = await supabase
        .from('enrollment_requests')
        .update({ status: 'rejected' })
        .eq('id', request.id);

      if (error) throw error;

      // Notify student
      await supabase.from('notifications').insert({
        user_id: request.student_id,
        type: 'enrollment_rejected',
        title: 'Yêu cầu bị từ chối',
        message: 'Yêu cầu đăng ký học của bạn đã bị từ chối.',
      });

      toast({
        title: 'Đã từ chối',
        description: 'Yêu cầu đã bị từ chối',
      });

      fetchRequests();
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Duyệt yêu cầu đăng ký</DialogTitle>
          <DialogDescription>
            Các yêu cầu đã được học viên chấp nhận, đang chờ duyệt
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Không có yêu cầu nào cần duyệt</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id}>
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
                    <Badge variant={request.request_type === 'trial' ? 'secondary' : 'default'}>
                      {request.request_type === 'trial' ? 'Học thử' : 'Học thật'}
                    </Badge>
                  </div>
                  <CardDescription>
                    {format(new Date(request.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {request.profiles && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{request.profiles.full_name}</span>
                      <span className="text-muted-foreground">({request.profiles.email})</span>
                    </div>
                  )}

                  {request.student_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{request.student_phone}</span>
                    </div>
                  )}

                  {request.student_address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{request.student_address}</span>
                    </div>
                  )}

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
                  
                  {request.trial_expires_at && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Hết hạn học thử: </span>
                      <span className="font-medium">
                        {format(new Date(request.trial_expires_at), 'dd/MM/yyyy', { locale: vi })}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleApprove(request)}
                      disabled={processingId === request.id}
                    >
                      {processingId === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Duyệt
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(request)}
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
  );
};

export default AdminEnrollmentApprovalDialog;
