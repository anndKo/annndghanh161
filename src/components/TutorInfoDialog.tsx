import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Star, BookOpen, GraduationCap, MapPin, Monitor, Users, User, Loader2 } from 'lucide-react';

interface TutorApplication {
  full_name: string;
  school_name: string;
  faculty: string;
  best_subject: string;
  teachable_subjects: string[];
  teaching_areas: string[];
  teaching_format: string;
}

interface ClassItem {
  id: string;
  display_id: string | null;
  name: string;
  subject: string;
  grade: string;
  teaching_format: string;
  class_type: string;
}

interface TutorInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tutorId: string;
  tutorName: string;
  avgRating: number;
  ratingCount: number;
}

const TutorInfoDialog = ({
  open,
  onOpenChange,
  tutorId,
  tutorName,
  avgRating,
  ratingCount,
}: TutorInfoDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [tutorInfo, setTutorInfo] = useState<TutorApplication | null>(null);
  const [tutorClasses, setTutorClasses] = useState<ClassItem[]>([]);

  useEffect(() => {
    if (open && tutorId) {
      fetchTutorInfo();
    }
  }, [open, tutorId]);

  const fetchTutorInfo = async () => {
    setLoading(true);
    try {
      // Fetch tutor application info
      const { data: applicationData } = await supabase
        .from('tutor_applications')
        .select('full_name, school_name, faculty, best_subject, teachable_subjects, teaching_areas, teaching_format')
        .eq('user_id', tutorId)
        .eq('status', 'approved')
        .single();

      if (applicationData) {
        setTutorInfo(applicationData);
      }

      // Fetch tutor's active classes
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, display_id, name, subject, grade, teaching_format, class_type')
        .eq('tutor_id', tutorId)
        .eq('is_active', true);

      setTutorClasses(classesData || []);
    } catch (error) {
      console.error('Error fetching tutor info:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'online':
        return <Monitor className="w-3 h-3" />;
      case 'offline':
        return <MapPin className="w-3 h-3" />;
      default:
        return <Monitor className="w-3 h-3" />;
    }
  };

  const getFormatLabel = (format: string) => {
    switch (format) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      default:
        return 'Online/Offline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-blue-600 flex items-center justify-center text-primary-foreground font-bold text-lg">
              {tutorName.charAt(0).toUpperCase()}
            </div>
            <div>
              <span>{tutorName}</span>
              <div className="flex items-center gap-1 text-yellow-500 text-sm font-normal">
                <Star className="w-4 h-4 fill-current" />
                <span>{avgRating.toFixed(1)}</span>
                <span className="text-muted-foreground">({ratingCount} đánh giá)</span>
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Thông tin chi tiết về gia sư
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tutor Info */}
            {tutorInfo && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Trường</p>
                    <p className="font-medium">{tutorInfo.school_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Khoa</p>
                    <p className="font-medium">{tutorInfo.faculty}</p>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground text-sm mb-2">Điểm nổi bật</p>
                  <Badge variant="secondary" className="text-sm">
                    <GraduationCap className="w-3 h-3 mr-1" />
                    {tutorInfo.best_subject}
                  </Badge>
                </div>

                <div>
                  <p className="text-muted-foreground text-sm mb-2">Môn có thể dạy</p>
                  <div className="flex flex-wrap gap-1">
                    {tutorInfo.teachable_subjects.map((subject, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground text-sm mb-2">Khu vực dạy</p>
                  <div className="flex flex-wrap gap-1">
                    {tutorInfo.teaching_areas.map((area, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        <MapPin className="w-3 h-3 mr-1" />
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground text-sm mb-2">Hình thức dạy</p>
                  <Badge>
                    {getFormatIcon(tutorInfo.teaching_format)}
                    <span className="ml-1">{getFormatLabel(tutorInfo.teaching_format)}</span>
                  </Badge>
                </div>
              </div>
            )}

            {/* Tutor Classes */}
            <div>
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4" />
                Lớp đang dạy ({tutorClasses.length})
              </h4>
              {tutorClasses.length === 0 ? (
                <p className="text-muted-foreground text-sm">Chưa có lớp nào</p>
              ) : (
                <div className="space-y-2">
                  {tutorClasses.map((classItem) => (
                    <Card key={classItem.id} className="bg-muted/30">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-mono text-primary">{classItem.display_id || classItem.id.slice(0, 8)}</p>
                            <p className="font-medium text-sm">{classItem.name}</p>
                            <p className="text-xs text-muted-foreground">{classItem.subject} • {classItem.grade}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {classItem.class_type === 'one_on_one' ? (
                                <><User className="w-3 h-3 mr-1" />1:1</>
                              ) : (
                                <><Users className="w-3 h-3 mr-1" />Nhóm</>
                              )}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {getFormatIcon(classItem.teaching_format)}
                              <span className="ml-1">{getFormatLabel(classItem.teaching_format)}</span>
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TutorInfoDialog;
