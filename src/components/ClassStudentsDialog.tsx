import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Trash2, Users, AlertCircle, Edit, Clock, GraduationCap, PlayCircle } from 'lucide-react';

interface ClassStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className: string;
}

interface Student {
  enrollment_id: string;
  student_id: string;
  full_name: string;
  email: string;
  status: string;
  enrolled_at: string;
  removal_reason: string | null;
  enrollment_type: string | null;
  trial_expires_at: string | null;
  enrollment_expires_at: string | null;
}

const ClassStudentsDialog = ({
  open,
  onOpenChange,
  classId,
  className,
}: ClassStudentsDialogProps) => {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [removingStudent, setRemovingStudent] = useState<Student | null>(null);
  const [removalReason, setRemovalReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [newEnrollmentType, setNewEnrollmentType] = useState('');
  const [extendDays, setExtendDays] = useState('30');

  useEffect(() => {
    if (open && classId) {
      fetchStudents();
    }
  }, [open, classId]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select('*')
        .eq('class_id', classId);

      if (error) throw error;

      // Get student profiles
      const studentIds = enrollments?.map((e) => e.student_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', studentIds);

      const profileMap = new Map<string, { full_name: string; email: string }>(
        profiles?.map((p: any) => [p.user_id, { full_name: p.full_name, email: p.email }]) || []
      );

      const enrichedStudents: Student[] = (enrollments || []).map((e) => ({
        enrollment_id: e.id,
        student_id: e.student_id,
        full_name: profileMap.get(e.student_id)?.full_name || 'Học viên',
        email: profileMap.get(e.student_id)?.email || '',
        status: e.status,
        enrolled_at: e.enrolled_at,
        removal_reason: e.removal_reason,
        enrollment_type: e.enrollment_type,
        trial_expires_at: e.trial_expires_at,
        enrollment_expires_at: e.enrollment_expires_at,
      }));

      setStudents(enrichedStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStudent = async () => {
    if (!removingStudent || !removalReason.trim()) return;

    setProcessing(true);
    try {
      // Update enrollment with removal reason and change status to 'removed'
      const { error } = await supabase
        .from('enrollments')
        .update({
          status: 'removed',
          removal_reason: removalReason.trim(),
        })
        .eq('id', removingStudent.enrollment_id);

      if (error) throw error;

      // Send notification to student
      await supabase.from('notifications').insert({
        user_id: removingStudent.student_id,
        type: 'enrollment_removed',
        title: 'Đã bị buộc rời lớp',
        message: `Bạn đã bị buộc rời khỏi lớp "${className}". Lý do: ${removalReason.trim()}`,
        related_id: classId,
      });

      toast({
        title: 'Đã xóa học viên',
        description: `${removingStudent.full_name} đã bị xóa khỏi lớp`,
      });

      setRemovingStudent(null);
      setRemovalReason('');
      await fetchStudents();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleEditEnrollment = async () => {
    if (!editingStudent) return;

    setProcessing(true);
    try {
      const updateData: any = {};
      
      if (newEnrollmentType) {
        updateData.enrollment_type = newEnrollmentType;
        
        // Update expiration based on type
        const newExpiration = new Date();
        newExpiration.setDate(newExpiration.getDate() + parseInt(extendDays));
        
        if (newEnrollmentType === 'trial') {
          updateData.trial_expires_at = newExpiration.toISOString();
          updateData.enrollment_expires_at = null;
        } else {
          updateData.enrollment_expires_at = newExpiration.toISOString();
          updateData.trial_expires_at = null;
        }
      } else if (extendDays) {
        // Just extend current enrollment
        const newExpiration = new Date();
        newExpiration.setDate(newExpiration.getDate() + parseInt(extendDays));
        
        if (editingStudent.enrollment_type === 'trial') {
          updateData.trial_expires_at = newExpiration.toISOString();
        } else {
          updateData.enrollment_expires_at = newExpiration.toISOString();
        }
      }

      const { error } = await supabase
        .from('enrollments')
        .update(updateData)
        .eq('id', editingStudent.enrollment_id);

      if (error) throw error;

      // Notify student
      await supabase.from('notifications').insert({
        user_id: editingStudent.student_id,
        type: 'enrollment_updated',
        title: 'Cập nhật đăng ký',
        message: `Đăng ký lớp "${className}" đã được cập nhật. ${newEnrollmentType ? `Loại: ${newEnrollmentType === 'trial' ? 'Học thử' : 'Học thật'}` : ''} Gia hạn thêm ${extendDays} ngày.`,
        related_id: classId,
      });

      toast({
        title: 'Đã cập nhật',
        description: `Đăng ký của ${editingStudent.full_name} đã được cập nhật`,
      });

      setEditingStudent(null);
      setNewEnrollmentType('');
      setExtendDays('30');
      await fetchStudents();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const getEnrollmentTypeBadge = (student: Student) => {
    if (student.enrollment_type === 'trial') {
      const expiresAt = student.trial_expires_at ? new Date(student.trial_expires_at) : null;
      const now = new Date();
      const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      
      return (
        <Badge variant="outline" className="text-warning border-warning flex items-center gap-1">
          <PlayCircle className="w-3 h-3" />
          Học thử {daysLeft > 0 ? `(${daysLeft} ngày)` : '(Hết hạn)'}
        </Badge>
      );
    } else if (student.enrollment_type === 'real') {
      const expiresAt = student.enrollment_expires_at ? new Date(student.enrollment_expires_at) : null;
      const now = new Date();
      const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      
      return (
        <Badge className="bg-success flex items-center gap-1">
          <GraduationCap className="w-3 h-3" />
          Học thật {expiresAt ? `(${daysLeft > 0 ? daysLeft : 0} ngày)` : ''}
        </Badge>
      );
    }
    return <Badge variant="secondary">Chưa xác định</Badge>;
  };

  const getStatusBadge = (status: string, removalReason: string | null) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success">Đang học</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-warning border-warning">Chờ duyệt</Badge>;
      case 'removed':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Đã rời lớp
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Danh sách học viên
            </DialogTitle>
            <DialogDescription>
              Lớp: {className}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có học viên nào trong lớp
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Học viên</TableHead>
                    <TableHead>Loại đăng ký</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.enrollment_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{student.full_name}</p>
                          <p className="text-xs text-muted-foreground">{student.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Đăng ký: {formatDate(student.enrolled_at)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getEnrollmentTypeBadge(student)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getStatusBadge(student.status, student.removal_reason)}
                          {student.removal_reason && (
                            <p className="text-xs text-destructive">
                              Lý do: {student.removal_reason}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {student.status !== 'removed' && (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingStudent(student);
                                setNewEnrollmentType(student.enrollment_type || '');
                              }}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Sửa
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRemovingStudent(student)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Xóa
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Enrollment Dialog */}
      <Dialog open={!!editingStudent} onOpenChange={() => setEditingStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa đăng ký</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin đăng ký của {editingStudent?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Loại đăng ký</Label>
              <Select value={newEnrollmentType} onValueChange={setNewEnrollmentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại đăng ký" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Học thử</SelectItem>
                  <SelectItem value="real">Học thật</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Gia hạn thêm (ngày)</Label>
              <Input
                type="number"
                min="1"
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
                placeholder="Số ngày gia hạn"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditingStudent(null)}>
                Hủy
              </Button>
              <Button className="flex-1" onClick={handleEditEnrollment} disabled={processing}>
                {processing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Cập nhật
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removingStudent} onOpenChange={() => setRemovingStudent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa học viên khỏi lớp</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa <strong>{removingStudent?.full_name}</strong> khỏi lớp này?
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="removal-reason">Lý do xóa (bắt buộc)</Label>
            <Textarea
              id="removal-reason"
              placeholder="Nhập lý do xóa học viên..."
              value={removalReason}
              onChange={(e) => setRemovalReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveStudent}
              disabled={!removalReason.trim() || processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Xóa học viên
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ClassStudentsDialog;
