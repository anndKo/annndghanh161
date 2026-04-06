import { useState, useEffect, useMemo } from 'react';
import logoImg from '@/assets/logo.png';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/untypedClient';
import ClassFilterPanel, { FilterState } from '@/components/ClassFilterPanel';
import { formatPriceDisplay } from '@/lib/formatPrice';
import NearbyClassSearchModal from '@/components/NearbyClassSearchModal';
import {
  GraduationCap, Users, BookOpen, Shield, CheckCircle2, ArrowRight, Star,
  Clock, MapPin, Monitor, User, Search, Filter, Tag, Calendar, ChevronDown,
  ChevronUp, Sparkles, Globe, Headphones
} from 'lucide-react';

const SUBJECTS = ['Toán', 'Vật Lý', 'Hóa Học', 'Sinh Học', 'Ngữ Văn', 'Tiếng Anh', 'Lịch Sử', 'Địa Lý', 'GDCD', 'Tin Học'];
const GRADES = ['Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5', 'Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9', 'Lớp 10', 'Lớp 11', 'Lớp 12'];

const DAY_LABELS: { [key: string]: string } = {
  monday: 'Thứ 2', tuesday: 'Thứ 3', wednesday: 'Thứ 4', thursday: 'Thứ 5',
  friday: 'Thứ 6', saturday: 'Thứ 7', sunday: 'CN'
};

const formatScheduleDays = (scheduleDays: string | null | undefined): string => {
  if (!scheduleDays) return '';
  try {
    const days = JSON.parse(scheduleDays);
    if (typeof days === 'object' && days !== null) {
      return Object.keys(days).filter((d) => days[d]).map((d) => DAY_LABELS[d] || d).join(', ');
    }
    return scheduleDays;
  } catch { return scheduleDays; }
};

const removeDiacritics = (str: string) =>
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd');

const Index = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [classes, setClasses] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [searchFiltersOpen, setSearchFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({
    startTime: '', endTime: '', days: [], subjects: []
  });
  const [nearbyModalOpen, setNearbyModalOpen] = useState(false);
  const [topTutor, setTopTutor] = useState<any>(null);
  const [topTutorLoading, setTopTutorLoading] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      const { data } = await supabase
        .from('classes')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      setClasses(data || []);
      setLoadingClasses(false);
    };
    fetchClasses();

    // Fetch top-rated tutor
    const fetchTopTutor = async () => {
      setTopTutorLoading(true);
      try {
        const { data: allRatings } = await supabase
          .from('tutor_ratings')
          .select('tutor_id, rating');
        if (allRatings && allRatings.length > 0) {
          const tutorMap: Record<string, { total: number; count: number }> = {};
          allRatings.forEach((r: any) => {
            if (!tutorMap[r.tutor_id]) tutorMap[r.tutor_id] = { total: 0, count: 0 };
            tutorMap[r.tutor_id].total += r.rating;
            tutorMap[r.tutor_id].count++;
          });
          const best = Object.entries(tutorMap)
            .map(([id, v]) => ({ tutor_id: id, avg: v.total / v.count, count: v.count }))
            .sort((a, b) => b.avg - a.avg || b.count - a.count)[0];
          if (best) {
            const { data: app } = await supabase
              .from('tutor_applications')
              .select('full_name, best_subject, teaching_format, teaching_areas, school_name')
              .eq('user_id', best.tutor_id)
              .eq('status', 'approved')
              .single();
            if (app) {
              setTopTutor({ ...best, ...app });
            }
          }
        }
      } catch (e) { console.error(e); }
      setTopTutorLoading(false);
    };
    fetchTopTutor();
  }, []);

  const fuzzyAddressMatch = (address: string, query: string): number => {
    if (!query.trim()) return 1;
    const normalizedAddr = removeDiacritics(address.toLowerCase());
    const words = removeDiacritics(query.toLowerCase()).split(/\s+/).filter(Boolean);
    if (words.length === 0) return 1;
    let matchCount = 0;
    for (const word of words) {
      if (normalizedAddr.includes(word)) matchCount++;
    }
    return matchCount;
  };

  const filteredClasses = useMemo(() => classes
    .map((c) => {
      if (subjectFilter !== 'all' && c.subject !== subjectFilter) return null;
      if (gradeFilter !== 'all' && c.grade !== gradeFilter) return null;
      if (formatFilter !== 'all' && c.teaching_format !== formatFilter) return null;
      let addressScore = 1;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesId = c.display_id?.toLowerCase().includes(q);
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesAddress = c.address ? fuzzyAddressMatch(c.address, searchQuery) : 0;
        if (!matchesId && !matchesName && matchesAddress === 0) return null;
        if (matchesAddress > 0 && !matchesId && !matchesName) addressScore = matchesAddress;
      }
      if (advancedFilters.subjects.length > 0 && !advancedFilters.subjects.includes(c.subject)) return null;
      if (advancedFilters.days.length > 0 && c.schedule_days) {
        try {
          const scheduleDays = JSON.parse(c.schedule_days);
          const hasMatchingDay = advancedFilters.days.some((day: string) => scheduleDays[day]);
          if (!hasMatchingDay) return null;
        } catch { return null; }
      }
      if ((advancedFilters.startTime || advancedFilters.endTime) && c.schedule_start_time && c.schedule_end_time) {
        if (advancedFilters.startTime && c.schedule_start_time < advancedFilters.startTime) return null;
        if (advancedFilters.endTime && c.schedule_end_time > advancedFilters.endTime) return null;
      }
      return { ...c, _addressScore: addressScore };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b._addressScore - a._addressScore),
    [classes, subjectFilter, gradeFilter, formatFilter, searchQuery, advancedFilters]);

  const features = [
    { icon: Shield, title: 'Gia sư được xác minh', description: 'Mọi gia sư đều được kiểm tra kỹ lưỡng về bằng cấp và kinh nghiệm giảng dạy.' },
    { icon: Clock, title: 'Học linh hoạt', description: 'Tự do chọn thời gian, địa điểm và hình thức học phù hợp với lịch trình của bạn.' },
    { icon: Globe, title: 'Toàn quốc', description: 'Mạng lưới gia sư phủ sóng 63 tỉnh thành, học online hoặc offline đều được.' },
    { icon: Headphones, title: 'Hỗ trợ 24/7', description: 'Đội ngũ hỗ trợ luôn sẵn sàng giúp đỡ bạn mọi lúc, mọi nơi.' }
  ];

  const stats = [
    { value: '500+', label: 'Gia sư hoạt động' },
    { value: '10,000+', label: 'Học viên' },
    { value: '50+', label: 'Môn học' },
    { value: '98%', label: 'Hài lòng' }
  ];

  return (
    <div className="min-h-screen" style={{ background: '#FFFFFF' }}>
      {/* ── Navbar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', borderColor: '#E2E8F0' }}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoImg} alt="EduTutor" className="w-9 h-9 rounded-xl object-cover" loading="eager" />
            <span className="text-xl font-bold" style={{ color: '#0F172A' }}>EduTutor</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium transition-colors hover:opacity-80" style={{ color: '#64748B' }}>Tính năng</a>
            <a href="#classes" className="text-sm font-medium transition-colors hover:opacity-80" style={{ color: '#64748B' }}>Lớp học</a>
            <Link to="/guides" className="text-sm font-medium transition-colors hover:opacity-80" style={{ color: '#64748B' }}>Hướng dẫn</Link>
            <Link to="/auth" className="text-sm font-medium transition-colors hover:opacity-80" style={{ color: '#64748B' }}>Đăng nhập</Link>
            <Link to="/auth?tab=signup">
              <button className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg" style={{ background: '#2563EB' }}>
                Đăng ký
              </button>
            </Link>
          </nav>
          <Link to="/auth" className="md:hidden">
            <button className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors" style={{ borderColor: '#E2E8F0', color: '#0F172A' }}>
              Đăng nhập
            </button>
          </Link>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="pt-28 md:pt-36 pb-16 md:pb-24 px-4 relative overflow-hidden" style={{ background: '#FFFFFF' }}>
        {/* Subtle decorative elements */}
        <div className="absolute top-20 right-0 w-[500px] h-[500px] rounded-full opacity-30 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #93C5FD 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #93C5FD 0%, transparent 70%)' }} />

        <div className="container mx-auto max-w-7xl relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left content */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                <Sparkles className="w-4 h-4" />
                Nền tảng gia sư #1 Việt Nam
              </div>

              {/* Headline */}
              <h1 className="font-bold leading-[1.1] tracking-tight" style={{ color: '#0F172A' }}>
                <span className="block text-[clamp(24px,7vw,56px)] whitespace-nowrap">
                  Học tập hiệu quả với
                </span>
                <span
                  className="block text-[clamp(24px,7vw,56px)] whitespace-nowrap"
                  style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                >
                  gia sư chất lượng
                </span>
              </h1>

              {/* Subtext */}
              <p className="text-lg md:text-xl leading-relaxed max-w-xl" style={{ color: '#64748B' }}>
                Kết nối với gia sư giỏi, được xác minh. Học online hoặc offline linh hoạt theo nhu cầu.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/auth?tab=signup&role=student">
                  <button className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-xl hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}>
                    Tìm gia sư ngay
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </Link>
                <Link to="/auth?tab=signup&role=tutor">
                  <button className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-semibold flex items-center justify-center gap-2 border-2 transition-all duration-200 hover:scale-[1.02]" style={{ borderColor: '#2563EB', color: '#2563EB', background: 'transparent' }}>
                    Đăng ký làm gia sư
                  </button>
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="flex items-center gap-5 pt-2">
                <div className="flex -space-x-2.5">
                  {['T', 'H', 'M', 'L'].map((letter, i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white border-2"
                      style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)', borderColor: '#FFFFFF' }}
                    >
                      {letter}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>500+ gia sư đang hoạt động</p>
                  <p className="text-xs" style={{ color: '#64748B' }}>Sẵn sàng hỗ trợ bạn</p>
                </div>
              </div>
            </div>

            {/* Right - Top Tutor preview card */}
            <div className="relative hidden lg:flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[380px] h-[380px] rounded-full blur-3xl opacity-20" style={{ background: '#93C5FD' }} />
              </div>

              {topTutorLoading ? (
                <div className="relative w-full max-w-[420px] rounded-2xl p-8 border flex items-center justify-center h-64" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
                  <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#2563EB', borderTopColor: 'transparent' }} />
                </div>
              ) : topTutor ? (
                <div className="relative w-full max-w-[420px] rounded-2xl p-8 border" style={{ background: '#FFFFFF', borderColor: '#E2E8F0', boxShadow: '0 20px 60px -15px rgba(37, 99, 235, 0.12), 0 4px 20px -5px rgba(0,0,0,0.06)' }}>
                  <div className="absolute -top-3 left-6 px-3 py-1 rounded-full text-[11px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #F59E0B, #EAB308)' }}>
                    ⭐ Gia sư nổi bật
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white" style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}>
                      {topTutor.full_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-lg" style={{ color: '#0F172A' }}>{topTutor.full_name}</p>
                      <p className="text-sm" style={{ color: '#64748B' }}>{topTutor.school_name || topTutor.best_subject}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-5">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} className="w-4 h-4" style={{ color: i <= Math.round(topTutor.avg) ? '#F59E0B' : '#E2E8F0', fill: i <= Math.round(topTutor.avg) ? '#F59E0B' : 'none' }} />
                      ))}
                    </div>
                    <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>{topTutor.avg.toFixed(1)}</span>
                    <span className="text-sm" style={{ color: '#64748B' }}>({topTutor.count} đánh giá)</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {topTutor.best_subject && <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: '#2563EB' }}>⭐ {topTutor.best_subject}</span>}
                    {topTutor.teaching_format && (
                      <span className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                        {topTutor.teaching_format === 'online' ? 'Online' : topTutor.teaching_format === 'offline' ? 'Offline' : 'Online & Offline'}
                      </span>
                    )}
                  </div>
                  {topTutor.teaching_areas?.length > 0 && (
                    <div className="flex items-center gap-2 mb-6">
                      <MapPin className="w-4 h-4" style={{ color: '#64748B' }} />
                      <span className="text-sm" style={{ color: '#64748B' }}>{topTutor.teaching_areas.join(', ')}</span>
                    </div>
                  )}
                  <Link to={`/tutor-profile/${topTutor.tutor_id}`}>
                    <button className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}>
                      Xem hồ sơ gia sư
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="relative w-full max-w-[420px] rounded-2xl p-8 border text-center" style={{ background: '#FFFFFF', borderColor: '#E2E8F0', boxShadow: '0 20px 60px -15px rgba(37, 99, 235, 0.12)' }}>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#EFF6FF' }}>
                    <GraduationCap className="w-8 h-8" style={{ color: '#2563EB' }} />
                  </div>
                  <p className="font-semibold mb-1" style={{ color: '#0F172A' }}>Chưa có gia sư nào</p>
                  <p className="text-sm" style={{ color: '#64748B' }}>Hãy quay lại sau nhé!</p>
                </div>
              )}

              {/* Floating cards */}
              <div className="absolute -left-4 top-12 p-3 rounded-xl border animate-float" style={{ background: '#FFFFFF', borderColor: '#E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#EFF6FF' }}>
                    <Clock className="w-4 h-4" style={{ color: '#2563EB' }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#0F172A' }}>Linh hoạt</p>
                    <p className="text-[10px]" style={{ color: '#64748B' }}>24/7</p>
                  </div>
                </div>
              </div>
              <div className="absolute -right-4 bottom-20 p-3 rounded-xl border animate-float" style={{ background: '#FFFFFF', borderColor: '#E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', animationDelay: '1s' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#EFF6FF' }}>
                    <CheckCircle2 className="w-4 h-4" style={{ color: '#2563EB' }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#0F172A' }}>Đã xác minh</p>
                    <p className="text-[10px]" style={{ color: '#64748B' }}>100%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Classes Section ── */}
      <section id="classes" className="py-20 md:py-28 px-4" style={{ background: '#F8FAFC' }}>
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: '#1D4ED8' }}>
              Lớp học đang mở
            </h2>
            <p className="text-lg" style={{ color: '#64748B' }}>
              Tìm và đăng ký lớp học phù hợp với bạn
            </p>
          </div>

          {/* Search controls */}
          <div className="mb-8">
            <div className="flex justify-center gap-3 mb-5">
              <button
                onClick={() => setSearchFiltersOpen(!searchFiltersOpen)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200"
                style={{
                  background: searchFiltersOpen ? '#2563EB' : '#FFFFFF',
                  color: searchFiltersOpen ? '#FFFFFF' : '#0F172A',
                  borderColor: searchFiltersOpen ? '#2563EB' : '#E2E8F0',
                }}
              >
                <Search className="w-4 h-4" />
                {searchFiltersOpen ? 'Đóng bộ lọc' : 'Tìm kiếm & Lọc'}
                {searchFiltersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setNearbyModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 hover:shadow-md"
                style={{ background: '#FFFFFF', borderColor: '#E2E8F0', color: '#0F172A' }}
              >
                <MapPin className="w-4 h-4" style={{ color: '#2563EB' }} />
                Tìm lớp gần đây
              </button>
            </div>

            {searchFiltersOpen && (
              <div className="rounded-2xl p-5 border mb-4 animate-fade-in" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Input
                    placeholder="Tìm theo tên, mã lớp, địa chỉ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="md:col-span-1"
                    style={{ borderColor: '#E2E8F0' }}
                  />
                  <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                    <SelectTrigger style={{ borderColor: '#E2E8F0' }}><SelectValue placeholder="Môn học" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả môn</SelectItem>
                      {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={gradeFilter} onValueChange={setGradeFilter}>
                    <SelectTrigger style={{ borderColor: '#E2E8F0' }}><SelectValue placeholder="Khối lớp" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả lớp</SelectItem>
                      {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={formatFilter} onValueChange={setFormatFilter}>
                    <SelectTrigger style={{ borderColor: '#E2E8F0' }}><SelectValue placeholder="Hình thức" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                      <SelectItem value="both">Cả hai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-3">
                  <ClassFilterPanel onFilterChange={setAdvancedFilters} />
                </div>
              </div>
            )}
          </div>

          {/* Class Grid */}
          {loadingClasses ? (
            <div className="text-center py-16" style={{ color: '#64748B' }}>Đang tải lớp học...</div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-40" style={{ color: '#64748B' }} />
              <p style={{ color: '#64748B' }}>Không tìm thấy lớp học phù hợp</p>
            </div>
          ) : (
            <div className="max-h-[800px] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {filteredClasses.map((classItem: any) => (
                  <div
                    key={classItem.id}
                    className="rounded-2xl border overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1"
                    style={{ background: '#FFFFFF', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 10px 40px -10px rgba(37,99,235,0.12)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
                  >
                    <div className="p-5 flex flex-col flex-1 gap-3">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-mono font-medium" style={{ color: '#2563EB' }}>{classItem.display_id}</p>
                          <h3 className="font-semibold line-clamp-2 mt-0.5" style={{ color: '#0F172A' }}>{classItem.name}</h3>
                        </div>
                        <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg flex-shrink-0 ml-2" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                          {classItem.class_type === 'one_on_one' ? '1:1' : 'Nhóm'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-sm" style={{ color: '#64748B' }}>
                        <p className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{classItem.subject} • {classItem.grade}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Monitor className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{classItem.teaching_format === 'online' ? 'Online' : classItem.teaching_format === 'offline' ? 'Offline' : 'Online & Offline'}</span>
                        </p>
                        {classItem.schedule_days && (
                          <p className="flex items-start gap-1.5">
                            <Calendar className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <span className="break-words">
                              {formatScheduleDays(classItem.schedule_days)}
                              {classItem.schedule_start_time && classItem.schedule_end_time && (
                                <span className="ml-1">| {classItem.schedule_start_time?.substring(0, 5)} – {classItem.schedule_end_time?.substring(0, 5)}</span>
                              )}
                            </span>
                          </p>
                        )}
                        {classItem.address && (
                          <p className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <span className="break-words">{classItem.address}</span>
                          </p>
                        )}
                        {classItem.max_students && (
                          <p className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>Tối đa {classItem.max_students} học viên</span>
                          </p>
                        )}
                      </div>

                      {/* Price + Register */}
                      <div className="mt-auto pt-3 space-y-3" style={{ borderTop: '1px solid #E2E8F0' }}>
                        <div>
                          {classItem.discount_percent > 0 ? (
                            <div>
                              <span className="text-sm line-through" style={{ color: '#94A3B8' }}>{formatPriceDisplay(classItem.price_per_session)}</span>
                              <span className="text-lg font-bold ml-1" style={{ color: '#2563EB' }}>
                                {formatPriceDisplay(classItem.price_per_session * (1 - classItem.discount_percent / 100))}
                                <span className="text-sm ml-1" style={{ color: '#EF4444' }}>(-{classItem.discount_percent}%)</span>
                              </span>
                            </div>
                          ) : (
                            <span className="text-lg font-bold" style={{ color: '#2563EB' }}>
                              {formatPriceDisplay(classItem.price_per_session)}/buổi
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => navigate('/auth?tab=signup&role=student')}
                          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                          style={{ background: '#2563EB' }}
                        >
                          Đăng ký học
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Stats Section ── */}
      <section className="py-12 px-4" style={{ background: '#F8FAFC' }}>
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="text-center py-6">
                <p className="text-3xl md:text-4xl font-bold mb-1" style={{ color: '#2563EB' }}>{stat.value}</p>
                <p className="text-sm" style={{ color: '#64748B' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section id="features" className="py-20 md:py-28 px-4" style={{ background: '#FFFFFF' }}>
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#0F172A' }}>
              Tại sao chọn <span style={{ color: '#2563EB' }}>EduTutor</span>?
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#64748B' }}>
              Nền tảng kết nối gia sư uy tín, giúp bạn tìm được gia sư phù hợp nhất.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1"
                style={{ background: '#FFFFFF', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 10px 40px -10px rgba(37,99,235,0.15)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110" style={{ background: '#EFF6FF' }}>
                  <feature.icon className="w-6 h-6" style={{ color: '#2563EB' }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#0F172A' }}>{feature.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 md:py-28 px-4" style={{ background: '#FFFFFF' }}>
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold" style={{ color: '#0F172A' }}>
              Bắt đầu <span style={{ color: '#2563EB' }}>dễ dàng</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Đăng ký tài khoản', desc: 'Tạo tài khoản miễn phí chỉ trong 30 giây.' },
              { step: '02', title: 'Tìm gia sư phù hợp', desc: 'Lọc theo môn học, khu vực, và đánh giá.' },
              { step: '03', title: 'Bắt đầu học', desc: 'Đăng ký lớp và bắt đầu hành trình học tập.' }
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="rounded-2xl p-8 border h-full transition-all duration-300 hover:-translate-y-1" style={{ background: '#FFFFFF', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <span className="text-6xl font-bold opacity-10" style={{ color: '#2563EB' }}>{item.step}</span>
                  <h3 className="text-xl font-semibold mt-4 mb-2" style={{ color: '#0F172A' }}>{item.title}</h3>
                  <p style={{ color: '#64748B' }}>{item.desc}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="w-6 h-6" style={{ color: '#93C5FD' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="py-20 px-4" style={{ background: '#F8FAFC' }}>
        <div className="container mx-auto max-w-4xl">
          <div className="rounded-3xl p-10 md:p-16 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Bắt đầu học ngay hôm nay
              </h2>
              <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto">
                Tham gia cộng đồng hơn 10,000 học viên đã tin tưởng EduTutor
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth?tab=signup&role=student">
                  <button className="px-8 py-3.5 rounded-xl text-base font-semibold flex items-center gap-2 transition-all duration-200 hover:scale-[1.02]" style={{ background: '#FFFFFF', color: '#2563EB' }}>
                    Đăng ký học viên
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </Link>
                <Link to="/auth?tab=signup&role=tutor">
                  <button className="px-8 py-3.5 rounded-xl text-base font-semibold border-2 text-white transition-all duration-200 hover:scale-[1.02]" style={{ borderColor: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.1)' }}>
                    Đăng ký gia sư
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 px-4 border-t" style={{ background: '#F8FAFC', borderColor: '#E2E8F0' }}>
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center gap-2.5 mb-4">
                <img src={logoImg} alt="EduTutor" className="w-9 h-9 rounded-xl object-cover" loading="eager" />
                <span className="text-xl font-bold" style={{ color: '#0F172A' }}>EduTutor</span>
              </Link>
              <p className="max-w-sm leading-relaxed" style={{ color: '#64748B' }}>
                Nền tảng kết nối gia sư và học viên uy tín hàng đầu Việt Nam.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4" style={{ color: '#0F172A' }}>Liên kết</h4>
              <ul className="space-y-2.5">
                <li><a href="#features" className="text-sm transition-colors hover:opacity-80" style={{ color: '#64748B' }}>Tính năng</a></li>
                <li><a href="#classes" className="text-sm transition-colors hover:opacity-80" style={{ color: '#64748B' }}>Lớp học</a></li>
                <li><Link to="/guides" className="text-sm transition-colors hover:opacity-80" style={{ color: '#64748B' }}>Hướng dẫn</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4" style={{ color: '#0F172A' }}>Liên hệ</h4>
              <ul className="space-y-2.5 text-sm" style={{ color: '#64748B' }}>
                <li>Email: contact@edututor.vn</li>
                <li>Hotline: 1900 xxxx</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-8 text-center text-sm" style={{ borderTop: '1px solid #E2E8F0', color: '#94A3B8' }}>
            © 2024 EduTutor. All rights reserved.
          </div>
        </div>
      </footer>

      <NearbyClassSearchModal
        open={nearbyModalOpen}
        onClose={() => setNearbyModalOpen(false)}
        onClassClick={() => navigate('/auth?tab=signup&role=student')}
        showRegisterButton
      />
    </div>
  );
};

export default Index;
