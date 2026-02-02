import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, Percent, Tag, Clock } from 'lucide-react';

const SUBJECTS = [
  'Toán', 'Vật Lý', 'Hóa Học', 'Sinh Học', 'Ngữ Văn', 
  'Tiếng Anh', 'Lịch Sử', 'Địa Lý', 'GDCD', 'Tin Học'
];

const GRADES = ['Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5', 'Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9', 'Lớp 10', 'Lớp 11', 'Lớp 12'];

const WEEKDAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

interface Tutor {
  user_id: string;
  full_name: string;
  teachable_subjects: string[];
}

interface ClassItem {
  id: string;
  display_id: string | null;
  name: string;
  subject: string;
  grade: string;
  description?: string | null;
  teaching_format: string;
  class_type: string;
  price_per_session: number;
  max_students: number | null;
  tutor_id?: string | null;
  is_active: boolean;
  address?: string | null;
  trial_days?: number | null;
  discount_percent?: number | null;
  tutor_percentage?: number | null;
  schedule_days?: string | null;
  schedule_start_time?: string | null;
  schedule_end_time?: string | null;
}

interface EditClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classItem: ClassItem | null;
  onUpdated?: () => void;
}

const EditClassDialog = ({
  open,
  onOpenChange,
  classItem,
  onUpdated,
}: EditClassDialogProps) => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loadingTutors, setLoadingTutors] = useState(false);
  const [discountEnabled, setDiscountEnabled] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    grade: '',
    description: '',
    teaching_format: 'both' as 'online' | 'offline' | 'both',
    class_type: 'group' as 'one_on_one' | 'group',
    price_per_session: '',
    max_students: '20',
    tutor_id: '',
    is_active: true,
    address: '',
    trial_days: '7',
    discount_percent: '0',
    tutor_percentage: '70',
    schedule_days: '',
    schedule_start_time: '',
    schedule_end_time: '',
  });

  useEffect(() => {
    if (open && classItem) {
      const hasDiscount = (classItem.discount_percent || 0) > 0;
      setDiscountEnabled(hasDiscount);
      setFormData({
        name: classItem.name,
        subject: classItem.subject,
        grade: classItem.grade,
        description: classItem.description || '',
        teaching_format: classItem.teaching_format as any,
        class_type: classItem.class_type as any,
        price_per_session: String(classItem.price_per_session),
        max_students: String(classItem.max_students || 20),
        tutor_id: classItem.tutor_id || '',
        is_active: classItem.is_active,
        address: classItem.address || '',
        trial_days: String(classItem.trial_days || 7),
        discount_percent: String(classItem.discount_percent || 0),
        tutor_percentage: String(classItem.tutor_percentage || 70),
        schedule_days: classItem.schedule_days || '',
        schedule_start_time: classItem.schedule_start_time?.slice(0, 5) || '',
        schedule_end_time: classItem.schedule_end_time?.slice(0, 5) || '',
      });
      fetchApprovedTutors();
    }
  }, [open, classItem]);

  const fetchApprovedTutors = async () => {
    setLoadingTutors(true);
    try {
      const { data: applications, error } = await supabase
        .from('tutor_applications')
        .select('user_id, full_name, teachable_subjects')
        .eq('status', 'approved');

      if (error) throw error;
      setTutors(applications || []);
    } catch (error) {
      console.error('Error fetching tutors:', error);
    } finally {
      setLoadingTutors(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!classItem || !formData.name || !formData.subject || !formData.grade || !formData.price_per_session) {
      toast({
        variant: 'destructive',
        title: 'Thiếu thông tin',
        description: 'Vui lòng điền đầy đủ các trường bắt buộc',
      });
      return;
    }

    // Validate time
    if (formData.schedule_start_time && formData.schedule_end_time) {
      if (formData.schedule_end_time <= formData.schedule_start_time) {
        toast({
          variant: 'destructive',
          title: 'Lỗi thời gian',
          description: 'Giờ kết thúc phải sau giờ bắt đầu',
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      const newTutorId = formData.tutor_id && formData.tutor_id !== 'no-tutor' ? formData.tutor_id : null;
      const oldTutorId = classItem.tutor_id;

      const { error } = await supabase
        .from('classes')
        .update({
          name: formData.name,
          subject: formData.subject,
          grade: formData.grade,
          description: formData.description || null,
          teaching_format: formData.teaching_format,
          class_type: formData.class_type,
          price_per_session: parseFloat(formData.price_per_session),
          max_students: parseInt(formData.max_students),
          tutor_id: newTutorId,
          is_active: formData.is_active,
          address: formData.address || null,
          trial_days: parseInt(formData.trial_days) || 7,
          discount_percent: discountEnabled ? parseInt(formData.discount_percent) || 0 : 0,
          tutor_percentage: parseInt(formData.tutor_percentage) || 70,
          schedule_days: formData.schedule_days || null,
          schedule_start_time: formData.schedule_start_time || null,
          schedule_end_time: formData.schedule_end_time || null,
        })
        .eq('id', classItem.id);

      if (error) throw error;

      // Notify new tutor if changed
      if (newTutorId && newTutorId !== oldTutorId) {
        await supabase.from('notifications').insert({
          user_id: newTutorId,
          type: 'class_assigned',
          title: 'Được phân công lớp mới',
          message: `Bạn đã được phân công dạy lớp "${formData.name}" - ${formData.subject}`,
        });
      }

      toast({
        title: 'Cập nhật thành công',
        description: 'Lớp học đã được cập nhật',
      });

      onOpenChange(false);
      onUpdated?.();
    } catch (error: any) {
      console.error('Error updating class:', error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message || 'Không thể cập nhật lớp học',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const originalPrice = parseFloat(formData.price_per_session) || 0;
  const discountedPrice = discountEnabled && formData.discount_percent
    ? originalPrice - (originalPrice * (parseInt(formData.discount_percent) || 0) / 100)
    : originalPrice;
  const tutorEarnings = originalPrice * ((parseInt(formData.tutor_percentage) || 70) / 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa lớp học</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin lớp {classItem?.display_id || classItem?.id.slice(0, 8)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên lớp *</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="VD: Lớp Toán Nâng Cao"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Môn học *</Label>
              <Select
                value={formData.subject}
                onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn môn" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Lớp *</Label>
              <Select
                value={formData.grade}
                onValueChange={(value) => setFormData(prev => ({ ...prev, grade: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn lớp" />
                </SelectTrigger>
                <SelectContent>
                  {GRADES.map(grade => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tutor Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Chọn gia sư
            </Label>
            <Select
              value={formData.tutor_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, tutor_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingTutors ? "Đang tải..." : "Chọn gia sư (không bắt buộc)"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-tutor">Không chọn gia sư</SelectItem>
                {tutors.map(tutor => (
                  <SelectItem key={tutor.user_id} value={tutor.user_id}>
                    {tutor.full_name} ({tutor.teachable_subjects.slice(0, 2).join(', ')}{tutor.teachable_subjects.length > 2 ? '...' : ''})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Mô tả về lớp học..."
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Label>Hình thức dạy *</Label>
            <RadioGroup
              value={formData.teaching_format}
              onValueChange={(value) => setFormData(prev => ({ ...prev, teaching_format: value as any }))}
              className="grid grid-cols-3 gap-2"
            >
              <div>
                <RadioGroupItem value="online" id="edit-format-online" className="peer sr-only" />
                <Label
                  htmlFor="edit-format-online"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer text-center"
                >
                  <span className="text-sm font-medium">Online</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="offline" id="edit-format-offline" className="peer sr-only" />
                <Label
                  htmlFor="edit-format-offline"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer text-center"
                >
                  <span className="text-sm font-medium">Offline</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="both" id="edit-format-both" className="peer sr-only" />
                <Label
                  htmlFor="edit-format-both"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer text-center"
                >
                  <span className="text-sm font-medium">Cả hai</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>Loại lớp *</Label>
            <RadioGroup
              value={formData.class_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, class_type: value as any }))}
              className="grid grid-cols-2 gap-2"
            >
              <div>
                <RadioGroupItem value="one_on_one" id="edit-type-1on1" className="peer sr-only" />
                <Label
                  htmlFor="edit-type-1on1"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer text-center"
                >
                  <span className="text-sm font-medium">1 kèm 1</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="group" id="edit-type-group" className="peer sr-only" />
                <Label
                  htmlFor="edit-type-group"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer text-center"
                >
                  <span className="text-sm font-medium">Nhóm</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-address">Địa chỉ chi tiết (cho lớp offline)</Label>
            <Input
              id="edit-address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="VD: 123 Nguyễn Văn A, Quận 1, TP.HCM"
            />
          </div>

          {/* Schedule */}
          <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Lịch học
            </Label>
            <div className="space-y-2">
              <Label>Ngày học</Label>
              <Select
                value={formData.schedule_days}
                onValueChange={(value) => setFormData(prev => ({ ...prev, schedule_days: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn ngày học" />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map(day => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Giờ bắt đầu</Label>
                <Input
                  type="time"
                  value={formData.schedule_start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, schedule_start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Giờ kết thúc</Label>
                <Input
                  type="time"
                  value={formData.schedule_end_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, schedule_end_time: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-price">Học phí/buổi (VND) *</Label>
              <Input
                id="edit-price"
                type="number"
                required
                min="0"
                value={formData.price_per_session}
                onChange={(e) => setFormData(prev => ({ ...prev, price_per_session: e.target.value }))}
                placeholder="150000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-maxStudents">Số học viên tối đa</Label>
              <Input
                id="edit-maxStudents"
                type="number"
                min="1"
                value={formData.max_students}
                onChange={(e) => setFormData(prev => ({ ...prev, max_students: e.target.value }))}
                placeholder="20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-trialDays">Số ngày học thử</Label>
              <Input
                id="edit-trialDays"
                type="number"
                min="1"
                value={formData.trial_days}
                onChange={(e) => setFormData(prev => ({ ...prev, trial_days: e.target.value }))}
                placeholder="7"
              />
            </div>
          </div>

          {/* Discount Section */}
          <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Ưu đãi lớp học
              </Label>
              <Switch checked={discountEnabled} onCheckedChange={setDiscountEnabled} />
            </div>
            {discountEnabled && (
              <div className="space-y-2">
                <Label>Phần trăm giảm giá (%)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.discount_percent}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(100, parseInt(e.target.value) || 0));
                    setFormData(prev => ({ ...prev, discount_percent: String(val) }));
                  }}
                  placeholder="10"
                />
                {originalPrice > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Giá gốc: <span className="line-through">{formatPrice(originalPrice)}</span> → 
                    <span className="text-primary font-medium ml-1">{formatPrice(discountedPrice)}</span>
                    <span className="text-destructive ml-1">(-{formData.discount_percent}%)</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Tutor Percentage */}
          <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
            <Label className="flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Phần trăm trả cho Gia sư (%)
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.tutor_percentage}
              onChange={(e) => {
                const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                setFormData(prev => ({ ...prev, tutor_percentage: String(val) }));
              }}
              placeholder="70"
            />
            {originalPrice > 0 && (
              <p className="text-sm text-muted-foreground">
                Gia sư nhận: <span className="text-primary font-medium">{formatPrice(tutorEarnings)}</span>/buổi ({formData.tutor_percentage}%)
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Hủy
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Cập nhật
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditClassDialog;
