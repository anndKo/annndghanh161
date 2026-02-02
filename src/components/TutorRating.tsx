import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Star, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TutorRatingProps {
  tutorId: string;
  classId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRated?: () => void;
}

const TutorRating = ({
  tutorId,
  classId,
  open,
  onOpenChange,
  onRated,
}: TutorRatingProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existingRating, setExistingRating] = useState<number | null>(null);

  useEffect(() => {
    if (open && user) {
      checkExistingRating();
    }
  }, [open, user]);

  const checkExistingRating = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('tutor_ratings')
      .select('rating, comment')
      .eq('tutor_id', tutorId)
      .eq('student_id', user.id)
      .eq('class_id', classId)
      .single();

    if (data) {
      setExistingRating(data.rating);
      setRating(data.rating);
      setComment(data.comment || '');
    }
  };

  const handleSubmit = async () => {
    if (!user || rating === 0) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('tutor_ratings').upsert({
        tutor_id: tutorId,
        student_id: user.id,
        class_id: classId,
        rating,
        comment: comment.trim() || null,
      });

      if (error) throw error;

      toast({
        title: 'Đánh giá thành công',
        description: 'Cảm ơn bạn đã đánh giá gia sư!',
      });

      onOpenChange(false);
      onRated?.();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message || 'Không thể gửi đánh giá',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Đánh giá gia sư</DialogTitle>
          <DialogDescription>
            {existingRating
              ? 'Cập nhật đánh giá của bạn'
              : 'Chia sẻ trải nghiệm học tập của bạn'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star rating */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    star <= (hoverRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {rating === 0 && 'Chọn số sao'}
            {rating === 1 && 'Rất không hài lòng'}
            {rating === 2 && 'Không hài lòng'}
            {rating === 3 && 'Bình thường'}
            {rating === 4 && 'Hài lòng'}
            {rating === 5 && 'Rất hài lòng'}
          </p>

          {/* Comment */}
          <div className="space-y-2">
            <Textarea
              placeholder="Nhận xét về gia sư (không bắt buộc)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="w-full"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            {existingRating ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TutorRating;

// Component to display tutor's average rating
export const TutorStars = ({ tutorId }: { tutorId: string }) => {
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [totalRatings, setTotalRatings] = useState(0);

  useEffect(() => {
    fetchRatings();
  }, [tutorId]);

  const fetchRatings = async () => {
    const { data, error } = await supabase
      .from('tutor_ratings')
      .select('rating')
      .eq('tutor_id', tutorId);

    if (!error && data && data.length > 0) {
      const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
      setAvgRating(Math.round(avg * 10) / 10);
      setTotalRatings(data.length);
    }
  };

  if (avgRating === null) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground text-sm">
        <Star className="w-4 h-4" />
        <span>Chưa có đánh giá</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= Math.round(avgRating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground'
            }`}
          />
        ))}
      </div>
      <span className="text-sm font-medium">{avgRating}</span>
      <span className="text-sm text-muted-foreground">({totalRatings})</span>
    </div>
  );
};
