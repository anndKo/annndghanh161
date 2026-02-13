import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, CalendarCheck, Eye, CheckCircle, XCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ClassItem {
  id: string;
  name: string;
  display_id: string | null;
  tutor_id: string | null;
  tutor_name?: string;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  attendance_date: string;
  checked_in: boolean;
  checked_in_at: string | null;
  student_name?: string;
  class_name?: string;
  tutor_name?: string;
  day_of_week?: string;
}

interface AdminAttendanceStatsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdminAttendanceStats = ({ open, onOpenChange }: AdminAttendanceStatsProps) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  useEffect(() => {
    if (open) {
      fetchClasses();
    }
  }, [open]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('classes')
        .select('id, name, display_id, tutor_id')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get tutor names
      const enrichedClasses = await Promise.all(
        (data || []).map(async (c) => {
          let tutorName = 'Chưa có';
          if (c.tutor_id) {
            const { data: profile } = await (supabase as any)
              .from('profiles')
              .select('full_name')
              .eq('user_id', c.tutor_id)
              .single();
            tutorName = profile?.full_name || 'Chưa có';
          }
          return { ...c, tutor_name: tutorName };
        })
      );

      setClasses(enrichedClasses);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (classId: string) => {
    setLoadingAttendance(true);
    try {
      const { data, error } = await (supabase as any)
        .from('attendance')
        .select('*')
        .eq('class_id', classId)
        .order('attendance_date', { ascending: false });

      if (error) throw error;

      // Get student names and class info
      const studentIds = [...new Set(data?.map(a => a.student_id) || [])];
      const { data: profiles } = await (supabase as any)
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', studentIds);

      const classInfo = classes.find(c => c.id === classId);

      const enrichedAttendance = (data || []).map(a => {
        const date = new Date(a.attendance_date);
        const dayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        return {
          ...a,
          student_name: profiles?.find(p => p.user_id === a.student_id)?.full_name || 'Học viên',
          class_name: classInfo?.name || 'Lớp học',
          tutor_name: classInfo?.tutor_name || 'Gia sư',
          day_of_week: dayNames[date.getDay()],
        };
      });

      setAttendance(enrichedAttendance);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleSelectClass = (classItem: ClassItem) => {
    setSelectedClass(classItem);
    fetchAttendance(classItem.id);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-primary" />
            Thống kê điểm danh
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-4">
          {/* Class list */}
          <div className="w-1/3 border-r border-border pr-4">
            <h3 className="font-medium mb-2">Danh sách lớp học</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {classes.map((c) => (
                    <div
                      key={c.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedClass?.id === c.id ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleSelectClass(c)}
                    >
                      <p className="text-xs font-mono text-primary">{c.display_id || c.id.slice(0, 8)}</p>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">Gia sư: {c.tutor_name}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Attendance table */}
          <div className="flex-1 overflow-hidden">
            {!selectedClass ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Chọn lớp để xem thống kê điểm danh</p>
              </div>
            ) : loadingAttendance ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : attendance.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Chưa có dữ liệu điểm danh cho lớp này</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên học viên</TableHead>
                      <TableHead>Tên lớp</TableHead>
                      <TableHead>Thứ</TableHead>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Gia sư</TableHead>
                      <TableHead className="text-center">Điểm danh</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.student_name}</TableCell>
                        <TableCell>{record.class_name}</TableCell>
                        <TableCell>{record.day_of_week}</TableCell>
                        <TableCell>{formatDate(record.attendance_date)}</TableCell>
                        <TableCell>{record.tutor_name}</TableCell>
                        <TableCell className="text-center">
                          {record.checked_in ? (
                            <CheckCircle className="w-5 h-5 text-success mx-auto" />
                          ) : (
                            <XCircle className="w-5 h-5 text-destructive mx-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminAttendanceStats;
