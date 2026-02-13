import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Loader2, CalendarCheck } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface EnrolledClass {
  id: string;
  name: string;
  display_id: string | null;
  tutor_name?: string;
}

interface AttendanceCheckInProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AttendanceCheckIn = ({ open, onOpenChange }: AttendanceCheckInProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<EnrolledClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchEnrolledClasses();
    }
  }, [open, user]);

  useEffect(() => {
    if (selectedClassId && user) {
      checkAlreadyCheckedIn();
    }
  }, [selectedClassId, user]);

  const fetchEnrolledClasses = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('class_id, classes(id, name, display_id, tutor_id)')
        .eq('student_id', user.id)
        .eq('status', 'approved');

      if (error) throw error;

      // Get tutor names
      const enrichedClasses = await Promise.all(
        (data || []).map(async (e: any) => {
          let tutorName = 'Gia sư';
          if (e.classes?.tutor_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', e.classes.tutor_id)
              .single();
            tutorName = profile?.full_name || 'Gia sư';
          }
          return {
            id: e.classes?.id,
            name: e.classes?.name,
            display_id: e.classes?.display_id,
            tutor_name: tutorName,
          };
        })
      );

      setClasses(enrichedClasses.filter(c => c.id));
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAlreadyCheckedIn = async () => {
    if (!user || !selectedClassId) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    const { data } = await supabase
      .from('attendance')
      .select('id')
      .eq('student_id', user.id)
      .eq('class_id', selectedClassId)
      .eq('attendance_date', today)
      .single();

    setAlreadyCheckedIn(!!data);
  };

  const handleCheckIn = async () => {
    if (!user || !selectedClassId) return;

    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase
        .from('attendance')
        .insert({
          student_id: user.id,
          class_id: selectedClassId,
          attendance_date: today,
          checked_in: true,
          checked_in_at: new Date().toISOString(),
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            variant: 'destructive',
            title: 'Đã điểm danh',
            description: 'Bạn đã điểm danh lớp này hôm nay rồi',
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: 'Điểm danh thành công',
        description: 'Bạn đã điểm danh thành công!',
      });

      onOpenChange(false);
      setSelectedClassId('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message || 'Không thể điểm danh',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-primary" />
            Điểm danh
          </DialogTitle>
          <DialogDescription>
            Chọn lớp học và xác nhận điểm danh cho buổi học hôm nay
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Bạn chưa được duyệt vào lớp nào
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Chọn lớp học</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn lớp để điểm danh" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.display_id || c.id.slice(0, 8)} - {c.name} ({c.tutor_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedClass && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="font-medium">{selectedClass.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Gia sư: {selectedClass.tutor_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ngày: {new Date().toLocaleDateString('vi-VN')}
                  </p>
                </div>
              )}

              {alreadyCheckedIn ? (
                <div className="flex items-center justify-center gap-2 p-4 bg-success/10 rounded-lg text-success">
                  <CheckCircle className="w-5 h-5" />
                  <span>Bạn đã điểm danh lớp này hôm nay</span>
                </div>
              ) : (
                <Button
                  onClick={handleCheckIn}
                  disabled={!selectedClassId || submitting}
                  className="w-full"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Xác nhận điểm danh
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceCheckIn;
