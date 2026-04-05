import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Briefcase, MapPin, Monitor, Users, Clock, Loader2, Send, Search, Navigation, ChevronUp, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SharedClass {
  id: string;
  display_id: string | null;
  name: string;
  subject: string;
  grade: string;
  teaching_format: string;
  class_type: string;
  price_per_session: number;
  max_students: number;
  address: string | null;
  schedule_days: string | null;
  schedule_start_time: string | null;
  schedule_end_time: string | null;
  tutor_percentage: number | null;
  latitude: number | null;
  longitude: number | null;
}

// Haversine distance calculation
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const SharedClassesButton = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [sharedClasses, setSharedClasses] = useState<SharedClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<SharedClass | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [addressSearch, setAddressSearch] = useState('');
  const [nearbyMode, setNearbyMode] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 20);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 20);
  };

  useEffect(() => {
    // Check scroll state when classes load
    const timer = setTimeout(handleScroll, 300);
    return () => clearTimeout(timer);
  }, [sharedClasses, nearbyMode, addressSearch]);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }
  }, [user]);

  useEffect(() => {
    if (open && user) {
      fetchSharedClasses();
      fetchMyRequests();
    }
  }, [open, user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('shared-classes-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'classes' }, (payload: any) => {
        if (payload.new?.is_shared) fetchUnreadCount();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchUnreadCount = async () => {
    const { count } = await supabase
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .eq('is_shared', true)
      .is('tutor_id', null);
    setUnreadCount(count || 0);
  };

  const fetchSharedClasses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('is_shared', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSharedClasses(data || []);
    } catch (error) {
      console.error('Error fetching shared classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRequests = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('class_requests')
      .select('class_id')
      .eq('tutor_id', user.id)
      .eq('status', 'pending');
    setMyRequests(data?.map((r: any) => r.class_id) || []);
  };

  const handleRequestClass = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user || !selectedClass || submitting) return;

    setSubmitting(true);
    try {
      const { data: existing } = await supabase
        .from('class_requests')
        .select('id')
        .eq('class_id', selectedClass.id)
        .eq('tutor_id', user.id)
        .single();

      if (existing) {
        toast({ variant: 'destructive', title: 'Đã gửi yêu cầu', description: 'Bạn đã gửi yêu cầu cho lớp này rồi' });
        setSubmitting(false);
        return;
      }

      const insertData: any = { class_id: selectedClass.id, tutor_id: user.id };
      if (note.trim()) insertData.note = note.trim();
      
      const { error } = await supabase.from('class_requests').insert(insertData);
      if (error) throw error;

      // Notify admins
      const { data: admins } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
      if (admins) {
        for (const admin of admins) {
          await supabase.from('notifications').insert({
            user_id: admin.user_id,
            type: 'class_request',
            title: 'Yêu cầu nhận lớp mới',
            message: `Có gia sư xin nhận lớp "${selectedClass.name}"`,
            related_id: selectedClass.id,
          });
        }
      }

      toast({ title: 'Đã gửi yêu cầu', description: 'Yêu cầu nhận lớp đã được gửi về Admin' });
      
      // Only close note section AFTER success
      setSelectedClass(null);
      setNote('');
      fetchMyRequests();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Lỗi', description: error.message || 'Không thể gửi yêu cầu' });
      // Do NOT close on error
    } finally {
      setSubmitting(false);
    }
  };

  const handleNearbySearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!navigator.geolocation) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Trình duyệt không hỗ trợ định vị' });
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearbyMode(true);
        setGettingLocation(false);
        toast({ title: 'Đã lấy vị trí', description: 'Đang sắp xếp lớp theo khoảng cách' });
      },
      () => {
        setGettingLocation(false);
        toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể lấy vị trí. Vui lòng cho phép truy cập vị trí.' });
      },
      { enableHighAccuracy: true }
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 relative"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      >
        <Briefcase className="w-4 h-4" />
        <span className="hidden sm:inline">Lớp đang trống</span>
        {unreadCount > 0 && (
          <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col z-[200]"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Lớp đang cần gia sư
            </DialogTitle>
            <DialogDescription>
              Các lớp đang trống và cần gia sư. Bạn có thể gửi yêu cầu nhận lớp.
            </DialogDescription>
          </DialogHeader>

          {/* Search and Nearby */}
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo địa chỉ..."
                value={addressSearch}
                onChange={(e) => setAddressSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={nearbyMode ? "default" : "outline"}
              size="sm"
              className="gap-1 flex-shrink-0"
              onClick={handleNearbySearch}
              onPointerDown={(e) => e.stopPropagation()}
              disabled={gettingLocation}
            >
              {gettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              <span className="hidden sm:inline">Gần đây</span>
            </Button>
            {nearbyMode && (
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setNearbyMode(false); setUserLocation(null); }}>
                ✕
              </Button>
            )}
          </div>

          {/* Scrollable class list with scroll buttons */}
          <div className="relative flex-1 min-h-0">
            <div
              ref={scrollRef}
              className="overflow-y-auto max-h-[55vh] pr-2 scroll-smooth"
              onScroll={handleScroll}
            >
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : sharedClasses.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Hiện không có lớp nào đang cần gia sư</p>
                </div>
              ) : (
                <SortedClassList
                  classes={sharedClasses}
                  addressSearch={addressSearch}
                  nearbyMode={nearbyMode}
                  userLocation={userLocation}
                  selectedClass={selectedClass}
                  myRequests={myRequests}
                  onSelect={(c) => { if (!myRequests.includes(c.id)) setSelectedClass(c); }}
                  formatPrice={formatPrice}
                />
              )}
            </div>
            {/* Scroll up button */}
            {canScrollUp && (
              <button
                onClick={() => scrollRef.current?.scrollBy({ top: -200, behavior: 'smooth' })}
                className="absolute top-0 left-1/2 -translate-x-1/2 z-10 bg-background/90 border rounded-full p-1 shadow-md hover:bg-accent transition-colors"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            )}
            {/* Scroll down button */}
            {canScrollDown && (
              <button
                onClick={() => scrollRef.current?.scrollBy({ top: 200, behavior: 'smooth' })}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10 bg-background/90 border rounded-full p-1 shadow-md hover:bg-accent transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
          </div>

          {selectedClass && !myRequests.includes(selectedClass.id) && (
            <div
              className="border-t pt-4 space-y-4"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="space-y-2">
                <Label>Ghi chú (không bắt buộc)</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Giới thiệu ngắn về bản thân hoặc lý do muốn nhận lớp..."
                  rows={2}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                />
              </div>
              <Button
                onClick={handleRequestClass}
                disabled={submitting}
                className="w-full"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Xin nhận lớp "{selectedClass.name}"
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

// Helper: count matching characters between search query and address
const countMatchingChars = (address: string, query: string): number => {
  if (!address || !query) return 0;
  const addrLower = address.toLowerCase();
  const queryLower = query.toLowerCase();
  let count = 0;
  for (const char of queryLower) {
    if (addrLower.includes(char)) count++;
  }
  if (addrLower.includes(queryLower)) count += queryLower.length * 2;
  return count;
};

// Sorted class list component
const SortedClassList = ({
  classes,
  addressSearch,
  nearbyMode,
  userLocation,
  selectedClass,
  myRequests,
  onSelect,
  formatPrice,
}: {
  classes: SharedClass[];
  addressSearch: string;
  nearbyMode: boolean;
  userLocation: { lat: number; lng: number } | null;
  selectedClass: SharedClass | null;
  myRequests: string[];
  onSelect: (c: SharedClass) => void;
  formatPrice: (p: number) => string;
}) => {
  const classesWithDistance = useMemo(() => {
    let result = classes.map(c => {
      let distance: number | null = null;
      if (userLocation && c.latitude && c.longitude) {
        distance = haversineDistance(userLocation.lat, userLocation.lng, c.latitude, c.longitude);
      }
      return { ...c, _distance: distance };
    });

    if (nearbyMode && userLocation) {
      // Filter only classes with location, sort by distance
      result = result
        .filter(c => c._distance !== null)
        .sort((a, b) => (a._distance || 0) - (b._distance || 0));
    } else if (addressSearch.trim()) {
      result = [...result].sort((a, b) => {
        const scoreA = countMatchingChars(a.address || '', addressSearch);
        const scoreB = countMatchingChars(b.address || '', addressSearch);
        return scoreB - scoreA;
      });
    }

    return result;
  }, [classes, addressSearch, nearbyMode, userLocation]);

  if (nearbyMode && classesWithDistance.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MapPin className="w-10 h-10 mx-auto mb-3 opacity-50" />
        <p>Không có lớp nào có vị trí gần bạn</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {classesWithDistance.map((classItem) => {
        const alreadyRequested = myRequests.includes(classItem.id);
        return (
          <Card
            key={classItem.id}
            className={`transition-all ${
              alreadyRequested ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'
            } ${selectedClass?.id === classItem.id ? 'ring-2 ring-primary' : ''}`}
            onClick={(e) => { e.stopPropagation(); onSelect(classItem); }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-mono text-primary">{classItem.display_id}</p>
                  <CardTitle className="text-base">{classItem.name}</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Badge variant={classItem.class_type === 'one_on_one' ? 'default' : 'secondary'}>
                    {classItem.class_type === 'one_on_one' ? '1 kèm 1' : 'Nhóm'}
                  </Badge>
                  {alreadyRequested && <Badge variant="outline">Đã gửi yêu cầu</Badge>}
                </div>
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
              {classItem.address && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                  <MapPin className="w-3 h-3" />
                  {classItem.address}
                </p>
              )}
              {classItem.schedule_days && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <Clock className="w-3 h-3" />
                  {classItem.schedule_days}
                  {classItem.schedule_start_time && ` | ${classItem.schedule_start_time.slice(0, 5)} - ${classItem.schedule_end_time?.slice(0, 5)}`}
                </div>
              )}
              <div className="flex items-center justify-between mt-3">
                <p className="text-sm">
                  <span className="text-primary font-semibold">{formatPrice(classItem.price_per_session)}</span>/buổi
                </p>
                <div className="flex items-center gap-2">
                  {classItem.tutor_percentage && (
                    <p className="text-xs text-muted-foreground">
                      Gia sư nhận: {classItem.tutor_percentage}%
                    </p>
                  )}
                  {classItem._distance !== null && (
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 rounded-md px-2 py-0.5 text-xs font-medium">
                      📍 {classItem._distance < 1 ? `${(classItem._distance * 1000).toFixed(0)} m` : `${classItem._distance.toFixed(1)} km`}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default SharedClassesButton;
