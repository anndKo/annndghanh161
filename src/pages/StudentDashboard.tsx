import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import NotificationBell from '@/components/NotificationBell';
import MessagingSystem from '@/components/MessagingSystem';
import TutorRating, { TutorStars } from '@/components/TutorRating';
import { useBackButtonBlock } from '@/hooks/useBackButtonBlock';
import StudentEnrollmentRequestDialog from '@/components/StudentEnrollmentRequestDialog';
import TrialEnrollmentBadge from '@/components/TrialEnrollmentBadge';
import RealEnrollmentBadge from '@/components/RealEnrollmentBadge';
import useEnrollmentExpiration from '@/hooks/useEnrollmentExpiration';
import MobileMenu from '@/components/MobileMenu';
import AttendanceCheckIn from '@/components/AttendanceCheckIn';
import ClassFilterPanel, { FilterState } from '@/components/ClassFilterPanel';
import StudentScheduleDialog from '@/components/StudentScheduleDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  GraduationCap, LogOut, BookOpen, Search, Filter, MapPin, Monitor, Users, User, Loader2, MessageCircle, Star, UserPlus, Copy, Clock, CheckCircle2, CreditCard, ClipboardList, Menu, Tag, Calendar, CalendarCheck, RefreshCw, CalendarDays
} from 'lucide-react';
import TutorInfoDialog from '@/components/TutorInfoDialog';
import ReEnrollButton from '@/components/ReEnrollButton';

const SUBJECTS = ['Toán', 'Vật Lý', 'Hóa Học', 'Sinh Học', 'Ngữ Văn', 'Tiếng Anh', 'Lịch Sử', 'Địa Lý', 'GDCD', 'Tin Học'];
const GRADES = ['Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5', 'Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9', 'Lớp 10', 'Lớp 11', 'Lớp 12'];

// Admin ID for messaging
const ADMIN_ID = 'd8485baa-9af4-44e4-bf84-850fad8e7034';

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
  tutor_id: string | null;
  address?: string | null;
  discount_percent?: number | null;
  schedule_days?: string | null;
  schedule_start_time?: string | null;
  schedule_end_time?: string | null;
}

interface Enrollment {
  id: string;
  class_id: string;
  status: string;
  classes: ClassItem;
  enrollment_type?: string | null;
  trial_expires_at?: string | null;
  enrollment_expires_at?: string | null;
}

interface TopTutor {
  tutor_id: string;
  full_name: string;
  avg_rating: number;
  rating_count: number;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, fullName, loading, signOut } = useAuth();
  const { toast } = useToast();
  
  // Block back button on mobile
  useBackButtonBlock();
  
  // Check enrollment expiration (both trial and real)
  useEnrollmentExpiration(user?.id);
  
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [topTutors, setTopTutors] = useState<TopTutor[]>([]);
  const [tutorClasses, setTutorClasses] = useState<ClassItem[]>([]);
  const [selectedTutor, setSelectedTutor] = useState<TopTutor | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [messagingOpen, setMessagingOpen] = useState(false);
  const [messagingReceiver, setMessagingReceiver] = useState<{ id: string; name: string } | null>(null);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [selectedClassForRating, setSelectedClassForRating] = useState<ClassItem | null>(null);
  const [enrollingClassId, setEnrollingClassId] = useState<string | null>(null);
  
  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedClassForPayment, setSelectedClassForPayment] = useState<ClassItem | null>(null);
  const [messageAdminOpen, setMessageAdminOpen] = useState(false);
  const [autoMessage, setAutoMessage] = useState('');
  const [enrollmentRequestsOpen, setEnrollmentRequestsOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [tutorInfoOpen, setTutorInfoOpen] = useState(false);
  const [selectedTutorForInfo, setSelectedTutorForInfo] = useState<TopTutor | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [addressFilter, setAddressFilter] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({
    area: '',
    startTime: '',
    endTime: '',
    days: [],
    subjects: [],
  });
  // Listen for openMessaging event
  useEffect(() => {
    const handleOpenMessaging = (event: CustomEvent<{ partnerId: string; partnerName: string }>) => {
      setMessagingReceiver({ id: event.detail.partnerId, name: event.detail.partnerName });
      setMessagingOpen(true);
    };

    window.addEventListener('openMessaging', handleOpenMessaging as EventListener);
    return () => {
      window.removeEventListener('openMessaging', handleOpenMessaging as EventListener);
    };
  }, []);

  const userShortId = user?.id?.slice(0, 8).toUpperCase() || '';

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) { 
      fetchClasses(); 
      fetchEnrollments(); 
      fetchTopTutors();
    }
  }, [user]);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase.from('classes').select('*').eq('is_active', true).order('created_at', { ascending: false });
      if (error) throw error;
      setClasses(data || []);
    } catch (error) { console.error('Error fetching classes:', error); }
    finally { setLoadingData(false); }
  };

  const fetchEnrollments = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('id, class_id, status, enrollment_type, trial_expires_at, enrollment_expires_at, classes(*)')
        .eq('student_id', user.id)
        .neq('status', 'removed');
      if (error) throw error;
      setEnrollments((data || []).filter(e => e.classes) as Enrollment[]);
    } catch (error) { console.error('Error fetching enrollments:', error); }
  };

  const fetchTopTutors = async () => {
    try {
      const { data, error } = await supabase
        .from('tutor_ratings')
        .select('tutor_id, rating');
      
      if (error) throw error;
      
      // Calculate average ratings per tutor
      const tutorRatings: { [key: string]: { total: number; count: number } } = {};
      data?.forEach(r => {
        if (!tutorRatings[r.tutor_id]) tutorRatings[r.tutor_id] = { total: 0, count: 0 };
        tutorRatings[r.tutor_id].total += r.rating;
        tutorRatings[r.tutor_id].count += 1;
      });

      // Get tutor names from profiles
      const tutorIds = Object.keys(tutorRatings);
      if (tutorIds.length === 0) return;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', tutorIds);

      const topTutorsList: TopTutor[] = tutorIds.map(id => ({
        tutor_id: id,
        full_name: profiles?.find(p => p.user_id === id)?.full_name || 'Gia sư',
        avg_rating: tutorRatings[id].total / tutorRatings[id].count,
        rating_count: tutorRatings[id].count,
      })).sort((a, b) => b.avg_rating - a.avg_rating);

      setTopTutors(topTutorsList.slice(0, 10));
    } catch (error) { console.error('Error fetching top tutors:', error); }
  };

  const fetchTutorClasses = async (tutorId: string) => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('tutor_id', tutorId)
        .eq('is_active', true);
      if (error) throw error;
      setTutorClasses(data || []);
    } catch (error) { console.error('Error fetching tutor classes:', error); }
  };

  const handleEnrollClass = async (classItem: ClassItem) => {
    if (!user) return;
    setEnrollingClassId(classItem.id);
    try {
      // Check if already enrolled
      const existingEnrollment = enrollments.find(e => e.class_id === classItem.id);
      if (existingEnrollment) {
        toast({
          variant: 'destructive',
          title: 'Đã đăng ký',
          description: existingEnrollment.status === 'pending' ? 'Bạn đã đăng ký lớp này, đang chờ duyệt' : 'Bạn đã tham gia lớp này',
        });
        return;
      }

      const { error } = await supabase.from('enrollments').insert({
        class_id: classItem.id,
        student_id: user.id,
        status: 'pending',
      });

      if (error) throw error;

      // Show payment dialog
      setSelectedClassForPayment(classItem);
      setPaymentDialogOpen(true);

      fetchEnrollments();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message,
      });
    } finally {
      setEnrollingClassId(null);
    }
  };

  const handleMessageAdmin = () => {
    if (!selectedClassForPayment) return;
    const message = `Xin chào Admin, tôi vừa đăng ký lớp ${selectedClassForPayment.display_id || selectedClassForPayment.id.slice(0, 8)} - ${selectedClassForPayment.name} với học phí ${formatPrice(selectedClassForPayment.price_per_session)}/buổi. Xin hướng dẫn thanh toán.`;
    setAutoMessage(message);
    setPaymentDialogOpen(false);
    setMessageAdminOpen(true);
  };

  const handleLogout = async () => { await signOut(); navigate('/'); };

  const copyUserId = () => {
    navigator.clipboard.writeText(userShortId);
    toast({ title: 'Đã sao chép', description: 'ID của bạn đã được sao chép' });
  };

  const filteredClasses = classes.filter(c => {
    if (subjectFilter !== 'all' && c.subject !== subjectFilter) return false;
    if (gradeFilter !== 'all' && c.grade !== gradeFilter) return false;
    if (formatFilter !== 'all' && c.teaching_format !== formatFilter) return false;
    if (searchQuery && !c.display_id?.toLowerCase().includes(searchQuery.toLowerCase()) && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (addressFilter && c.address && !c.address.toLowerCase().includes(addressFilter.toLowerCase())) return false;
    
    // Advanced filters
    if (advancedFilters.area && c.address && !c.address.toLowerCase().includes(advancedFilters.area.toLowerCase())) return false;
    if (advancedFilters.subjects.length > 0 && !advancedFilters.subjects.includes(c.subject)) return false;
    
    // Filter by days
    if (advancedFilters.days.length > 0 && c.schedule_days) {
      try {
        const scheduleDays = JSON.parse(c.schedule_days);
        const hasMatchingDay = advancedFilters.days.some(day => scheduleDays[day]);
        if (!hasMatchingDay) return false;
      } catch (e) {
        return false;
      }
    }
    
    // Filter by time
    if ((advancedFilters.startTime || advancedFilters.endTime) && c.schedule_start_time && c.schedule_end_time) {
      if (advancedFilters.startTime && c.schedule_start_time < advancedFilters.startTime) return false;
      if (advancedFilters.endTime && c.schedule_end_time > advancedFilters.endTime) return false;
    }
    
    return true;
  });

  const getEnrollmentStatus = (classId: string) => {
    const enrollment = enrollments.find(e => e.class_id === classId);
    return enrollment?.status || null;
  };

  // Get removed enrollments (expired classes)
  const getRemovedEnrollments = async () => {
    if (!user) return [];
    const { data } = await supabase
      .from('enrollments')
      .select('id, class_id, status, removal_reason, classes(*)')
      .eq('student_id', user.id)
      .eq('status', 'removed');
    return (data || []).filter(e => e.classes) as any[];
  };

  const [expiredEnrollments, setExpiredEnrollments] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      getRemovedEnrollments().then(data => setExpiredEnrollments(data));
    }
  }, [user, enrollments]);

  const approvedEnrollments = enrollments.filter(e => e.status === 'approved');
  const pendingEnrollments = enrollments.filter(e => e.status === 'pending');

  const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  if (loading || loadingData) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary to-blue-600 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold truncate">{fullName || 'Học viên'}</h1>
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
            <Button variant="ghost" size="icon" onClick={() => setScheduleOpen(true)} title="Lịch học">
              <CalendarDays className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setAttendanceOpen(true)} title="Điểm danh">
              <CalendarCheck className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setEnrollmentRequestsOpen(true)} title="Yêu cầu đăng ký">
              <ClipboardList className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setMessagingOpen(true)}><MessageCircle className="w-5 h-5" /></Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/tutor/register"><UserPlus className="w-4 h-4 mr-2" />Đăng ký gia sư</Link>
            </Button>
            <Button variant="ghost" onClick={handleLogout}><LogOut className="w-4 h-4 mr-2" />Đăng xuất</Button>
          </div>
          
          {/* Mobile menu */}
          <div className="flex md:hidden items-center gap-1">
            <NotificationBell />
            <MobileMenu title="Menu học viên">
              <Button variant="ghost" className="w-full justify-start" onClick={() => setScheduleOpen(true)}>
                <CalendarDays className="w-5 h-5 mr-2" />
                Lịch học
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => setAttendanceOpen(true)}>
                <CalendarCheck className="w-5 h-5 mr-2" />
                Điểm danh
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => setEnrollmentRequestsOpen(true)}>
                <ClipboardList className="w-5 h-5 mr-2" />
                Yêu cầu đăng ký
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => setMessagingOpen(true)}>
                <MessageCircle className="w-5 h-5 mr-2" />
                Tin nhắn
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link to="/tutor/register"><UserPlus className="w-5 h-5 mr-2" />Đăng ký gia sư</Link>
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
        <Tabs defaultValue="browse" className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="browse" className="flex items-center gap-2"><Search className="w-4 h-4" />Tìm lớp</TabsTrigger>
            <TabsTrigger value="enrolled" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />Lớp của tôi
              {approvedEnrollments.length > 0 && <Badge variant="secondary">{approvedEnrollments.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />Chờ duyệt
              {pendingEnrollments.length > 0 && <Badge variant="outline">{pendingEnrollments.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="top-tutors" className="flex items-center gap-2"><Star className="w-4 h-4" />Gia sư nổi bật</TabsTrigger>
          </TabsList>

          <TabsContent value="browse">
            <Card className="mb-6">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Filter className="w-5 h-5" />Bộ lọc & Tìm kiếm</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="space-y-2">
                    <Label>Tìm theo mã lớp</Label>
                    <Input placeholder="Nhập mã lớp (VD: CL12345)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
                  <div className="space-y-2"><Label>Môn học</Label><Select value={subjectFilter} onValueChange={setSubjectFilter}><SelectTrigger><SelectValue placeholder="Tất cả môn" /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả môn</SelectItem>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Lớp</Label><Select value={gradeFilter} onValueChange={setGradeFilter}><SelectTrigger><SelectValue placeholder="Tất cả lớp" /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả lớp</SelectItem>{GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Hình thức</Label><Select value={formatFilter} onValueChange={setFormatFilter}><SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả</SelectItem><SelectItem value="online">Online</SelectItem><SelectItem value="offline">Offline</SelectItem><SelectItem value="both">Cả hai</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2">
                    <Label>Địa chỉ</Label>
                    <Input placeholder="Nhập địa chỉ tìm kiếm..." value={addressFilter} onChange={(e) => setAddressFilter(e.target.value)} />
                  </div>
                  <div className="flex items-end"><Button variant="outline" className="w-full" onClick={() => { setSubjectFilter('all'); setGradeFilter('all'); setFormatFilter('all'); setSearchQuery(''); setAddressFilter(''); setAdvancedFilters({ area: '', startTime: '', endTime: '', days: [], subjects: [] }); }}>Xóa bộ lọc</Button></div>
                </div>
                
                {/* Advanced Filter Panel */}
                <div className="mt-4">
                  <ClassFilterPanel onFilterChange={setAdvancedFilters} />
                </div>
              </CardContent>
            </Card>

            {filteredClasses.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground"><BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>Chưa có lớp học nào</p></CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClasses.map((classItem) => {
                  const enrollStatus = getEnrollmentStatus(classItem.id);
                  return (
                    <Card key={classItem.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-mono text-primary mb-1">{classItem.display_id || classItem.id.slice(0, 8)}</p>
                            <CardTitle className="text-lg">{classItem.name}</CardTitle>
                            <CardDescription>{classItem.subject} • {classItem.grade}</CardDescription>
                          </div>
                          <Badge variant={classItem.class_type === 'one_on_one' ? 'default' : 'secondary'}>{classItem.class_type === 'one_on_one' ? <><User className="w-3 h-3 mr-1" />1 kèm 1</> : <><Users className="w-3 h-3 mr-1" />Nhóm</>}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {classItem.tutor_id && <TutorStars tutorId={classItem.tutor_id} />}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">{classItem.teaching_format === 'online' ? <><Monitor className="w-4 h-4" />Online</> : classItem.teaching_format === 'offline' ? <><MapPin className="w-4 h-4" />Offline</> : <><Monitor className="w-4 h-4" />Online/Offline</>}</span>
                        </div>
                        {/* Schedule display */}
                        {classItem.schedule_days && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>{classItem.schedule_days}</span>
                            {classItem.schedule_start_time && classItem.schedule_end_time && (
                              <span>| {classItem.schedule_start_time} – {classItem.schedule_end_time}</span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          {/* Price with discount display */}
                          {classItem.discount_percent && classItem.discount_percent > 0 ? (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <Tag className="w-4 h-4 text-destructive" />
                                <span className="text-sm line-through text-muted-foreground">{formatPrice(classItem.price_per_session)}</span>
                              </div>
                              <span className="text-lg font-bold text-primary">
                                {formatPrice(classItem.price_per_session - (classItem.price_per_session * classItem.discount_percent / 100))}/buổi
                                <span className="text-sm text-destructive ml-1">(-{classItem.discount_percent}%)</span>
                              </span>
                            </div>
                          ) : (
                            <span className="text-lg font-bold text-primary">{formatPrice(classItem.price_per_session)}/buổi</span>
                          )}
                          {enrollStatus === 'approved' ? (
                            <Badge className="bg-success"><CheckCircle2 className="w-3 h-3 mr-1" />Đã tham gia</Badge>
                          ) : enrollStatus === 'pending' ? (
                            <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Chờ duyệt</Badge>
                          ) : (
                            <Button size="sm" onClick={() => handleEnrollClass(classItem)} disabled={enrollingClassId === classItem.id}>
                              {enrollingClassId === classItem.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Đăng ký'}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="enrolled">
            <Card>
              <CardHeader><CardTitle>Lớp học của tôi</CardTitle><CardDescription>Các lớp bạn đã được duyệt tham gia</CardDescription></CardHeader>
              <CardContent>
                {approvedEnrollments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground"><BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>Bạn chưa được duyệt vào lớp nào</p></div>
                ) : (
                  <div className="space-y-4">
                    {approvedEnrollments.map((enrollment) => (
                      <div 
                        key={enrollment.id} 
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors gap-3"
                        onClick={() => navigate(`/class/${enrollment.class_id}`)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="text-xs font-mono text-primary">{enrollment.classes.display_id}</p>
                            <TrialEnrollmentBadge 
                              trialExpiresAt={enrollment.trial_expires_at || null}
                              enrollmentType={enrollment.enrollment_type || null}
                            />
                            <RealEnrollmentBadge
                              enrollmentExpiresAt={enrollment.enrollment_expires_at || null}
                              enrollmentType={enrollment.enrollment_type || null}
                            />
                          </div>
                          <h3 className="font-semibold truncate">{enrollment.classes.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">{enrollment.classes.subject} • {enrollment.classes.grade}</p>
                          {enrollment.classes.schedule_days && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Calendar className="w-3 h-3 flex-shrink-0" />
                              <span>{enrollment.classes.schedule_days}</span>
                              {enrollment.classes.schedule_start_time && enrollment.classes.schedule_end_time && (
                                <span>| {enrollment.classes.schedule_start_time} – {enrollment.classes.schedule_end_time}</span>
                              )}
                            </p>
                          )}
                          {enrollment.classes.address && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{enrollment.classes.address}</span>
                            </p>
                          )}
                          {enrollment.classes.tutor_id && <TutorStars tutorId={enrollment.classes.tutor_id} />}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/class/${enrollment.class_id}`); }}>Vào lớp</Button>
                          {enrollment.classes.tutor_id && (
                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedClassForRating(enrollment.classes); setRatingOpen(true); }}><Star className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Đánh giá</span></Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Expired Classes Section */}
                {expiredEnrollments.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <h4 className="font-semibold text-muted-foreground flex items-center gap-2 mb-4">
                      <RefreshCw className="w-4 h-4" />
                      Lớp đã hết hạn ({expiredEnrollments.length})
                    </h4>
                    <div className="space-y-4">
                      {expiredEnrollments.map((enrollment: any) => (
                        <div 
                          key={enrollment.id} 
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg bg-muted/30 gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-mono text-muted-foreground">{enrollment.classes.display_id}</p>
                            <h3 className="font-semibold">{enrollment.classes.name}</h3>
                            <p className="text-sm text-muted-foreground">{enrollment.classes.subject} • {enrollment.classes.grade}</p>
                            <p className="text-xs text-destructive mt-1">{enrollment.removal_reason || 'Đã hết hạn'}</p>
                          </div>
                          <ReEnrollButton
                            classId={enrollment.class_id}
                            className={enrollment.classes.name}
                            classDisplayId={enrollment.classes.display_id}
                            onSuccess={() => {
                              fetchEnrollments();
                              getRemovedEnrollments().then(data => setExpiredEnrollments(data));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card>
              <CardHeader><CardTitle>Lớp chờ duyệt</CardTitle><CardDescription>Các lớp bạn đã đăng ký và đang chờ Admin duyệt</CardDescription></CardHeader>
              <CardContent>
                {pendingEnrollments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground"><Clock className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>Không có lớp nào đang chờ duyệt</p></div>
                ) : (
                  <div className="space-y-4">
                    {pendingEnrollments.map((enrollment) => (
                      <div key={enrollment.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div>
                          <p className="text-xs font-mono text-primary">{enrollment.classes.display_id}</p>
                          <h3 className="font-semibold">{enrollment.classes.name}</h3>
                          <p className="text-sm text-muted-foreground">{enrollment.classes.subject} • {enrollment.classes.grade}</p>
                        </div>
                        <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Chờ duyệt</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="top-tutors">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Star className="w-5 h-5 text-yellow-500" />Gia sư được đánh giá cao</CardTitle></CardHeader>
                <CardContent>
                  {topTutors.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground"><Star className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>Chưa có đánh giá nào</p></div>
                  ) : (
                    <div className="space-y-3">
                      {topTutors.map((tutor, index) => (
                        <div
                          key={tutor.tutor_id}
                          className={`flex items-center justify-between p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${selectedTutor?.tutor_id === tutor.tutor_id ? 'ring-2 ring-primary' : ''}`}
                          onClick={() => { 
                            setSelectedTutor(tutor); 
                            fetchTutorClasses(tutor.tutor_id);
                            setSelectedTutorForInfo(tutor);
                            setTutorInfoOpen(true);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{tutor.full_name}</p>
                              <p className="text-xs text-muted-foreground">{tutor.rating_count} đánh giá</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-yellow-500">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="font-bold">{tutor.avg_rating.toFixed(1)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedTutor ? `Lớp của ${selectedTutor.full_name}` : 'Chọn gia sư để xem lớp'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!selectedTutor ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nhấn vào gia sư bên trái để xem danh sách lớp</p>
                    </div>
                  ) : tutorClasses.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Gia sư này chưa có lớp nào</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tutorClasses.map((classItem) => {
                        const enrollStatus = getEnrollmentStatus(classItem.id);
                        return (
                          <div key={classItem.id} className="p-3 border border-border rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="text-xs font-mono text-primary">{classItem.display_id}</p>
                                <p className="font-medium">{classItem.name}</p>
                                <p className="text-sm text-muted-foreground">{classItem.subject} • {classItem.grade}</p>
                              </div>
                              <Badge variant="outline">{formatPrice(classItem.price_per_session)}</Badge>
                            </div>
                            {enrollStatus === 'approved' ? (
                              <Badge className="bg-success w-full justify-center"><CheckCircle2 className="w-3 h-3 mr-1" />Đã tham gia</Badge>
                            ) : enrollStatus === 'pending' ? (
                              <Badge variant="outline" className="w-full justify-center"><Clock className="w-3 h-3 mr-1" />Chờ duyệt</Badge>
                            ) : (
                              <Button size="sm" className="w-full" onClick={() => handleEnrollClass(classItem)} disabled={enrollingClassId === classItem.id}>
                                {enrollingClassId === classItem.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Đăng ký lớp này'}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <MessagingSystem 
        open={messagingOpen} 
        onOpenChange={(open) => {
          setMessagingOpen(open);
          if (!open) setMessagingReceiver(null);
        }}
        defaultReceiverId={messagingReceiver?.id}
        defaultReceiverName={messagingReceiver?.name}
      />
      <MessagingSystem 
        open={messageAdminOpen} 
        onOpenChange={setMessageAdminOpen} 
        defaultReceiverId={ADMIN_ID}
        defaultReceiverName="Admin"
        autoMessage={autoMessage}
      />
      {selectedClassForRating && selectedClassForRating.tutor_id && (
        <TutorRating tutorId={selectedClassForRating.tutor_id} classId={selectedClassForRating.id} open={ratingOpen} onOpenChange={setRatingOpen} />
      )}

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Thông tin thanh toán
            </DialogTitle>
            <DialogDescription>
              Đăng ký lớp thành công! Vui lòng thanh toán để được duyệt vào lớp.
            </DialogDescription>
          </DialogHeader>
          
          {selectedClassForPayment && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mã lớp:</span>
                  <span className="font-mono font-bold text-primary">
                    {selectedClassForPayment.display_id || selectedClassForPayment.id.slice(0, 8)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tên lớp:</span>
                  <span className="font-medium">{selectedClassForPayment.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Môn học:</span>
                  <span>{selectedClassForPayment.subject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lớp:</span>
                  <span>{selectedClassForPayment.grade}</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="text-muted-foreground">Học phí:</span>
                  <span className="text-xl font-bold text-primary">
                    {formatPrice(selectedClassForPayment.price_per_session)}/buổi
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={handleMessageAdmin} className="w-full">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Nhắn tin Admin để thanh toán
                </Button>
                <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                  Đóng
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Sau khi thanh toán, Admin sẽ duyệt và bạn có thể vào lớp học.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enrollment Requests Dialog */}
      <StudentEnrollmentRequestDialog
        open={enrollmentRequestsOpen}
        onOpenChange={setEnrollmentRequestsOpen}
      />

      {/* Attendance Check In Dialog */}
      <AttendanceCheckIn
        open={attendanceOpen}
        onOpenChange={setAttendanceOpen}
      />

      {/* Tutor Info Dialog */}
      {selectedTutorForInfo && (
        <TutorInfoDialog
          open={tutorInfoOpen}
          onOpenChange={setTutorInfoOpen}
          tutorId={selectedTutorForInfo.tutor_id}
          tutorName={selectedTutorForInfo.full_name}
          avgRating={selectedTutorForInfo.avg_rating}
          ratingCount={selectedTutorForInfo.rating_count}
        />
      )}
      
      {/* Student Schedule Dialog */}
      {user && (
        <StudentScheduleDialog
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          userId={user.id}
        />
      )}
    </div>
  );
};

export default StudentDashboard;
