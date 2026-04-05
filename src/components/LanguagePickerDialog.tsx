import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { Globe } from 'lucide-react';

const LanguagePickerDialog = () => {
  const { showLanguagePicker, setShowLanguagePicker, setLanguage, t } = useLanguage();

  const handleSelect = (lang: 'vi' | 'en') => {
    setLanguage(lang);
    setShowLanguagePicker(false);
  };

  return (
    <Dialog open={showLanguagePicker} onOpenChange={setShowLanguagePicker}>
      <DialogContent className="max-w-xs">
        <DialogHeader className="items-center text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Globe className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle>{t('langpicker.title')}</DialogTitle>
          <DialogDescription>{t('langpicker.subtitle')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-2">
          <Button
            variant="outline"
            className="h-14 text-base gap-3 justify-start px-4"
            onClick={() => handleSelect('vi')}
          >
            <span className="text-2xl">🇻🇳</span>
            Tiếng Việt
          </Button>
          <Button
            variant="outline"
            className="h-14 text-base gap-3 justify-start px-4"
            onClick={() => handleSelect('en')}
          >
            <span className="text-2xl">🇬🇧</span>
            English
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LanguagePickerDialog;
