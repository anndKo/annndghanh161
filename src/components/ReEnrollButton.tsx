import { useState } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw } from 'lucide-react';

// Admin ID for messaging
const ADMIN_ID = 'd8485baa-9af4-44e4-bf84-850fad8e7034';

interface ReEnrollButtonProps {
  classId: string;
  className: string;
  classDisplayId: string | null;
  onSuccess?: () => void;
}

const ReEnrollButton = ({ classId, className, classDisplayId, onSuccess }: ReEnrollButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleReEnroll = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Check if there's already a pending enrollment
      const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('id, status')
        .eq('class_id', classId)
        .eq('student_id', user.id)
        .eq('status', 'pending')
        .single();

      if (existingEnrollment) {
        toast({
          variant: 'destructive',
          title: 'Đã có yêu cầu',
          description: 'Bạn đã có yêu cầu đăng ký lớp này đang chờ duyệt',
        });
        return;
      }

      // Create new enrollment request
      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert({
          class_id: classId,
          student_id: user.id,
          status: 'pending',
        });

      if (enrollError) throw enrollError;

      // Send automatic message to admin
      const autoMessage = `🔄 Xin chào Admin, tôi muốn đăng ký lại lớp ${classDisplayId || classId.slice(0, 8)} - ${className}. Thời gian học trước đó của tôi đã hết hạn. Xin vui lòng xem xét.`;

      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: ADMIN_ID,
        content: autoMessage,
      });

      // Send notification to admin
      await supabase.from('notifications').insert({
        user_id: ADMIN_ID,
        type: 're_enrollment_request',
        title: 'Yêu cầu đăng ký lại lớp',
        message: `Học viên muốn đăng ký lại lớp ${className} sau khi hết hạn`,
        related_id: classId,
      });

      toast({
        title: 'Đã gửi yêu cầu',
        description: 'Yêu cầu đăng ký lại đã được gửi cho Admin. Vui lòng chờ duyệt.',
      });

      onSuccess?.();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message || 'Không thể gửi yêu cầu',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      onClick={handleReEnroll}
      disabled={loading}
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <RefreshCw className="w-4 h-4" />
      )}
      Đăng ký lại
    </Button>
  );
};

export default ReEnrollButton;
