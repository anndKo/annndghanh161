import { useState, useEffect, useRef, useCallback } from 'react';
import logoImg from '@/assets/logo.png';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/untypedClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Mail, Lock, User, ArrowLeft, Eye, EyeOff, HelpCircle, Shield, AlertTriangle } from 'lucide-react';
import ForgotPasswordDialog from '@/components/ForgotPasswordDialog';
import { z } from 'zod';
import { generateFingerprint, BehaviorTracker, detectBot, type DeviceFingerprint } from '@/lib/deviceFingerprint';
import { lovable } from '@/integrations/lovable/index';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
});
const signupSchema = z.object({
  fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự').max(100, 'Họ tên quá dài'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  confirmPassword: z.string(),
  role: z.enum(['student', 'tutor'])
}).refine(data => data.password === data.confirmPassword, {
  message: 'Mật khẩu không khớp',
  path: ['confirmPassword']
});

async function callAuthSecurity(body: Record<string, any>) {
  try {
    const { data, error } = await supabase.functions.invoke('auth-security', {
      body,
    });
    if (error) {
      console.error('Auth security error:', error);
      return { allowed: false, reason: 'security_unavailable' };
    }
    return data;
  } catch (error) {
    console.error('Auth security fetch failed:', error);
    return { allowed: false, reason: 'security_unavailable' };
  }
}

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, signUp, user, role, loading } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'signup' ? 'signup' : 'login');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  // Security state
  const [fingerprint, setFingerprint] = useState<DeviceFingerprint | null>(null);
  const [securityAvailable, setSecurityAvailable] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState<string | null>(null);
  const [isPermanentBlock, setIsPermanentBlock] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<string>('');
  const [securityWarning, setSecurityWarning] = useState<string>('');
  
  const behaviorTracker = useRef(new BehaviorTracker());
  const lastSubmitTime = useRef(0);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupFullName, setSignupFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupRole, setSignupRole] = useState<'student' | 'tutor'>(searchParams.get('role') === 'tutor' ? 'tutor' : 'student');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Generate fingerprint on mount & check block status
  useEffect(() => {
    window.scrollTo(0, 0);
    generateFingerprint().then(fp => {
      setFingerprint(fp);
      // Check if already blocked + get remaining attempts
      callAuthSecurity({
        action: 'check_block_status',
        fingerprint_hash: fp.hash,
      }).then(result => {
        if (result?.reason === 'security_unavailable') {
          setSecurityAvailable(false);
          setSecurityWarning('Hệ thống bảo mật tạm thời không khả dụng, vui lòng thử lại sau.');
          return;
        }

        if (result.blocked) {
          setIsBlocked(true);
          setBlockedUntil(result.blocked_until || null);
          setIsPermanentBlock(!!result.permanent);
          setRemainingAttempts(0);
        } else {
          // Always show remaining attempts if ≤ 3
          if (result.remaining_attempts !== undefined && result.remaining_attempts !== null) {
            setRemainingAttempts(result.remaining_attempts);
          }
        }
      });
    });
  }, []);

  // Countdown timer - re-check status when block expires
  useEffect(() => {
    if (!blockedUntil) {
      setCountdown('');
      return;
    }

    const updateCountdown = () => {
      const remaining = new Date(blockedUntil).getTime() - Date.now();
      if (remaining <= 0) {
        setIsBlocked(false);
        setBlockedUntil(null);
        setCountdown('');
        // Re-check status to get new remaining attempts
        if (fingerprint) {
          callAuthSecurity({
            action: 'check_block_status',
            fingerprint_hash: fingerprint.hash,
          }).then(result => {
            if (result.blocked) {
              setIsBlocked(true);
              setBlockedUntil(result.blocked_until || null);
              setIsPermanentBlock(!!result.permanent);
              setRemainingAttempts(0);
            } else {
              setRemainingAttempts(result.remaining_attempts ?? null);
            }
          });
        }
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setCountdown(`${minutes}m ${seconds}s`);
      } else {
        setCountdown(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [blockedUntil, fingerprint]);

  // Track keyboard behavior
  const handleKeyPress = useCallback(() => {
    behaviorTracker.current.trackKeyPress();
  }, []);

  // Track mouse
  useEffect(() => {
    const handler = () => behaviorTracker.current.trackMouseMove();
    document.addEventListener('mousemove', handler);
    return () => document.removeEventListener('mousemove', handler);
  }, []);

  // Anti-spam: minimum time between submits
  const canSubmit = () => {
    const now = Date.now();
    if (now - lastSubmitTime.current < 2000) {
      setSecurityWarning(t('security.too_fast'));
      return false;
    }
    lastSubmitTime.current = now;
    return true;
  };

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user && role) {
      switch (role) {
        case 'admin': navigate('/admin'); break;
        case 'tutor': navigate('/tutor'); break;
        case 'student': navigate('/student'); break;
      }
    }
  }, [user, role, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSecurityWarning('');

    if (!securityAvailable) return;
    if (!canSubmit()) return;
    if (isBlocked) return;

    try {
      const validated = loginSchema.parse({ email: loginEmail, password: loginPassword });
      setIsSubmitting(true);
      behaviorTracker.current.trackSubmit();

      // Security check before login
      if (fingerprint) {
        const secCheck = await callAuthSecurity({
          action: 'check_login',
          fingerprint_hash: fingerprint.hash,
          bot_signals: fingerprint.botDetection,
          behavior_metrics: behaviorTracker.current.getMetrics(),
          email: validated.email,
        });

        if (secCheck?.reason === 'security_unavailable') {
          setSecurityAvailable(false);
          setSecurityWarning('Hệ thống bảo mật tạm thời không khả dụng, vui lòng thử lại sau.');
          setIsSubmitting(false);
          return;
        }

        if (!secCheck.allowed) {
          if (secCheck.reason === 'bot_detected') {
            setSecurityWarning(t('security.bot_detected'));
            setIsSubmitting(false);
            return;
          }
          if (secCheck.reason === 'device_blocked' || secCheck.reason === 'too_many_attempts') {
            setIsBlocked(true);
            setBlockedUntil(secCheck.blocked_until || null);
            setIsPermanentBlock(!!secCheck.permanent);
            setIsSubmitting(false);
            return;
          }

          // Any other deny reason → stop
          setSecurityWarning(t('security.too_fast'));
          setIsSubmitting(false);
          return;
        }
        setRemainingAttempts(secCheck.remaining_attempts ?? null);
      }

      // Check blacklist
      const { data: isBlacklisted } = await supabase
        .rpc('is_email_blacklisted', { _email: validated.email.toLowerCase() });

      if (isBlacklisted) {
        toast({
          variant: 'destructive',
          title: t('auth.account_deleted'),
          description: t('auth.account_deleted_desc')
        });
        setIsSubmitting(false);
        return;
      }

      const { error } = await signIn(validated.email, validated.password);

      // Record attempt and get updated status
      if (fingerprint) {
        const recordResult = await callAuthSecurity({
          action: 'record_attempt',
          fingerprint_hash: fingerprint.hash,
          email: validated.email,
          success: !error,
        });

        if (recordResult.blocked) {
          setIsBlocked(true);
          setBlockedUntil(recordResult.blocked_until || null);
          setIsPermanentBlock(!!recordResult.permanent);
          setRemainingAttempts(0);
        } else if (recordResult.remaining_attempts !== undefined && recordResult.remaining_attempts !== null) {
          setRemainingAttempts(recordResult.remaining_attempts);
        }
      }

      if (error) {
        // Generic error message - don't reveal whether email exists
        toast({
          variant: 'destructive',
          title: t('auth.login_failed'),
          description: t('security.invalid_credentials')
        });
      } else {
        toast({
          title: t('auth.login_success'),
          description: t('auth.login_welcome')
        });
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .single();
          const userRole = roleData?.role;
          if (userRole === 'admin') navigate('/admin');
          else if (userRole === 'tutor') navigate('/tutor');
          else navigate('/student');
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) newErrors[err.path[0] as string] = err.message;
        });
        setErrors(newErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSecurityWarning('');

    if (!securityAvailable) return;
    if (!canSubmit()) return;
    if (isBlocked) return;

    try {
      const validated = signupSchema.parse({
        fullName: signupFullName,
        email: signupEmail,
        password: signupPassword,
        confirmPassword: signupConfirmPassword,
        role: signupRole
      });
      setIsSubmitting(true);
      behaviorTracker.current.trackSubmit();

      // Security check before signup
      if (fingerprint) {
        const secCheck = await callAuthSecurity({
          action: 'check_register',
          fingerprint_hash: fingerprint.hash,
          components: fingerprint.components,
          bot_signals: fingerprint.botDetection,
          behavior_metrics: behaviorTracker.current.getMetrics(),
          email: validated.email,
        });

        if (secCheck?.reason === 'security_unavailable') {
          setSecurityAvailable(false);
          setSecurityWarning('Hệ thống bảo mật tạm thời không khả dụng, vui lòng thử lại sau.');
          setIsSubmitting(false);
          return;
        }

        if (!secCheck.allowed) {
          if (secCheck.reason === 'bot_detected') {
            setSecurityWarning(t('security.bot_detected'));
            setIsSubmitting(false);
            return;
          }
          if (secCheck.reason === 'max_accounts') {
            setSecurityWarning(t('security.max_accounts').replace('{max}', String(secCheck.max)));
            setIsSubmitting(false);
            return;
          }
          if (secCheck.reason === 'device_blocked') {
            setIsBlocked(true);
            setBlockedUntil(secCheck.blocked_until || null);
            setIsPermanentBlock(!!secCheck.permanent);
            setIsSubmitting(false);
            return;
          }

          // Any other deny reason → stop
          setSecurityWarning(t('security.too_fast'));
          setIsSubmitting(false);
          return;
        }
      }

      const { error } = await signUp(validated.email, validated.password, validated.fullName, validated.role);
      
      if (error) {
        if (error.message.includes('User already registered')) {
          toast({
            variant: 'destructive',
            title: t('auth.signup_failed'),
            description: t('auth.email_exists')
          });
        } else {
          toast({
            variant: 'destructive',
            title: t('auth.signup_failed'),
            description: error.message
          });
        }
      } else {
        // Register device fingerprint for new user
        toast({
          title: t('auth.signup_success'),
          description: signupRole === 'tutor' ? t('auth.signup_tutor_desc') : t('auth.signup_student_desc')
        });
        
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && fingerprint) {
            await callAuthSecurity({
              action: 'register_device',
              fingerprint_hash: fingerprint.hash,
              components: fingerprint.components,
              user_id: session.user.id,
            });
          }
          if (session?.user) {
            if (signupRole === 'tutor') {
              navigate('/tutor/register');
            } else {
              const { data: roleData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id)
                .single();
              const userRole = roleData?.role;
              if (userRole === 'admin') navigate('/admin');
              else if (userRole === 'tutor') navigate('/tutor');
              else navigate('/student');
            }
          }
        }, 500);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) newErrors[err.path[0] as string] = err.message;
        });
        setErrors(newErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-hero opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      
      <div className="w-full max-w-md relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {t('auth.back')}
        </Link>
        
        <div className="flex items-center gap-3 mb-8">
          <img src={logoImg} alt="EduTutor" className="w-12 h-12 rounded-xl object-cover" loading="eager" />
          <div>
            <h1 className="text-2xl font-bold">EduTutor</h1>
            <p className="text-sm text-muted-foreground">{t('auth.platform')}</p>
          </div>
        </div>

        {/* Device blocked banner */}
        {isBlocked && (
          <div className="mb-4 p-4 rounded-xl border border-destructive/50 bg-destructive/10 space-y-2">
            <div className="flex items-center gap-2 text-destructive font-semibold">
              <Shield className="w-5 h-5" />
              {t('security.device_blocked_title')}
            </div>
            <p className="text-sm text-destructive/80">
              {isPermanentBlock
                ? t('security.permanent_block')
                : t('security.temporary_block')}
            </p>
            {countdown && (
              <div className="text-center">
                <span className="text-lg font-mono font-bold text-destructive">{countdown}</span>
                <p className="text-xs text-muted-foreground">{t('security.time_remaining')}</p>
              </div>
            )}
          </div>
        )}

        {/* Security warning */}
        {securityWarning && !isBlocked && (
          <div className="mb-4 p-3 rounded-lg border border-accent/50 bg-accent/10 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-accent-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-accent-foreground">{securityWarning}</p>
          </div>
        )}

        {/* Remaining attempts warning */}
        {remainingAttempts !== null && remainingAttempts <= 3 && remainingAttempts > 0 && !isBlocked && (
          <div className="mb-4 p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive font-medium">
              {t('security.attempts_remaining').replace('{count}', String(remainingAttempts))}
            </p>
          </div>
        )}
        
        <Card className="border-border/50 shadow-xl">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{t('auth.login')}</TabsTrigger>
                <TabsTrigger value="signup">{t('auth.signup')}</TabsTrigger>
              </TabsList>
            </CardHeader>
            
            <CardContent>
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">{t('auth.email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="email@example.com"
                        value={loginEmail}
                        onChange={e => setLoginEmail(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="pl-10"
                        disabled={isBlocked}
                      />
                    </div>
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">{t('auth.password')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="pl-10 pr-10"
                        disabled={isBlocked}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="text-muted-foreground hover:text-primary p-0 h-auto"
                      onClick={() => setForgotPasswordOpen(true)}
                    >
                      <HelpCircle className="w-3 h-3 mr-1" />
                      {t('auth.forgot_password')}
                    </Button>
                  </div>
                  
                  <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || isBlocked}>
                    {isSubmitting ? t('common.processing') : t('auth.login')}
                  </Button>
                  
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">{t('auth_google.or')}</span></div>
                  </div>
                  
                  <Button type="button" variant="outline" className="w-full" size="lg" disabled={isBlocked} onClick={async () => {
                    try {
                      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
                      if (result.error) { toast({ variant: 'destructive', title: t('auth.login_failed'), description: String(result.error) }); return; }
                      if (result.redirected) return;
                      toast({ title: t('auth.login_success'), description: t('auth.login_welcome') });
                    } catch (e: any) { toast({ variant: 'destructive', title: t('auth.login_failed'), description: e.message }); }
                  }}>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    {t('auth_google.signin_with_google')}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">{t('auth.fullname')}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Nguyễn Văn A"
                        value={signupFullName}
                        onChange={e => setSignupFullName(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="pl-10"
                        disabled={isBlocked}
                      />
                    </div>
                    {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t('auth.email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="email@example.com"
                        value={signupEmail}
                        onChange={e => setSignupEmail(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="pl-10"
                        disabled={isBlocked}
                      />
                    </div>
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t('auth.password')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={signupPassword}
                        onChange={e => setSignupPassword(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="pl-10 pr-10"
                        disabled={isBlocked}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">{t('auth.confirm_password')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-confirm"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={signupConfirmPassword}
                        onChange={e => setSignupConfirmPassword(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="pl-10"
                        disabled={isBlocked}
                      />
                    </div>
                    {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                  </div>
                  
                  <div className="space-y-3">
                    <Label>{t('auth.role_label')}</Label>
                    <RadioGroup value={signupRole} onValueChange={value => setSignupRole(value as 'student' | 'tutor')} className="grid grid-cols-2 gap-4">
                      <div>
                        <RadioGroupItem value="student" id="role-student" className="peer sr-only" />
                        <Label htmlFor="role-student" className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                          <User className="mb-2 h-6 w-6" />
                          <span className="text-sm font-medium">{t('role.student')}</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="tutor" id="role-tutor" className="peer sr-only" />
                        <Label htmlFor="role-tutor" className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                          <GraduationCap className="mb-2 h-6 w-6" />
                          <span className="text-sm font-medium">{t('role.tutor')}</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {signupRole === 'tutor' && (
                    <p className="text-sm text-muted-foreground bg-accent/50 p-3 rounded-lg">
                      {t('auth.tutor_note')}
                    </p>
                  )}
                  
                  <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || isBlocked}>
                    {isSubmitting ? t('common.processing') : t('auth.signup')}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Security badge */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60">
          <Shield className="w-3 h-3" />
          {t('security.protected_badge')}
        </div>
        
        <ForgotPasswordDialog 
          open={forgotPasswordOpen} 
          onOpenChange={setForgotPasswordOpen} 
        />
      </div>
    </div>
  );
};

export default Auth;
