import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/hooks/useLanguage';
import { useToast } from '@/hooks/use-toast';
import { Globe, Check } from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();

  const handleLanguageChange = (lang: 'vi' | 'en') => {
    setLanguage(lang);
    toast({ title: t('common.success'), description: t('settings.saved') });
  };

  const languages = [
    { code: 'vi' as const, label: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'en' as const, label: 'English', flag: '🇬🇧' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t('settings.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">{t('settings.language._')}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{t('settings.language.description')}</p>
            <div className="flex flex-col gap-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors text-left ${
                    language === lang.code
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border hover:bg-muted/50 text-foreground'
                  }`}
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span className="flex-1 font-medium text-sm">{lang.label}</span>
                  {language === lang.code && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
