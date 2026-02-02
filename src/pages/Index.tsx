import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Shield, 
  CheckCircle2, 
  ArrowRight,
  Star,
  Clock,
  MapPin
} from 'lucide-react';

const Index = () => {
  const features = [
    {
      icon: GraduationCap,
      title: 'Gia sư chất lượng',
      description: 'Đội ngũ gia sư được tuyển chọn kỹ lưỡng, có trình độ và kinh nghiệm'
    },
    {
      icon: Users,
      title: 'Học 1 kèm 1 hoặc nhóm',
      description: 'Linh hoạt lựa chọn hình thức học phù hợp với nhu cầu'
    },
    {
      icon: BookOpen,
      title: 'Đa dạng môn học',
      description: 'Từ Toán, Lý, Hóa đến Ngoại ngữ và các môn xã hội'
    },
    {
      icon: Shield,
      title: 'An toàn & Tin cậy',
      description: 'Hệ thống xác minh gia sư nghiêm ngặt, đảm bảo chất lượng'
    }
  ];

  const stats = [
    { value: '500+', label: 'Gia sư' },
    { value: '10,000+', label: 'Học viên' },
    { value: '50+', label: 'Môn học' },
    { value: '98%', label: 'Hài lòng' }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">EduTutor</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Tính năng
            </a>
            <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">
              Về chúng tôi
            </a>
            <Link to="/auth" className="text-muted-foreground hover:text-foreground transition-colors">
              Đăng nhập
            </Link>
            <Button asChild size="sm">
              <Link to="/auth?tab=signup">Đăng ký ngay</Link>
            </Button>
          </nav>
          
          <Button asChild variant="outline" size="sm" className="md:hidden">
            <Link to="/auth">Đăng nhập</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-hero opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="container mx-auto max-w-6xl relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-accent px-4 py-2 rounded-full text-sm">
                <Star className="w-4 h-4 text-secondary" />
                <span className="text-accent-foreground">Nền tảng gia sư #1 Việt Nam</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Học tập hiệu quả cùng{' '}
                <span className="text-gradient">gia sư chất lượng</span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-lg">
                Kết nối với đội ngũ gia sư giỏi, được xác minh kỹ lưỡng. 
                Học online hoặc offline, theo lớp hoặc 1 kèm 1 - hoàn toàn theo ý bạn.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="xl" variant="hero">
                  <Link to="/auth?tab=signup&role=student">
                    Tìm gia sư ngay
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button asChild size="xl" variant="outline">
                  <Link to="/auth?tab=signup&role=tutor">
                    Đăng ký làm gia sư
                  </Link>
                </Button>
              </div>
              
              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-gradient-primary border-2 border-card flex items-center justify-center text-xs text-primary-foreground font-medium"
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div className="text-sm">
                  <p className="font-semibold">500+ gia sư đang hoạt động</p>
                  <p className="text-muted-foreground">Sẵn sàng hỗ trợ bạn</p>
                </div>
              </div>
            </div>
            
            <div className="relative animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="aspect-square max-w-lg mx-auto relative">
                <div className="absolute inset-0 bg-gradient-hero rounded-3xl rotate-6 opacity-20" />
                <div className="absolute inset-0 bg-card rounded-3xl shadow-xl border border-border overflow-hidden">
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center mb-6 animate-float">
                      <GraduationCap className="w-12 h-12 text-primary-foreground" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Học mọi lúc, mọi nơi</h3>
                    <p className="text-muted-foreground">Online • Offline • Linh hoạt</p>
                  </div>
                </div>
                
                {/* Floating cards */}
                <div className="absolute -left-4 top-1/4 glass-card p-4 animate-float" style={{ animationDelay: '0.5s' }}>
                  <div className="flex items-center gap-3">
                    <Clock className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-semibold text-sm">Linh hoạt</p>
                      <p className="text-xs text-muted-foreground">24/7</p>
                    </div>
                  </div>
                </div>
                
                <div className="absolute -right-4 bottom-1/4 glass-card p-4 animate-float" style={{ animationDelay: '1s' }}>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-8 h-8 text-secondary" />
                    <div>
                      <p className="font-semibold text-sm">Toàn quốc</p>
                      <p className="text-xs text-muted-foreground">63 tỉnh thành</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-primary">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="text-center animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <p className="text-4xl md:text-5xl font-bold text-primary-foreground mb-2">
                  {stat.value}
                </p>
                <p className="text-primary-foreground/80">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tại sao chọn <span className="text-gradient">EduTutor</span>?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Chúng tôi mang đến giải pháp học tập toàn diện với đội ngũ gia sư chất lượng cao
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-card rounded-2xl p-6 border border-border card-hover animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center mb-4 group-hover:bg-gradient-primary transition-all duration-300">
                  <feature.icon className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="about" className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Bắt đầu chỉ với <span className="text-gradient">3 bước</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Đăng ký tài khoản', desc: 'Tạo tài khoản miễn phí trong 30 giây' },
              { step: '02', title: 'Chọn môn học', desc: 'Tìm môn học và gia sư phù hợp' },
              { step: '03', title: 'Bắt đầu học', desc: 'Học online hoặc offline theo lịch của bạn' },
            ].map((item, index) => (
              <div 
                key={index} 
                className="relative animate-fade-in"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <div className="bg-card rounded-2xl p-8 border border-border h-full">
                  <span className="text-6xl font-bold text-gradient opacity-20">{item.step}</span>
                  <h3 className="text-xl font-semibold mt-4 mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="w-8 h-8 text-primary" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-gradient-hero rounded-3xl p-8 md:p-12 text-center text-primary-foreground relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-10" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Sẵn sàng nâng cao kiến thức?
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
                Tham gia cùng hàng nghìn học viên đã tin tưởng EduTutor
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="xl" variant="secondary">
                  <Link to="/auth?tab=signup&role=student">
                    Đăng ký học ngay
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button 
                  asChild 
                  size="xl" 
                  className="bg-primary-foreground/20 text-primary-foreground border-2 border-primary-foreground/30 hover:bg-primary-foreground/30"
                >
                  <Link to="/auth?tab=signup&role=tutor">
                    Trở thành gia sư
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">EduTutor</span>
              </Link>
              <p className="text-muted-foreground max-w-sm">
                Nền tảng kết nối gia sư và học viên hàng đầu Việt Nam. 
                Học tập hiệu quả, an toàn và tiện lợi.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Liên kết</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Về chúng tôi</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Điều khoản</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Chính sách</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Liên hệ</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>Email: contact@edututor.vn</li>
                <li>Hotline: 1900 xxxx</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground text-sm">
            © 2024 EduTutor. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
