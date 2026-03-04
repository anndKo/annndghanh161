import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
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
  { key: 'monday', label: 'Thứ 2', aliases: ['thứ 2', 'thu 2', 'monday', 't2'] },
  { key: 'tuesday', label: 'Thứ 3', aliases: ['thứ 3', 'thu 3', 'tuesday', 't3'] },
  { key: 'wednesday', label: 'Thứ 4', aliases: ['thứ 4', 'thu 4', 'wednesday', 't4'] },
  { key: 'thursday', label: 'Thứ 5', aliases: ['thứ 5', 'thu 5', 'thursday', 't5'] },
  { key: 'friday', label: 'Thứ 6', aliases: ['thứ 6', 'thu 6', 'friday', 't6'] },
  { key: 'saturday', label: 'Thứ 7', aliases: ['thứ 7', 'thu 7', 'saturday', 't7'] },
  { key: 'sunday', label: 'CN', aliases: ['cn', 'chủ nhật', 'chu nhat', 'sunday'] },
];

const findDayKey = (input: string): string | null => {
  const normalized = input.trim().toLowerCase();
  for (const day of DAYS_OF_WEEK) {
    if (day.key === normalized) return day.key;
    if (day.aliases.some(a => normalized === a || normalized.includes(a))) return day.key;
  }
  return null;
};

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

      // Collect all tutor IDs first, then batch fetch
      const classesData: any[] = [];
      const tutorIds: string[] = [];
      
      for (const enrollment of enrollments || []) {
        const classData = enrollment.classes as any;
        if (!classData) continue;
        classesData.push(classData);
        if (classData.tutor_id && !tutorIds.includes(classData.tutor_id)) {
          tutorIds.push(classData.tutor_id);
        }
      }

      // Batch fetch all tutor names at once
      let tutorMap = new Map<string, string>();
      if (tutorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', tutorIds);
        (profiles || []).forEach((p: any) => tutorMap.set(p.user_id, p.full_name));
      }

      const classesWithTutor: ScheduleClass[] = classesData.map(classData => ({
        id: classData.id,
        name: classData.name,
        subject: classData.subject,
        schedule_days: classData.schedule_days,
        schedule_start_time: classData.schedule_start_time,
        schedule_end_time: classData.schedule_end_time,
        tutor_name: classData.tutor_id ? (tutorMap.get(classData.tutor_id) || 'Gia sư') : 'Chưa có gia sư',
      }));

      // Group classes by day
      const scheduleMap = new Map<string, ScheduleClass[]>();
      DAYS_OF_WEEK.forEach(day => scheduleMap.set(day.key, []));

      classesWithTutor.forEach(cls => {
        if (cls.schedule_days) {
          const raw = typeof cls.schedule_days === 'string' ? cls.schedule_days : String(cls.schedule_days);
          
          // Try as JSON object first: {"monday": true, "wednesday": true}
          try {
            const parsed = JSON.parse(raw);
            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
              Object.keys(parsed).forEach(key => {
                if (parsed[key]) {
                  const dayKey = findDayKey(key);
                  if (dayKey) {
                    const existing = scheduleMap.get(dayKey) || [];
                    existing.push(cls);
                    scheduleMap.set(dayKey, existing);
                  }
                }
              });
              return;
            }
          } catch {}

          // Try as plain text: "Thứ 2", "Thứ 2, Thứ 5", "monday,wednesday"
          const parts = raw.split(/[,;|]+/);
          for (const part of parts) {
            const dayKey = findDayKey(part);
            if (dayKey) {
              const existing = scheduleMap.get(dayKey) || [];
              existing.push(cls);
              scheduleMap.set(dayKey, existing);
            }
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
              {/* Header with class count */}
              {DAYS_OF_WEEK.map(day => {
                const classCount = (schedule.get(day.key) || []).length;
                return (
                  <div 
                    key={day.key} 
                    className="text-center p-2 bg-primary/10 rounded-t-lg font-semibold text-sm"
                  >
                    {day.label}
                    {classCount > 0 && (
                      <span className="ml-1 text-xs font-normal text-primary">({classCount})</span>
                    )}
                  </div>
                );
              })}
              
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
