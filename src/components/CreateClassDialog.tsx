import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import { Loader2, UserPlus, Percent, Tag, Clock, Plus, X } from 'lucide-react';

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

interface CreateClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  tutorId?: string;
}

const CreateClassDialog = ({
  open,
  onOpenChange,
  onCreated,
  tutorId: initialTutorId,
}: CreateClassDialogProps) => {
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
    tutor_id: initialTutorId || '',
    address: '',
    trial_days: '7',
    discount_percent: '0',
    tutor_percentage: '70',
    schedule_start_time: '',
    schedule_end_time: '',
  });
  
  const [scheduleDays, setScheduleDays] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchApprovedTutors();
    }
  }, [open]);

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
    
    if (!formData.name || !formData.subject || !formData.grade || !formData.price_per_session) {
      toast({
        variant: 'destructive',
        title: 'Thiếu thông tin',
        description: 'Vui lòng điền đầy đủ các trường bắt buộc',
      });
      return;
    }

    // Validate time if both are provided
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
      const { error } = await supabase.from('classes').insert({
        name: formData.name,
        subject: formData.subject,
        grade: formData.grade,
        description: formData.description || null,
        teaching_format: formData.teaching_format,
        class_type: formData.class_type,
        price_per_session: parseFloat(formData.price_per_session),
        max_students: parseInt(formData.max_students),
        tutor_id: formData.tutor_id && formData.tutor_id !== 'no-tutor' ? formData.tutor_id : null,
        is_active: true,
        address: formData.address || null,
        trial_days: parseInt(formData.trial_days) || 7,
        discount_percent: discountEnabled ? parseInt(formData.discount_percent) || 0 : 0,
        tutor_percentage: parseInt(formData.tutor_percentage) || 70,
        schedule_days: scheduleDays.length > 0 ? scheduleDays.join(', ') : null,
        schedule_start_time: formData.schedule_start_time || null,
        schedule_end_time: formData.schedule_end_time || null,
      });

      if (error) throw error;

      // Notify tutor if assigned
      if (formData.tutor_id && formData.tutor_id !== 'no-tutor') {
        await supabase.from('notifications').insert({
          user_id: formData.tutor_id,
          type: 'class_assigned',
          title: 'Được phân công lớp mới',
          message: `Bạn đã được phân công dạy lớp "${formData.name}" - ${formData.subject}`,
        });
      }

      toast({
        title: 'Tạo lớp thành công',
        description: 'Lớp học mới đã được tạo',
      });

      // Reset form
      setFormData({
        name: '',
        subject: '',
        grade: '',
        description: '',
        teaching_format: 'both',
        class_type: 'group',
        price_per_session: '',
        max_students: '20',
        tutor_id: '',
        address: '',
        trial_days: '7',
        discount_percent: '0',
        tutor_percentage: '70',
        schedule_start_time: '',
        schedule_end_time: '',
      });
      setScheduleDays([]);
      setDiscountEnabled(false);

      onOpenChange(false);
      onCreated?.();
    } catch (error: any) {
      console.error('Error creating class:', error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message || 'Không thể tạo lớp học',
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
          <DialogTitle>Tạo lớp học mới</DialogTitle>
          <DialogDescription>
            Điền thông tin để tạo lớp học mới
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
            {tutors.length === 0 && !loadingTutors && (
              <p className="text-xs text-muted-foreground">Chưa có gia sư nào được duyệt</p>
            )}
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
                <RadioGroupItem value="online" id="format-online" className="peer sr-only" />
                <Label
                  htmlFor="format-online"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer text-center"
                >
                  <span className="text-sm font-medium">Online</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="offline" id="format-offline" className="peer sr-only" />
                <Label
                  htmlFor="format-offline"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer text-center"
                >
                  <span className="text-sm font-medium">Offline</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="both" id="format-both" className="peer sr-only" />
                <Label
                  htmlFor="format-both"
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
                <RadioGroupItem value="one_on_one" id="type-1on1" className="peer sr-only" />
                <Label
                  htmlFor="type-1on1"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer text-center"
                >
                  <span className="text-sm font-medium">1 kèm 1</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="group" id="type-group" className="peer sr-only" />
                <Label
                  htmlFor="type-group"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer text-center"
                >
                  <span className="text-sm font-medium">Nhóm</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Địa chỉ chi tiết (cho lớp offline)</Label>
            <Input
              id="address"
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
              <div className="flex flex-wrap gap-2 mb-2">
                {scheduleDays.map((day, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {day}
                    <button
                      type="button"
                      onClick={() => setScheduleDays(prev => prev.filter((_, i) => i !== index))}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (value && !scheduleDays.includes(value)) {
                      setScheduleDays(prev => [...prev, value]);
                    }
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Thêm ngày học" />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.filter(day => !scheduleDays.includes(day)).map(day => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const nextDay = WEEKDAYS.find(d => !scheduleDays.includes(d));
                    if (nextDay) setScheduleDays(prev => [...prev, nextDay]);
                  }}
                  disabled={scheduleDays.length >= WEEKDAYS.length}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
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
              <Label htmlFor="price">Học phí/buổi (VND) *</Label>
              <Input
                id="price"
                type="number"
                required
                min="0"
                value={formData.price_per_session}
                onChange={(e) => setFormData(prev => ({ ...prev, price_per_session: e.target.value }))}
                placeholder="150000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxStudents">Số học viên tối đa</Label>
              <Input
                id="maxStudents"
                type="number"
                min="1"
                value={formData.max_students}
                onChange={(e) => setFormData(prev => ({ ...prev, max_students: e.target.value }))}
                placeholder="20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trialDays">Số ngày học thử</Label>
              <Input
                id="trialDays"
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
              Tạo lớp
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateClassDialog;
