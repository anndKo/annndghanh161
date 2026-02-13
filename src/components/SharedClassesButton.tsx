import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Briefcase, MapPin, Monitor, Users, Clock, Loader2, Send } from 'lucide-react';
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
}

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

  // Realtime subscription for new shared classes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('shared-classes-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'classes',
        },
        (payload) => {
          const updatedClass = payload.new as any;
          if (updatedClass.is_shared) {
            fetchUnreadCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
    
    setMyRequests(data?.map(r => r.class_id) || []);
  };

  const handleRequestClass = async () => {
    if (!user || !selectedClass) return;

    setSubmitting(true);
    try {
      // Check if already requested
      const { data: existing } = await supabase
        .from('class_requests')
        .select('id')
        .eq('class_id', selectedClass.id)
        .eq('tutor_id', user.id)
        .single();

      if (existing) {
        toast({
          variant: 'destructive',
          title: 'Đã gửi yêu cầu',
          description: 'Bạn đã gửi yêu cầu cho lớp này rồi',
        });
        return;
      }

      const { error } = await supabase.from('class_requests').insert({
        class_id: selectedClass.id,
        tutor_id: user.id,
        note: note.trim() || null,
      });

      if (error) throw error;

      // Notify admins
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

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

      toast({
        title: 'Đã gửi yêu cầu',
        description: 'Yêu cầu nhận lớp đã được gửi về Admin',
      });

      setSelectedClass(null);
      setNote('');
      fetchMyRequests();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message || 'Không thể gửi yêu cầu',
      });
    } finally {
      setSubmitting(false);
    }
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
        onClick={() => setOpen(true)}
      >
        <Briefcase className="w-4 h-4" />
        <span className="hidden sm:inline">Lớp đang trống</span>
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Lớp đang cần gia sư
            </DialogTitle>
            <DialogDescription>
              Các lớp đang trống và cần gia sư. Bạn có thể gửi yêu cầu nhận lớp.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 max-h-[60vh] pr-4">
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
              <div className="space-y-4">
                {sharedClasses.map((classItem) => (
                  <Card 
                    key={classItem.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedClass?.id === classItem.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedClass(classItem)}
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
                          {myRequests.includes(classItem.id) && (
                            <Badge variant="outline">Đã gửi yêu cầu</Badge>
                          )}
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
                        {classItem.tutor_percentage && (
                          <p className="text-xs text-muted-foreground">
                            Gia sư nhận: {classItem.tutor_percentage}%
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {selectedClass && !myRequests.includes(selectedClass.id) && (
            <div className="border-t pt-4 space-y-4">
              <div className="space-y-2">
                <Label>Ghi chú (không bắt buộc)</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Giới thiệu ngắn về bản thân hoặc lý do muốn nhận lớp..."
                  rows={2}
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

export default SharedClassesButton;
