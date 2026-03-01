import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X, ImagePlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ConversationReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUserId: string;
  reportedUserName: string;
}

const ConversationReportDialog = ({ open, onOpenChange, reportedUserId, reportedUserName }: ConversationReportDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selected].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user || !content.trim()) return;

    setSubmitting(true);
    try {
      // Upload evidence files
      const evidenceUrls: string[] = [];
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('report-evidence')
          .upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from('report-evidence')
          .getPublicUrl(fileName);
        evidenceUrls.push(urlData.publicUrl);
      }

      const { error } = await supabase.from('conversation_reports').insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        content: content.trim(),
        evidence_urls: evidenceUrls,
      });

      if (error) throw error;

      // Notify all admins
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (admins) {
        for (const admin of admins) {
          await supabase.from('notifications').insert({
            user_id: admin.user_id,
            type: 'new_report',
            title: 'Báo cáo mới',
            message: `Có báo cáo mới về người dùng ${reportedUserName}`,
          });
        }
      }

      toast({
        title: 'Đã gửi báo cáo',
        description: 'Admin sẽ xem xét và phản hồi sớm nhất.',
      });

      setContent('');
      setFiles([]);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Báo cáo người dùng</DialogTitle>
          <DialogDescription>
            Báo cáo {reportedUserName}. Admin sẽ xem xét và xử lý.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nội dung báo cáo</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Mô tả lý do báo cáo..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Ảnh/Video minh chứng (tùy chọn)</Label>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={files.length >= 5}
            >
              <ImagePlus className="w-4 h-4 mr-2" />
              Thêm ảnh/video ({files.length}/5)
            </Button>

            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {files.map((file, i) => (
                  <div key={i} className="relative group">
                    {file.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt=""
                        className="w-16 h-16 object-cover rounded-lg border"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg border flex items-center justify-center bg-muted text-xs text-center p-1">
                        {file.name.slice(0, 10)}
                      </div>
                    )}
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Hủy
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
              className="flex-1"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Gửi báo cáo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConversationReportDialog;
