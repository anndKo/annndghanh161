import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw } from 'lucide-react';

interface ReEnrollButtonProps {
  classId: string;
  className: string;
  classDisplayId: string | null;
  onSuccess?: () => void;
  onOpenMessaging?: (autoMessage: string) => void;
}

const ReEnrollButton = ({ classId, className, classDisplayId, onSuccess, onOpenMessaging }: ReEnrollButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdmin = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1)
        .single();
      if (data) setAdminId(data.user_id);
    };
    fetchAdmin();
  }, []);

  const handleReEnroll = async () => {
    if (!user || !adminId) return;

    setLoading(true);
    try {
      // Check if there's already a pending enrollment
      const { data: existingEnrollments } = await supabase
        .from('enrollments')
        .select('id, status')
        .eq('class_id', classId)
        .eq('student_id', user.id);

      const hasPending = existingEnrollments?.some((e: any) => e.status === 'pending');
      if (hasPending) {
        toast({
          variant: 'destructive',
          title: 'Đã có yêu cầu',
          description: 'Bạn đã có yêu cầu đăng ký lớp này đang chờ duyệt',
        });
        return;
      }

      // Delete ALL old enrollments (RLS allows deleting expired approved ones)
      for (const e of (existingEnrollments || [])) {
        await supabase.from('enrollments').delete().eq('id', e.id);
      }

      // Create new enrollment request
      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert({
          class_id: classId,
          student_id: user.id,
          status: 'pending',
          enrollment_type: 'real',
        });

      if (enrollError) throw enrollError;

      // Build auto message
      const displayCode = classDisplayId || classId.slice(0, 8).toUpperCase();
      const autoMessage = `🔄 Xin chào Admin!\n\n📋 Tôi đã hết hạn học lớp:\n🏷️ Mã lớp: ${displayCode}\n📚 Tên lớp: ${className}\n\n✨ Tôi muốn đăng ký lại lớp này.\nXin Admin vui lòng xem xét và duyệt giúp. Cảm ơn! 🙏`;

      // Send the auto message directly to DB
      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: adminId,
        content: autoMessage,
      });

      // Send notification to admin
      await supabase.from('notifications').insert({
        user_id: adminId,
        type: 're_enrollment_request',
        title: 'Yêu cầu đăng ký lại lớp',
        message: `Học viên muốn đăng ký lại lớp ${className} (${displayCode}) sau khi hết hạn`,
        related_id: classId,
      });

      toast({
        title: '✅ Đã gửi yêu cầu',
        description: 'Yêu cầu đăng ký lại và tin nhắn đã được gửi cho Admin.',
      });

      // Open messaging system to show the conversation
      if (onOpenMessaging) {
        onOpenMessaging(autoMessage);
      }

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
      onClick={(e) => { e.stopPropagation(); handleReEnroll(); }}
      disabled={loading}
      className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
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
