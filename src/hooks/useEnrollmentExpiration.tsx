import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';

// Hook to check and update expired trial AND real enrollments
// Also sends warning notifications when enrollment is about to expire
export const useEnrollmentExpiration = (userId: string | undefined) => {
  useEffect(() => {
    if (!userId) return;

    const checkAndExpireEnrollments = async () => {
      try {
        const now = new Date();
        const nowIso = now.toISOString();
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Get all enrollments that need checking
        const { data: allEnrollments, error: fetchError } = await supabase
          .from('enrollments')
          .select('id, class_id, trial_expires_at, enrollment_expires_at, enrollment_type')
          .eq('student_id', userId)
          .eq('status', 'approved');

        if (fetchError) throw fetchError;

        for (const enrollment of allEnrollments || []) {
          const expiresAt = enrollment.enrollment_type === 'trial' 
            ? enrollment.trial_expires_at 
            : enrollment.enrollment_expires_at;

          if (!expiresAt) continue;

          const expiresDate = new Date(expiresAt);
          const enrollmentTypeText = enrollment.enrollment_type === 'trial' ? 'học thử' : 'học thật';

          // Check if expired
          if (expiresDate < now) {
            await supabase
              .from('enrollments')
              .update({
                status: 'removed',
                removal_reason: `Hết hạn ${enrollmentTypeText}`
              })
              .eq('id', enrollment.id);

            // Only send expiry notification if we haven't sent one for this class before
            const expType = enrollment.enrollment_type === 'trial' ? 'trial_expired' : 'enrollment_expired';
            const { data: existingExpiry } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', userId)
              .eq('type', expType)
              .eq('related_id', enrollment.class_id)
              .limit(1);

            if (!existingExpiry || existingExpiry.length === 0) {
              await supabase.from('notifications').insert({
                user_id: userId,
                type: expType,
                title: `Hết hạn ${enrollmentTypeText}`,
                message: `Thời gian ${enrollmentTypeText} của bạn đã hết. Vui lòng đăng ký lại để tiếp tục học.`,
                related_id: enrollment.class_id,
              });
            }
          } 
          // Check if expiring in 24 hours
          else if (expiresDate <= oneDayFromNow && expiresDate > now) {
            const hoursLeft = Math.ceil((expiresDate.getTime() - now.getTime()) / (60 * 60 * 1000));
            
            // Check if we already sent this notification today
            const { data: existingNotif } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', userId)
              .eq('type', 'enrollment_expiring_soon')
              .eq('related_id', enrollment.class_id)
              .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
              .limit(1);

            if (!existingNotif || existingNotif.length === 0) {
              await supabase.from('notifications').insert({
                user_id: userId,
                type: 'enrollment_expiring_soon',
                title: `⚠️ Sắp hết hạn ${enrollmentTypeText}!`,
                message: `Lớp học của bạn sẽ hết hạn trong ${hoursLeft} giờ nữa. Hãy gia hạn ngay!`,
                related_id: enrollment.class_id,
              });
            }
          }
          // Check if expiring in 3 days
          else if (expiresDate <= threeDaysFromNow && expiresDate > oneDayFromNow) {
            const daysLeft = Math.ceil((expiresDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
            
            // Check if we already sent this notification in the last 2 days
            const { data: existingNotif } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', userId)
              .eq('type', 'enrollment_expiring_3days')
              .eq('related_id', enrollment.class_id)
              .gte('created_at', new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString())
              .limit(1);

            if (!existingNotif || existingNotif.length === 0) {
              await supabase.from('notifications').insert({
                user_id: userId,
                type: 'enrollment_expiring_3days',
                title: `📅 Còn ${daysLeft} ngày ${enrollmentTypeText}`,
                message: `Lớp học của bạn sẽ hết hạn trong ${daysLeft} ngày nữa. Hãy chuẩn bị gia hạn!`,
                related_id: enrollment.class_id,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error checking enrollment expirations:', error);
      }
    };

    // Check immediately
    checkAndExpireEnrollments();

    // Check every minute
    const interval = setInterval(checkAndExpireEnrollments, 60000);
    return () => clearInterval(interval);
  }, [userId]);
};

export default useEnrollmentExpiration;
