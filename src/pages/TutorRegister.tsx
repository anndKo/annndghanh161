import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/untypedClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { 
  GraduationCap, 
  ArrowLeft, 
  Upload, 
  MapPin, 
  School, 
  BookOpen,
  CheckCircle2,
  Loader2
} from 'lucide-react';

const SUBJECTS = [
  'Toán', 'Vật Lý', 'Hóa Học', 'Sinh Học', 'Ngữ Văn', 
  'Tiếng Anh', 'Lịch Sử', 'Địa Lý', 'GDCD', 'Tin Học',
  'Tiếng Pháp', 'Tiếng Nhật', 'Tiếng Hàn', 'Tiếng Trung'
];

const TutorRegister = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    gender: '' as 'male' | 'female' | '',
    currentAddress: '',
    teachingAreas: '',
    schoolName: '',
    faculty: '',
    educationStatus: '',
    customEducationStatus: '',
    bestSubject: '',
    teachableSubjects: [] as string[],
    teachingFormat: 'both' as 'online' | 'offline' | 'both',
  });
  
  const [studentIdFront, setStudentIdFront] = useState<File | null>(null);
  const [studentIdBack, setStudentIdBack] = useState<File | null>(null);
  const [achievementFiles, setAchievementFiles] = useState<File[]>([]);
  
  const handleSubjectToggle = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      teachableSubjects: prev.teachableSubjects.includes(subject)
        ? prev.teachableSubjects.filter(s => s !== subject)
        : [...prev.teachableSubjects, subject]
    }));
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${path}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('tutor-documents')
      .upload(fileName, file);
    
    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage
      .from('tutor-documents')
      .getPublicUrl(fileName);
    
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Vui lòng đăng nhập để tiếp tục',
      });
      navigate('/auth');
      return;
    }
    
    if (!studentIdFront || !studentIdBack) {
      toast({
        variant: 'destructive',
        title: 'Thiếu thông tin',
        description: 'Vui lòng tải lên ảnh thẻ sinh viên (mặt trước và mặt sau)',
      });
      return;
    }
    
    if (formData.teachableSubjects.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Thiếu thông tin',
        description: 'Vui lòng chọn ít nhất một môn học có thể dạy',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Upload files
      const frontUrl = await uploadFile(studentIdFront, `${user.id}/student-id`);
      const backUrl = await uploadFile(studentIdBack, `${user.id}/student-id`);
      
      let achievementUrls: string[] = [];
      if (achievementFiles.length > 0) {
        achievementUrls = await Promise.all(
          achievementFiles.map(file => uploadFile(file, `${user.id}/achievements`))
        );
      }
      
      // Create tutor application
      const educationStatusValue = formData.educationStatus === 'other' 
        ? formData.customEducationStatus 
        : formData.educationStatus;
        
      const { error } = await supabase.from('tutor_applications').insert({
        user_id: user.id,
        full_name: formData.fullName,
        phone: formData.phone,
        gender: formData.gender || null,
        current_address: formData.currentAddress,
        teaching_areas: formData.teachingAreas.split(',').map(s => s.trim()),
        school_name: formData.schoolName,
        faculty: formData.faculty,
        education_status: educationStatusValue || null,
        best_subject: formData.bestSubject,
        teachable_subjects: formData.teachableSubjects,
        teaching_format: formData.teachingFormat,
        student_id_front: frontUrl,
        student_id_back: backUrl,
        achievement_files: achievementUrls,
      });
      
      if (error) throw error;
      
      toast({
        title: 'Đăng ký thành công!',
        description: 'Hồ sơ của bạn đã được gửi. Vui lòng chờ Admin duyệt.',
      });
      
      navigate('/tutor');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        variant: 'destructive',
        title: 'Đăng ký thất bại',
        description: error.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Quay lại trang chủ
        </Link>
        
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Đăng ký gia sư</h1>
            <p className="text-sm text-muted-foreground">Hoàn thành hồ sơ để bắt đầu dạy học</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Thông tin cá nhân
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Họ và tên *</Label>
                <Input
                  id="fullName"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Nguyễn Văn A"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại *</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="0909 xxx xxx"
                />
              </div>
              
              <div className="space-y-3">
                <Label>Giới tính *</Label>
                <RadioGroup
                  value={formData.gender}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value as 'male' | 'female' }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="gender-male" />
                    <Label htmlFor="gender-male" className="cursor-pointer">Nam</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="gender-female" />
                    <Label htmlFor="gender-female" className="cursor-pointer">Nữ</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentAddress">Địa chỉ hiện tại *</Label>
                <Textarea
                  id="currentAddress"
                  required
                  value={formData.currentAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentAddress: e.target.value }))}
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="teachingAreas">Khu vực muốn dạy * (phân cách bằng dấu phẩy)</Label>
                <Input
                  id="teachingAreas"
                  required
                  value={formData.teachingAreas}
                  onChange={(e) => setFormData(prev => ({ ...prev, teachingAreas: e.target.value }))}
                  placeholder="Quận 1, Quận 3, Bình Thạnh"
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Education Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="w-5 h-5 text-primary" />
                Thông tin học vấn
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="schoolName">Trường đang học / đã tốt nghiệp *</Label>
                <Input
                  id="schoolName"
                  required
                  value={formData.schoolName}
                  onChange={(e) => setFormData(prev => ({ ...prev, schoolName: e.target.value }))}
                  placeholder="Đại học Bách Khoa TP.HCM"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="faculty">Khoa / Ngành *</Label>
                <Input
                  id="faculty"
                  required
                  value={formData.faculty}
                  onChange={(e) => setFormData(prev => ({ ...prev, faculty: e.target.value }))}
                  placeholder="Khoa Toán - Tin học"
                />
              </div>
              
              <div className="space-y-3">
                <Label>Trạng thái học vấn</Label>
                <RadioGroup
                  value={formData.educationStatus}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, educationStatus: value }))}
                  className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="year1" id="edu-year1" />
                    <Label htmlFor="edu-year1" className="cursor-pointer text-sm">Sinh viên năm 1</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="year2" id="edu-year2" />
                    <Label htmlFor="edu-year2" className="cursor-pointer text-sm">Sinh viên năm 2</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="year3" id="edu-year3" />
                    <Label htmlFor="edu-year3" className="cursor-pointer text-sm">Sinh viên năm 3</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="year4" id="edu-year4" />
                    <Label htmlFor="edu-year4" className="cursor-pointer text-sm">Sinh viên năm 4</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="graduated" id="edu-graduated" />
                    <Label htmlFor="edu-graduated" className="cursor-pointer text-sm">Đã tốt nghiệp</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="edu-other" />
                    <Label htmlFor="edu-other" className="cursor-pointer text-sm">Khác</Label>
                  </div>
                </RadioGroup>
                {formData.educationStatus === 'other' && (
                  <Input
                    placeholder="Nhập trạng thái cụ thể..."
                    value={formData.customEducationStatus}
                    onChange={(e) => setFormData(prev => ({ ...prev, customEducationStatus: e.target.value }))}
                    className="mt-2"
                  />
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Teaching Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Thông tin giảng dạy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bestSubject">Môn học tự tin nhất *</Label>
                <Input
                  id="bestSubject"
                  required
                  value={formData.bestSubject}
                  onChange={(e) => setFormData(prev => ({ ...prev, bestSubject: e.target.value }))}
                  placeholder="Toán cao cấp"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Các môn có thể dạy * (chọn ít nhất 1)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {SUBJECTS.map((subject) => (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => handleSubjectToggle(subject)}
                      className={`p-2 rounded-lg border text-sm transition-all ${
                        formData.teachableSubjects.includes(subject)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {formData.teachableSubjects.includes(subject) && (
                        <CheckCircle2 className="w-4 h-4 inline mr-1" />
                      )}
                      {subject}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3">
                <Label>Hình thức dạy *</Label>
                <RadioGroup
                  value={formData.teachingFormat}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, teachingFormat: value as any }))}
                  className="grid grid-cols-3 gap-4"
                >
                  <div>
                    <RadioGroupItem value="online" id="format-online" className="peer sr-only" />
                    <Label
                      htmlFor="format-online"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                    >
                      <span className="text-sm font-medium">Online</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="offline" id="format-offline" className="peer sr-only" />
                    <Label
                      htmlFor="format-offline"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                    >
                      <span className="text-sm font-medium">Offline</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="both" id="format-both" className="peer sr-only" />
                    <Label
                      htmlFor="format-both"
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                    >
                      <span className="text-sm font-medium">Cả hai</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
          
          {/* Document Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Tải lên tài liệu
              </CardTitle>
              <CardDescription>
                Vui lòng tải lên ảnh thẻ sinh viên và các tệp chứng nhận thành tích (nếu có)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="studentIdFront">Thẻ sinh viên - Mặt trước *</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      id="studentIdFront"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setStudentIdFront(e.target.files?.[0] || null)}
                    />
                    <label htmlFor="studentIdFront" className="cursor-pointer">
                      {studentIdFront ? (
                        <div className="flex items-center justify-center gap-2 text-success">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-sm">{studentIdFront.name}</span>
                        </div>
                      ) : (
                        <div className="text-muted-foreground">
                          <Upload className="w-8 h-8 mx-auto mb-2" />
                          <span className="text-sm">Nhấn để tải lên</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="studentIdBack">Thẻ sinh viên - Mặt sau *</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      id="studentIdBack"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setStudentIdBack(e.target.files?.[0] || null)}
                    />
                    <label htmlFor="studentIdBack" className="cursor-pointer">
                      {studentIdBack ? (
                        <div className="flex items-center justify-center gap-2 text-success">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-sm">{studentIdBack.name}</span>
                        </div>
                      ) : (
                        <div className="text-muted-foreground">
                          <Upload className="w-8 h-8 mx-auto mb-2" />
                          <span className="text-sm">Nhấn để tải lên</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="achievements">Thành tích / Chứng chỉ (không bắt buộc)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    id="achievements"
                    accept="image/*,.pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => setAchievementFiles(Array.from(e.target.files || []))}
                  />
                  <label htmlFor="achievements" className="cursor-pointer">
                    {achievementFiles.length > 0 ? (
                      <div className="flex flex-col items-center gap-1 text-success">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-sm">{achievementFiles.length} tệp đã chọn</span>
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        <Upload className="w-8 h-8 mx-auto mb-2" />
                        <span className="text-sm">Nhấn để tải lên nhiều tệp</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Button type="submit" size="xl" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Đang gửi hồ sơ...
              </>
            ) : (
              'Gửi hồ sơ đăng ký'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default TutorRegister;
