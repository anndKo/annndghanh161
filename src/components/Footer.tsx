import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/untypedClient';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Mail, Phone, MapPin, Clock, Facebook, Youtube,
  Send, ChevronDown, ChevronUp, ExternalLink,
  Shield, HelpCircle, MessageSquare, AlertTriangle, FileText, BookOpen, Play, MessageCircleQuestion
} from 'lucide-react';
import logoImg from '@/assets/logo.png';
import PolicyDialog, { type PolicyType } from '@/components/PolicyDialog';
import SupportDialog, { type SupportCategory } from '@/components/SupportDialog';

const currentYear = new Date().getFullYear();

interface FooterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const FooterSection = ({ title, children, defaultOpen = false }: FooterSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="space-y-3">
      <h3 className="hidden md:block text-sm font-semibold uppercase tracking-wider text-primary-foreground/90">
        {title}
      </h3>
      <div className="hidden md:block">
        <div className="max-h-48 overflow-y-auto pr-1 space-y-2 custom-scrollbar">{children}</div>
      </div>
      <button
        className="md:hidden flex items-center justify-between w-full text-sm font-semibold uppercase tracking-wider text-primary-foreground/90"
        onClick={() => setOpen(!open)}
      >
        {title}
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="md:hidden max-h-40 overflow-y-auto pr-1 space-y-2 custom-scrollbar">{children}</div>
      )}
    </div>
  );
};

const FooterLink = ({ to, children, external, onClick }: { to?: string; children: React.ReactNode; external?: boolean; onClick?: () => void }) => {
  const cls = "flex items-center gap-1.5 text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors duration-200 cursor-pointer";
  if (onClick) return <button onClick={onClick} className={cls + " text-left"}>{children}</button>;
  if (external) return <a href={to} target="_blank" rel="noopener noreferrer" className={cls}>{children}<ExternalLink className="w-3 h-3 opacity-50" /></a>;
  return <Link to={to || '/'} className={cls} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>{children}</Link>;
};

const PolicyButton = ({ type, onClick, children }: { type: PolicyType; onClick: (type: PolicyType) => void; children: React.ReactNode }) => (
  <button onClick={() => onClick(type)} className="flex items-center gap-1.5 text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors duration-200 text-left">
    {children}
  </button>
);

const Footer = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [policyType, setPolicyType] = useState<PolicyType | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportCategory, setSupportCategory] = useState<SupportCategory | null>(null);
  const [guidesOpen, setGuidesOpen] = useState(false);
  const [guides, setGuides] = useState<any[]>([]);
  const [guidesLoading, setGuidesLoading] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null);
  const [videoFullscreen, setVideoFullscreen] = useState<string | null>(null);
  const [faqOpen, setFaqOpen] = useState(false);
  const [faqSelected, setFaqSelected] = useState<number | null>(null);

  const openPolicy = (type: PolicyType) => { setPolicyType(type); setPolicyOpen(true); };
  const openSupport = (cat: SupportCategory) => { setSupportCategory(cat); setSupportOpen(true); };

  const openGuides = async () => {
    setGuidesOpen(true);
    setGuidesLoading(true);
    const { data } = await supabase.from('guides').select('*').order('created_at', { ascending: false });
    setGuides(data || []);
    setGuidesLoading(false);
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  const faqItems = Array.from({ length: 10 }, (_, i) => ({
    q: t(`footer.faq_${i + 1}_q`),
    a: t(`footer.faq_${i + 1}_a`),
  }));

  return (
    <footer className="bg-gradient-to-b from-[hsl(213,40%,20%)] to-[hsl(213,45%,14%)] text-primary-foreground/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-8 lg:gap-6">

          {/* Brand */}
          <div className="lg:col-span-1 xl:col-span-1 space-y-4">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="EduTutor" className="w-10 h-10 rounded-xl object-cover" loading="eager" />
              <span className="text-lg font-bold text-primary-foreground">EduTutor</span>
            </div>
            <p className="text-sm text-primary-foreground/60 leading-relaxed">{t('footer.brand_desc')}</p>
            <p className="text-xs italic text-primary-foreground/40">{t('footer.slogan')}</p>
            <div className="flex items-center gap-3 pt-2">
              <a href="#" className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"><Facebook className="w-4 h-4" /></a>
              <a href="#" className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors text-xs font-bold">Zalo</a>
              <a href="#" className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.8.1V9.01a6.27 6.27 0 00-.8-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.77 1.52V6.84a4.84 4.84 0 01-1-.15z"/></svg>
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"><Youtube className="w-4 h-4" /></a>
            </div>
          </div>

          {/* Quick Links */}
          <FooterSection title={t('footer.quick_links')}>
            <FooterLink to="/">{t('footer.homepage')}</FooterLink>
            <FooterLink to="/">{t('footer.explore_classes')}</FooterLink>
            <FooterLink onClick={async () => {
              const { data: { session } } = await supabase.auth.getSession();
              navigate(session ? '/tutor/register' : '/auth');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}>{t('footer.register_tutor')}</FooterLink>
            <FooterLink onClick={openGuides}><BookOpen className="w-3.5 h-3.5 shrink-0" /> {t('footer.user_guide')}</FooterLink>
            <FooterLink onClick={() => { setFaqOpen(true); setFaqSelected(null); }}><MessageCircleQuestion className="w-3.5 h-3.5 shrink-0" /> {t('footer.faq')}</FooterLink>
            <FooterLink to="/#">{t('footer.blog')}</FooterLink>
          </FooterSection>

          {/* Account */}
          <FooterSection title={t('footer.account')}>
            <FooterLink to="/auth">{t('footer.login')}</FooterLink>
            <FooterLink to="/auth">{t('footer.signup')}</FooterLink>
            <FooterLink to="/student">{t('footer.manage_account')}</FooterLink>
            <FooterLink to="/student">{t('footer.transaction_history')}</FooterLink>
            <FooterLink to="/student">{t('footer.notifications')}</FooterLink>
            <FooterLink to="/student">{t('footer.settings_link')}</FooterLink>
          </FooterSection>

          {/* Policies */}
          <FooterSection title={t('footer.policies')}>
            <PolicyButton type="terms" onClick={openPolicy}><FileText className="w-3.5 h-3.5 shrink-0" /> {t('footer.terms_of_service')}</PolicyButton>
            <PolicyButton type="privacy" onClick={openPolicy}><Shield className="w-3.5 h-3.5 shrink-0" /> {t('footer.privacy_policy')}</PolicyButton>
            <PolicyButton type="refund" onClick={openPolicy}>{t('footer.refund_policy')}</PolicyButton>
            <PolicyButton type="dispute" onClick={openPolicy}>{t('footer.dispute_resolution')}</PolicyButton>
            <PolicyButton type="antifraud" onClick={openPolicy}><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {t('footer.anti_fraud')}</PolicyButton>
            <PolicyButton type="community" onClick={openPolicy}>{t('footer.community_policy')}</PolicyButton>
          </FooterSection>

          {/* Support + Contact + Newsletter */}
          <div className="space-y-6 md:col-span-2 lg:col-span-4 xl:col-span-1">
            <FooterSection title={t('footer.customer_support')}>
              <button onClick={() => openSupport('help_center')} className="flex items-center gap-1.5 text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors duration-200 text-left">
                <HelpCircle className="w-3.5 h-3.5 shrink-0" /> {t('footer.help_center')}
              </button>
              <button onClick={() => openSupport('contact_support')} className="flex items-center gap-1.5 text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors duration-200 text-left">
                <MessageSquare className="w-3.5 h-3.5 shrink-0" /> {t('footer.contact_support')}
              </button>
              <button onClick={() => openSupport('support_request')} className="flex items-center gap-1.5 text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors duration-200 text-left">
                {t('footer.send_support_request')}
              </button>
              <button onClick={() => openSupport('report_violation')} className="flex items-center gap-1.5 text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors duration-200 text-left">
                {t('footer.report_violation')}
              </button>
              <button onClick={() => openSupport('complaint')} className="flex items-center gap-1.5 text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors duration-200 text-left">
                {t('footer.service_complaint')}
              </button>
            </FooterSection>

            <FooterSection title={t('footer.contact')} defaultOpen>
              <div className="space-y-2 text-sm text-primary-foreground/60">
                <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 shrink-0" /><span>support@edututor.vn</span></div>
                <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 shrink-0" /><span>0123 456 789</span></div>
                <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 shrink-0" /><span>TP. Hồ Chí Minh, Việt Nam</span></div>
                <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 shrink-0" /><span>T2 – T7: 8:00 – 21:00</span></div>
              </div>
            </FooterSection>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-primary-foreground/90">{t('footer.newsletter')}</h3>
              <p className="text-xs text-primary-foreground/50">{t('footer.newsletter_desc')}</p>
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <Input
                  type="email"
                  placeholder={t('footer.email_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/40 text-sm"
                  required
                />
                <Button type="submit" size="sm" className="h-9 px-3 bg-primary hover:bg-primary/80 shrink-0"><Send className="w-4 h-4" /></Button>
              </form>
              {subscribed && <p className="text-xs text-green-400">{t('footer.subscribed')}</p>}
            </div>
          </div>
        </div>

        <Separator className="my-8 bg-primary-foreground/10" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-primary-foreground/40">
          <p>© {currentYear} EduTutor. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="#" className="hover:text-primary-foreground/70 transition-colors">Sitemap</Link>
            <button onClick={() => openPolicy('terms')} className="hover:text-primary-foreground/70 transition-colors">{t('footer.terms_short')}</button>
            <button onClick={() => openPolicy('privacy')} className="hover:text-primary-foreground/70 transition-colors">{t('footer.privacy_short')}</button>
          </div>
        </div>
      </div>

      <PolicyDialog open={policyOpen} onOpenChange={setPolicyOpen} type={policyType} />
      <SupportDialog open={supportOpen} onOpenChange={setSupportOpen} category={supportCategory} />

      {/* Guides Dialog */}
      <Dialog open={guidesOpen} onOpenChange={(v) => { setGuidesOpen(v); if (!v) { setSelectedGuide(null); setVideoFullscreen(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {t('footer.user_guide')}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="px-6 py-4 max-h-[65vh]">
            {guidesLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('footer.loading')}</p>
            ) : guides.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{t('footer.no_guides')}</p>
                <p className="text-xs text-muted-foreground/60">{t('footer.no_guides_desc')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {guides.map((guide) => (
                  <div key={guide.id} className="border rounded-lg overflow-hidden transition-all">
                    <button
                      onClick={() => setSelectedGuide(selectedGuide === guide.id ? null : guide.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <BookOpen className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-semibold text-sm truncate">{guide.title}</span>
                        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                          {guide.target_role === 'tutor' ? t('footer.guide_tutor') : guide.target_role === 'admin' ? t('footer.guide_admin') : t('footer.guide_student')}
                        </span>
                      </div>
                      <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${selectedGuide === guide.id ? 'rotate-180' : ''}`} />
                    </button>
                    {selectedGuide === guide.id && (
                      <div className="px-4 pb-4 space-y-3 border-t bg-muted/20">
                        {guide.content && <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed pt-3">{guide.content}</div>}
                        {guide.video_url && (
                          <button
                            onClick={() => setVideoFullscreen(guide.video_url)}
                            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors bg-primary/10 rounded-lg px-3 py-2"
                          >
                            <Play className="w-4 h-4" />
                            {t('footer.watch_video')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Video Fullscreen Dialog */}
      <Dialog open={!!videoFullscreen} onOpenChange={(v) => { if (!v) setVideoFullscreen(null); }}>
        <DialogContent className="max-w-5xl w-[95vw] p-0 gap-0 bg-black border-none">
          <DialogHeader className="absolute top-2 right-2 z-10">
            <DialogTitle className="sr-only">{t('footer.video_title')}</DialogTitle>
          </DialogHeader>
          {videoFullscreen && (
            <div className="aspect-video w-full">
              <iframe
                src={videoFullscreen.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* FAQ Dialog */}
      <Dialog open={faqOpen} onOpenChange={(v) => { setFaqOpen(v); if (!v) setFaqSelected(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <MessageCircleQuestion className="w-5 h-5 text-primary" />
              {t('footer.faq')}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="px-6 py-4 max-h-[65vh]">
            <div className="space-y-2">
              {faqItems.map((item, idx) => (
                <div key={idx} className="border rounded-lg overflow-hidden transition-all">
                  <button
                    onClick={() => setFaqSelected(faqSelected === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">{idx + 1}</span>
                      <span className="font-medium text-sm">{item.q}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${faqSelected === idx ? 'rotate-180' : ''}`} />
                  </button>
                  {faqSelected === idx && (
                    <div className="px-4 pb-4 border-t bg-muted/20">
                      <p className="text-sm text-muted-foreground leading-relaxed pt-3">{item.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </footer>
  );
};

export default Footer;
