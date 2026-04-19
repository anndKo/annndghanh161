import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import logoImg from '@/assets/logo.png';
import { supabase } from '@/integrations/supabase/untypedClient';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TutorStars } from '@/components/TutorRating';
import { formatPriceDisplay } from '@/lib/formatPrice';
import {
  ArrowLeft, BookOpen, Calendar, CheckCircle2, Loader2, MapPin, Monitor,
  Star, User, Users, Tag, GraduationCap, Clock, UserPlus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const DAY_LABELS: Record<string, string> = {
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
  } catch { return scheduleDays; }
};

const ClassDetailPage = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [classInfo, setClassInfo] = useState<any>(null);
  const [tutorInfo, setTutorInfo] = useState<any>(null);
  const [tutorProfile, setTutorProfile] = useState<any>(null);
  const [suggestedClasses, setSuggestedClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<string | null>(null);

  useEffect(() => {
    if (classId) fetchClassDetail();
  }, [classId]);

  useEffect(() => {
    if (user && classId) checkEnrollment();
  }, [user, classId]);

  const fetchClassDetail = async () => {
    setLoading(true);
    const { data: cls } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .eq('is_active', true)
      .single();

    if (!cls) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Không tìm thấy lớp học' });
      navigate(-1);
      return;
    }
    setClassInfo(cls);

    // Fetch tutor info
    if (cls.tutor_id) {
      const [{ data: profile }, { data: app }, { data: ratings }] = await Promise.all([
        supabase.from('profiles').select('full_name, avatar_url').eq('user_id', cls.tutor_id).single(),
        supabase.from('tutor_applications').select('*').eq('user_id', cls.tutor_id).eq('status', 'approved').maybeSingle(),
        supabase.from('tutor_ratings').select('rating').eq('tutor_id', cls.tutor_id).eq('status', 'approved'),
      ]);
      setTutorProfile(profile);
      setTutorInfo(app);
    }

    // Fetch suggested classes (same subject, different class)
    const { data: suggested } = await supabase
      .from('classes')
      .select('*')
      .eq('is_active', true)
      .eq('subject', cls.subject)
      .neq('id', cls.id)
      .limit(4);
    
    if (!suggested || suggested.length === 0) {
      // Fallback: any other active classes
      const { data: fallback } = await supabase
        .from('classes')
        .select('*')
        .eq('is_active', true)
        .neq('id', cls.id)
        .limit(4);
      setSuggestedClasses(fallback || []);
    } else {
      setSuggestedClasses(suggested);
    }

    setLoading(false);
  };

  const checkEnrollment = async () => {
    if (!user || !classId) return;
    const { data } = await supabase
      .from('enrollments')
      .select('status')
      .eq('class_id', classId)
      .eq('student_id', user.id)
      .neq('status', 'removed')
      .maybeSingle();
    setEnrollmentStatus(data?.status || null);
  };

  const handleEnroll = async () => {
    if (!user) {
      navigate(`/auth?redirect=/class-detail/${classId}`);
      return;
    }
    if (enrollmentStatus) return;

    setEnrolling(true);
    try {
      const { error } = await supabase.from('enrollments').insert({
        class_id: classId,
        student_id: user.id,
        status: 'pending',
      });
      if (error) throw error;
      setEnrollmentStatus('pending');
      toast({ title: 'Đã đăng ký', description: 'Yêu cầu đăng ký đã được gửi, vui lòng chờ duyệt.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Lỗi', description: err.message });
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!classInfo) return null;

  const finalPrice = classInfo.discount_percent > 0
    ? classInfo.price_per_session * (1 - classInfo.discount_percent / 100)
    : classInfo.price_per_session;

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)', borderColor: '#E2E8F0' }}>
        <div className="container mx-auto px-4 h-14 flex items-center gap-3 max-w-6xl">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImg} alt="EduTutor" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-bold text-lg hidden sm:inline" style={{ color: '#0F172A' }}>EduTutor</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Class Info Card */}
            <div className="rounded-2xl border p-6 md:p-8 space-y-6" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <p className="text-sm font-mono font-medium mb-1" style={{ color: '#2563EB' }}>{classInfo.display_id}</p>
                  <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#0F172A' }}>{classInfo.name}</h1>
                </div>
                <Badge className="text-sm px-3 py-1" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                  {classInfo.class_type === 'one_on_one' ? '1:1' : 'Nhóm'}
                </Badge>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <InfoItem icon={BookOpen} label="Môn học" value={classInfo.subject} />
                <InfoItem icon={GraduationCap} label="Khối lớp" value={classInfo.grade} />
                <InfoItem icon={Monitor} label="Hình thức" value={classInfo.teaching_format === 'online' ? 'Online' : classInfo.teaching_format === 'offline' ? 'Offline' : 'Online & Offline'} />
                {classInfo.max_students && (
                  <InfoItem icon={Users} label="Sĩ số tối đa" value={`${classInfo.max_students} học viên`} />
                )}
                {classInfo.schedule_days && (
                  <InfoItem icon={Calendar} label="Lịch học" value={`${formatScheduleDays(classInfo.schedule_days)}${classInfo.schedule_start_time && classInfo.schedule_end_time ? ` | ${classInfo.schedule_start_time?.substring(0, 5)} – ${classInfo.schedule_end_time?.substring(0, 5)}` : ''}`} />
                )}
                {classInfo.address && (
                  <InfoItem icon={MapPin} label="Địa chỉ" value={classInfo.address} />
                )}
              </div>

              {classInfo.description && (
                <div className="pt-4" style={{ borderTop: '1px solid #E2E8F0' }}>
                  <h3 className="font-semibold mb-2" style={{ color: '#0F172A' }}>Mô tả</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>{classInfo.description}</p>
                </div>
              )}

              {/* Price */}
              <div className="p-4 rounded-xl" style={{ background: '#EFF6FF' }}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-sm mb-1" style={{ color: '#64748B' }}>Học phí</p>
                    <div className="flex items-baseline gap-2">
                      {classInfo.discount_percent > 0 && (
                        <span className="text-lg line-through" style={{ color: '#94A3B8' }}>
                          {formatPriceDisplay(classInfo.price_per_session)}
                        </span>
                      )}
                      <span className="text-2xl font-bold" style={{ color: '#2563EB' }}>
                        {formatPriceDisplay(finalPrice)}/buổi
                      </span>
                      {classInfo.discount_percent > 0 && (
                        <Badge variant="destructive" className="text-xs">-{classInfo.discount_percent}%</Badge>
                      )}
                    </div>
                  </div>
                  {/* CTA for mobile */}
                  <div className="lg:hidden">
                    <EnrollButton status={enrollmentStatus} enrolling={enrolling} onEnroll={handleEnroll} />
                  </div>
                </div>
              </div>
            </div>

            {/* Tutor Card */}
            {(tutorProfile || tutorInfo) && (
              <div className="rounded-2xl border p-6" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
                <h2 className="font-bold text-lg mb-4" style={{ color: '#0F172A' }}>Thông tin gia sư</h2>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}>
                    {tutorProfile?.full_name?.charAt(0)?.toUpperCase() || 'G'}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg" style={{ color: '#0F172A' }}>{tutorProfile?.full_name || 'Gia sư'}</h3>
                      {tutorInfo && (
                        <Badge className="bg-emerald-500 text-white text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />Đã xác minh
                        </Badge>
                      )}
                    </div>
                    {classInfo.tutor_id && <TutorStars tutorId={classInfo.tutor_id} />}
                    {tutorInfo && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {tutorInfo.school_name && (
                          <span className="text-xs px-2.5 py-1 rounded-lg" style={{ background: '#F1F5F9', color: '#64748B' }}>
                            🏫 {tutorInfo.school_name}
                          </span>
                        )}
                        {tutorInfo.best_subject && (
                          <span className="text-xs px-2.5 py-1 rounded-lg" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                            ⭐ {tutorInfo.best_subject}
                          </span>
                        )}
                        {tutorInfo.teaching_format && (
                          <span className="text-xs px-2.5 py-1 rounded-lg" style={{ background: '#F1F5F9', color: '#64748B' }}>
                            {tutorInfo.teaching_format === 'online' ? '💻 Online' : tutorInfo.teaching_format === 'offline' ? '📍 Offline' : '🔄 Online & Offline'}
                          </span>
                        )}
                      </div>
                    )}
                    {tutorInfo?.teaching_areas?.length > 0 && (
                      <p className="text-sm flex items-center gap-1.5 mt-1" style={{ color: '#64748B' }}>
                        <MapPin className="w-3.5 h-3.5" />
                        {tutorInfo.teaching_areas.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                {classInfo.tutor_id && (
                  <div className="mt-4">
                    <Link to={`/tutor-profile/${classInfo.tutor_id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        Xem hồ sơ gia sư
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Enroll Card - Desktop */}
            <div className="hidden lg:block rounded-2xl border p-6 sticky top-20" style={{ background: '#FFFFFF', borderColor: '#E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div className="text-center space-y-4">
                <div>
                  <p className="text-sm mb-1" style={{ color: '#64748B' }}>Học phí</p>
                  <p className="text-3xl font-bold" style={{ color: '#2563EB' }}>{formatPriceDisplay(finalPrice)}</p>
                  <p className="text-sm" style={{ color: '#64748B' }}>/buổi</p>
                </div>
                <EnrollButton status={enrollmentStatus} enrolling={enrolling} onEnroll={handleEnroll} />
                <p className="text-xs" style={{ color: '#94A3B8' }}>Đăng ký sẽ cần được admin duyệt</p>
              </div>
            </div>

            {/* Suggested Classes */}
            {suggestedClasses.length > 0 && (
              <div className="rounded-2xl border p-6" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
                <h3 className="font-bold mb-4" style={{ color: '#0F172A' }}>Lớp học gợi ý</h3>
                <div className="space-y-3">
                  {suggestedClasses.map(cls => (
                    <Link
                      key={cls.id}
                      to={`/class-detail/${cls.id}`}
                      className="block p-3 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-md"
                      style={{ borderColor: '#E2E8F0' }}
                    >
                      <p className="text-xs font-mono" style={{ color: '#2563EB' }}>{cls.display_id}</p>
                      <p className="font-medium text-sm line-clamp-1" style={{ color: '#0F172A' }}>{cls.name}</p>
                      <p className="text-xs mt-1" style={{ color: '#64748B' }}>{cls.subject} • {cls.grade}</p>
                      <p className="text-sm font-bold mt-1" style={{ color: '#2563EB' }}>{formatPriceDisplay(cls.price_per_session)}/buổi</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const InfoItem = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="space-y-1">
    <p className="text-xs flex items-center gap-1" style={{ color: '#94A3B8' }}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </p>
    <p className="text-sm font-medium" style={{ color: '#0F172A' }}>{value}</p>
  </div>
);

const EnrollButton = ({ status, enrolling, onEnroll }: { status: string | null; enrolling: boolean; onEnroll: () => void }) => {
  if (status === 'approved') {
    return (
      <Badge className="bg-emerald-500 text-white px-4 py-2 text-sm">
        <CheckCircle2 className="w-4 h-4 mr-1.5" />Đã tham gia
      </Badge>
    );
  }
  if (status === 'pending') {
    return (
      <Badge variant="outline" className="px-4 py-2 text-sm">
        <Clock className="w-4 h-4 mr-1.5" />Đang chờ duyệt
      </Badge>
    );
  }
  return (
    <button
      onClick={onEnroll}
      disabled={enrolling}
      className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg hover:scale-[1.02] disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}
    >
      {enrolling ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (
        <span className="flex items-center justify-center gap-2">
          <UserPlus className="w-4 h-4" />
          Đăng ký lớp học
        </span>
      )}
    </button>
  );
};

export default ClassDetailPage;
