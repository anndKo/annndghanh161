import { useState, useEffect, useMemo } from 'react';
import logoImg from '@/assets/logo.png';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/untypedClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NotificationBell from '@/components/NotificationBell';
import MessagingSystem from '@/components/MessagingSystem';
import TutorPaymentRequestDialog from '@/components/TutorPaymentRequestDialog';
import TutorRevenueDialog from '@/components/TutorRevenueDialog';
import SharedClassesButton from '@/components/SharedClassesButton';
import { useBackButtonBlock } from '@/hooks/useBackButtonBlock';
import MobileMenu from '@/components/MobileMenu';
import UserAvatarMenu from '@/components/UserAvatarMenu';
import {
  GraduationCap,
  LogOut,
  Clock,
  XCircle,
  BookOpen,
  Users,
  Loader2,
  Copy,
  User,
  Monitor,
  MapPin,
  Send,
  DollarSign,
  Search,
  Home,
} from 'lucide-react';
import UnreadMessageBadge from '@/components/UnreadMessageBadge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const DAY_LABELS: { [key: string]: string } = {
  monday: 'Thứ 2', tuesday: 'Thứ 3', wednesday: 'Thứ 4', thursday: 'Thứ 5',
  friday: 'Thứ 6', saturday: 'Thứ 7', sunday: 'CN',
};

const formatScheduleDays = (scheduleDays: string | null | undefined): string => {
  if (!scheduleDays) return '';
  try {
    const days = JSON.parse(scheduleDays);
    if (typeof days === 'object' && days !== null) {
      return Object.keys(days).filter(d => days[d]).map(d => DAY_LABELS[d] || d).join(', ');
    }
    return scheduleDays;
  } catch {
    return scheduleDays;
  }
};

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
  const { user, role, fullName, loading, signOut, isDeleted } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  
  // Block back button on mobile
  useBackButtonBlock();
  
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classEnrollments, setClassEnrollments] = useState<{ [classId: string]: Enrollment[] }>({});
  const [messagingOpen, setMessagingOpen] = useState(false);
  const [messagingReceiver, setMessagingReceiver] = useState<{ id: string; name: string } | null>(null);
  const [paymentRequestOpen, setPaymentRequestOpen] = useState(false);
  const [revenueOpen, setRevenueOpen] = useState(false);
  const [classSearchQuery, setClassSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

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
    if (!loading && user && isDeleted) navigate('/account-deleted');
  }, [user, loading, navigate, isDeleted]);

  useEffect(() => {
    if (user) {
      checkApplicationStatus();
      fetchClasses();
    }
  }, [user]);

  // Realtime subscription for classes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('tutor-classes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, () => {
        fetchClasses();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, () => {
        fetchClasses();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const checkApplicationStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('tutor_applications')
        .select('status')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        setApplicationStatus(null);
      } else {
        setApplicationStatus(data?.status || null);
      }
    } catch (error) {
      console.error('Error checking application:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchClasses = async () => {
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

          const enrollmentsByClass: { [classId: string]: Enrollment[] } = {};
          enrollmentsData.forEach(e => {
            if (!enrollmentsByClass[e.class_id]) enrollmentsByClass[e.class_id] = [];
            const profile = profiles?.find(p => p.user_id === e.student_id);
            enrollmentsByClass[e.class_id].push({
              ...e,
              student_name: profile?.full_name || 'Học viên',
            });
          });
          setClassEnrollments(enrollmentsByClass);
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
    toast({ title: t('common.copied'), description: t('common.id_copied') });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const totalStudents = Object.values(classEnrollments).reduce((sum, arr) => sum + arr.length, 0);

  // Filter classes based on search query - must be before early returns to maintain hook order
  const filteredClasses = useMemo(() => classes.filter((c) => {
    if (!classSearchQuery.trim()) return true;
    const q = classSearchQuery.toLowerCase();
    const matchId = (c.display_id || '').toLowerCase().includes(q);
    const matchName = c.name.toLowerCase().includes(q);
    const matchStudents = (classEnrollments[c.id] || []).some(s => 
      (s.student_name || '').toLowerCase().includes(q)
    );
    return matchId || matchName || matchStudents;
  }), [classes, classSearchQuery, classEnrollments]);

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
            <CardTitle>{t('tutor.complete_profile')}</CardTitle>
            <CardDescription>{t('tutor.complete_profile_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full" size="lg">
              <Link to="/tutor/register">{t('tutor.register_now')}</Link>
            </Button>
            <Button variant="ghost" className="w-full" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              {t('common.signout')}
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
            <CardTitle>{t('tutor.profile_pending')}</CardTitle>
            <CardDescription>{t('tutor.profile_pending_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="w-full" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              {t('common.signout')}
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
            <CardTitle>{t('tutor.profile_rejected')}</CardTitle>
            <CardDescription>{t('tutor.profile_rejected_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="w-full" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              {t('common.signout')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Approved - Full dashboard
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img src={logoImg} alt="EduTutor" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 cursor-pointer" loading="eager" onClick={() => navigate('/tutor')} />
            <div className="min-w-0">
              <h1 className="font-bold truncate">{fullName || t('tutor.dashboard')}</h1>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>ID: {userShortId}</span>
                <Button variant="ghost" size="icon" className="h-4 w-4 p-0" onClick={copyUserId}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2">
            <NotificationBell />
            <UnreadMessageBadge onClick={() => setMessagingOpen(true)} />
            <UserAvatarMenu onSignOut={handleLogout} />
            <MobileMenu title={t('tutor.menu_title')}>
              <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/')}>
                <Home className="w-5 h-5 mr-2" />
                {t('nav.home')}
              </Button>
              <SharedClassesButton />
              <Button variant="ghost" className="w-full justify-start" onClick={() => setPaymentRequestOpen(true)}>
                <Send className="w-5 h-5 mr-2" />
                {t('tutor.send_task')}
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => setRevenueOpen(true)}>
                <DollarSign className="w-5 h-5 mr-2" />
                {t('tutor.revenue')}
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/guides')}>
                <BookOpen className="w-5 h-5 mr-2" />
                {t('tutor.guides')}
              </Button>
              <Button variant="ghost" className="w-full justify-start text-destructive" onClick={handleLogout}>
                <LogOut className="w-5 h-5 mr-2" />
                {t('common.signout')}
              </Button>
            </MobileMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">{t('tutor.hello')}{fullName ? `, ${fullName}` : ''}!</h2>
          <p className="text-muted-foreground">{t('tutor.welcome')}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                {t('tutor.classes_teaching')}
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
                {t('tutor.total_students')}
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
                {t('tutor.pending_assignments')}
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
              {t('tutor.my_classes')}
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t('tutor.students_tab')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="classes">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle>{t('tutor.my_classes_title')}</CardTitle>
                    <CardDescription>{t('tutor.my_classes_desc')}</CardDescription>
                  </div>
                  {classes.length > 0 && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-56">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder={t('tutor.search_placeholder')}
                          value={classSearchQuery}
                          onChange={(e) => { setClassSearchQuery(e.target.value); setSelectedClassId(null); }}
                          className="pl-8 h-9 text-sm"
                        />
                      </div>
                      {classSearchQuery && (
                        <Button variant="ghost" size="sm" className="h-9 px-2 flex-shrink-0"
                          onClick={() => setClassSearchQuery('')}>
                          {t('common.all')}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {classes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t('tutor.no_classes')}</p>
                    <p className="text-sm">{t('tutor.no_classes_desc')}</p>
                  </div>
                ) : filteredClasses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>{t('tutor.no_results')}</p>
                    <p className="text-sm">{t('tutor.try_other')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredClasses.map((classItem) => (
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
                              {classItem.class_type === 'one_on_one' ? t('tutor.one_on_one') : t('tutor.group')}
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
                              {formatScheduleDays(classItem.schedule_days)} | {classItem.schedule_start_time?.slice(0, 5)} - {classItem.schedule_end_time?.slice(0, 5)}
                            </div>
                          )}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-primary">
                              {formatPrice(classItem.price_per_session)}{t('common.per_session')}
                            </span>
                            <Badge variant="outline">
                              <Users className="w-3 h-3 mr-1" />
                              {classEnrollments[classItem.id]?.length || 0} {t('tutor.students_count')}
                            </Badge>
                          </div>
                          <div className="p-2 bg-muted/50 rounded text-xs">
                            <span className="text-muted-foreground">{t('tutor.income_per_session')}</span>
                            <span className="font-medium text-primary">
                              {formatPrice(classItem.price_per_session * ((classItem.tutor_percentage || 70) / 100))}
                            </span>
                            <span className="text-muted-foreground ml-1">({classItem.tutor_percentage || 70}%)</span>
                          </div>
                          <Button className="w-full mt-3" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/class/${classItem.id}`); }}>
                            {t('common.enter_class')}
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
                <CardTitle>{t('tutor.my_students')}</CardTitle>
                <CardDescription>{t('tutor.my_students_desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {totalStudents === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t('tutor.no_students')}</p>
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
                            <Badge variant="outline">{students.length} {t('tutor.students_count')}</Badge>
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

      <MessagingSystem 
        open={messagingOpen} 
        onOpenChange={(open) => {
          setMessagingOpen(open);
          if (!open) setMessagingReceiver(null);
        }}
        defaultReceiverId={messagingReceiver?.id}
        defaultReceiverName={messagingReceiver?.name}
      />
      <TutorPaymentRequestDialog open={paymentRequestOpen} onOpenChange={setPaymentRequestOpen} />
      <TutorRevenueDialog open={revenueOpen} onOpenChange={setRevenueOpen} />
    </div>
  );
};

export default TutorDashboard;
