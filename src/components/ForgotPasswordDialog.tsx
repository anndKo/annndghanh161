import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, User, Phone, Mail, FileText } from 'lucide-react';
import { z } from 'zod';

const formSchema = z.object({
  fullName: z.string().trim().min(2, 'Họ tên phải có ít nhất 2 ký tự').max(100, 'Họ tên quá dài'),
  phone: z.string().trim().min(9, 'Số điện thoại không hợp lệ').max(15, 'Số điện thoại không hợp lệ'),
  email: z.string().trim().email('Email không hợp lệ').max(255, 'Email quá dài'),
  content: z.string().trim().min(10, 'Nội dung phải có ít nhất 10 ký tự').max(1000, 'Nội dung quá dài'),
});

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ForgotPasswordDialog = ({ open, onOpenChange }: ForgotPasswordDialogProps) => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    content: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = formSchema.parse(formData);
      setSubmitting(true);

      const { error } = await supabase.from('password_reset_requests').insert({
        full_name: validated.fullName,
        phone: validated.phone,
        email: validated.email,
        content: validated.content,
        status: 'pending',
      });

      if (error) throw error;

      // Send notification to admin
      const ADMIN_ID = 'd8485baa-9af4-44e4-bf84-850fad8e7034';
      await supabase.from('notifications').insert({
        user_id: ADMIN_ID,
        type: 'password_reset_request',
        title: 'Yêu cầu đặt lại mật khẩu',
        message: `${validated.fullName} yêu cầu đặt lại mật khẩu cho email ${validated.email}`,
      });

      toast({
        title: 'Đã gửi yêu cầu',
        description: 'Yêu cầu của bạn đã được gửi. Admin sẽ liên hệ bạn qua số điện thoại đã cung cấp.',
      });

      // Reset form and close
      setFormData({ fullName: '', phone: '', email: '', content: '' });
      onOpenChange(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      } else {
        toast({
          variant: 'destructive',
          title: 'Lỗi',
          description: 'Không thể gửi yêu cầu. Vui lòng thử lại sau.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quên mật khẩu</DialogTitle>
          <DialogDescription>
            Điền thông tin bên dưới để gửi yêu cầu đặt lại mật khẩu cho Admin
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-name" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Họ và tên
            </Label>
            <Input
              id="forgot-name"
              required
              value={formData.fullName}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              placeholder="Nguyễn Văn A"
            />
            {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="forgot-phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Số điện thoại liên hệ
            </Label>
            <Input
              id="forgot-phone"
              required
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="0987654321"
            />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="forgot-email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Gmail đã đăng ký
            </Label>
            <Input
              id="forgot-email"
              required
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@gmail.com"
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="forgot-content" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Nội dung yêu cầu
            </Label>
            <Textarea
              id="forgot-content"
              required
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Tôi quên mật khẩu và muốn được hỗ trợ đặt lại..."
              rows={4}
            />
            {errors.content && <p className="text-sm text-destructive">{errors.content}</p>}
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Gửi yêu cầu
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordDialog;
