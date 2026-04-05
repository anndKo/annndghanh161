import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/untypedClient';
import { formatPriceDisplay } from '@/lib/formatPrice';
import LocationGuideModal from '@/components/LocationGuideModal';
import {
  X, Search, MapPin, BookOpen, Monitor, Users, User, Calendar,
  Tag, Loader2, Radar, Navigation, XCircle, HelpCircle
} from 'lucide-react';

const SUBJECTS = ['Toán', 'Vật Lý', 'Hóa Học', 'Sinh Học', 'Ngữ Văn', 'Tiếng Anh', 'Lịch Sử', 'Địa Lý', 'GDCD', 'Tin Học'];

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

interface NearbyClassSearchModalProps {
  open: boolean;
  onClose: () => void;
  onClassClick?: (classItem: any) => void;
  showRegisterButton?: boolean;
}

const NearbyClassSearchModal = ({ open, onClose, onClassClick, showRegisterButton = false }: NearbyClassSearchModalProps) => {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'found' | 'denied' | 'error'>('idle');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [showDeniedNotice, setShowDeniedNotice] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetchClasses = async () => {
      setLoading(true);
      const { data } = await supabase.from('classes').select('*').eq('is_active', true).order('created_at', { ascending: false });
      setClasses(data || []);
      setLoading(false);
    };
    fetchClasses();
    requestLocation();
  }, [open]);

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setShowDeniedNotice(true);
      return;
    }

    // Check permission state first
    try {
      const perm = await navigator.permissions.query({ name: 'geolocation' });
      if (perm.state === 'denied') {
        setPermissionDenied(true);
        setLocationStatus('denied');
        setShowDeniedNotice(true);
        return;
      }
    } catch {
      // permissions API not supported, proceed with request
    }

    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('found');
        setShowDeniedNotice(false);
        setPermissionDenied(false);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionDenied(true);
          setLocationStatus('denied');
        } else {
          setLocationStatus('error');
        }
        setShowDeniedNotice(true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const removeDiacritics = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd');

  const filteredClasses = classes
    .map(c => {
      if (subjectFilter !== 'all' && c.subject !== subjectFilter) return null;
      if (formatFilter !== 'all' && c.teaching_format !== formatFilter) return null;
      if (searchQuery) {
        const q = removeDiacritics(searchQuery.toLowerCase());
        const matchName = removeDiacritics((c.name || '').toLowerCase()).includes(q);
        const matchAddr = removeDiacritics((c.address || '').toLowerCase()).includes(q);
        const matchId = (c.display_id || '').toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchName && !matchAddr && !matchId) return null;
      }
      let dist = Infinity;
      if (userLocation && c.latitude && c.longitude) {
        dist = getDistance(userLocation.lat, userLocation.lng, c.latitude, c.longitude);
      }
      return { ...c, _distance: dist };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a._distance - b._distance);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm animate-fade-in pointer-events-none" />
      <div className="relative z-10 w-full h-full md:w-[95vw] md:h-[90vh] md:max-w-7xl md:rounded-2xl bg-background border border-border shadow-2xl flex flex-col md:flex-row overflow-hidden animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Panel */}
        <div className="w-full md:w-[40%] p-5 md:p-8 border-b md:border-b-0 md:border-r border-border flex flex-col gap-5 bg-card/50 overflow-y-auto flex-shrink-0 max-h-[45vh] md:max-h-full">
          <div className="flex items-center justify-center">
            <div className="relative w-20 h-20 md:w-28 md:h-28">
              <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
              <div className="absolute inset-2 rounded-full border-2 border-primary/30 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-4 rounded-full border-2 border-primary/40 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 md:w-7 md:h-7 text-primary" />
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-lg md:text-xl font-bold">Tìm lớp gần bạn</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {locationStatus === 'loading' && 'Đang xác định vị trí...'}
              {locationStatus === 'found' && '✓ Đã xác định vị trí, sắp xếp theo khoảng cách'}
              {locationStatus === 'denied' && '⚠ Vị trí bị từ chối. Bạn vẫn có thể tìm lớp bình thường.'}
              {locationStatus === 'error' && 'Không thể lấy vị trí. Kết quả không sắp xếp theo khoảng cách.'}
              {locationStatus === 'idle' && 'Cho phép truy cập vị trí để tìm lớp gần nhất'}
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên, địa chỉ, mã lớp..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 h-11 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Môn học" /></SelectTrigger>
              <SelectContent className="z-[200]">
                <SelectItem value="all">Tất cả môn</SelectItem>
                {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={formatFilter} onValueChange={setFormatFilter}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Hình thức" /></SelectTrigger>
              <SelectContent className="z-[200]">
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="both">Cả hai</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(locationStatus === 'error' || locationStatus === 'denied') && !showDeniedNotice && (
            <Button variant="outline" size="sm" onClick={requestLocation} className="gap-2 rounded-xl">
              <MapPin className="w-4 h-4" />
              Thử lại định vị
            </Button>
          )}
        </div>

        {/* Right Panel */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Location denied notice */}
          {showDeniedNotice && (
            <div className="mb-5 rounded-2xl border border-warning/30 bg-warning/5 p-5 animate-fade-in">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">Không thể lấy vị trí</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vui lòng bật định vị để tìm lớp gần bạn nhanh và chính xác hơn.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button size="sm" onClick={requestLocation} className="gap-1.5 rounded-xl">
                      <Navigation className="w-3.5 h-3.5" />
                      Bật vị trí lại
                    </Button>
                    {permissionDenied && (
                      <Button size="sm" variant="outline" onClick={() => setShowGuide(true)} className="gap-1.5 rounded-xl">
                        <HelpCircle className="w-3.5 h-3.5" />
                        Hướng dẫn bật vị trí
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setShowDeniedNotice(false)} className="gap-1.5 rounded-xl text-muted-foreground">
                      <XCircle className="w-3.5 h-3.5" />
                      Từ chối
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Đang tải lớp học...</p>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold">Không có lớp gần đây</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Không tìm thấy lớp học phù hợp. Hãy thử thay đổi bộ lọc hoặc mở rộng tìm kiếm.
              </p>
              <Button
                variant="outline"
                onClick={() => { setSearchQuery(''); setSubjectFilter('all'); setFormatFilter('all'); }}
                className="gap-2 rounded-xl"
              >
                <Search className="w-4 h-4" />
                Xem tất cả lớp
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredClasses.map((classItem: any) => (
                <Card
                  key={classItem.id}
                  className="overflow-hidden border border-border rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col"
                  onClick={() => onClassClick?.(classItem)}
                >
                  <CardContent className="p-4 flex flex-col flex-1 gap-2.5">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono text-primary">{classItem.display_id}</p>
                        <h3 className="font-semibold line-clamp-2 text-sm">{classItem.name}</h3>
                      </div>
                      <Badge variant="outline" className="text-[10px] flex-shrink-0 ml-2">
                        {classItem.class_type === 'one_on_one' ? '1:1' : 'Nhóm'}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1.5">
                        <BookOpen className="w-3 h-3 flex-shrink-0" />
                        {classItem.subject} • {classItem.grade}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Monitor className="w-3 h-3 flex-shrink-0" />
                        {classItem.teaching_format === 'online' ? 'Online' : classItem.teaching_format === 'offline' ? 'Offline' : 'Online & Offline'}
                      </p>
                      {classItem.schedule_days && (
                        <p className="flex items-start gap-1.5">
                          <Calendar className="w-3 h-3 flex-shrink-0 mt-0.5" />
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
                          <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          <span className="break-words">{classItem.address}</span>
                        </p>
                      )}
                    </div>
                    <div className="mt-auto pt-2 border-t border-border space-y-1.5">
                      <div>
                        {classItem.discount_percent > 0 ? (
                          <div>
                            <span className="text-xs line-through text-muted-foreground">{formatPriceDisplay(classItem.price_per_session)}</span>
                            <span className="text-sm font-bold text-primary ml-1">
                              {formatPriceDisplay(classItem.price_per_session * (1 - classItem.discount_percent / 100))}
                              <span className="text-xs text-destructive ml-1">(-{classItem.discount_percent}%)</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-primary">{formatPriceDisplay(classItem.price_per_session)}/buổi</span>
                        )}
                      </div>
                      {classItem._distance < Infinity && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="inline-flex items-center gap-1 font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-lg">
                            📍 Cách bạn {classItem._distance < 1 ? `${Math.round(classItem._distance * 1000)}m` : `${classItem._distance.toFixed(1)}km`}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <LocationGuideModal open={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
};

export default NearbyClassSearchModal;
