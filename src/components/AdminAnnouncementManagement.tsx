import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Megaphone, Loader2, ImageIcon } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  target_role: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const AdminAnnouncementManagement = () => {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRole, setTargetRole] = useState('all');
  const [priority, setPriority] = useState('1');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('system_announcements')
        .select('*')
        .order('priority', { ascending: true });
      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Lỗi', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setTargetRole('all');
    setPriority('1');
    setImageFile(null);
    setImagePreview(null);
    setEditing(null);
  };

  const openCreateForm = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEditForm = (a: Announcement) => {
    setEditing(a);
    setTitle(a.title);
    setContent(a.content);
    setTargetRole(a.target_role);
    setPriority(String(a.priority));
    setImagePreview(a.image_url);
    setImageFile(null);
    setFormOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng nhập tiêu đề và nội dung' });
      return;
    }

    setSaving(true);
    try {
      let imageUrl = editing?.image_url || null;

      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const path = `${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('announcement-images')
          .upload(path, imageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from('announcement-images')
          .getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const payload = {
        title: title.trim(),
        content: content.trim(),
        image_url: imageUrl,
        target_role: targetRole,
        priority: parseInt(priority) || 1,
      };

      if (editing) {
        const { error } = await supabase
          .from('system_announcements')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Đã cập nhật thông báo' });
      } else {
        const { error } = await supabase
          .from('system_announcements')
          .insert(payload);
        if (error) throw error;
        toast({ title: 'Đã tạo thông báo mới' });
      }

      setFormOpen(false);
      resetForm();
      fetchAnnouncements();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Lỗi', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (a: Announcement) => {
    try {
      const { error } = await supabase
        .from('system_announcements')
        .update({ is_active: !a.is_active })
        .eq('id', a.id);
      if (error) throw error;
      setAnnouncements(prev => prev.map(item => item.id === a.id ? { ...item, is_active: !item.is_active } : item));
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Lỗi', description: error.message });
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const { error } = await supabase
        .from('system_announcements')
        .delete()
        .eq('id', deleting.id);
      if (error) throw error;
      toast({ title: 'Đã xóa thông báo' });
      setDeleting(null);
      fetchAnnouncements();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Lỗi', description: error.message });
    }
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case 'tutor': return 'Gia sư';
      case 'student': return 'Học viên';
      default: return 'Tất cả';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold">Quản lý thông báo hệ thống</h2>
        </div>
        <Button onClick={openCreateForm}>
          <Plus className="w-4 h-4 mr-2" />
          Tạo thông báo mới
        </Button>
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Chưa có thông báo nào. Bấm "Tạo thông báo mới" để bắt đầu.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Ưu tiên</TableHead>
                    <TableHead>Tiêu đề</TableHead>
                    <TableHead className="hidden md:table-cell">Nội dung</TableHead>
                    <TableHead>Ảnh</TableHead>
                    <TableHead>Vai trò</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="hidden md:table-cell">Ngày tạo</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-bold text-center">{a.priority}</TableCell>
                      <TableCell className="font-medium max-w-[150px] truncate">{a.title}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-[200px] truncate text-muted-foreground">{a.content}</TableCell>
                      <TableCell>
                        {a.image_url ? (
                          <img src={a.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={a.target_role === 'all' ? 'default' : 'secondary'}>
                          {roleLabel(a.target_role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={a.is_active}
                          onCheckedChange={() => handleToggle(a)}
                        />
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditForm(a)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleting(a)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) { setFormOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Chỉnh sửa thông báo' : 'Tạo thông báo mới'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Cập nhật nội dung thông báo hệ thống.' : 'Tạo thông báo hệ thống mới để gửi đến người dùng.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Vai trò nhận thông báo</Label>
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="tutor">Gia sư</SelectItem>
                  <SelectItem value="student">Học viên</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tiêu đề thông báo</Label>
              <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nhập tiêu đề..." />
            </div>

            <div>
              <Label>Nội dung thông báo</Label>
              <Textarea className="mt-1 min-h-[120px]" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Nhập nội dung..." />
            </div>

            <div>
              <Label>Tải ảnh lên (không bắt buộc)</Label>
              <div className="mt-1 flex items-center gap-3">
                <Input type="file" accept="image/*" onChange={handleImageChange} className="flex-1" />
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" className="w-16 h-16 rounded object-cover border" />
                )}
              </div>
            </div>

            <div>
              <Label>Số ưu tiên hiển thị (số nhỏ hiển thị trước)</Label>
              <Input className="mt-1" type="number" min="1" value={priority} onChange={(e) => setPriority(e.target.value)} placeholder="1" />
            </div>

            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? 'Cập nhật thông báo' : 'Lưu thông báo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa thông báo?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa thông báo "{deleting?.title}"? Thao tác này không thể hoàn tác.
            </AlertDialogDescription>
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

export default AdminAnnouncementManagement;
