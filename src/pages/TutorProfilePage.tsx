import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/untypedClient';
import logoImg from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatPriceDisplay } from '@/lib/formatPrice';
import {
  Star, BookOpen, GraduationCap, MapPin, Monitor, Users, User,
  Loader2, CheckCircle2, ArrowLeft, Calendar, Clock, ArrowRight
} from 'lucide-react';

const DAY_LABELS: Record<string, string> = {
  monday: 'Thứ 2', tuesday: 'Thứ 3', wednesday: 'Thứ 4', thursday: 'Thứ 5',
  friday: 'Thứ 6', saturday: 'Thứ 7', sunday: 'CN'
};

const formatScheduleDays = (scheduleDays: string | null): string => {
  if (!scheduleDays) return '';
  try {
    const days = JSON.parse(scheduleDays);
    if (typeof days === 'object' && days !== null) {
      return Object.keys(days).filter(d => days[d]).map(d => DAY_LABELS[d] || d).join(', ');
    }
    return scheduleDays;
  } catch { return scheduleDays; }
};

const TutorProfilePage = () => {
  const { tutorId } = useParams<{ tutorId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tutor, setTutor] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [suggestedTutors, setSuggestedTutors] = useState<any[]>([]);

  useEffect(() => {
    if (tutorId) fetchAll();
  }, [tutorId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Fetch tutor info
      const { data: app } = await supabase
        .from('tutor_applications')
        .select('*')
        .eq('user_id', tutorId)
        .eq('status', 'approved')
        .single();
      setTutor(app);

      // Fetch classes
      const { data: cls } = await supabase
        .from('classes')
        .select('*')
        .eq('tutor_id', tutorId)
        .eq('is_active', true);
      setClasses(cls || []);

      // Fetch ratings
      const { data: rats } = await supabase
        .from('tutor_ratings')
        .select('*')
        .eq('tutor_id', tutorId)
        .order('created_at', { ascending: false })
        .limit(10);
      setRatings(rats || []);
      if (rats && rats.length > 0) {
        const avg = rats.reduce((s: number, r: any) => s + r.rating, 0) / rats.length;
        setAvgRating(avg);
      }

      // Fetch suggested tutors (other top-rated)
      const { data: otherRatings } = await supabase
        .from('tutor_ratings')
        .select('tutor_id, rating')
        .neq('tutor_id', tutorId);

      if (otherRatings && otherRatings.length > 0) {
        const tutorMap: Record<string, { total: number; count: number }> = {};
        otherRatings.forEach((r: any) => {
          if (!tutorMap[r.tutor_id]) tutorMap[r.tutor_id] = { total: 0, count: 0 };
          tutorMap[r.tutor_id].total += r.rating;
          tutorMap[r.tutor_id].count++;
        });
        const sorted = Object.entries(tutorMap)
          .map(([id, v]) => ({ tutor_id: id, avg: v.total / v.count, count: v.count }))
          .sort((a, b) => b.avg - a.avg)
          .slice(0, 4);

        const ids = sorted.map(s => s.tutor_id);
        const { data: apps } = await supabase
          .from('tutor_applications')
          .select('user_id, full_name, best_subject, teaching_format, teaching_areas')
          .in('user_id', ids)
          .eq('status', 'approved');

        const merged = sorted.map(s => {
          const info = apps?.find((a: any) => a.user_id === s.tutor_id);
          return { ...s, ...info };
        }).filter(s => s.full_name);
        setSuggestedTutors(merged);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8FAFC' }}>
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#2563EB' }} />
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#F8FAFC' }}>
        <p className="text-lg" style={{ color: '#64748B' }}>Không tìm thấy gia sư</p>
        <Link to="/">
          <Button>Về trang chủ</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b" style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)', borderColor: '#E2E8F0' }}>
        <div className="container mx-auto px-4 h-16 flex items-center gap-4 max-w-7xl">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-medium" style={{ color: '#64748B' }}>
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>
          <Link to="/" className="flex items-center gap-2 ml-auto">
            <img src={logoImg} alt="EduTutor" className="w-8 h-8 rounded-xl object-cover" />
            <span className="text-lg font-bold" style={{ color: '#0F172A' }}>EduTutor</span>
          </Link>
        </div>
      </header>

      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-5xl">
          {/* Profile Header */}
          <div className="rounded-2xl border p-6 md:p-10 mb-8" style={{ background: '#FFFFFF', borderColor: '#E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}>
                {tutor.full_name?.charAt(0)?.toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#0F172A' }}>{tutor.full_name}</h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white" style={{ background: '#10B981' }}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Đã xác minh
                  </span>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className="w-5 h-5" style={{ color: i <= Math.round(avgRating) ? '#F59E0B' : '#E2E8F0', fill: i <= Math.round(avgRating) ? '#F59E0B' : 'none' }} />
                    ))}
                  </div>
                  <span className="font-bold text-lg" style={{ color: '#0F172A' }}>{avgRating.toFixed(1)}</span>
                  <span className="text-sm" style={{ color: '#64748B' }}>({ratings.length} đánh giá)</span>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {tutor.school_name && (
                    <div className="flex items-center gap-2" style={{ color: '#64748B' }}>
                      <GraduationCap className="w-4 h-4 flex-shrink-0" style={{ color: '#2563EB' }} />
                      <span>{tutor.school_name}</span>
                    </div>
                  )}
                  {tutor.faculty && (
                    <div className="flex items-center gap-2" style={{ color: '#64748B' }}>
                      <BookOpen className="w-4 h-4 flex-shrink-0" style={{ color: '#2563EB' }} />
                      <span>{tutor.faculty}</span>
                    </div>
                  )}
                  {tutor.teaching_format && (
                    <div className="flex items-center gap-2" style={{ color: '#64748B' }}>
                      <Monitor className="w-4 h-4 flex-shrink-0" style={{ color: '#2563EB' }} />
                      <span>{tutor.teaching_format === 'online' ? 'Online' : tutor.teaching_format === 'offline' ? 'Offline' : 'Online & Offline'}</span>
                    </div>
                  )}
                  {tutor.teaching_areas?.length > 0 && (
                    <div className="flex items-center gap-2" style={{ color: '#64748B' }}>
                      <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: '#2563EB' }} />
                      <span>{tutor.teaching_areas.join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Subjects */}
                {tutor.teachable_subjects?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tutor.best_subject && (
                      <span className="px-3 py-1 rounded-lg text-xs font-semibold text-white" style={{ background: '#2563EB' }}>
                        ⭐ {tutor.best_subject}
                      </span>
                    )}
                    {tutor.teachable_subjects.filter((s: string) => s !== tutor.best_subject).map((s: string, i: number) => (
                      <span key={i} className="px-3 py-1 rounded-lg text-xs font-medium" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Classes */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#0F172A' }}>
              <BookOpen className="w-5 h-5" style={{ color: '#2563EB' }} />
              Lớp đang dạy ({classes.length})
            </h2>
            {classes.length === 0 ? (
              <div className="rounded-2xl border p-8 text-center" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
                <p style={{ color: '#64748B' }}>Chưa có lớp nào đang dạy</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classes.map((c: any) => (
                  <div key={c.id} className="rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-0.5" style={{ background: '#FFFFFF', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xs font-mono font-medium" style={{ color: '#2563EB' }}>{c.display_id}</p>
                        <h3 className="font-semibold" style={{ color: '#0F172A' }}>{c.name}</h3>
                      </div>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-lg" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                        {c.class_type === 'one_on_one' ? '1:1' : 'Nhóm'}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-sm mb-4" style={{ color: '#64748B' }}>
                      <p className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> {c.subject} • {c.grade}</p>
                      <p className="flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5" /> {c.teaching_format === 'online' ? 'Online' : c.teaching_format === 'offline' ? 'Offline' : 'Cả hai'}</p>
                      {c.schedule_days && (
                        <p className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatScheduleDays(c.schedule_days)}
                          {c.schedule_start_time && c.schedule_end_time && ` | ${c.schedule_start_time?.substring(0, 5)} – ${c.schedule_end_time?.substring(0, 5)}`}
                        </p>
                      )}
                      {c.address && <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {c.address}</p>}
                    </div>
                    <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
                      <span className="text-lg font-bold" style={{ color: '#2563EB' }}>{formatPriceDisplay(c.price_per_session)}/buổi</span>
                      <div className="flex gap-2">
                        <Link to={`/class/${c.id}`}>
                          <button className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors" style={{ borderColor: '#E2E8F0', color: '#64748B' }}>
                            Chi tiết
                          </button>
                        </Link>
                        <Link to="/auth?tab=signup&role=student">
                          <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: '#2563EB' }}>
                            Đăng ký
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reviews */}
          {ratings.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#0F172A' }}>
                <Star className="w-5 h-5" style={{ color: '#F59E0B' }} />
                Đánh giá từ học viên
              </h2>
              <div className="space-y-3">
                {ratings.map((r: any) => (
                  <div key={r.id} className="rounded-xl border p-4" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} className="w-3.5 h-3.5" style={{ color: i <= r.rating ? '#F59E0B' : '#E2E8F0', fill: i <= r.rating ? '#F59E0B' : 'none' }} />
                        ))}
                      </div>
                      <span className="text-xs" style={{ color: '#94A3B8' }}>
                        {new Date(r.created_at).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    {r.comment && <p className="text-sm" style={{ color: '#64748B' }}>{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Tutors */}
          {suggestedTutors.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#0F172A' }}>
                <Users className="w-5 h-5" style={{ color: '#2563EB' }} />
                Gia sư khác được đánh giá cao
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {suggestedTutors.map((t: any) => (
                  <Link key={t.tutor_id} to={`/tutor-profile/${t.tutor_id}`}>
                    <div className="rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 cursor-pointer" style={{ background: '#FFFFFF', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-white mb-3" style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}>
                        {t.full_name?.charAt(0)?.toUpperCase()}
                      </div>
                      <h3 className="font-semibold text-sm mb-1" style={{ color: '#0F172A' }}>{t.full_name}</h3>
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="w-3.5 h-3.5 fill-current" style={{ color: '#F59E0B' }} />
                        <span className="text-sm font-medium" style={{ color: '#0F172A' }}>{t.avg.toFixed(1)}</span>
                        <span className="text-xs" style={{ color: '#94A3B8' }}>({t.count})</span>
                      </div>
                      {t.best_subject && (
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                          {t.best_subject}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TutorProfilePage;
