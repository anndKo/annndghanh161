import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/untypedClient';
import { useLanguage } from '@/hooks/useLanguage';

const sections = Array.from({ length: 14 }, (_, i) => `s${i + 1}`);

const TermsOfServiceDialog = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const checkAcceptance = async () => {
      const { data } = await supabase
        .from('tos_acceptances')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!data) setOpen(true);
    };
    checkAcceptance();
  }, [user]);

  const handleAccept = async () => {
    if (!user || !agreed) return;
    setLoading(true);
    await supabase.from('tos_acceptances').insert({ user_id: user.id });
    setLoading(false);
    setOpen(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            {t('tos_dialog.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 max-h-[55vh] border rounded-lg overflow-y-auto">
          <div className="p-4 space-y-4 text-sm text-muted-foreground">
            {sections.map((key) => (
              <div key={key}>
                <h3 className="font-semibold text-foreground text-base">{t(`tos_dialog.${key}_title`)}</h3>
                <p className="whitespace-pre-line">{t(`tos_dialog.${key}_content`)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="tos-agree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
              className="mt-0.5"
            />
            <label htmlFor="tos-agree" className="text-sm font-medium cursor-pointer leading-relaxed">
              {t('tos_dialog.agree_label')}
            </label>
          </div>
          <Button onClick={handleAccept} disabled={!agreed || loading} className="w-full">
            {loading ? t('common.processing') : t('tos_dialog.accept_button')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TermsOfServiceDialog;
