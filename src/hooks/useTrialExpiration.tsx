import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Hook to check and update expired trial enrollments
export const useTrialExpiration = (userId: string | undefined) => {
  useEffect(() => {
    if (!userId) return;

    const checkAndExpireTrials = async () => {
      try {
        // Get all trial enrollments for this user that have expired
        const { data: expiredEnrollments, error } = await supabase
          .from('enrollments')
          .select('id, class_id, trial_expires_at')
          .eq('student_id', userId)
          .eq('enrollment_type', 'trial')
          .eq('status', 'approved')
          .lt('trial_expires_at', new Date().toISOString());

        if (error) throw error;

        // Update each expired enrollment
        for (const enrollment of expiredEnrollments || []) {
          await supabase
            .from('enrollments')
            .update({
              status: 'removed',
              removal_reason: 'Hết hạn học thử'
            })
            .eq('id', enrollment.id);

          // Send notification
          await supabase.from('notifications').insert({
            user_id: userId,
            type: 'trial_expired',
            title: 'Hết hạn học thử',
            message: 'Thời gian học thử của bạn đã hết. Vui lòng đăng ký chính thức để tiếp tục học.',
            related_id: enrollment.class_id,
          });
        }
      } catch (error) {
        console.error('Error checking trial expirations:', error);
      }
    };

    // Check immediately
    checkAndExpireTrials();

    // Check every minute
    const interval = setInterval(checkAndExpireTrials, 60000);
    return () => clearInterval(interval);
  }, [userId]);
};

export default useTrialExpiration;
