import { useState, useEffect, memo } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  userId?: string;
  avatarUrl?: string | null;
  fullName?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

const iconSizeMap = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const textSizeMap = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-xl',
  xl: 'text-3xl',
};

const UserAvatar = memo(({ userId, avatarUrl, fullName, size = 'md', className, onClick }: UserAvatarProps) => {
  const [url, setUrl] = useState<string | null>(avatarUrl || null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (avatarUrl) {
      setUrl(avatarUrl);
      setError(false);
      return;
    }
    if (!userId) return;

    // Fetch avatar_url from profiles
    const fetchAvatar = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', userId)
        .single();
      if (data?.avatar_url) {
        setUrl(data.avatar_url);
      }
    };
    fetchAvatar();
  }, [userId, avatarUrl]);

  const initials = fullName
    ? fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : null;

  return (
    <Avatar className={cn(sizeMap[size], 'cursor-pointer flex-shrink-0 ring-2 ring-primary/40 ring-offset-2 ring-offset-background hover:ring-primary transition-all shadow-sm', className)} onClick={onClick}>
      {url && !error ? (
        <AvatarImage
          src={url}
          alt={fullName || 'Avatar'}
          loading="lazy"
          onError={() => setError(true)}
        />
      ) : null}
      <AvatarFallback className={cn('bg-primary/10 text-primary', textSizeMap[size])}>
        {initials || <User className={iconSizeMap[size]} />}
      </AvatarFallback>
    </Avatar>
  );
});

UserAvatar.displayName = 'UserAvatar';
export default UserAvatar;
