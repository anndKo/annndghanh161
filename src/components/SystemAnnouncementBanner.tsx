import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Announcement {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  target_role: string;
  priority: number;
}

const SystemAnnouncementBanner = () => {
  const { user, role } = useAuth();
  const { t } = useLanguage();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pendingDismiss, setPendingDismiss] = useState(false);

  useEffect(() => {
    if (!user || !role) return;
    fetchAnnouncements();
  }, [user, role]);

  const fetchAnnouncements = async () => {
    if (!user || !role) return;
    const { data: allAnnouncements } = await supabase
      .from('system_announcements')
      .select('id, title, content, image_url, target_role, priority')
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (!allAnnouncements?.length) return;
    const filtered = allAnnouncements.filter(a => a.target_role === 'all' || a.target_role === role);
    const { data: dismissed } = await supabase
      .from('dismissed_announcements')
      .select('announcement_id')
      .eq('user_id', user.id);

    const dismissedSet = new Set<string>((dismissed || []).map(d => d.announcement_id as string));
    setAnnouncements(filtered.filter(a => !dismissedSet.has(a.id)));
    setCurrentIndex(0);
  };

  const handleDismiss = async (announcementId: string) => {
    if (!user) return;
    try {
      await supabase.from('dismissed_announcements').insert({
        user_id: user.id,
        announcement_id: announcementId,
      });
    } catch (e) {
      console.error('Error dismissing announcement:', e);
    }
  };

  const handleClose = () => {
    if (pendingDismiss && current) handleDismiss(current.id);
    setPendingDismiss(false);
    setCurrentIndex(prev => prev + 1);
  };

  const current = announcements[currentIndex];
  if (!current) return null;

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-lg w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0 border-0 overflow-hidden rounded-2xl shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="relative bg-gradient-to-r from-primary via-primary/90 to-accent p-5 pb-4">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-primary-foreground/20 hover:bg-primary-foreground/40 text-primary-foreground transition-all duration-200"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-foreground/20 backdrop-blur-sm">
              <Megaphone className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-primary-foreground/70 uppercase tracking-wider">
                {t('announcement.system_label')}
              </p>
              <DialogTitle className="text-lg font-bold text-primary-foreground mt-0.5">{current.title}</DialogTitle>
            </div>
          </div>
          {announcements.length > 1 && (
            <div className="flex gap-1.5 mt-3">
              {announcements.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === currentIndex
                      ? 'w-6 bg-primary-foreground'
                      : i < currentIndex
                      ? 'w-3 bg-primary-foreground/40'
                      : 'w-3 bg-primary-foreground/20'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 max-h-[45vh]">
          <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{current.content}</p>
          {current.image_url && (
            <div className="mt-4 rounded-xl overflow-hidden border bg-muted/30">
              <img src={current.image_url} alt={current.title} className="w-full max-h-[220px] object-contain" />
            </div>
          )}
        </div>

        <div className="border-t bg-muted/20 px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`dismiss-${current.id}`}
              checked={pendingDismiss}
              onCheckedChange={(checked) => setPendingDismiss(!!checked)}
            />
            <label htmlFor={`dismiss-${current.id}`} className="text-xs text-muted-foreground cursor-pointer select-none">
              {t('announcement.dont_show_again')}
            </label>
          </div>
          <Button onClick={handleClose} className="w-full rounded-xl font-semibold" size="lg">
            {t('announcement.close_button')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SystemAnnouncementBanner;
