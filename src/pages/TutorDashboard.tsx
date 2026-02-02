import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NotificationBell from '@/components/NotificationBell';
import MessagingSystem from '@/components/MessagingSystem';
import TutorPaymentRequestDialog from '@/components/TutorPaymentRequestDialog';
import TutorRevenueDialog from '@/components/TutorRevenueDialog';
import { useBackButtonBlock } from '@/hooks/useBackButtonBlock';
import MobileMenu from '@/components/MobileMenu';
import {
  GraduationCap,
  LogOut,
  Clock,
  CheckCircle2,
  XCircle,
  BookOpen,
  Users,
  Loader2,
  MessageCircle,
  Copy,
  User,
  Monitor,
  MapPin,
  Send,
  DollarSign,
  Menu,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  tutor_percentage: number | null;
  schedule_days: string | null;
  schedule_start_time: string | null;
  schedule_end_time: string | null;
}

interface Enrollment {
  id: string;
  student_id: string;
  status: string;
  student_name?: string;
}

const TutorDashboard = () => {
  const navigate = useNavigate();
  const { user, role, fullName, loading, signOut } = useAuth();
  const { toast } = useToast();
  
  // Block back button on mobile
  useBackButtonBlock();
  
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classEnrollments, setClassEnrollments] = useState<{ [classId: string]: Enrollment[] }>({});
  const [messagingOpen, setMessagingOpen] = useState(false);
  const [paymentRequestOpen, setPaymentRequestOpen] = useState(false);
  const [revenueOpen, setRevenueOpen] = useState(false);

  const userShortId = user?.id?.slice(0, 8).toUpperCase() || '';

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      checkApplicationStatus();
      fetchMyClasses();
    }
  }, [user]);

  // Realtime subscription for classes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('tutor-classes-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'classes',
          filter: `tutor_id=eq.${user.id}`,
        },
        () => {
          fetchMyClasses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const checkApplicationStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('tutor_applications')
        .select('status')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setApplicationStatus(data?.status || null);
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchMyClasses = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('tutor_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClasses(data || []);

      // Fetch enrollments for each class
      if (data && data.length > 0) {
        const classIds = data.map(c => c.id);
        const { data: enrollmentsData } = await supabase
          .from('enrollments')
          .select('*')
          .in('class_id', classIds)
          .eq('status', 'approved');

        if (enrollmentsData) {
          // Get student names
          const studentIds = [...new Set(enrollmentsData.map(e => e.student_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', studentIds);

          const groupedEnrollments: { [classId: string]: Enrollment[] } = {};
          enrollmentsData.forEach(e => {
            if (!groupedEnrollments[e.class_id]) groupedEnrollments[e.class_id] = [];
            groupedEnrollments[e.class_id].push({
              ...e,
              student_name: profiles?.find(p => p.user_id === e.student_id)?.full_name || 'Học viên',
            });
          });
          setClassEnrollments(groupedEnrollments);
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
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

  // If no application submitted yet
  if (!applicationStatus) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-accent mx-auto mb-4 flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Hoàn thành hồ sơ gia sư</CardTitle>
            <CardDescription>
              Bạn cần hoàn thành hồ sơ đăng ký gia sư trước khi có thể nhận lớp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full" size="lg">
              <Link to="/tutor/register">Đăng ký ngay</Link>
            </Button>
            <Button variant="ghost" className="w-full" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Đăng xuất
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If application is pending
  if (applicationStatus === 'pending') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-warning/20 mx-auto mb-4 flex items-center justify-center">
              <Clock className="w-8 h-8 text-warning" />
            </div>
            <CardTitle>Hồ sơ đang chờ duyệt</CardTitle>
            <CardDescription>
              Hồ sơ của bạn đã được gửi thành công và đang chờ Admin xét duyệt. 
              Chúng tôi sẽ thông báo khi có kết quả.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="w-full" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Đăng xuất
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If application is rejected
  if (applicationStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/20 mx-auto mb-4 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle>Hồ sơ không được duyệt</CardTitle>
            <CardDescription>
              Rất tiếc, hồ sơ của bạn không đáp ứng yêu cầu. 
              Vui lòng liên hệ với chúng tôi để biết thêm chi tiết.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="w-full" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Đăng xuất
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalStudents = Object.values(classEnrollments).reduce((sum, arr) => sum + arr.length, 0);

  // Approved - Full dashboard
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary to-blue-600 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold truncate">{fullName || 'Gia sư Dashboard'}</h1>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>ID: {userShortId}</span>
                <Button variant="ghost" size="icon" className="h-4 w-4 p-0" onClick={copyUserId}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Desktop buttons */}
          <div className="hidden md:flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setPaymentRequestOpen(true)} className="gap-1">
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Gửi nhiệm vụ</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRevenueOpen(true)} className="gap-1">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Doanh thu</span>
            </Button>
            <Badge className="bg-success hidden sm:flex">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Đã xác minh
            </Badge>
            <NotificationBell />
            <Button variant="ghost" size="icon" onClick={() => setMessagingOpen(true)}>
              <MessageCircle className="w-5 h-5" />
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </Button>
          </div>
          
          {/* Mobile menu */}
          <div className="flex md:hidden items-center gap-1">
            <NotificationBell />
            <MobileMenu title="Menu gia sư">
              <Button variant="ghost" className="w-full justify-start" onClick={() => setPaymentRequestOpen(true)}>
                <Send className="w-5 h-5 mr-2" />
                Gửi nhiệm vụ
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => setRevenueOpen(true)}>
                <DollarSign className="w-5 h-5 mr-2" />
                Doanh thu
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
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Xin chào{fullName ? `, ${fullName}` : ''}!</h2>
          <p className="text-muted-foreground">Chào mừng bạn đến với trang quản lý gia sư</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Lớp đang dạy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{classes.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Tổng học viên
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalStudents}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Bài tập chờ chấm
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">0</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="classes" className="space-y-6">
          <TabsList>
            <TabsTrigger value="classes" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Lớp của tôi
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Học viên
            </TabsTrigger>
          </TabsList>

          <TabsContent value="classes">
            <Card>
              <CardHeader>
                <CardTitle>Lớp học của tôi</CardTitle>
                <CardDescription>Danh sách các lớp bạn đang phụ trách</CardDescription>
              </CardHeader>
              <CardContent>
                {classes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Bạn chưa được phân công lớp nào</p>
                    <p className="text-sm">Admin sẽ gán lớp cho bạn khi có lớp phù hợp</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classes.map((classItem) => (
                      <Card 
                        key={classItem.id} 
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(`/class/${classItem.id}`)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-mono text-primary">{classItem.display_id}</p>
                              <CardTitle className="text-base">{classItem.name}</CardTitle>
                            </div>
                            <Badge variant={classItem.class_type === 'one_on_one' ? 'default' : 'secondary'}>
                              {classItem.class_type === 'one_on_one' ? '1 kèm 1' : 'Nhóm'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-2">
                            {classItem.subject} • {classItem.grade}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            {classItem.teaching_format === 'online' ? (
                              <><Monitor className="w-4 h-4" />Online</>
                            ) : classItem.teaching_format === 'offline' ? (
                              <><MapPin className="w-4 h-4" />Offline</>
                            ) : (
                              <><Monitor className="w-4 h-4" />Online/Offline</>
                            )}
                          </div>
                          {classItem.schedule_days && classItem.schedule_start_time && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                              <Clock className="w-3 h-3" />
                              {classItem.schedule_days} | {classItem.schedule_start_time?.slice(0, 5)} - {classItem.schedule_end_time?.slice(0, 5)}
                            </div>
                          )}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-primary">
                              {formatPrice(classItem.price_per_session)}/buổi
                            </span>
                            <Badge variant="outline">
                              <Users className="w-3 h-3 mr-1" />
                              {classEnrollments[classItem.id]?.length || 0} học viên
                            </Badge>
                          </div>
                          <div className="p-2 bg-muted/50 rounded text-xs">
                            <span className="text-muted-foreground">💰 Thu nhập mỗi buổi: </span>
                            <span className="font-medium text-primary">
                              {formatPrice(classItem.price_per_session * ((classItem.tutor_percentage || 70) / 100))}
                            </span>
                            <span className="text-muted-foreground ml-1">({classItem.tutor_percentage || 70}%)</span>
                          </div>
                          <Button className="w-full mt-3" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/class/${classItem.id}`); }}>
                            Vào lớp học
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle>Học viên của tôi</CardTitle>
                <CardDescription>Danh sách học viên trong các lớp bạn dạy</CardDescription>
              </CardHeader>
              <CardContent>
                {totalStudents === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có học viên nào</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {classes.map((classItem) => {
                      const students = classEnrollments[classItem.id] || [];
                      if (students.length === 0) return null;
                      
                      return (
                        <div key={classItem.id}>
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-primary" />
                            {classItem.name}
                            <Badge variant="outline">{students.length} học viên</Badge>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {students.map((student) => (
                              <div key={student.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{student.student_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    ID: {student.student_id.slice(0, 8).toUpperCase()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <MessagingSystem open={messagingOpen} onOpenChange={setMessagingOpen} />
      <TutorPaymentRequestDialog open={paymentRequestOpen} onOpenChange={setPaymentRequestOpen} />
      <TutorRevenueDialog open={revenueOpen} onOpenChange={setRevenueOpen} />
    </div>
  );
};

export default TutorDashboard;
