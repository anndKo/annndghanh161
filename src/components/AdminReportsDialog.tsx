import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, X, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ImageViewer from '@/components/ImageViewer';

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  content: string;
  evidence_urls: string[];
  is_read: boolean;
  status: string;
  created_at: string;
  reporter_name?: string;
  reported_name?: string;
}

interface AdminReportsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdminReportsDialog = ({ open, onOpenChange }: AdminReportsDialogProps) => {
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  useEffect(() => {
    if (open) fetchReports();
  }, [open]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversation_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get all unique user IDs
      const userIds = [...new Set((data || []).flatMap(r => [r.reporter_id, r.reported_user_id]))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.display_name]));

      setReports((data || []).map(r => ({
        ...r,
        evidence_urls: r.evidence_urls || [],
        reporter_name: profileMap.get(r.reporter_id) || 'Không rõ',
        reported_name: profileMap.get(r.reported_user_id) || 'Không rõ',
      })));
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (reportId: string) => {
    await supabase.from('conversation_reports').update({ is_read: true }).eq('id', reportId);
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, is_read: true } : r));
  };

  const updateStatus = async (reportId: string, status: string) => {
    const { error } = await supabase.from('conversation_reports').update({ status }).eq('id', reportId);
    if (error) {
      toast({ variant: 'destructive', title: 'Lỗi', description: error.message });
      return;
    }
    toast({ title: 'Đã cập nhật', description: `Báo cáo đã được ${status === 'resolved' ? 'giải quyết' : 'từ chối'}` });
    fetchReports();
  };

  const toggleExpand = (reportId: string) => {
    if (expandedReport === reportId) {
      setExpandedReport(null);
    } else {
      setExpandedReport(reportId);
      // Mark as read when expanded
      const report = reports.find(r => r.id === reportId);
      if (report && !report.is_read) markAsRead(reportId);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Báo cáo người dùng</DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Chưa có báo cáo nào</div>
            ) : (
              <div className="space-y-3">
                {reports.map(report => (
                  <div
                    key={report.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      !report.is_read ? 'bg-primary/5 border-primary/20' : ''
                    }`}
                    onClick={() => toggleExpand(report.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {!report.is_read && (
                            <Badge variant="destructive" className="text-xs">Mới</Badge>
                          )}
                          <Badge variant={report.status === 'pending' ? 'outline' : report.status === 'resolved' ? 'default' : 'secondary'} className="text-xs">
                            {report.status === 'pending' ? 'Chờ xử lý' : report.status === 'resolved' ? 'Đã xử lý' : 'Từ chối'}
                          </Badge>
                        </div>
                        <p className="text-sm mt-1">
                          <span className="font-medium">{report.reporter_name}</span>
                          {' → '}
                          <span className="font-medium text-destructive">{report.reported_name}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(report.created_at)}</p>
                      </div>
                      {expandedReport === report.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>

                    {expandedReport === report.id && (
                      <div className="mt-3 pt-3 border-t space-y-3" onClick={e => e.stopPropagation()}>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Người báo cáo</p>
                          <p className="text-sm">{report.reporter_name} (ID: {report.reporter_id.slice(0, 8).toUpperCase()})</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Người bị báo cáo</p>
                          <p className="text-sm">{report.reported_name} (ID: {report.reported_user_id.slice(0, 8).toUpperCase()})</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Nội dung</p>
                          <p className="text-sm whitespace-pre-wrap">{report.content}</p>
                        </div>

                        {report.evidence_urls.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Minh chứng</p>
                            <div className="flex flex-wrap gap-2">
                              {report.evidence_urls.map((url, i) => {
                                const isVideo = url.match(/\.(mp4|webm|mov)(\?|$)/i);
                                return isVideo ? (
                                  <video
                                    key={i}
                                    src={url}
                                    className="w-20 h-20 object-cover rounded-lg border cursor-pointer"
                                    onClick={() => window.open(url, '_blank')}
                                  />
                                ) : (
                                  <img
                                    key={i}
                                    src={url}
                                    alt={`Evidence ${i + 1}`}
                                    className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                                    onClick={() => setViewingImage(url)}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {report.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => updateStatus(report.id, 'resolved')} className="flex-1">
                              Đã xử lý
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => updateStatus(report.id, 'dismissed')} className="flex-1">
                              Từ chối
                            </Button>
                          </div>
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

      <ImageViewer
        src={viewingImage || ''}
        alt="Minh chứng báo cáo"
        open={!!viewingImage}
        onOpenChange={(open) => { if (!open) setViewingImage(null); }}
      />
    </>
  );
};

export default AdminReportsDialog;
