import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Users,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  DollarSign,
  Banknote,
  Trash2,
  AlertTriangle,
  MessageSquare,
  Search,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Tutor {
  id: string;
  user_id: string;
  full_name: string;
  school_name: string;
  teachable_subjects: string[];
  status: string;
}

interface PaymentRequest {
  id: string;
  tutor_id: string;
  class_id: string;
  requested_amount: number;
  approved_amount: number | null;
  note: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  tutor_name?: string;
  class_name?: string;
}

interface BankAccount {
  id: string;
  tutor_id: string;
  bank_name: string;
  account_holder_name: string;
  account_number: string;
}

interface Complaint {
  id: string;
  tutor_id: string;
  reason: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  tutor_name?: string;
}

const TutorManagement = () => {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const { toast } = useToast();

  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [tutorBankAccount, setTutorBankAccount] = useState<BankAccount | null>(null);
  const [tutorRevenue, setTutorRevenue] = useState<any[]>([]);
  const [tutorSearch, setTutorSearch] = useState('');
  
  // Approve payment dialog
  const [approvingRequest, setApprovingRequest] = useState<PaymentRequest | null>(null);
  const [approveAmount, setApproveAmount] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Delete tutor dialog
  const [deletingTutor, setDeletingTutor] = useState<Tutor | null>(null);
  
  // Complaint response dialog
  const [respondingComplaint, setRespondingComplaint] = useState<Complaint | null>(null);
  const [complaintResponse, setComplaintResponse] = useState('');

  // Filter tutors based on search
  const filteredTutors = tutors.filter(tutor => {
    if (!tutorSearch.trim()) return true;
    const searchLower = tutorSearch.toLowerCase();
    const shortId = tutor.user_id.slice(0, 8).toUpperCase();
    return (
      tutor.full_name.toLowerCase().includes(searchLower) ||
      shortId.includes(tutorSearch.toUpperCase())
    );
  });

  useEffect(() => {
    if (!loading && (!user || role !== 'admin')) {
      navigate('/auth');
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (user && role === 'admin') {
      fetchTutors();
      fetchPaymentRequests();
      fetchComplaints();
    }
  }, [user, role]);

  const fetchTutors = async () => {
    try {
      const { data, error } = await supabase
        .from('tutor_applications')
        .select('*')
        .eq('status', 'approved')
        .order('full_name');

      if (error) throw error;
      setTutors(data || []);
    } catch (error) {
      console.error('Error fetching tutors:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchPaymentRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('tutor_payment_requests')
        .select('*, classes(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get tutor names
      const tutorIds = [...new Set(data?.map(r => r.tutor_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', tutorIds);

      const enrichedRequests = data?.map(r => ({
        ...r,
        tutor_name: profiles?.find(p => p.user_id === r.tutor_id)?.full_name || 'Gia sư',
        class_name: (r.classes as any)?.name || 'Lớp học',
      })) || [];

      setPaymentRequests(enrichedRequests);
    } catch (error) {
      console.error('Error fetching payment requests:', error);
    }
  };

  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from('tutor_complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get tutor names
      const tutorIds = [...new Set(data?.map(c => c.tutor_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', tutorIds);

      const enrichedComplaints = data?.map(c => ({
        ...c,
        tutor_name: profiles?.find(p => p.user_id === c.tutor_id)?.full_name || 'Gia sư',
      })) || [];

      setComplaints(enrichedComplaints);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    }
  };

  const fetchTutorDetails = async (tutor: Tutor) => {
    setSelectedTutor(tutor);

    // Fetch bank account
    const { data: bankData } = await supabase
      .from('tutor_bank_accounts')
      .select('*')
      .eq('tutor_id', tutor.user_id)
      .maybeSingle();
    setTutorBankAccount(bankData);

    // Fetch revenue history
    const { data: revenueData } = await supabase
      .from('tutor_revenue')
      .select('*, tutor_payment_requests(note)')
      .eq('tutor_id', tutor.user_id)
      .order('created_at', { ascending: false });
    setTutorRevenue(revenueData || []);
  };

  const handleApprovePayment = async () => {
    if (!approvingRequest || !approveAmount) return;

    setProcessing(true);
    try {
      const amount = parseFloat(approveAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Số tiền không hợp lệ');
      }

      // Update payment request
      const { error: updateError } = await supabase
        .from('tutor_payment_requests')
        .update({
          status: 'approved',
          approved_amount: amount,
          admin_note: adminNote.trim() || null,
        })
        .eq('id', approvingRequest.id);

      if (updateError) throw updateError;

      // Add to revenue
      const { error: revenueError } = await supabase
        .from('tutor_revenue')
        .insert({
          tutor_id: approvingRequest.tutor_id,
          payment_request_id: approvingRequest.id,
          amount: amount,
          description: `Duyệt lớp: ${approvingRequest.class_name}`,
        });

      if (revenueError) throw revenueError;

      // Send notification
      await supabase.from('notifications').insert({
        user_id: approvingRequest.tutor_id,
        type: 'payment_approved',
        title: 'Yêu cầu thanh toán được duyệt',
        message: `Yêu cầu thanh toán lớp ${approvingRequest.class_name} đã được duyệt với số tiền ${formatPrice(amount)}`,
      });

      toast({
        title: 'Đã duyệt',
        description: 'Yêu cầu thanh toán đã được duyệt',
      });

      setApprovingRequest(null);
      setApproveAmount('');
      setAdminNote('');
      fetchPaymentRequests();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectPayment = async (request: PaymentRequest) => {
    try {
      const { error } = await supabase
        .from('tutor_payment_requests')
        .update({ status: 'rejected' })
        .eq('id', request.id);

      if (error) throw error;

      // Send notification
      await supabase.from('notifications').insert({
        user_id: request.tutor_id,
        type: 'payment_rejected',
        title: 'Yêu cầu thanh toán bị từ chối',
        message: `Yêu cầu thanh toán lớp ${request.class_name} đã bị từ chối`,
      });

      toast({
        title: 'Đã từ chối',
        description: 'Yêu cầu thanh toán đã bị từ chối',
      });

      fetchPaymentRequests();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message,
      });
    }
  };

  const handleConfirmPayment = async (tutor: Tutor) => {
    const totalRevenue = tutorRevenue.reduce((sum, r) => sum + r.amount, 0);
    
    if (totalRevenue <= 0) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không có doanh thu để thanh toán',
      });
      return;
    }

    setProcessing(true);
    try {
      // Just reset the total by setting amount to 0 for each revenue record
      // Instead of deleting, we mark them as paid by adding a negative entry
      const { error: insertError } = await supabase
        .from('tutor_revenue')
        .insert({
          tutor_id: tutor.user_id,
          amount: -totalRevenue,
          description: `Đã thanh toán: ${formatPrice(totalRevenue)}`,
        });

      if (insertError) throw insertError;

      // Send notification to tutor with complaint option
      await supabase.from('notifications').insert({
        user_id: tutor.user_id,
        type: 'payment_confirmed',
        title: 'Đã thanh toán doanh thu',
        message: `Admin đã xác nhận thanh toán ${formatPrice(totalRevenue)} cho bạn. Bấm vào đây để khiếu nại nếu cần.`,
        related_id: tutor.user_id,
      });

      toast({
        title: 'Đã xác nhận thanh toán',
        description: `Đã thanh toán ${formatPrice(totalRevenue)} cho ${tutor.full_name}`,
      });

      // Refresh data
      fetchTutorDetails(tutor);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteTutor = async () => {
    if (!deletingTutor) return;

    setProcessing(true);
    try {
      // Update application status to rejected
      const { error: updateError } = await supabase
        .from('tutor_applications')
        .update({ status: 'rejected', rejection_reason: 'Bị xóa khỏi danh sách gia sư' })
        .eq('id', deletingTutor.id);

      if (updateError) throw updateError;

      // Change role back to student
      await supabase
        .from('user_roles')
        .update({ role: 'student' })
        .eq('user_id', deletingTutor.user_id);

      // Send notification
      await supabase.from('notifications').insert({
        user_id: deletingTutor.user_id,
        type: 'tutor_removed',
        title: 'Đã bị xóa khỏi danh sách gia sư',
        message: 'Bạn đã bị xóa khỏi danh sách gia sư. Vui lòng liên hệ Admin để biết thêm chi tiết.',
      });

      toast({
        title: 'Đã xóa gia sư',
        description: `${deletingTutor.full_name} đã bị xóa khỏi danh sách`,
      });

      setDeletingTutor(null);
      setSelectedTutor(null);
      fetchTutors();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRespondComplaint = async () => {
    if (!respondingComplaint || !complaintResponse.trim()) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('tutor_complaints')
        .update({
          status: 'resolved',
          admin_response: complaintResponse.trim(),
        })
        .eq('id', respondingComplaint.id);

      if (error) throw error;

      // Send notification
      await supabase.from('notifications').insert({
        user_id: respondingComplaint.tutor_id,
        type: 'complaint_resolved',
        title: 'Khiếu nại đã được xử lý',
        message: `Admin đã phản hồi khiếu nại của bạn: ${complaintResponse.trim()}`,
      });

      toast({
        title: 'Đã phản hồi',
        description: 'Khiếu nại đã được xử lý',
      });

      setRespondingComplaint(null);
      setComplaintResponse('');
      fetchComplaints();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-warning border-warning"><Clock className="w-3 h-3 mr-1" />Chờ duyệt</Badge>;
      case 'approved':
        return <Badge className="bg-success"><CheckCircle2 className="w-3 h-3 mr-1" />Đã duyệt</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Từ chối</Badge>;
      case 'resolved':
        return <Badge className="bg-success"><CheckCircle2 className="w-3 h-3 mr-1" />Đã xử lý</Badge>;
      default:
        return null;
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingRequests = paymentRequests.filter(r => r.status === 'pending');
  const pendingComplaints = complaints.filter(c => c.status === 'pending');
  const totalRevenue = tutorRevenue.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold">Quản lý gia sư</h1>
            <p className="text-xs text-muted-foreground">Thanh toán và duyệt lớp</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Yêu cầu duyệt lớp
              {pendingRequests.length > 0 && <Badge variant="secondary">{pendingRequests.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="tutors" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Danh sách gia sư
            </TabsTrigger>
            <TabsTrigger value="complaints" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Khiếu nại
              {pendingComplaints.length > 0 && <Badge variant="destructive">{pendingComplaints.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Yêu cầu duyệt lớp</CardTitle>
                <CardDescription>Duyệt và thanh toán cho gia sư</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentRequests.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Chưa có yêu cầu nào
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Gia sư</TableHead>
                          <TableHead>Lớp</TableHead>
                          <TableHead>Số tiền YC</TableHead>
                          <TableHead>Ghi chú</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead>Ngày tạo</TableHead>
                          <TableHead className="text-right">Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{request.tutor_name}</p>
                                <p className="text-xs text-muted-foreground font-mono">ID: {request.tutor_id.slice(0, 8).toUpperCase()}</p>
                              </div>
                            </TableCell>
                            <TableCell>{request.class_name}</TableCell>
                            <TableCell className="text-primary font-medium">
                              {formatPrice(request.requested_amount)}
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate">{request.note || '-'}</TableCell>
                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                            <TableCell className="text-sm">{formatDate(request.created_at)}</TableCell>
                            <TableCell className="text-right">
                              {request.status === 'pending' && (
                                <div className="flex gap-1 justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-success border-success"
                                    onClick={() => {
                                      setApprovingRequest(request);
                                      setApproveAmount(request.requested_amount.toString());
                                    }}
                                  >
                                    <DollarSign className="w-4 h-4 mr-1" />
                                    Duyệt
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-destructive border-destructive"
                                    onClick={() => handleRejectPayment(request)}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                              {request.status === 'approved' && (
                                <span className="text-sm text-success">
                                  {formatPrice(request.approved_amount || 0)}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tutors">
            <Card>
              <CardHeader>
                <CardTitle>Danh sách gia sư</CardTitle>
                <CardDescription>Xem thông tin chi tiết và thanh toán</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search box */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm theo tên hoặc ID gia sư..."
                      value={tutorSearch}
                      onChange={(e) => setTutorSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                {filteredTutors.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {tutorSearch ? 'Không tìm thấy gia sư phù hợp' : 'Chưa có gia sư nào'}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredTutors.map((tutor) => (
                      <div
                        key={tutor.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg gap-4"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold">{tutor.full_name}</h3>
                          <p className="text-xs text-muted-foreground font-mono">ID: {tutor.user_id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-sm text-muted-foreground">{tutor.school_name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Môn dạy: {tutor.teachable_subjects.join(', ')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fetchTutorDetails(tutor)}
                          >
                            <Banknote className="w-4 h-4 mr-1" />
                            Thanh toán
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive"
                            onClick={() => setDeletingTutor(tutor)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="complaints">
            <Card>
              <CardHeader>
                <CardTitle>Khiếu nại từ gia sư</CardTitle>
                <CardDescription>Xử lý khiếu nại về thanh toán</CardDescription>
              </CardHeader>
              <CardContent>
                {complaints.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Chưa có khiếu nại nào
                  </div>
                ) : (
                  <div className="space-y-4">
                    {complaints.map((complaint) => (
                      <div
                        key={complaint.id}
                        className="p-4 border border-border rounded-lg space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{complaint.tutor_name}</h4>
                            <p className="text-xs text-muted-foreground font-mono">ID: {complaint.tutor_id.slice(0, 8).toUpperCase()}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(complaint.created_at)}</p>
                          </div>
                          {getStatusBadge(complaint.status)}
                        </div>
                        <p className="text-sm bg-muted p-2 rounded">{complaint.reason}</p>
                        {complaint.admin_response && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Phản hồi: </span>
                            {complaint.admin_response}
                          </div>
                        )}
                        {complaint.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => setRespondingComplaint(complaint)}
                          >
                            Phản hồi
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Tutor Detail Dialog */}
      <Dialog open={!!selectedTutor} onOpenChange={() => setSelectedTutor(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTutor?.full_name}</DialogTitle>
            <DialogDescription>Thông tin thanh toán và doanh thu</DialogDescription>
          </DialogHeader>

          {selectedTutor && (
            <div className="space-y-6">
              {/* Bank Account */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Tài khoản ngân hàng
                </h4>
                {tutorBankAccount ? (
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <p><span className="text-muted-foreground">Ngân hàng:</span> {tutorBankAccount.bank_name}</p>
                    <p><span className="text-muted-foreground">Chủ TK:</span> {tutorBankAccount.account_holder_name}</p>
                    <p><span className="text-muted-foreground">STK:</span> {tutorBankAccount.account_number}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Chưa thêm tài khoản ngân hàng</p>
                )}
              </div>

              {/* Revenue Summary */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Tổng doanh thu hiện tại
                  </h4>
                  {totalRevenue > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-success border-success"
                      onClick={() => handleConfirmPayment(selectedTutor!)}
                      disabled={processing}
                    >
                      {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                      Xác nhận thanh toán
                    </Button>
                  )}
                </div>
                <p className="text-2xl font-bold text-primary">
                  {formatPrice(Math.max(0, totalRevenue))}
                </p>
              </div>

              {/* Revenue History */}
              <div>
                <h4 className="font-medium mb-2">Lịch sử doanh thu</h4>
                {tutorRevenue.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Chưa có doanh thu</p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {tutorRevenue.map((rev) => (
                      <div key={rev.id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <div>
                          <p className="text-sm font-medium">{rev.description}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(rev.created_at)}</p>
                        </div>
                        <span className={`font-medium ${rev.amount >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {rev.amount >= 0 ? '+' : ''}{formatPrice(rev.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Payment Dialog */}
      <Dialog open={!!approvingRequest} onOpenChange={() => setApprovingRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duyệt thanh toán</DialogTitle>
            <DialogDescription>
              Nhập số tiền duyệt cho gia sư {approvingRequest?.tutor_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Số tiền yêu cầu</Label>
              <p className="text-lg font-medium text-primary">
                {formatPrice(approvingRequest?.requested_amount || 0)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="approve-amount">Số tiền duyệt (VNĐ)</Label>
              <Input
                id="approve-amount"
                type="number"
                value={approveAmount}
                onChange={(e) => setApproveAmount(e.target.value)}
                placeholder="Nhập số tiền"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-note">Ghi chú (tùy chọn)</Label>
              <Textarea
                id="admin-note"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Ghi chú cho gia sư..."
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                className="flex-1"
                onClick={handleApprovePayment}
                disabled={!approveAmount || processing}
              >
                {processing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Duyệt thanh toán
              </Button>
              <Button
                variant="outline"
                onClick={() => setApprovingRequest(null)}
              >
                Hủy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Tutor Confirmation */}
      <AlertDialog open={!!deletingTutor} onOpenChange={() => setDeletingTutor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Xóa gia sư?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa <strong>{deletingTutor?.full_name}</strong> khỏi danh sách gia sư? 
              Hành động này sẽ chuyển gia sư về vai trò học viên.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTutor}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Xóa gia sư
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Respond to Complaint Dialog */}
      <Dialog open={!!respondingComplaint} onOpenChange={() => setRespondingComplaint(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Phản hồi khiếu nại</DialogTitle>
            <DialogDescription>
              Khiếu nại từ {respondingComplaint?.tutor_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">{respondingComplaint?.reason}</p>
            </div>

            <div className="space-y-2">
              <Label>Phản hồi của bạn</Label>
              <Textarea
                value={complaintResponse}
                onChange={(e) => setComplaintResponse(e.target.value)}
                placeholder="Nhập phản hồi..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setRespondingComplaint(null)}
                className="flex-1"
              >
                Hủy
              </Button>
              <Button
                onClick={handleRespondComplaint}
                disabled={!complaintResponse.trim() || processing}
                className="flex-1"
              >
                {processing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Gửi phản hồi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TutorManagement;