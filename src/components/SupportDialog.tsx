import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/untypedClient';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Clock, CheckCircle2, MessageSquare } from 'lucide-react';

export type SupportCategory = 'help_center' | 'contact_support' | 'support_request' | 'report_violation' | 'complaint';

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: SupportCategory | null;
}

const SupportDialog = ({ open, onOpenChange, category }: SupportDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [viewMode, setViewMode] = useState<'form' | 'history'>('form');

  const fetchMyRequests = async () => {
    if (!user || !category) return;
    setLoadingRequests(true);
    const { data } = await supabase
      .from('support_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('category', category)
      .order('created_at', { ascending: false });
    setMyRequests(data || []);
    setLoadingRequests(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !category) {
      toast({ title: t('support.login_to_submit'), variant: 'destructive' });
      return;
    }
    if (!subject.trim() || !content.trim()) return;

    setLoading(true);
    const { error } = await supabase.from('support_requests').insert({
      user_id: user.id,
      category,
      subject: subject.trim(),
      content: content.trim(),
    });

    if (error) {
      toast({ title: t('support.send_error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('support.send_success'), description: t('support.send_success_desc') });
      setSubject('');
      setContent('');
      fetchMyRequests();
    }
    setLoading(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && category) {
      fetchMyRequests();
      setViewMode('form');
    }
    onOpenChange(isOpen);
  };

  if (!category) return null;

  const categoryLabel = t(`support.${category}`);
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary" className="text-xs"><Clock className="w-3 h-3 mr-1" />{t('support.pending')}</Badge>;
      case 'responded': return <Badge className="bg-success text-success-foreground text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />{t('support.responded')}</Badge>;
      default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg">{categoryLabel}</DialogTitle>
          <DialogDescription>{t('support.description')}</DialogDescription>
        </DialogHeader>

        <div className="flex border-b px-6">
          <button
            className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${viewMode === 'form' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
            onClick={() => setViewMode('form')}
          >
            {t('support.tab_form')}
          </button>
          <button
            className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors relative ${viewMode === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
            onClick={() => { setViewMode('history'); fetchMyRequests(); }}
          >
            {t('support.tab_history')} ({myRequests.length})
          </button>
        </div>

        <ScrollArea className="max-h-[55vh]">
          {viewMode === 'form' ? (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">{t('support.subject')}</Label>
                <Input
                  id="subject"
                  placeholder={t('support.subject_placeholder')}
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">{t('support.content')}</Label>
                <Textarea
                  id="content"
                  placeholder={t('support.content_placeholder')}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={5}
                  required
                />
              </div>
              {!user && (
                <p className="text-sm text-destructive">{t('support.login_required')}</p>
              )}
              <Button type="submit" disabled={loading || !user} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                {t('support.submit')}
              </Button>
            </form>
          ) : (
            <div className="p-4 space-y-3">
              {loadingRequests ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : myRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  {t('support.no_requests')}
                </div>
              ) : (
                myRequests.map(req => (
                  <div key={req.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm">{req.subject}</p>
                      {statusBadge(req.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">{req.content}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString(locale)} {new Date(req.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {req.admin_response && (
                      <div className="bg-accent rounded-lg p-3 mt-2">
                        <p className="text-xs font-medium text-accent-foreground mb-1">{t('support.admin_response')}</p>
                        <p className="text-sm">{req.admin_response}</p>
                        {req.responded_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(req.responded_at).toLocaleDateString(locale)} {new Date(req.responded_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default SupportDialog;
