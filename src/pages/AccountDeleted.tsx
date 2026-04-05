import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, Send, CheckCircle2 } from 'lucide-react';

const AccountDeleted = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletionInfo, setDeletionInfo] = useState<{ reason: string | null } | null>(null);

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      // Check deletion info
      supabase.from('deleted_accounts')
        .select('reason')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
        .then(({ data }) => {
          if (data) setDeletionInfo(data);
        });
    }
  }, [user]);

  const handleSubmitAppeal = async () => {
    if (!email || !fullName || !phone || !reason) {
      toast({ title: 'Vui lòng điền đầy đủ thông tin', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('account_appeals').insert({
        email,
        full_name: fullName,
        phone,
        reason,
      });
      if (error) throw error;
      setSubmitted(true);
      toast({ title: 'Đã gửi kháng cáo', description: 'Admin sẽ xem xét và phản hồi sớm nhất.' });
    } catch (e) {
      toast({ title: 'Lỗi gửi kháng cáo', variant: 'destructive' });
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-destructive">Tài khoản đã bị xóa</CardTitle>
          <CardDescription>
            Tài khoản của bạn đã bị vô hiệu hóa bởi quản trị viên.
            {deletionInfo?.reason && (
              <span className="block mt-2 font-medium text-foreground">Lý do: {deletionInfo.reason}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="font-medium">Kháng cáo đã được gửi!</p>
              <p className="text-sm text-muted-foreground mt-1">Vui lòng chờ Admin xem xét và phản hồi.</p>
              <Button variant="outline" className="mt-4" onClick={() => signOut()}>
                Đăng xuất
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Nếu bạn cho rằng đây là sai sót, hãy gửi kháng cáo bên dưới:
              </p>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email của bạn" />
              </div>
              <div className="space-y-2">
                <Label>Họ và tên</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nhập họ tên" />
              </div>
              <div className="space-y-2">
                <Label>Số điện thoại</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Nhập SĐT" />
              </div>
              <div className="space-y-2">
                <Label>Lý do kháng cáo</Label>
                <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Giải thích lý do bạn muốn khôi phục tài khoản..." rows={4} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSubmitAppeal} disabled={submitting} className="flex-1">
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? 'Đang gửi...' : 'Gửi kháng cáo'}
                </Button>
                <Button variant="outline" onClick={() => signOut()}>
                  Đăng xuất
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountDeleted;
