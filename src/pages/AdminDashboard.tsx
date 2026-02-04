import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import NotificationBell from '@/components/NotificationBell';
import MessagingSystem from '@/components/MessagingSystem';
import CreateClassDialog from '@/components/CreateClassDialog';
import ImageViewer from '@/components/ImageViewer';
import ClassStudentsDialog from '@/components/ClassStudentsDialog';
import DownloadConfirmDialog from '@/components/DownloadConfirmDialog';
import EditClassDialog from '@/components/EditClassDialog';
import { useBackButtonBlock } from '@/hooks/useBackButtonBlock';
import AdminEnrollmentRequestDialog from '@/components/AdminEnrollmentRequestDialog';
import AdminEnrollmentApprovalDialog from '@/components/AdminEnrollmentApprovalDialog';
import MobileMenu from '@/components/MobileMenu';
import AdminAttendanceStats from '@/components/AdminAttendanceStats';
import AdminPasswordResetRequests from '@/components/AdminPasswordResetRequests';
import AdminClassRequestsDialog from '@/components/AdminClassRequestsDialog';
import {
  GraduationCap,
  Users,
  BookOpen,
  LogOut,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Loader2,
  Plus,
  MessageCircle,
  FileText,
  ExternalLink,
  Trash2,
  Copy,
  UserCheck,
  ImageOff,
  Download,
  Edit,
  Settings,
  ClipboardList,
  Send,
  Menu,
  CalendarCheck,
  RefreshCw,
  Share2,
  Briefcase,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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

interface TutorApplication {
  id: string;
  user_id: string;
  full_name: string;
  current_address: string;
  teaching_areas: string[];
  school_name: string;
  faculty: string;
  best_subject: string;
  teachable_subjects: string[];
  teaching_format: string;
  student_id_front: string;
  student_id_back: string;
  achievement_files: string[] | null;
  status: string;
  created_at: string;
}

interface ClassItem {
  id: string;
  display_id: string | null;
  name: string;
  subject: string;
  grade: string;
  teaching_format: string;
  class_type: string;
  price_per_session: number;
  max_students: number;
  is_active: boolean;
  created_at: string;
}

interface Enrollment {
  id: string;
  student_id: string;
  class_id: string;
  status: string;
  enrolled_at: string;
  student_name?: string;
  class_name?: string;
}

// Image component with fallback, retry logic, and click to view fullscreen
const SafeImage = ({ 
  src, 
  alt, 
  className,
  onImageClick 
}: { 
  src: string; 
  alt: string; 
  className?: string;
  onImageClick?: (url: string) => void;
}) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(false);
    setRetryCount(0);
    setSignedUrl('');

    const getSignedUrl = async (url: string, attempt: number = 0): Promise<string> => {
      try {
        // Check if it's a Supabase storage URL pattern
        const match = url.match(/tutor-documents\/(.+)$/);
        if (match) {
          const filePath = decodeURIComponent(match[1]);
          const { data, error } = await supabase.storage
            .from('tutor-documents')
            .createSignedUrl(filePath, 3600);
          
          if (error) {
            console.error('Error getting signed URL:', error);
            // Retry with delay if failed
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
              return getSignedUrl(url, attempt + 1);
            }
            return url;
          }
          return data?.signedUrl || url;
        }
        
        // Check if it's already a full URL
        if (url.startsWith('http')) {
          return url;
        }
        
        return url;
      } catch (err) {
        console.error('Error in getSignedUrl:', err);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          return getSignedUrl(url, attempt + 1);
        }
        return url;
      }
    };

    if (src) {
      getSignedUrl(src).then(url => {
        if (isMounted) {
          setSignedUrl(url);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [src]);

  const handleRetry = () => {
    if (retryCount < maxRetries) {
      setError(false);
      setLoading(true);
      setRetryCount(prev => prev + 1);
      // Force re-fetch by updating signedUrl with cache buster
      if (signedUrl) {
        const separator = signedUrl.includes('?') ? '&' : '?';
        setSignedUrl(`${signedUrl.split('&_retry=')[0]}${separator}_retry=${Date.now()}`);
      }
    }
  };

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center bg-muted rounded-lg cursor-pointer ${className}`}
        onClick={handleRetry}
      >
        <div className="text-center text-muted-foreground p-2">
          <ImageOff className="w-6 h-6 mx-auto mb-1" />
          <p className="text-xs">Lỗi ảnh</p>
          {retryCount < maxRetries && (
            <p className="text-xs text-primary mt-1">Nhấn để thử lại</p>
          )}
        </div>
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative cursor-pointer" onClick={() => onImageClick?.(signedUrl)}>
      {loading && (
        <div className={`absolute inset-0 flex items-center justify-center bg-muted rounded-lg ${className}`}>
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <img
        src={signedUrl}
        alt={alt}
        className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} hover:opacity-80 transition-opacity`}
        onLoad={() => setLoading(false)}
        onError={() => { 
          if (retryCount < maxRetries) {
            handleRetry();
          } else {
            setError(true); 
            setLoading(false); 
          }
        }}
      />
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, role, fullName, loading, signOut } = useAuth();
  const { toast } = useToast();
  
  // Block back button on mobile
  useBackButtonBlock();
  
  const [applications, setApplications] = useState<TutorApplication[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedApp, setSelectedApp] = useState<TutorApplication | null>(null);
  const [processing, setProcessing] = useState(false);
  const [messagingOpen, setMessagingOpen] = useState(false);
  const [createClassOpen, setCreateClassOpen] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  
  // Class students dialog
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<ClassItem | null>(null);
  
  // Class editing dialog
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  
  // Tutor removal dialog
  const [removingTutor, setRemovingTutor] = useState<TutorApplication | null>(null);
  const [tutorRemovalReason, setTutorRemovalReason] = useState('');
  
  // Permanent delete dialog
  const [permanentDeleteApp, setPermanentDeleteApp] = useState<TutorApplication | null>(null);
  
  // Download confirmation dialog
  const [downloadFile, setDownloadFile] = useState<{ url: string; name: string } | null>(null);
  
  // Enrollment request dialog
  const [enrollmentRequestOpen, setEnrollmentRequestOpen] = useState(false);
  const [selectedStudentForRequest, setSelectedStudentForRequest] = useState<{ id: string; name: string } | null>(null);
  const [enrollmentApprovalOpen, setEnrollmentApprovalOpen] = useState(false);
  const [attendanceStatsOpen, setAttendanceStatsOpen] = useState(false);
  const [passwordResetOpen, setPasswordResetOpen] = useState(false);
  const [classRequestsOpen, setClassRequestsOpen] = useState(false);
  const userShortId = user?.id?.slice(0, 8).toUpperCase() || '';

  useEffect(() => {
    if (!loading && (!user || role !== 'admin')) {
      navigate('/auth');
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (user && role === 'admin') {
      fetchApplications();
      fetchClasses();
      fetchEnrollments();
    }
  }, [user, role]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('tutor_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchEnrollments = async () => {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, classes(name)')
        .order('enrolled_at', { ascending: false });

      if (error) throw error;

      // Get student names from profiles
      const studentIds = [...new Set(data?.map(e => e.student_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', studentIds);

      const enrichedEnrollments = data?.map(e => ({
        ...e,
        student_name: profiles?.find(p => p.user_id === e.student_id)?.full_name || 'Học viên',
        class_name: (e.classes as any)?.name || 'Lớp học',
      })) || [];

      setEnrollments(enrichedEnrollments);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    }
  };

  const handleApprove = async (application: TutorApplication) => {
    setProcessing(true);
    try {
      const { error: updateError } = await supabase
        .from('tutor_applications')
        .update({ status: 'approved' })
        .eq('id', application.id);

      if (updateError) throw updateError;

      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: 'tutor' })
        .eq('user_id', application.user_id);

      if (roleError) throw roleError;

      await supabase.from('notifications').insert({
        user_id: application.user_id,
        type: 'application_approved',
        title: 'Hồ sơ được duyệt',
        message: 'Chúc mừng! Hồ sơ gia sư của bạn đã được phê duyệt. Bạn có thể bắt đầu nhận lớp ngay bây giờ.',
      });

      toast({
        title: 'Đã duyệt',
        description: `${application.full_name} đã được duyệt làm gia sư`,
      });

      fetchApplications();
      setSelectedApp(null);
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

  const handleReject = async (application: TutorApplication) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('tutor_applications')
        .update({ status: 'rejected' })
        .eq('id', application.id);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: application.user_id,
        type: 'application_rejected',
        title: 'Hồ sơ bị từ chối',
        message: 'Rất tiếc, hồ sơ gia sư của bạn chưa được phê duyệt. Vui lòng liên hệ Admin để biết thêm chi tiết.',
      });

      toast({
        title: 'Đã từ chối',
        description: `Hồ sơ của ${application.full_name} đã bị từ chối`,
      });

      fetchApplications();
      setSelectedApp(null);
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

  const handleRemoveTutor = async () => {
    if (!removingTutor || !tutorRemovalReason.trim()) return;

    setProcessing(true);
    try {
      // Update application status to rejected with reason
      const { error } = await supabase
        .from('tutor_applications')
        .update({
          status: 'rejected',
          rejection_reason: tutorRemovalReason.trim(),
        })
        .eq('id', removingTutor.id);

      if (error) throw error;

      // Change role back to student
      await supabase
        .from('user_roles')
        .update({ role: 'student' })
        .eq('user_id', removingTutor.user_id);

      // Send notification
      await supabase.from('notifications').insert({
        user_id: removingTutor.user_id,
        type: 'tutor_removed',
        title: 'Đã bị xóa tư cách gia sư',
        message: `Bạn đã bị xóa tư cách gia sư. Lý do: ${tutorRemovalReason.trim()}`,
      });

      toast({
        title: 'Đã xóa gia sư',
        description: `${removingTutor.full_name} đã bị xóa tư cách gia sư`,
      });

      setRemovingTutor(null);
      setTutorRemovalReason('');
      setSelectedApp(null);
      fetchApplications();
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

  // Permanently delete application and blacklist the email
  const handlePermanentDelete = async () => {
    if (!permanentDeleteApp) return;

    setProcessing(true);
    try {
      // Get user email from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', permanentDeleteApp.user_id)
        .single();

      if (profile?.email) {
        // Add to blacklist
        await supabase
          .from('blacklisted_emails')
          .insert({
            email: profile.email.toLowerCase(),
            reason: 'Xóa vĩnh viễn bởi admin',
          });
      }

      // Delete the tutor application
      const { error: deleteAppError } = await supabase
        .from('tutor_applications')
        .delete()
        .eq('id', permanentDeleteApp.id);

      if (deleteAppError) throw deleteAppError;

      // Change role back to student
      await supabase
        .from('user_roles')
        .update({ role: 'student' })
        .eq('user_id', permanentDeleteApp.user_id);

      toast({
        title: 'Đã xóa vĩnh viễn',
        description: `Hồ sơ của ${permanentDeleteApp.full_name} đã bị xóa và email đã bị cấm đăng ký lại`,
      });

      setPermanentDeleteApp(null);
      fetchApplications();
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

  const handleApproveEnrollment = async (enrollment: Enrollment) => {
    try {
      const { error } = await supabase
        .from('enrollments')
        .update({ status: 'approved' })
        .eq('id', enrollment.id);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: enrollment.student_id,
        type: 'enrollment_approved',
        title: 'Đăng ký lớp được duyệt',
        message: `Bạn đã được duyệt vào lớp ${enrollment.class_name}. Chúc bạn học tốt!`,
        related_id: enrollment.class_id,
      });

      toast({
        title: 'Đã duyệt',
        description: `${enrollment.student_name} đã được duyệt vào lớp`,
      });

      fetchEnrollments();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message,
      });
    }
  };

  const handleRejectEnrollment = async (enrollment: Enrollment) => {
    try {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('id', enrollment.id);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: enrollment.student_id,
        type: 'enrollment_rejected',
        title: 'Đăng ký lớp bị từ chối',
        message: `Yêu cầu đăng ký lớp ${enrollment.class_name} của bạn không được chấp nhận.`,
      });

      toast({
        title: 'Đã từ chối',
        description: 'Đã từ chối yêu cầu đăng ký lớp',
      });

      fetchEnrollments();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message,
      });
    }
  };

  const handleDeleteClass = async (classId: string) => {
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

      if (error) throw error;

      toast({
        title: 'Đã xóa lớp',
        description: 'Lớp học đã được xóa thành công',
      });

      fetchClasses();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message,
      });
    }
  };

  const handleShareClass = async (classId: string, classItem: ClassItem) => {
    try {
      // Toggle share status
      const currentClass = classes.find(c => c.id === classId);
      const newShareStatus = !(currentClass as any)?.is_shared;

      const { error } = await supabase
        .from('classes')
        .update({ is_shared: newShareStatus })
        .eq('id', classId);

      if (error) throw error;

      if (newShareStatus) {
        // Notify all tutors
        const { data: tutors } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'tutor');

        if (tutors) {
          for (const tutor of tutors) {
            await supabase.from('notifications').insert({
              user_id: tutor.user_id,
              type: 'class_shared',
              title: 'Lớp mới cần gia sư',
              message: `Lớp "${classItem.name}" đang cần gia sư. Bấm để xem chi tiết.`,
              related_id: classId,
            });
          }
        }

        toast({
          title: 'Đã chia sẻ',
          description: 'Lớp đã được chia sẻ cho tất cả gia sư',
        });
      } else {
        toast({
          title: 'Đã hủy chia sẻ',
          description: 'Lớp đã được gỡ khỏi danh sách chia sẻ',
        });
      }

      fetchClasses();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message,
      });
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const copyUserId = () => {
    navigator.clipboard.writeText(userShortId);
    toast({ title: 'Đã sao chép', description: 'ID của bạn đã được sao chép' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-warning border-warning"><Clock className="w-3 h-3 mr-1" />Chờ duyệt</Badge>;
      case 'approved':
        return <Badge className="bg-success"><CheckCircle2 className="w-3 h-3 mr-1" />Đã duyệt</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Từ chối</Badge>;
      default:
        return null;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingApps = applications.filter(a => a.status === 'pending').length;
  const approvedApps = applications.filter(a => a.status === 'approved').length;
  const pendingEnrollments = enrollments.filter(e => e.status === 'pending');

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold truncate">{fullName || 'Admin Dashboard'}</h1>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>ID: {userShortId}</span>
                <Button variant="ghost" size="icon" className="h-4 w-4 p-0" onClick={copyUserId}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Desktop buttons */}
          <div className="hidden md:flex items-center gap-2">
            <NotificationBell />
            <Button variant="ghost" size="icon" onClick={() => setClassRequestsOpen(true)} title="Yêu cầu nhận lớp">
              <Briefcase className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setAttendanceStatsOpen(true)} title="Thống kê điểm danh">
              <CalendarCheck className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setPasswordResetOpen(true)} title="Yêu cầu đặt lại mật khẩu">
              <RefreshCw className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setMessagingOpen(true)}>
              <MessageCircle className="w-5 h-5" />
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
          
          {/* Mobile menu */}
          <div className="flex md:hidden items-center gap-1">
            <NotificationBell />
            <MobileMenu title="Menu Admin">
              <Button variant="ghost" className="w-full justify-start" onClick={() => setClassRequestsOpen(true)}>
                <Briefcase className="w-5 h-5 mr-2" />
                Yêu cầu nhận lớp
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => setAttendanceStatsOpen(true)}>
                <CalendarCheck className="w-5 h-5 mr-2" />
                Thống kê điểm danh
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => setPasswordResetOpen(true)}>
                <RefreshCw className="w-5 h-5 mr-2" />
                Yêu cầu đặt lại mật khẩu
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => setMessagingOpen(true)}>
                <MessageCircle className="w-5 h-5 mr-2" />
                Tin nhắn
              </Button>
              <Button variant="ghost" className="w-full justify-start text-destructive" onClick={handleLogout}>
                <LogOut className="w-5 h-5 mr-2" />
                Đăng xuất
              </Button>
            </MobileMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="border-l-4 border-l-warning">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Hồ sơ chờ duyệt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingApps}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-success">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Gia sư đã duyệt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{approvedApps}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tổng hồ sơ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{applications.length}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-secondary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tổng lớp học</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{classes.length}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Đăng ký lớp chờ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingEnrollments.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="applications" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Hồ sơ gia sư
              {pendingApps > 0 && <Badge variant="secondary">{pendingApps}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="enrollments" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Duyệt học viên
              {pendingEnrollments.length > 0 && <Badge variant="secondary">{pendingEnrollments.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="classes" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Lớp học
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applications">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Danh sách hồ sơ gia sư</CardTitle>
                  <CardDescription>Xem và duyệt hồ sơ đăng ký gia sư</CardDescription>
                </div>
                <Button onClick={() => navigate('/admin/tutors')} variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Quản lý chi tiết
                </Button>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Chưa có hồ sơ đăng ký nào
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications.map((app) => (
                      <div
                        key={app.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors gap-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <h3 className="font-semibold">{app.full_name}</h3>
                            {getStatusBadge(app.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {app.school_name} • {app.faculty}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Môn dạy: {app.teachable_subjects.join(', ')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            ID: {app.user_id.slice(0, 8).toUpperCase()}
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedApp(app)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Xem chi tiết
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => setPermanentDeleteApp(app)}
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

          <TabsContent value="enrollments">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Duyệt học viên vào lớp</CardTitle>
                  <CardDescription>Xem và duyệt yêu cầu đăng ký lớp của học viên</CardDescription>
                </div>
                <Button onClick={() => setEnrollmentApprovalOpen(true)} variant="outline">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Duyệt yêu cầu học thử/thật
                </Button>
              </CardHeader>
              <CardContent>
                {pendingEnrollments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Không có yêu cầu đăng ký lớp nào đang chờ
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingEnrollments.map((enrollment) => (
                      <div
                        key={enrollment.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg gap-4"
                      >
                        <div>
                          <h3 className="font-semibold">{enrollment.student_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Đăng ký: <span className="font-medium text-foreground">{enrollment.class_name}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ID học viên: {enrollment.student_id.slice(0, 8).toUpperCase()}
                          </p>
                        </div>
                        
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedStudentForRequest({
                                id: enrollment.student_id,
                                name: enrollment.student_name || 'Học viên'
                              });
                              setEnrollmentRequestOpen(true);
                            }}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Gửi yêu cầu
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-success border-success hover:bg-success hover:text-success-foreground"
                            onClick={() => handleApproveEnrollment(enrollment)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Duyệt
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleRejectEnrollment(enrollment)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Từ chối
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Quản lý lớp học</CardTitle>
                  <CardDescription>Tạo và quản lý các lớp học</CardDescription>
                </div>
                <Button onClick={() => setCreateClassOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tạo lớp mới
                </Button>
              </CardHeader>
              <CardContent>
                {classes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Chưa có lớp học nào. Nhấn "Tạo lớp mới" để bắt đầu.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mã lớp</TableHead>
                          <TableHead>Tên lớp</TableHead>
                          <TableHead>Môn</TableHead>
                          <TableHead>Lớp</TableHead>
                          <TableHead>Học phí</TableHead>
                          <TableHead>Loại</TableHead>
                          <TableHead className="text-right">Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classes.map((classItem) => (
                          <TableRow key={classItem.id}>
                            <TableCell className="font-mono text-primary">
                              {classItem.display_id || classItem.id.slice(0, 8)}
                            </TableCell>
                            <TableCell className="font-medium">{classItem.name}</TableCell>
                            <TableCell>{classItem.subject}</TableCell>
                            <TableCell>{classItem.grade}</TableCell>
                            <TableCell>{formatPrice(classItem.price_per_session)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {classItem.class_type === 'one_on_one' ? '1 kèm 1' : 'Nhóm'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingClass(classItem)}
                                title="Chỉnh sửa lớp"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedClassForStudents(classItem)}
                                title="Xem học viên"
                              >
                                <Users className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClass(classItem.id)}
                                title="Xóa lớp"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
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
        </Tabs>
      </main>

      {/* Application Detail Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết hồ sơ gia sư</DialogTitle>
            <DialogDescription>
              Xem thông tin và quyết định duyệt hồ sơ
            </DialogDescription>
          </DialogHeader>
          
          {selectedApp && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-xl font-bold">{selectedApp.full_name}</h3>
                {getStatusBadge(selectedApp.status)}
              </div>

              <p className="text-sm text-muted-foreground">
                ID: {selectedApp.user_id.slice(0, 8).toUpperCase()}
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Địa chỉ</p>
                  <p className="font-medium">{selectedApp.current_address}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Khu vực dạy</p>
                  <p className="font-medium">{selectedApp.teaching_areas.join(', ')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Trường</p>
                  <p className="font-medium">{selectedApp.school_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Khoa</p>
                  <p className="font-medium">{selectedApp.faculty}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Môn giỏi nhất</p>
                  <p className="font-medium">{selectedApp.best_subject}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Hình thức dạy</p>
                  <p className="font-medium capitalize">{selectedApp.teaching_format}</p>
                </div>
              </div>
              
              <div>
                <p className="text-muted-foreground mb-2">Các môn có thể dạy</p>
                <div className="flex flex-wrap gap-2">
                  {selectedApp.teachable_subjects.map((subject) => (
                    <Badge key={subject} variant="secondary">{subject}</Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <p className="text-muted-foreground mb-2">Thẻ sinh viên (nhấn để xem)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Mặt trước</p>
                    <SafeImage
                      src={selectedApp.student_id_front}
                      alt="Student ID Front"
                      className="rounded-lg border border-border w-full h-40 object-cover"
                      onImageClick={setViewingImage}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Mặt sau</p>
                    <SafeImage
                      src={selectedApp.student_id_back}
                      alt="Student ID Back"
                      className="rounded-lg border border-border w-full h-40 object-cover"
                      onImageClick={setViewingImage}
                    />
                  </div>
                </div>
              </div>

              {/* Achievement files section */}
              {selectedApp.achievement_files && selectedApp.achievement_files.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Minh chứng / Thành tích ({selectedApp.achievement_files.length} tệp)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedApp.achievement_files.map((file, index) => (
                      <div
                        key={index}
                        onClick={() => setDownloadFile({ url: file, name: `Tệp ${index + 1}` })}
                        className="flex items-center gap-2 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        {file.toLowerCase().includes('.pdf') ? (
                          <FileText className="w-8 h-8 text-red-500 flex-shrink-0" />
                        ) : (
                          <SafeImage
                            src={file}
                            alt={`Achievement ${index + 1}`}
                            className="w-16 h-16 object-cover rounded flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">Tệp {index + 1}</p>
                          <p className="text-xs text-muted-foreground">Nhấn để tải</p>
                        </div>
                        <Download className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedApp.status === 'pending' && (
                <div className="flex gap-3 pt-4">
                  <Button
                    className="flex-1 bg-success hover:bg-success/90"
                    onClick={() => handleApprove(selectedApp)}
                    disabled={processing}
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Duyệt hồ sơ
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleReject(selectedApp)}
                    disabled={processing}
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                    Từ chối
                  </Button>
                </div>
              )}
              
              {selectedApp.status === 'approved' && (
                <div className="pt-4">
                  <Button
                    variant="destructive"
                    onClick={() => setRemovingTutor(selectedApp)}
                    disabled={processing}
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Xóa gia sư
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MessagingSystem open={messagingOpen} onOpenChange={setMessagingOpen} />
      <CreateClassDialog
        open={createClassOpen}
        onOpenChange={setCreateClassOpen}
        onCreated={fetchClasses}
      />
      <ImageViewer 
        src={viewingImage || ''} 
        alt="Ảnh hồ sơ" 
        open={!!viewingImage} 
        onOpenChange={(open) => !open && setViewingImage(null)} 
      />
      
      {/* Class Students Dialog */}
      <ClassStudentsDialog
        open={!!selectedClassForStudents}
        onOpenChange={(open) => !open && setSelectedClassForStudents(null)}
        classId={selectedClassForStudents?.id || ''}
        className={selectedClassForStudents?.name || ''}
      />
      
      {/* Edit Class Dialog */}
      <EditClassDialog
        open={!!editingClass}
        onOpenChange={(open) => !open && setEditingClass(null)}
        classItem={editingClass}
        onUpdated={fetchClasses}
      />
      
      {/* Download Confirm Dialog */}
      <DownloadConfirmDialog
        open={!!downloadFile}
        onOpenChange={(open) => !open && setDownloadFile(null)}
        fileUrl={downloadFile?.url || ''}
        fileName={downloadFile?.name}
      />
      
      {/* Tutor Removal Dialog */}
      <AlertDialog open={!!removingTutor} onOpenChange={() => setRemovingTutor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa gia sư</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa tư cách gia sư của <strong>{removingTutor?.full_name}</strong>?
              Hành động này sẽ chuyển họ về vai trò học viên.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="tutor-removal-reason">Lý do xóa (bắt buộc)</Label>
            <Textarea
              id="tutor-removal-reason"
              placeholder="Nhập lý do xóa gia sư..."
              value={tutorRemovalReason}
              onChange={(e) => setTutorRemovalReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setRemovingTutor(null); setTutorRemovalReason(''); }}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveTutor}
              disabled={!tutorRemovalReason.trim() || processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Xóa gia sư
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Permanent Delete Application Dialog */}
      <AlertDialog open={!!permanentDeleteApp} onOpenChange={() => setPermanentDeleteApp(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Xóa vĩnh viễn hồ sơ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa vĩnh viễn hồ sơ của <strong>{permanentDeleteApp?.full_name}</strong>?
              <br /><br />
              <span className="text-destructive font-medium">
                Hành động này không thể hoàn tác. Email của người này sẽ bị cấm đăng ký lại gia sư.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              disabled={processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Xóa vĩnh viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Enrollment Request Dialog */}
      {selectedStudentForRequest && (
        <AdminEnrollmentRequestDialog
          open={enrollmentRequestOpen}
          onOpenChange={setEnrollmentRequestOpen}
          studentId={selectedStudentForRequest.id}
          studentName={selectedStudentForRequest.name}
        />
      )}

      {/* Enrollment Approval Dialog */}
      <AdminEnrollmentApprovalDialog
        open={enrollmentApprovalOpen}
        onOpenChange={setEnrollmentApprovalOpen}
      />

      {/* Attendance Stats Dialog */}
      <AdminAttendanceStats
        open={attendanceStatsOpen}
        onOpenChange={setAttendanceStatsOpen}
      />

      {/* Password Reset Requests Dialog */}
      <AdminPasswordResetRequests
        open={passwordResetOpen}
        onOpenChange={setPasswordResetOpen}
      />

      {/* Class Requests Dialog */}
      <AdminClassRequestsDialog
        open={classRequestsOpen}
        onOpenChange={setClassRequestsOpen}
        onApproved={fetchClasses}
      />
    </div>
  );
};

export default AdminDashboard;
