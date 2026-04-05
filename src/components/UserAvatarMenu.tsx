import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/untypedClient';
import UserAvatar from './UserAvatar';
import SettingsDialog from './SettingsDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Settings, LogOut } from 'lucide-react';

interface UserAvatarMenuProps {
  onSignOut: () => void;
}

const UserAvatarMenu = ({ onSignOut }: UserAvatarMenuProps) => {
  const { user, fullName } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchAvatar = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', user.id)
        .single();
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
    };
    fetchAvatar();
  }, [user]);

  useEffect(() => {
    const handler = (e: CustomEvent<string>) => setAvatarUrl(e.detail || null);
    window.addEventListener('avatarUpdated', handler as EventListener);
    return () => window.removeEventListener('avatarUpdated', handler as EventListener);
  }, []);

  if (!user) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="focus:outline-none">
            <UserAvatar
              userId={user.id}
              avatarUrl={avatarUrl}
              fullName={fullName}
              size="sm"
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56 p-1.5 animate-in fade-in-0 zoom-in-95 duration-150 rounded-xl shadow-xl border border-border/60"
        >
          <div className="px-3 py-2">
            <p className="font-semibold text-sm truncate">{fullName || t('menu.user')}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => navigate('/profile')}
            className="gap-3 py-2.5 px-3 rounded-lg cursor-pointer"
          >
            <User className="w-4 h-4" />
            {t('menu.profile')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setSettingsOpen(true)}
            className="gap-3 py-2.5 px-3 rounded-lg cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            {t('menu.settings')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onSignOut}
            className="gap-3 py-2.5 px-3 rounded-lg cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="w-4 h-4" />
            {t('menu.signout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
};

export default UserAvatarMenu;
