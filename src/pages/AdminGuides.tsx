import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/untypedClient';
import logoImg from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, Plus, Trash2, Loader2, BookOpen, Video, Upload, X,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const AdminGuides = () => {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const { toast } = useToast();
  const [guides, setGuides] = useState<any[]>([]);
  const [loadingGuides, setLoadingGuides] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [targetRole, setTargetRole] = useState('student');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!loading && (!user || role !== 'admin')) navigate('/');
  }, [user, role, loading, navigate]);

  const fetchGuides = async () => {
    setLoadingGuides(true);
    const { data } = await supabase.from('guides').select('*').order('created_at', { ascending: false });
    setGuides(data || []);
    setLoadingGuides(false);
  };

  useEffect(() => { fetchGuides(); }, []);

  const resetForm = () => {
    setTargetRole('student');
    setTitle('');
    setContent('');
    setVideoFile(null);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: 'Vui lòng nhập tiêu đề', variant: 'destructive' });
      return;
    }
    setSaving(true);

    let videoUrl: string | null = null;
    if (videoFile) {
      setUploading(true);
      const fileName = `${Date.now()}_${videoFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('guide-videos')
        .upload(fileName, videoFile, { cacheControl: '3600', upsert: false });
      setUploading(false);
      if (uploadError) {
        toast({ title: 'Lỗi tải video', description: uploadError.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('guide-videos').getPublicUrl(uploadData.path);
      videoUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from('guides').insert({
      target_role: targetRole,
      title: title.trim(),
      content: content.trim() || null,
      video_url: videoUrl,
    });

    setSaving(false);
    if (error) {
      toast({ title: 'Lỗi lưu hướng dẫn', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Đã tạo hướng dẫn!' });
      resetForm();
      setFormOpen(false);
      fetchGuides();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('guides').delete().eq('id', deleteId);
    toast({ title: 'Đã xóa hướng dẫn' });
    setDeleteId(null);
    fetchGuides();
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <img src={logoImg} alt="Logo" className="w-8 h-8 rounded-lg object-cover" loading="eager" />
          <h1 className="font-bold text-lg">Quản lý hướng dẫn</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Danh sách hướng dẫn</h2>
          <Button onClick={() => { resetForm(); setFormOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Tạo hướng dẫn
          </Button>
        </div>

        {loadingGuides ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : guides.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Chưa có hướng dẫn nào.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {guides.map(g => (
              <Card key={g.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {g.video_url ? <Video className="w-4 h-4 text-primary" /> : <BookOpen className="w-4 h-4 text-primary" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm break-words">{g.title}</p>
                      <Badge variant="secondary" className="text-[10px] mt-1">
                        {g.target_role === 'tutor' ? 'Gia sư' : 'Học viên'}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive flex-shrink-0" onClick={() => setDeleteId(g.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create Guide Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tạo hướng dẫn mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="mb-2 block">Vai trò được xem</Label>
              <RadioGroup value={targetRole} onValueChange={setTargetRole} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="tutor" id="role-tutor" />
                  <Label htmlFor="role-tutor">Gia sư</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="student" id="role-student" />
                  <Label htmlFor="role-student">Học viên</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label htmlFor="guide-title">Tiêu đề</Label>
              <Input id="guide-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ví dụ: Cách tìm lớp gần bạn" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="guide-content">Nội dung (tuỳ chọn)</Label>
              <Textarea id="guide-content" value={content} onChange={e => setContent(e.target.value)} placeholder="Mô tả chi tiết..." rows={4} className="mt-1" />
            </div>
            <div>
              <Label>Tải video (tuỳ chọn)</Label>
              {videoFile ? (
                <div className="mt-1 flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Video className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm truncate flex-1">{videoFile.name}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setVideoFile(null)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <label className="mt-1 flex items-center justify-center gap-2 p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Chọn video từ thiết bị</span>
                  <input type="file" accept="video/*" className="hidden" onChange={e => { if (e.target.files?.[0]) setVideoFile(e.target.files[0]); }} />
                </label>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {uploading ? 'Đang tải video...' : saving ? 'Đang lưu...' : 'Lưu'}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setFormOpen(false)}>Hủy</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa hướng dẫn?</AlertDialogTitle>
            <AlertDialogDescription>Hành động này không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminGuides;
