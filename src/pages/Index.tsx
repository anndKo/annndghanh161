import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  GraduationCap,
  Users,
  BookOpen,
  Shield,
  CheckCircle2,
  ArrowRight,
  Star,
  Clock,
  MapPin,
  Monitor,
  User,
  Search,
  Filter,
  Tag,
  Calendar,
  ChevronDown,
  ChevronUp } from
'lucide-react';

const SUBJECTS = ['Toán', 'Vật Lý', 'Hóa Học', 'Sinh Học', 'Ngữ Văn', 'Tiếng Anh', 'Lịch Sử', 'Địa Lý', 'GDCD', 'Tin Học'];
const GRADES = ['Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5', 'Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9', 'Lớp 10', 'Lớp 11', 'Lớp 12'];

const DAY_LABELS: {[key: string]: string;} = {
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
  } catch {
    return scheduleDays;
  }
};

const removeDiacritics = (str: string) =>
str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd');

const Index = () => {
  const navigate = useNavigate();
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

  useEffect(() => {
    const fetchClasses = async () => {
      const { data } = await supabase.
      from('classes').
      select('*').
      eq('is_active', true).
      order('created_at', { ascending: false });
      setClasses(data || []);
      setLoadingClasses(false);
    };
    fetchClasses();
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

  const filteredClasses = classes.
  map((c) => {
    if (subjectFilter !== 'all' && c.subject !== subjectFilter) return null;
    if (gradeFilter !== 'all' && c.grade !== gradeFilter) return null;
    if (formatFilter !== 'all' && c.teaching_format !== formatFilter) return null;

    // Unified search: match against display_id, name, or address
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
      } catch {return null;}
    }
    if ((advancedFilters.startTime || advancedFilters.endTime) && c.schedule_start_time && c.schedule_end_time) {
      if (advancedFilters.startTime && c.schedule_start_time < advancedFilters.startTime) return null;
      if (advancedFilters.endTime && c.schedule_end_time > advancedFilters.endTime) return null;
    }
    return { ...c, _addressScore: addressScore };
  }).
  filter(Boolean).
  sort((a: any, b: any) => b._addressScore - a._addressScore);

  const features = [
  { icon: GraduationCap, title: 'Gia sư chất lượng', description: 'Đội ngũ gia sư được tuyển chọn kỹ lưỡng, có trình độ và kinh nghiệm' },
  { icon: Users, title: 'Học 1 kèm 1 hoặc nhóm', description: 'Linh hoạt lựa chọn hình thức học phù hợp với nhu cầu' },
  { icon: BookOpen, title: 'Đa dạng môn học', description: 'Từ Toán, Lý, Hóa đến Ngoại ngữ và các môn xã hội' },
  { icon: Shield, title: 'An toàn & Tin cậy', description: 'Hệ thống xác minh gia sư nghiêm ngặt, đảm bảo chất lượng' }];


  const stats = [
  { value: '500+', label: 'Gia sư' },
  { value: '10,000+', label: 'Học viên' },
  { value: '50+', label: 'Môn học' },
  { value: '98%', label: 'Hài lòng' }];


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">EduTutor</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Tính năng</a>
            <a href="#classes" className="text-muted-foreground hover:text-foreground transition-colors">Lớp học</a>
            <Link to="/auth" className="text-muted-foreground hover:text-foreground transition-colors">Đăng nhập</Link>
            <Button asChild size="sm"><Link to="/auth?tab=signup">Đăng ký ngay</Link></Button>
          </nav>
          <Button asChild variant="outline" size="sm" className="md:hidden"><Link to="/auth">Đăng nhập</Link></Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 md:pt-32 pb-8 md:pb-12 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-hero opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="container mx-auto max-w-6xl relative">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-6 md:space-y-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-accent px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm">
                <Star className="w-3 h-3 md:w-4 md:h-4 text-secondary" />
                <span className="text-accent-foreground">Nền tảng gia sư #1 Việt Nam</span>
              </div>
             <h1 className="font-bold text-left leading-tight">
                <span className="block whitespace-nowrap 
                  text-[28px] 
                  sm:text-[32px] 
                  md:text-[40px] 
                  lg:text-[52px] 
                  xl:text-[60px]">
                  Học tập hiệu quả cùng
                </span>
              
                <span className="block whitespace-nowrap text-gradient 
                  text-[28px] 
                  sm:text-[32px] 
                  md:text-[40px] 
                  lg:text-[52px] 
                  xl:text-[60px]">
                  gia sư chất lượng
                </span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-lg mt-3 md:mt-4">
                Kết nối với đội ngũ gia sư giỏi, được xác minh kỹ lưỡng. 
                Học online hoặc offline, theo lớp hoặc 1 kèm 1 - hoàn toàn theo ý bạn.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="xl" variant="hero">
                  <Link to="/auth?tab=signup&role=student">Tìm gia sư ngay<ArrowRight className="w-5 h-5" /></Link>
                </Button>
                <Button asChild size="xl" variant="outline">
                  <Link to="/auth?tab=signup&role=tutor">Đăng ký làm gia sư</Link>
                </Button>
              </div>

              {/* Search moved to classes section */}
              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) =>
                  <div key={i} className="w-10 h-10 rounded-full bg-gradient-primary border-2 border-card flex items-center justify-center text-xs text-primary-foreground font-medium">
                      {String.fromCharCode(64 + i)}
                    </div>
                  )}
                </div>
                <div className="text-sm">
                  <p className="font-semibold">500+ gia sư đang hoạt động</p>
                  <p className="text-muted-foreground">Sẵn sàng hỗ trợ bạn</p>
                </div>
              </div>
            </div>
            <div className="relative animate-fade-in-up hidden md:block" style={{ animationDelay: '0.2s' }}>
              <div className="aspect-square max-w-lg mx-auto relative">
                <div className="absolute inset-0 bg-gradient-hero rounded-3xl rotate-6 opacity-20" />
                <div className="absolute inset-0 bg-card rounded-3xl shadow-xl border border-border overflow-hidden">
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-primary flex items-center justify-center mb-6 animate-float">
                      <GraduationCap className="w-10 h-10 lg:w-12 lg:h-12 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl lg:text-2xl font-bold mb-2">Học mọi lúc, mọi nơi</h3>
                    <p className="text-muted-foreground text-sm">Online • Offline • Linh hoạt</p>
                  </div>
                </div>
                <div className="absolute -left-4 top-1/4 glass-card p-3 animate-float" style={{ animationDelay: '0.5s' }}>
                  <div className="flex items-center gap-2">
                    <Clock className="w-6 h-6 text-primary" />
                    <div><p className="font-semibold text-xs">Linh hoạt</p><p className="text-[10px] text-muted-foreground">24/7</p></div>
                  </div>
                </div>
                <div className="absolute -right-4 bottom-1/4 glass-card p-3 animate-float" style={{ animationDelay: '1s' }}>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-6 h-6 text-secondary" />
                    <div><p className="font-semibold text-xs">Toàn quốc</p><p className="text-[10px] text-muted-foreground">63 tỉnh thành</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Classes Section - moved up */}
      <section id="classes" className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-6">
            <h2 className="text-3xl md:text-4xl font-bold mb-2">
              <span className="text-gradient">Lớp học</span> đang mở
            </h2>
            <p className="text-muted-foreground">Tìm kiếm và đăng ký lớp học phù hợp với bạn</p>
          </div>

          {/* Search Filters - below title */}
          <div className="mb-6">
            <div className="flex justify-center gap-2 mb-4">
              <Button
                variant={searchFiltersOpen ? 'default' : 'outline'}
                onClick={() => setSearchFiltersOpen(!searchFiltersOpen)}
                className="gap-2">
                
                <Search className="w-4 h-4" />
                {searchFiltersOpen ? 'Thu bộ lọc' : 'Tìm kiếm'}
                {searchFiltersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setNearbyModalOpen(true)}>
                
                <MapPin className="w-4 h-4" />
                Tìm lớp gần đây
              </Button>
            </div>
            {searchFiltersOpen &&
            <div className="space-y-3 animate-fade-in">
                {/* Unified search + filters in one row on desktop */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Input placeholder="Tìm theo địa chỉ, mã lớp, tên lớp..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="md:col-span-1" />
                
                  <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                    <SelectTrigger><SelectValue placeholder="Môn học" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả môn</SelectItem>
                      {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={gradeFilter} onValueChange={setGradeFilter}>
                    <SelectTrigger><SelectValue placeholder="Khối lớp" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả lớp</SelectItem>
                      {GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={formatFilter} onValueChange={setFormatFilter}>
                    <SelectTrigger><SelectValue placeholder="Hình thức" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                      <SelectItem value="both">Cả hai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ClassFilterPanel onFilterChange={setAdvancedFilters} />
              </div>
            }
          </div>

          {/* Class Grid */}
          {loadingClasses ?
          <div className="text-center py-12 text-muted-foreground">Đang tải lớp học...</div> :
          filteredClasses.length === 0 ?
          <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Không tìm thấy lớp học nào</p>
            </div> :

          <div className="max-h-[800px] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Show distance if available */}
                {filteredClasses.map((classItem: any) =>
              <Card key={classItem.id} className="overflow-hidden hover:shadow-lg transition-shadow border border-border flex flex-col">
                    <CardContent className="p-4 flex flex-col flex-1 gap-3">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-mono text-primary">{classItem.display_id}</p>
                          <h3 className="font-semibold line-clamp-2">{classItem.name}</h3>
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0 ml-2">
                          {classItem.class_type === 'one_on_one' ? '1:1' : 'Nhóm'}
                        </Badge>
                      </div>
                      <div className="space-y-1.5 text-sm text-muted-foreground">
                        <p className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 flex-shrink-0" /><span>{classItem.subject} • {classItem.grade}</span></p>
                        <p className="flex items-center gap-1.5">
                          <Monitor className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{classItem.teaching_format === 'online' ? 'Online' : classItem.teaching_format === 'offline' ? 'Offline' : 'Online & Offline'}</span>
                        </p>
                        {classItem.schedule_days &&
                    <p className="flex items-start gap-1.5">
                            <Calendar className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <span className="break-words">
                              {formatScheduleDays(classItem.schedule_days)}
                              {classItem.schedule_start_time && classItem.schedule_end_time &&
                        <span className="ml-1">| {classItem.schedule_start_time?.substring(0, 5)} – {classItem.schedule_end_time?.substring(0, 5)}</span>
                        }
                            </span>
                          </p>
                    }
                        {classItem.address &&
                    <p className="flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /><span className="break-words">{classItem.address}</span></p>
                    }
                        {classItem.max_students &&
                    <p className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 flex-shrink-0" /><span>Tối đa {classItem.max_students} học viên</span></p>
                    }
                      </div>
                      {/* Price + Register - pushed to bottom */}
                      <div className="mt-auto pt-3 border-t border-border space-y-2">
                        <div>
                          {classItem.discount_percent > 0 ?
                      <div>
                              <span className="text-sm line-through text-muted-foreground">{formatPriceDisplay(classItem.price_per_session)}</span>
                              <span className="text-lg font-bold text-primary ml-1">
                                {formatPriceDisplay(classItem.price_per_session * (1 - classItem.discount_percent / 100))}
                                <span className="text-sm text-destructive ml-1">(-{classItem.discount_percent}%)</span>
                              </span>
                            </div> :

                      <span className="text-lg font-bold text-primary">{formatPriceDisplay(classItem.price_per_session)}/buổi</span>
                      }
                        </div>
                        <Button className="w-full" size="sm" onClick={() => navigate('/auth?tab=signup&role=student')}>
                          Đăng ký
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
              )}
              </div>
            </div>
          }
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-primary">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) =>
            <div key={index} className="text-center animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <p className="text-4xl md:text-5xl font-bold text-primary-foreground mb-2">{stat.value}</p>
                <p className="text-primary-foreground/80">{stat.label}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Tại sao chọn <span className="text-gradient">EduTutor</span>?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Chúng tôi mang đến giải pháp học tập toàn diện với đội ngũ gia sư chất lượng cao</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) =>
            <div key={index} className="group bg-card rounded-2xl p-6 border border-border card-hover animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center mb-4 group-hover:bg-gradient-primary transition-all duration-300">
                  <feature.icon className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="about" className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Bắt đầu chỉ với <span className="text-gradient">3 bước</span></h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
            { step: '01', title: 'Đăng ký tài khoản', desc: 'Tạo tài khoản miễn phí trong 30 giây' },
            { step: '02', title: 'Chọn môn học', desc: 'Tìm môn học và gia sư phù hợp' },
            { step: '03', title: 'Bắt đầu học', desc: 'Học online hoặc offline theo lịch của bạn' }].
            map((item, index) =>
            <div key={index} className="relative animate-fade-in" style={{ animationDelay: `${index * 0.2}s` }}>
                <div className="bg-card rounded-2xl p-8 border border-border h-full">
                  <span className="text-6xl font-bold text-gradient opacity-20">{item.step}</span>
                  <h3 className="text-xl font-semibold mt-4 mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
                {index < 2 &&
              <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="w-8 h-8 text-primary" />
                  </div>
              }
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-gradient-hero rounded-3xl p-8 md:p-12 text-center text-primary-foreground relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-10" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Sẵn sàng nâng cao kiến thức?</h2>
              <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">Tham gia cùng hàng nghìn học viên đã tin tưởng EduTutor</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="xl" variant="secondary">
                  <Link to="/auth?tab=signup&role=student">Đăng ký học ngay<ArrowRight className="w-5 h-5" /></Link>
                </Button>
                <Button asChild size="xl" className="bg-primary-foreground/20 text-primary-foreground border-2 border-primary-foreground/30 hover:bg-primary-foreground/30">
                  <Link to="/auth?tab=signup&role=tutor">Trở thành gia sư</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">EduTutor</span>
              </Link>
              <p className="text-muted-foreground max-w-sm">Nền tảng kết nối gia sư và học viên hàng đầu Việt Nam. Học tập hiệu quả, an toàn và tiện lợi.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Liên kết</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Về chúng tôi</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Điều khoản</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Chính sách</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Liên hệ</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>Email: contact@edututor.vn</li>
                <li>Hotline: 1900 xxxx</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground text-sm">© 2024 EduTutor. All rights reserved.</div>
        </div>
      </footer>

      <NearbyClassSearchModal
        open={nearbyModalOpen}
        onClose={() => setNearbyModalOpen(false)}
        onClassClick={() => navigate('/auth?tab=signup&role=student')}
        showRegisterButton />
      
    </div>);

};

export default Index;
