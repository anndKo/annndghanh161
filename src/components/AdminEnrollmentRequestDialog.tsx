import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Upload, GraduationCap, PlayCircle, CheckCircle2 } from 'lucide-react';

interface ClassItem {
  id: string;
  name: string;
  display_id: string | null;
  price_per_session: number;
  trial_days: number | null;
}

interface AdminEnrollmentRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
}

const AdminEnrollmentRequestDialog = ({ 
  open, 
  onOpenChange, 
  studentId, 
  studentName 
}: AdminEnrollmentRequestDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Trial form state
  const [trialClassId, setTrialClassId] = useState('');
  const [trialContent, setTrialContent] = useState('');
  const [trialDays, setTrialDays] = useState('7');
  
  // Real form state
  const [realClassId, setRealClassId] = useState('');
  const [realAmount, setRealAmount] = useState('');
  const [realContent, setRealContent] = useState('');
  const [realDays, setRealDays] = useState('30');
  const [paymentImage, setPaymentImage] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      fetchClasses();
    }
  }, [open]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, display_id, price_per_session, trial_days')
        .eq('is_active', true);

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadPaymentImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `payment-proofs/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('assignments')
      .upload(fileName, file);
    
    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage
      .from('assignments')
      .getPublicUrl(fileName);
    
    return data.publicUrl;
  };

  const handleTrialClassChange = (classId: string) => {
    setTrialClassId(classId);
    const selectedClass = classes.find(c => c.id === classId);
    if (selectedClass?.trial_days) {
      setTrialDays(String(selectedClass.trial_days));
    }
  };

  const handleRealClassChange = (classId: string) => {
    setRealClassId(classId);
    const selectedClass = classes.find(c => c.id === classId);
    if (selectedClass) {
      setRealAmount(String(selectedClass.price_per_session));
    }
  };

  const handleSubmitTrial = async () => {
    if (!user || !trialClassId) return;

    setSubmitting(true);
    try {
      const trialExpiresAt = new Date();
      trialExpiresAt.setDate(trialExpiresAt.getDate() + parseInt(trialDays));

      const { error } = await supabase
        .from('enrollment_requests')
        .insert({
          student_id: studentId,
          class_id: trialClassId,
          request_type: 'trial',
          content: trialContent.trim() || null,
          trial_expires_at: trialExpiresAt.toISOString(),
          enrollment_days: parseInt(trialDays),
          created_by: user.id,
        });

      if (error) throw error;

      // Create notification for student
      const selectedClass = classes.find(c => c.id === trialClassId);
      await supabase.from('notifications').insert({
        user_id: studentId,
        type: 'enrollment_request',
        title: 'Yêu cầu học thử',
        message: `Admin đã gửi yêu cầu học thử lớp ${selectedClass?.name || 'N/A'} (${trialDays} ngày). Vui lòng xác nhận.`,
        related_id: trialClassId,
      });

      toast({
        title: 'Đã gửi yêu cầu',
        description: `Yêu cầu học thử đã được gửi đến ${studentName}`,
      });

      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReal = async () => {
    if (!user || !realClassId || !realAmount) return;

    setSubmitting(true);
    try {
      let imageUrl = null;
      if (paymentImage) {
        imageUrl = await uploadPaymentImage(paymentImage);
      }

      const enrollmentExpiresAt = new Date();
      enrollmentExpiresAt.setDate(enrollmentExpiresAt.getDate() + parseInt(realDays));

      const { error } = await supabase
        .from('enrollment_requests')
        .insert({
          student_id: studentId,
          class_id: realClassId,
          request_type: 'real',
          content: realContent.trim() || null,
          amount: parseFloat(realAmount),
          payment_image_url: imageUrl,
          enrollment_days: parseInt(realDays),
          created_by: user.id,
        });

      if (error) throw error;

      // Create notification for student
      const selectedClass = classes.find(c => c.id === realClassId);
      await supabase.from('notifications').insert({
        user_id: studentId,
        type: 'enrollment_request',
        title: 'Yêu cầu học thật',
        message: `Admin đã gửi yêu cầu xác nhận học thật lớp ${selectedClass?.name || ''} với số tiền ${formatPrice(parseFloat(realAmount))} (${realDays} ngày). Vui lòng xác nhận.`,
      });

      toast({
        title: 'Đã gửi yêu cầu',
        description: `Yêu cầu học thật đã được gửi đến ${studentName}`,
      });

      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTrialClassId('');
    setTrialContent('');
    setTrialDays('7');
    setRealClassId('');
    setRealAmount('');
    setRealContent('');
    setRealDays('30');
    setPaymentImage(null);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gửi yêu cầu đến {studentName}</DialogTitle>
          <DialogDescription>
            Chọn loại yêu cầu bạn muốn gửi đến học viên
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="trial" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="trial" className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4" />
              Học thử
            </TabsTrigger>
            <TabsTrigger value="real" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Học thật
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trial" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Chọn lớp</Label>
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : classes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có lớp nào</p>
              ) : (
                <Select value={trialClassId} onValueChange={handleTrialClassChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn lớp học" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.display_id || c.id.slice(0, 8)} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="trialDays">Số ngày học thử</Label>
              <Input
                id="trialDays"
                type="number"
                min="1"
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
                placeholder="Nhập số ngày"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trialContent">Nội dung</Label>
              <Textarea
                id="trialContent"
                value={trialContent}
                onChange={(e) => setTrialContent(e.target.value)}
                placeholder="Ghi chú cho học viên..."
                rows={3}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSubmitTrial}
              disabled={!trialClassId || submitting}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Gửi yêu cầu học thử
            </Button>
          </TabsContent>

          <TabsContent value="real" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Chọn lớp</Label>
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : classes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có lớp nào</p>
              ) : (
                <Select value={realClassId} onValueChange={handleRealClassChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn lớp học" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.display_id || c.id.slice(0, 8)} - {c.name} ({formatPrice(c.price_per_session)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="realAmount">Số tiền (VNĐ)</Label>
              <Input
                id="realAmount"
                type="number"
                value={realAmount}
                onChange={(e) => setRealAmount(e.target.value)}
                placeholder="Nhập số tiền"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="realDays">Thời gian học thật (ngày)</Label>
              <Input
                id="realDays"
                type="number"
                min="1"
                value={realDays}
                onChange={(e) => setRealDays(e.target.value)}
                placeholder="Nhập số ngày"
              />
              <p className="text-xs text-muted-foreground">Học viên sẽ tự động rời lớp sau {realDays} ngày</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="realContent">Nội dung</Label>
              <Textarea
                id="realContent"
                value={realContent}
                onChange={(e) => setRealContent(e.target.value)}
                placeholder="Nội dung yêu cầu..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Ảnh chứng minh thanh toán</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  id="paymentImage"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setPaymentImage(e.target.files?.[0] || null)}
                />
                <label htmlFor="paymentImage" className="cursor-pointer">
                  {paymentImage ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm">{paymentImage.name}</span>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      <Upload className="w-8 h-8 mx-auto mb-2" />
                      <span className="text-sm">Nhấn để tải ảnh lên</span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleSubmitReal}
              disabled={!realClassId || !realAmount || submitting}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Gửi yêu cầu học thật
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AdminEnrollmentRequestDialog;
