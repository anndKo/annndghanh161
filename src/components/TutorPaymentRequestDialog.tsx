import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';

interface ClassItem {
  id: string;
  name: string;
  price_per_session: number;
  tutor_percentage: number | null;
}

interface TutorPaymentRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TutorPaymentRequestDialog = ({ open, onOpenChange }: TutorPaymentRequestDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [amount, setAmount] = useState('');
  const [tutorEarnings, setTutorEarnings] = useState('');
  const [tutorPercentage, setTutorPercentage] = useState(70);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchClasses();
    }
  }, [open, user]);

  const fetchClasses = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, price_per_session, tutor_percentage')
        .eq('tutor_id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    const selectedClass = classes.find(c => c.id === classId);
    if (selectedClass) {
      const percentage = selectedClass.tutor_percentage || 70;
      setTutorPercentage(percentage);
      const earnings = selectedClass.price_per_session * (percentage / 100);
      setAmount(selectedClass.price_per_session.toString());
      setTutorEarnings(earnings.toString());
    }
  };

  const handleSubmit = async () => {
    if (!user || !selectedClassId || !tutorEarnings) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('tutor_payment_requests')
        .insert({
          tutor_id: user.id,
          class_id: selectedClassId,
          requested_amount: parseFloat(tutorEarnings),
          note: note.trim() || null,
        });

      if (error) throw error;

      toast({
        title: 'Đã gửi yêu cầu',
        description: 'Yêu cầu duyệt lớp đã được gửi đến Admin',
      });

      onOpenChange(false);
      setSelectedClassId('');
      setAmount('');
      setTutorEarnings('');
      setNote('');
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gửi nhiệm vụ</DialogTitle>
          <DialogDescription>
            Chọn lớp và gửi yêu cầu duyệt để nhận thanh toán
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Chọn lớp</Label>
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : classes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Bạn chưa có lớp nào</p>
            ) : (
              <Select value={selectedClassId} onValueChange={handleClassChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn lớp học" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} - {formatPrice(c.price_per_session * ((c.tutor_percentage || 70) / 100))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedClass && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tên lớp:</span>
                <span className="font-medium">{selectedClass.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Giá lớp:</span>
                <span>{formatPrice(selectedClass.price_per_session)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phần trăm gia sư:</span>
                <span>{tutorPercentage}%</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-primary">
                <span>Gia sư nhận:</span>
                <span>{formatPrice(parseFloat(tutorEarnings) || 0)} ({tutorPercentage}%)</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú cho Admin (tùy chọn)..."
              rows={3}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!selectedClassId || submitting}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Gửi yêu cầu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TutorPaymentRequestDialog;
