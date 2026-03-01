import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/untypedClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Mail, Lock, User, ArrowLeft, Eye, EyeOff, HelpCircle } from 'lucide-react';
import ForgotPasswordDialog from '@/components/ForgotPasswordDialog';
import { z } from 'zod';
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
const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    signIn,
    signUp,
    user,
    role,
    loading
  } = useAuth();
  const {
    toast
  } = useToast();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'signup' ? 'signup' : 'login');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

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

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user && role) {
      switch (role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'tutor':
          navigate('/tutor');
          break;
        case 'student':
          navigate('/student');
          break;
      }
    }
  }, [user, role, loading, navigate]);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    try {
      const validated = loginSchema.parse({
        email: loginEmail,
        password: loginPassword
      });
      setIsSubmitting(true);

      // Check if email is blacklisted first
      const { data: blacklisted } = await supabase
        .from('blacklisted_emails')
        .select('id')
        .eq('email', validated.email.toLowerCase())
        .maybeSingle();

      if (blacklisted) {
        toast({
          variant: 'destructive',
          title: 'Tài khoản không tồn tại',
          description: 'Tài khoản này đã bị xóa khỏi hệ thống'
        });
        setIsSubmitting(false);
        return;
      }

      const {
        error
      } = await signIn(validated.email, validated.password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            variant: 'destructive',
            title: 'Đăng nhập thất bại',
            description: 'Email hoặc mật khẩu không đúng'
          });
        } else if (error.message.includes('Email not confirmed')) {
          toast({
            variant: 'destructive',
            title: 'Đăng nhập thất bại',
            description: 'Email chưa được xác nhận. Vui lòng kiểm tra hộp thư.'
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Đăng nhập thất bại',
            description: error.message
          });
        }
      } else {
        toast({
          title: 'Đăng nhập thành công',
          description: 'Chào mừng bạn quay trở lại!'
        });
        // Fetch role and redirect
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
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
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
    try {
      const validated = signupSchema.parse({
        fullName: signupFullName,
        email: signupEmail,
        password: signupPassword,
        confirmPassword: signupConfirmPassword,
        role: signupRole
      });
      setIsSubmitting(true);
      const {
        error
      } = await signUp(validated.email, validated.password, validated.fullName, validated.role);
      if (error) {
        if (error.message.includes('User already registered')) {
          toast({
            variant: 'destructive',
            title: 'Đăng ký thất bại',
            description: 'Email này đã được sử dụng'
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Đăng ký thất bại',
            description: error.message
          });
        }
      } else {
        toast({
          title: 'Đăng ký thành công!',
          description: signupRole === 'tutor' ? 'Vui lòng hoàn thành hồ sơ gia sư để được duyệt.' : 'Chào mừng bạn đến với EduTutor!'
        });
        // Wait briefly for session to establish then redirect
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession();
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
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Đang tải...</div>
      </div>;
  }
  return <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-hero opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      
      <div className="w-full max-w-md relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Quay lại trang chủ
        </Link>
        
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">EduTutor</h1>
            <p className="text-sm text-muted-foreground">Nền tảng gia sư trực tuyến</p>
          </div>
        </div>
        
        <Card className="border-border/50 shadow-xl">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Đăng nhập</TabsTrigger>
                <TabsTrigger value="signup">Đăng ký</TabsTrigger>
              </TabsList>
            </CardHeader>
            
            <CardContent>
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="login-email" type="email" placeholder="email@example.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="pl-10" />
                    </div>
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Mật khẩu</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="login-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="pl-10 pr-10" />
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
                      Quên mật khẩu?
                    </Button>
                  </div>
                  
                  <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? 'Đang xử lý...' : 'Đăng nhập'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Họ và tên</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="signup-name" type="text" placeholder="Nguyễn Văn A" value={signupFullName} onChange={e => setSignupFullName(e.target.value)} className="pl-10" />
                    </div>
                    {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="signup-email" type="email" placeholder="email@example.com" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} className="pl-10" />
                    </div>
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Mật khẩu</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="signup-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} className="pl-10 pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Xác nhận mật khẩu</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="signup-confirm" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={signupConfirmPassword} onChange={e => setSignupConfirmPassword(e.target.value)} className="pl-10" />
                    </div>
                    {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                  </div>
                  
                  <div className="space-y-3">
                    <Label>Bạn muốn đăng ký với vai trò</Label>
                    <RadioGroup value={signupRole} onValueChange={value => setSignupRole(value as 'student' | 'tutor')} className="grid grid-cols-2 gap-4">
                      <div>
                        <RadioGroupItem value="student" id="role-student" className="peer sr-only" />
                        <Label htmlFor="role-student" className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                          <User className="mb-2 h-6 w-6" />
                          <span className="text-sm font-medium">Học viên</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="tutor" id="role-tutor" className="peer sr-only" />
                        <Label htmlFor="role-tutor" className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                          <GraduationCap className="mb-2 h-6 w-6" />
                          <span className="text-sm font-medium">Gia sư</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {signupRole === 'tutor' && <p className="text-sm text-muted-foreground bg-accent/50 p-3 rounded-lg">
                      💡 Sau khi đăng ký, bạn sẽ cần hoàn thành hồ sơ gia sư và chờ Admin duyệt trước khi có thể nhận lớp.
                    </p>}
                  
                  <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? 'Đang xử lý...' : 'Đăng ký'}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
        
        <ForgotPasswordDialog 
          open={forgotPasswordOpen} 
          onOpenChange={setForgotPasswordOpen} 
        />
      </div>
    </div>;
};
export default Auth;