import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DollarSign, CreditCard, Save, Edit2 } from 'lucide-react';

interface Revenue {
  id: string;
  amount: number;
  description: string | null;
  created_at: string;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_holder_name: string;
  account_number: string;
}

interface TutorRevenueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TutorRevenueDialog = ({ open, onOpenChange }: TutorRevenueDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(false);

  // Bank account form
  const [editingBank, setEditingBank] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [savingBank, setSavingBank] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchData();
    }
  }, [open, user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch revenues
      const { data: revenueData } = await supabase
        .from('tutor_revenue')
        .select('*')
        .eq('tutor_id', user.id)
        .order('created_at', { ascending: false });

      setRevenues(revenueData || []);
      setTotalRevenue(revenueData?.reduce((sum, r) => sum + r.amount, 0) || 0);

      // Fetch bank account
      const { data: bankData } = await supabase
        .from('tutor_bank_accounts')
        .select('*')
        .eq('tutor_id', user.id)
        .maybeSingle();

      if (bankData) {
        setBankAccount(bankData);
        setBankName(bankData.bank_name);
        setAccountHolder(bankData.account_holder_name);
        setAccountNumber(bankData.account_number);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBankAccount = async () => {
    if (!user || !bankName.trim() || !accountHolder.trim() || !accountNumber.trim()) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Vui lòng điền đầy đủ thông tin',
      });
      return;
    }

    setSavingBank(true);
    try {
      if (bankAccount) {
        // Update existing
        const { error } = await supabase
          .from('tutor_bank_accounts')
          .update({
            bank_name: bankName.trim(),
            account_holder_name: accountHolder.trim(),
            account_number: accountNumber.trim(),
          })
          .eq('id', bankAccount.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('tutor_bank_accounts')
          .insert({
            tutor_id: user.id,
            bank_name: bankName.trim(),
            account_holder_name: accountHolder.trim(),
            account_number: accountNumber.trim(),
          });

        if (error) throw error;
      }

      toast({
        title: 'Đã lưu',
        description: 'Thông tin tài khoản đã được lưu',
      });

      setEditingBank(false);
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message,
      });
    } finally {
      setSavingBank(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Doanh thu của tôi</DialogTitle>
          <DialogDescription>Xem lịch sử doanh thu và quản lý tài khoản ngân hàng</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="revenue" className="space-y-4">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="revenue" className="gap-2">
                <DollarSign className="w-4 h-4" />
                Doanh thu
              </TabsTrigger>
              <TabsTrigger value="bank" className="gap-2">
                <CreditCard className="w-4 h-4" />
                Ngân hàng
              </TabsTrigger>
            </TabsList>

            <TabsContent value="revenue" className="space-y-4">
              {/* Total Revenue Card */}
              <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Tổng doanh thu</p>
                    <p className="text-3xl font-bold text-primary">{formatPrice(totalRevenue)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue History */}
              <div>
                <h4 className="font-medium mb-3">Lịch sử doanh thu</h4>
                {revenues.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Chưa có doanh thu</p>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {revenues.map((rev) => (
                      <div
                        key={rev.id}
                        className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium">{rev.description || 'Thanh toán'}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(rev.created_at)}</p>
                        </div>
                        <span className="text-success font-semibold">+{formatPrice(rev.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="bank" className="space-y-4">
              {!editingBank && bankAccount ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      Tài khoản ngân hàng
                      <Button variant="ghost" size="sm" onClick={() => setEditingBank(true)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p><span className="text-muted-foreground">Ngân hàng:</span> {bankAccount.bank_name}</p>
                    <p><span className="text-muted-foreground">Chủ TK:</span> {bankAccount.account_holder_name}</p>
                    <p><span className="text-muted-foreground">STK:</span> {bankAccount.account_number}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank-name">Tên ngân hàng</Label>
                    <Input
                      id="bank-name"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="VD: Vietcombank, MB Bank, ..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account-holder">Tên người nhận</Label>
                    <Input
                      id="account-holder"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      placeholder="Họ và tên chủ tài khoản"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account-number">Số tài khoản</Label>
                    <Input
                      id="account-number"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Số tài khoản ngân hàng"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={handleSaveBankAccount}
                      disabled={savingBank}
                    >
                      {savingBank ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Lưu thông tin
                    </Button>
                    {bankAccount && (
                      <Button variant="outline" onClick={() => setEditingBank(false)}>
                        Hủy
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TutorRevenueDialog;
