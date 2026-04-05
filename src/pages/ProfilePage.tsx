import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/untypedClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import UserAvatar from '@/components/UserAvatar';
import AvatarUploadDialog from '@/components/AvatarUploadDialog';
import { ArrowLeft, Camera, Pencil, Save, Loader2, Mail, Phone, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/useLanguage';

const ProfilePage = () => {
  const { user, role, fullName, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);

  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user!.id)
      .single();
    if (data) {
      setProfile(data);
      setEditFullName(data.full_name || '');
      setEditPhone(data.phone || '');
    }
    setLoadingProfile(false);
  };

  const handleSave = async () => {
    if (!editFullName.trim()) {
      toast({ title: t('common.error'), description: t('profile.error.name'), variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editFullName.trim(), phone: editPhone.trim() || null })
      .eq('user_id', user!.id);

    if (error) {
      toast({ title: t('common.error'), description: t('profile.error.update'), variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: t('profile.updated') });
      setEditing(false);
      fetchProfile();
    }
    setSaving(false);
  };

  const handleAvatarUpdated = (url: string) => {
    setProfile((prev: any) => ({ ...prev, avatar_url: url }));
    window.dispatchEvent(new CustomEvent('avatarUpdated', { detail: url }));
  };

  const roleLabels: Record<string, string> = {
    admin: t('role.admin'),
    tutor: t('role.tutor'),
    student: t('role.student'),
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-blue-900 text-white',
    tutor: 'bg-orange-100 text-orange-800',
    student: 'bg-primary/10 text-primary',
  };

  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold">{t('profile.title')}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        <Card className="overflow-hidden">
          {/* Header with gradient */}
          <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20" />

          <div className="px-6 -mt-12 pb-6">
            {/* Avatar */}
            <div className="relative inline-block mb-4">
              <UserAvatar
                avatarUrl={profile?.avatar_url}
                fullName={profile?.full_name}
                size="xl"
                className="ring-4 ring-card"
              />
              <button
                onClick={() => setAvatarDialogOpen(true)}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Info */}
            {!editing ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold">{profile?.full_name}</h2>
                  {role && (
                    <Badge className={`mt-1 ${roleColors[role] || ''}`}>
                      <Shield className="w-3 h-3 mr-1" />
                      {roleLabels[role] || role}
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{profile?.email}</span>
                  </div>
                  {profile?.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    ID: {user?.id?.slice(0, 8).toUpperCase()}
                  </div>
                </div>

                <Button onClick={() => setEditing(true)} variant="outline" className="gap-2 w-full">
                  <Pencil className="w-4 h-4" />
                  {t('profile.edit')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>{t('profile.fullname')}</Label>
                  <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
                </div>
                <div>
                  <Label>{t('profile.phone._')}</Label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder={t('profile.phone.placeholder')} />
                </div>
                <div>
                  <Label>{t('profile.email')}</Label>
                  <Input value={profile?.email} disabled className="opacity-60" />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => { setEditing(false); setEditFullName(profile?.full_name || ''); setEditPhone(profile?.phone || ''); }}>
                    {t('common.cancel')}
                  </Button>
                  <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {t('common.save')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </main>

      <AvatarUploadDialog
        open={avatarDialogOpen}
        onOpenChange={setAvatarDialogOpen}
        onAvatarUpdated={handleAvatarUpdated}
        currentAvatarUrl={profile?.avatar_url}
        fullName={profile?.full_name}
      />
    </div>
  );
};

export default ProfilePage;
