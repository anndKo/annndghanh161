import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Loader2, User, Briefcase, Clock, Eye, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TutorInfoDialog from './TutorInfoDialog';

interface ClassRequest {
  id: string;
  class_id: string;
  tutor_id: string;
  status: string;
  note: string | null;
  created_at: string;
  tutor_name?: string;
  class_name?: string;
  class_display_id?: string;
}

interface TutorInfoState {
  tutorId: string;
  tutorName: string;
}

interface AdminClassRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApproved?: () => void;
}

const AdminClassRequestsDialog = ({
  open,
  onOpenChange,
  onApproved,
}: AdminClassRequestsDialogProps) => {
  const { toast } = useToast();
  
  const [requests, setRequests] = useState<ClassRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ClassRequest | null>(null);
  const [tutorInfoState, setTutorInfoState] = useState<TutorInfoState | null>(null);
  const [tutorInfoOpen, setTutorInfoOpen] = useState(false);

  const openTutorInfo = (tutorId: string, tutorName: string) => {
    setTutorInfoState({ tutorId, tutorName });
    setTutorInfoOpen(true);
  };

  const handleMessageTutor = async (tutorId: string, tutorName: string) => {
    // Close the dialog and navigate to messaging
    onOpenChange(false);
    // Dispatch custom event to open messaging with this tutor
    window.dispatchEvent(new CustomEvent('openMessaging', { 
      detail: { partnerId: tutorId, partnerName: tutorName } 
    }));
  };

  useEffect(() => {
    if (open) {
      fetchRequests();
    }
  }, [open]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('class_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get tutor names and class names
      const tutorIds = [...new Set(data?.map(r => r.tutor_id) || [])];
      const classIds = [...new Set(data?.map(r => r.class_id) || [])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', tutorIds);

      const { data: classes } = await supabase
        .from('classes')
        .select('id, name, display_id')
        .in('id', classIds);

      const enrichedRequests = data?.map(r => ({
        ...r,
        tutor_name: profiles?.find(p => p.user_id === r.tutor_id)?.full_name || 'Gia sư',
        class_name: classes?.find(c => c.id === r.class_id)?.name || 'Lớp học',
        class_display_id: classes?.find(c => c.id === r.class_id)?.display_id || '',
      })) || [];

      setRequests(enrichedRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: ClassRequest) => {
    setProcessing(request.id);
    try {
      // Update request status
      const { error: requestError } = await supabase
        .from('class_requests')
        .update({ 
          status: 'approved',
          admin_response: adminResponse.trim() || null,
        })
        .eq('id', request.id);

      if (requestError) throw requestError;

      // Assign tutor to class
      const { error: classError } = await supabase
        .from('classes')
        .update({ 
          tutor_id: request.tutor_id,
          is_shared: false,
        })
        .eq('id', request.class_id);

      if (classError) throw classError;

      // Reject other pending requests for the same class
      await supabase
        .from('class_requests')
        .update({ 
          status: 'rejected',
          admin_response: 'Lớp đã được giao cho gia sư khác',
        })
        .eq('class_id', request.class_id)
        .eq('status', 'pending')
        .neq('id', request.id);

      // Notify tutor
      await supabase.from('notifications').insert({
        user_id: request.tutor_id,
        type: 'class_request_approved',
        title: 'Yêu cầu nhận lớp được duyệt',
        message: `Bạn đã được phân công dạy lớp "${request.class_name}"`,
        related_id: request.class_id,
      });

      toast({
        title: 'Đã duyệt',
        description: `Đã giao lớp cho ${request.tutor_name}`,
      });

      setAdminResponse('');
      setSelectedRequest(null);
      fetchRequests();
      onApproved?.();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message,
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (request: ClassRequest) => {
    setProcessing(request.id);
    try {
      const { error } = await supabase
        .from('class_requests')
        .update({ 
          status: 'rejected',
          admin_response: adminResponse.trim() || 'Yêu cầu không được duyệt',
        })
        .eq('id', request.id);

      if (error) throw error;

      // Notify tutor
      await supabase.from('notifications').insert({
        user_id: request.tutor_id,
        type: 'class_request_rejected',
        title: 'Yêu cầu nhận lớp bị từ chối',
        message: `Yêu cầu nhận lớp "${request.class_name}" của bạn không được duyệt`,
        related_id: request.class_id,
      });

      toast({
        title: 'Đã từ chối',
        description: 'Yêu cầu đã bị từ chối',
      });

      setAdminResponse('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message,
      });
    } finally {
      setProcessing(null);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Yêu cầu nhận lớp từ gia sư
            {pendingRequests.length > 0 && (
              <Badge variant="destructive">{pendingRequests.length}</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Duyệt hoặc từ chối yêu cầu nhận lớp của gia sư
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có yêu cầu nhận lớp nào</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Đang chờ duyệt ({pendingRequests.length})
                  </h3>
                  {pendingRequests.map((request) => (
                    <Card 
                      key={request.id}
                      className={`${selectedRequest?.id === request.id ? 'ring-2 ring-primary' : ''}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              <User className="w-4 h-4" />
                              {request.tutor_name}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              Xin nhận: <span className="font-medium">{request.class_name}</span>
                              {request.class_display_id && (
                                <span className="text-xs ml-1">({request.class_display_id})</span>
                              )}
                            </p>
                          </div>
                          <Badge variant="outline">Chờ duyệt</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {request.note && (
                          <p className="text-sm bg-muted p-2 rounded mb-3">
                            "{request.note}"
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mb-3">
                          Gửi lúc: {formatTime(request.created_at)}
                        </p>
                        
                        {selectedRequest?.id === request.id ? (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label>Phản hồi (không bắt buộc)</Label>
                              <Textarea
                                value={adminResponse}
                                onChange={(e) => setAdminResponse(e.target.value)}
                                placeholder="Ghi chú cho gia sư..."
                                rows={2}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(request)}
                                disabled={processing === request.id}
                                className="flex-1"
                              >
                                {processing === request.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                )}
                                Duyệt
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleReject(request)}
                                disabled={processing === request.id}
                                className="flex-1"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Từ chối
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(null);
                                  setAdminResponse('');
                                }}
                              >
                                Hủy
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedRequest(request)}
                            >
                              Xử lý
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                          onClick={() => openTutorInfo(request.tutor_id, request.tutor_name || 'Gia sư')}
                            >
                          <Eye className="w-4 h-4 mr-1" />
                              Xem chi tiết
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMessageTutor(request.tutor_id, request.tutor_name || 'Gia sư')}
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Nhắn tin
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {processedRequests.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground">
                    Đã xử lý ({processedRequests.length})
                  </h3>
                  {processedRequests.map((request) => (
                    <Card key={request.id} className="opacity-60">
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{request.tutor_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {request.class_name}
                            </p>
                          </div>
                          <Badge 
                            variant={request.status === 'approved' ? 'default' : 'destructive'}
                          >
                            {request.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {tutorInfoState && (
          <TutorInfoDialog
            open={tutorInfoOpen}
            onOpenChange={setTutorInfoOpen}
            tutorId={tutorInfoState.tutorId}
            tutorName={tutorInfoState.tutorName}
            avgRating={0}
            ratingCount={0}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdminClassRequestsDialog;
