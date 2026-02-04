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
import { Loader2, UserPlus, Percent, Tag, Clock, Plus, X, MapPin } from 'lucide-react';
import { formatPriceInput, parsePriceInput } from '@/lib/formatPrice';

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

interface ScheduleItem {
  day: string;
  startTime: string;
  endTime: string;
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
  const [priceDisplay, setPriceDisplay] = useState('');
  
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
    // Address fields
    province: '',
    district: '',
    detailed_address: '',
    trial_days: '7',
    discount_percent: '0',
    tutor_percentage: '70',
  });
  
  // Schedule with different times for each day
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);

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

  const handlePriceChange = (value: string) => {
    const formatted = formatPriceInput(value);
    setPriceDisplay(formatted);
    setFormData(prev => ({ ...prev, price_per_session: String(parsePriceInput(formatted)) }));
  };

  const addScheduleItem = (day: string) => {
    if (!scheduleItems.find(s => s.day === day)) {
      setScheduleItems(prev => [...prev, { day, startTime: '', endTime: '' }]);
    }
  };

  const updateScheduleItem = (day: string, field: 'startTime' | 'endTime', value: string) => {
    setScheduleItems(prev => 
      prev.map(item => 
        item.day === day ? { ...item, [field]: value } : item
      )
    );
  };

  const removeScheduleItem = (day: string) => {
    setScheduleItems(prev => prev.filter(item => item.day !== day));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const priceValue = parsePriceInput(priceDisplay);
    if (!formData.name || !formData.subject || !formData.grade || priceValue <= 0) {
      toast({
        variant: 'destructive',
        title: 'Thiếu thông tin',
        description: 'Vui lòng điền đầy đủ các trường bắt buộc',
      });
      return;
    }

    // Validate schedule times
    for (const item of scheduleItems) {
      if (item.startTime && item.endTime && item.endTime <= item.startTime) {
        toast({
          variant: 'destructive',
          title: 'Lỗi thời gian',
          description: `Giờ kết thúc phải sau giờ bắt đầu cho ${item.day}`,
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      // Combine address fields
      const fullAddress = [formData.province, formData.district, formData.detailed_address]
        .filter(Boolean)
        .join(', ');

      // Format schedule as JSON string with day-specific times
      const scheduleDays = scheduleItems.map(s => s.day).join(', ');
      const scheduleData = scheduleItems.length > 0 
        ? JSON.stringify(scheduleItems)
        : null;

      // Get first schedule item times as default for backward compatibility
      const firstSchedule = scheduleItems[0];

      const { error } = await supabase.from('classes').insert({
        name: formData.name,
        subject: formData.subject,
        grade: formData.grade,
        description: formData.description || null,
        teaching_format: formData.teaching_format,
        class_type: formData.class_type,
        price_per_session: priceValue,
        max_students: parseInt(formData.max_students),
        tutor_id: formData.tutor_id && formData.tutor_id !== 'no-tutor' ? formData.tutor_id : null,
        is_active: true,
        address: fullAddress || null,
        trial_days: parseInt(formData.trial_days) || 7,
        discount_percent: discountEnabled ? parseInt(formData.discount_percent) || 0 : 0,
        tutor_percentage: parseInt(formData.tutor_percentage) || 70,
        schedule_days: scheduleDays || null,
        schedule_start_time: firstSchedule?.startTime || null,
        schedule_end_time: firstSchedule?.endTime || null,
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
        province: '',
        district: '',
        detailed_address: '',
        trial_days: '7',
        discount_percent: '0',
        tutor_percentage: '70',
      });
      setScheduleItems([]);
      setPriceDisplay('');
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

  const originalPrice = parsePriceInput(priceDisplay) || 0;
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

          {/* Address fields */}
          <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Địa chỉ (cho lớp offline)
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="province">Tỉnh/Thành phố</Label>
                <Input
                  id="province"
                  value={formData.province}
                  onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value }))}
                  placeholder="VD: TP. Hồ Chí Minh"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="district">Quận/Huyện/Thị xã</Label>
                <Input
                  id="district"
                  value={formData.district}
                  onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                  placeholder="VD: Quận 1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="detailed_address">Địa chỉ chi tiết</Label>
              <Input
                id="detailed_address"
                value={formData.detailed_address}
                onChange={(e) => setFormData(prev => ({ ...prev, detailed_address: e.target.value }))}
                placeholder="VD: 123 Nguyễn Huệ, Phường Bến Nghé"
              />
            </div>
          </div>

          {/* Schedule with different times per day */}
          <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Lịch học (thời gian riêng mỗi ngày)
            </Label>
            
            {/* Existing schedule items */}
            {scheduleItems.length > 0 && (
              <div className="space-y-2">
                {scheduleItems.map((item) => (
                  <div key={item.day} className="flex items-center gap-2 p-2 bg-background rounded border">
                    <Badge variant="secondary" className="min-w-[70px] justify-center">
                      {item.day}
                    </Badge>
                    <Input
                      type="time"
                      value={item.startTime}
                      onChange={(e) => updateScheduleItem(item.day, 'startTime', e.target.value)}
                      className="w-28"
                      placeholder="Bắt đầu"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="time"
                      value={item.endTime}
                      onChange={(e) => updateScheduleItem(item.day, 'endTime', e.target.value)}
                      className="w-28"
                      placeholder="Kết thúc"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeScheduleItem(item.day)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Add new day */}
            <div className="flex gap-2">
              <Select
                value=""
                onValueChange={(value) => addScheduleItem(value)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Thêm ngày học" />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.filter(day => !scheduleItems.find(s => s.day === day)).map(day => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  const nextDay = WEEKDAYS.find(d => !scheduleItems.find(s => s.day === d));
                  if (nextDay) addScheduleItem(nextDay);
                }}
                disabled={scheduleItems.length >= WEEKDAYS.length}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Học phí/buổi (VND) *</Label>
              <Input
                id="price"
                type="text"
                required
                value={priceDisplay}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="100,000"
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
