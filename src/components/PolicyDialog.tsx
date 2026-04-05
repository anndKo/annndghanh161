import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Shield, FileText, AlertTriangle, RefreshCw, Scale, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type PolicyType =
  | 'terms'
  | 'privacy'
  | 'refund'
  | 'dispute'
  | 'antifraud'
  | 'community';

interface PolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: PolicyType | null;
}

const iconMap: Record<PolicyType, React.ReactNode> = {
  terms: <FileText className="w-5 h-5" />,
  privacy: <Shield className="w-5 h-5" />,
  refund: <RefreshCw className="w-5 h-5" />,
  dispute: <Scale className="w-5 h-5" />,
  antifraud: <AlertTriangle className="w-5 h-5" />,
  community: <Users className="w-5 h-5" />,
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h3 className="font-semibold text-base mb-2">{title}</h3>
    {children}
  </section>
);

const BulletList = ({ items }: { items: string[] }) => (
  <ul className="list-disc pl-5 space-y-1">
    {items.map((item, i) => <li key={i}>{item}</li>)}
  </ul>
);

const NumberedList = ({ items }: { items: string[] }) => (
  <ol className="list-decimal pl-5 space-y-1">
    {items.map((item, i) => <li key={i}>{item}</li>)}
  </ol>
);

// Structure definitions for each policy type
type SectionDef = { key: string; type: 'text' | 'list' | 'numbered' | 'intro_list' };

const policyStructure: Record<PolicyType, SectionDef[]> = {
  terms: [
    { key: 's1', type: 'text' },
    { key: 's2', type: 'list' },
    { key: 's3', type: 'text' },
    { key: 's4', type: 'list' },
    { key: 's5', type: 'list' },
    { key: 's6', type: 'text' },
    { key: 's7', type: 'text' },
    { key: 's8', type: 'text' },
    { key: 's9', type: 'text' },
  ],
  privacy: [
    { key: 's1', type: 'list' },
    { key: 's2', type: 'list' },
    { key: 's3', type: 'intro_list' },
    { key: 's4', type: 'text' },
    { key: 's5', type: 'list' },
    { key: 's6', type: 'text' },
    { key: 's7', type: 'text' },
  ],
  refund: [
    { key: 's1', type: 'intro_list' },
    { key: 's2', type: 'list' },
    { key: 's3', type: 'numbered' },
    { key: 's4', type: 'list' },
    { key: 's5', type: 'text' },
  ],
  dispute: [
    { key: 's1', type: 'text' },
    { key: 's2', type: 'list' },
    { key: 's3', type: 'numbered' },
    { key: 's4', type: 'list' },
    { key: 's5', type: 'text' },
  ],
  antifraud: [
    { key: 's1', type: 'text' },
    { key: 's2', type: 'list' },
    { key: 's3', type: 'list' },
    { key: 's4', type: 'numbered' },
    { key: 's5', type: 'list' },
  ],
  community: [
    { key: 's1', type: 'text' },
    { key: 's2', type: 'list' },
    { key: 's3', type: 'list' },
    { key: 's4', type: 'list' },
    { key: 's5', type: 'intro_list' },
  ],
};

const PolicyDialog = ({ open, onOpenChange, type }: PolicyDialogProps) => {
  const { t } = useTranslation();

  if (!type) return null;

  const prefix = `policy.${type}`;
  const title = t(`${prefix}.title`);
  const icon = iconMap[type];
  const sections = policyStructure[type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            {icon}
            {title}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="px-6 py-4 max-h-[65vh]">
          <div className="space-y-4 text-sm leading-relaxed">
            <p className="text-muted-foreground">{t('policy.last_updated')}</p>
            {sections.map((sec) => {
              const sTitle = t(`${prefix}.${sec.key}_title`);
              const items = t(`${prefix}.${sec.key}_items`, { returnObjects: true }) as string[];

              switch (sec.type) {
                case 'text':
                  return <Section key={sec.key} title={sTitle}><p>{t(`${prefix}.${sec.key}_content`)}</p></Section>;
                case 'list':
                  return <Section key={sec.key} title={sTitle}><BulletList items={Array.isArray(items) ? items : []} /></Section>;
                case 'numbered':
                  return <Section key={sec.key} title={sTitle}><NumberedList items={Array.isArray(items) ? items : []} /></Section>;
                case 'intro_list':
                  return (
                    <Section key={sec.key} title={sTitle}>
                      <p>{t(`${prefix}.${sec.key}_intro`)}</p>
                      <BulletList items={Array.isArray(items) ? items : []} />
                    </Section>
                  );
                default:
                  return null;
              }
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default PolicyDialog;
