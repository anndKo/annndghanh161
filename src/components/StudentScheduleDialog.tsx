import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen, User, Clock } from 'lucide-react';

interface ScheduleClass {
  id: string;
  name: string;
  subject: string;
  schedule_days: string | null;
  schedule_start_time: string | null;
  schedule_end_time: string | null;
  tutor_name?: string;
}

interface StudentScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Thứ 2' },
  { key: 'tuesday', label: 'Thứ 3' },
  { key: 'wednesday', label: 'Thứ 4' },
  { key: 'thursday', label: 'Thứ 5' },
  { key: 'friday', label: 'Thứ 6' },
  { key: 'saturday', label: 'Thứ 7' },
  { key: 'sunday', label: 'CN' },
];

const StudentScheduleDialog = ({ open, onOpenChange, userId }: StudentScheduleDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<Map<string, ScheduleClass[]>>(new Map());

  useEffect(() => {
    if (open && userId) {
      fetchSchedule();
    }
  }, [open, userId]);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      // Get enrolled classes
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select('class_id, classes(*)')
        .eq('student_id', userId)
        .eq('status', 'approved');

      if (error) throw error;

      // Get tutor names for each class
      const classesWithTutor: ScheduleClass[] = [];
      
      for (const enrollment of enrollments || []) {
        const classData = enrollment.classes as any;
        if (!classData) continue;
        
        let tutorName = 'Chưa có gia sư';
        if (classData.tutor_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', classData.tutor_id)
            .single();
          if (profile) tutorName = profile.full_name;
        }
        
        classesWithTutor.push({
          id: classData.id,
          name: classData.name,
          subject: classData.subject,
          schedule_days: classData.schedule_days,
          schedule_start_time: classData.schedule_start_time,
          schedule_end_time: classData.schedule_end_time,
          tutor_name: tutorName,
        });
      }

      // Group classes by day
      const scheduleMap = new Map<string, ScheduleClass[]>();
      DAYS_OF_WEEK.forEach(day => scheduleMap.set(day.key, []));

      classesWithTutor.forEach(cls => {
        if (cls.schedule_days) {
          try {
            const days = JSON.parse(cls.schedule_days);
            Object.keys(days).forEach(day => {
              if (days[day]) {
                const existing = scheduleMap.get(day) || [];
                existing.push(cls);
                scheduleMap.set(day, existing);
              }
            });
          } catch (e) {
            console.error('Error parsing schedule_days:', e);
          }
        }
      });

      setSchedule(scheduleMap);
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Lịch học của bạn
          </DialogTitle>
          <DialogDescription>
            Xem lịch học theo từng ngày trong tuần
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-7 gap-2 min-w-[700px]">
              {/* Header */}
              {DAYS_OF_WEEK.map(day => (
                <div 
                  key={day.key} 
                  className="text-center p-2 bg-primary/10 rounded-t-lg font-semibold text-sm"
                >
                  {day.label}
                </div>
              ))}
              
              {/* Schedule cells */}
              {DAYS_OF_WEEK.map(day => {
                const classes = schedule.get(day.key) || [];
                return (
                  <div 
                    key={`cell-${day.key}`} 
                    className="min-h-[150px] border rounded-b-lg p-1 bg-muted/20"
                  >
                    {classes.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                        Trống
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {classes.map((cls, idx) => (
                          <Card key={`${cls.id}-${idx}`} className="bg-primary/5 border-primary/20">
                            <CardContent className="p-2">
                              <p className="font-medium text-xs truncate" title={cls.name}>
                                {cls.name}
                              </p>
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 mt-1">
                                {cls.subject}
                              </Badge>
                              <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                                <User className="w-3 h-3" />
                                <span className="truncate">{cls.tutor_name}</span>
                              </div>
                              {cls.schedule_start_time && (
                                <div className="flex items-center gap-1 mt-1 text-[10px] text-primary">
                                  <Clock className="w-3 h-3" />
                                  <span>
                                    {formatTime(cls.schedule_start_time)} - {formatTime(cls.schedule_end_time)}
                                  </span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StudentScheduleDialog;
