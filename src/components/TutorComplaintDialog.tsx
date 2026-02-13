import { useState } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TutorComplaintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notificationId?: string;
}

const TutorComplaintDialog = ({ open, onOpenChange, notificationId }: TutorComplaintDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reason.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('tutor_complaints').insert({
        tutor_id: user.id,
        notification_id: notificationId || null,
        reason: reason.trim(),
      });

      if (error) throw error;

      toast({
        title: 'Đã gửi khiếu nại',
        description: 'Admin sẽ xem xét và phản hồi sớm nhất.',
      });

      setReason('');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Khiếu nại thanh toán</DialogTitle>
          <DialogDescription>
            Nhập lý do khiếu nại của bạn. Admin sẽ xem xét và phản hồi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Lý do khiếu nại</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do khiếu nại..."
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Hủy
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!reason.trim() || submitting}
              className="flex-1"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Gửi khiếu nại
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TutorComplaintDialog;