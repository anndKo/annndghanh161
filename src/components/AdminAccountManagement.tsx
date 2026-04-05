import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Search, Trash2, Users, Shield, GraduationCap, User, AlertTriangle, MessageSquare, CheckCircle2, XCircle, Clock } from 'lucide-react';
import UserAvatar from './UserAvatar';

interface AccountInfo {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

interface Appeal {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  reason: string;
  status: string;
  admin_response: string | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdminAccountManagement = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AccountInfo | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [appealResponse, setAppealResponse] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAccounts();
      fetchAppeals();
    }
  }, [open]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, email, phone, avatar_url, created_at');
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      
      if (profiles && roles) {
        const roleMap: Record<string, string> = {};
        roles.forEach((r: any) => { roleMap[r.user_id] = r.role; });
        
        const combined: AccountInfo[] = profiles.map((p: any) => ({
          ...p,
          role: roleMap[p.user_id] || 'student',
        }));
        setAccounts(combined);
      }
    } catch (e) {
      console.error('Error fetching accounts:', e);
    }
    setLoading(false);
  };

  const fetchAppeals = async () => {
    const { data } = await supabase.from('account_appeals').select('*').order('created_at', { ascending: false });
    if (data) setAppeals(data);
  };

  const handleDeleteAccount = async () => {
    if (!deleteTarget || !user) return;
    setDeleting(true);
    try {
      // Record in deleted_accounts
      await supabase.from('deleted_accounts').insert({
        user_id: deleteTarget.user_id,
        email: deleteTarget.email,
        full_name: deleteTarget.full_name,
        role: deleteTarget.role,
        reason: deleteReason || 'Vi phạm quy định',
        deleted_by: user.id,
      });

      // Delete user role
      await supabase.from('user_roles').delete().eq('user_id', deleteTarget.user_id);
      
      // Delete profile
      await supabase.from('profiles').delete().eq('user_id', deleteTarget.user_id);

      toast({ title: 'Đã xóa tài khoản', description: `Tài khoản ${deleteTarget.full_name} đã bị xóa.` });
      setDeleteTarget(null);
      setDeleteReason('');
      fetchAccounts();
    } catch (e) {
      toast({ title: 'Lỗi', description: 'Không thể xóa tài khoản.', variant: 'destructive' });
    }
    setDeleting(false);
  };

  const handleAppealResponse = async (status: 'approved' | 'rejected') => {
    if (!selectedAppeal) return;
    setProcessing(true);
    try {
      await supabase.from('account_appeals').update({
        status,
        admin_response: appealResponse,
        updated_at: new Date().toISOString(),
      }).eq('id', selectedAppeal.id);

      toast({ title: status === 'approved' ? 'Đã chấp nhận kháng cáo' : 'Đã từ chối kháng cáo' });
      setSelectedAppeal(null);
      setAppealResponse('');
      fetchAppeals();
    } catch (e) {
      toast({ title: 'Lỗi', variant: 'destructive' });
    }
    setProcessing(false);
  };

  const getRoleIcon = (role: string) => {
    if (role === 'admin') return <Shield className="w-4 h-4 text-red-500" />;
    if (role === 'tutor') return <GraduationCap className="w-4 h-4 text-blue-500" />;
    return <User className="w-4 h-4 text-green-500" />;
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Admin</Badge>;
    if (role === 'tutor') return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Gia sư</Badge>;
    return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Học viên</Badge>;
  };

  const filteredAccounts = accounts.filter(a =>
    a.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.user_id.slice(0, 8).toUpperCase().includes(searchQuery.toUpperCase())
  );

  const pendingAppeals = appeals.filter(a => a.status === 'pending');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Quản lý tài khoản
          </DialogTitle>
          <DialogDescription>Xem, quản lý tài khoản người dùng và xử lý kháng cáo.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="accounts">
          <TabsList className="w-full">
            <TabsTrigger value="accounts" className="flex-1 gap-2">
              <Users className="w-4 h-4" />
              Tài khoản ({accounts.length})
            </TabsTrigger>
            <TabsTrigger value="appeals" className="flex-1 gap-2">
              <MessageSquare className="w-4 h-4" />
              Kháng cáo
              {pendingAppeals.length > 0 && <Badge variant="destructive" className="ml-1">{pendingAppeals.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên, email hoặc ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {filteredAccounts.map(account => (
                  <div key={account.user_id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <UserAvatar userId={account.user_id} fullName={account.full_name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{account.full_name}</span>
                        {getRoleBadge(account.role)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{account.email}</p>
                      <p className="text-xs text-muted-foreground">ID: {account.user_id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    {account.role !== 'admin' && account.user_id !== user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => setDeleteTarget(account)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {filteredAccounts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">Không tìm thấy tài khoản</div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="appeals" className="space-y-4">
            {appeals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Chưa có kháng cáo nào</div>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {appeals.map(appeal => (
                  <Card key={appeal.id} className={`cursor-pointer hover:shadow-md transition-shadow ${appeal.status === 'pending' ? 'border-warning/50' : ''}`}
                    onClick={() => { setSelectedAppeal(appeal); setAppealResponse(appeal.admin_response || ''); }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{appeal.full_name}</span>
                            {appeal.status === 'pending' && <Badge variant="outline" className="text-warning border-warning"><Clock className="w-3 h-3 mr-1" />Chờ xử lý</Badge>}
                            {appeal.status === 'approved' && <Badge className="bg-green-500/10 text-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Chấp nhận</Badge>}
                            {appeal.status === 'rejected' && <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Từ chối</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{appeal.email} • {appeal.phone}</p>
                          <p className="text-sm mt-2 line-clamp-2">{appeal.reason}</p>
                          <p className="text-xs text-muted-foreground mt-1">{new Date(appeal.created_at).toLocaleString('vi-VN')}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Xác nhận xóa tài khoản
              </AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc chắn muốn xóa tài khoản <strong>{deleteTarget?.full_name}</strong> ({deleteTarget?.email})?
                Hành động này không thể hoàn tác. Người dùng sẽ không thể đăng nhập và sẽ nhận được thông báo tài khoản bị xóa.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label>Lý do xóa</Label>
              <Textarea
                placeholder="Nhập lý do xóa tài khoản..."
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? 'Đang xóa...' : 'Xóa tài khoản'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Appeal Detail Dialog */}
        <Dialog open={!!selectedAppeal} onOpenChange={open => { if (!open) setSelectedAppeal(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Chi tiết kháng cáo</DialogTitle>
            </DialogHeader>
            {selectedAppeal && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Họ tên</Label>
                    <p className="font-medium">{selectedAppeal.full_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedAppeal.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Số điện thoại</Label>
                    <p className="font-medium">{selectedAppeal.phone}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Ngày gửi</Label>
                    <p className="font-medium">{new Date(selectedAppeal.created_at).toLocaleString('vi-VN')}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Lý do kháng cáo</Label>
                  <p className="mt-1 p-3 bg-muted rounded-lg text-sm">{selectedAppeal.reason}</p>
                </div>
                {selectedAppeal.status === 'pending' && (
                  <>
                    <div>
                      <Label>Phản hồi của Admin</Label>
                      <Textarea
                        placeholder="Nhập phản hồi..."
                        value={appealResponse}
                        onChange={e => setAppealResponse(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleAppealResponse('approved')} disabled={processing} className="flex-1 bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Chấp nhận
                      </Button>
                      <Button onClick={() => handleAppealResponse('rejected')} disabled={processing} variant="destructive" className="flex-1">
                        <XCircle className="w-4 h-4 mr-2" />
                        Từ chối
                      </Button>
                    </div>
                  </>
                )}
                {selectedAppeal.status !== 'pending' && selectedAppeal.admin_response && (
                  <div>
                    <Label className="text-muted-foreground">Phản hồi Admin</Label>
                    <p className="mt-1 p-3 bg-muted rounded-lg text-sm">{selectedAppeal.admin_response}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default AdminAccountManagement;
