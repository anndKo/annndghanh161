import { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/untypedClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, ZoomIn, ZoomOut, Trash2 } from 'lucide-react';
import UserAvatar from './UserAvatar';
import { useLanguage } from '@/hooks/useLanguage';

interface AvatarUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAvatarUpdated: (url: string) => void;
  currentAvatarUrl?: string | null;
  fullName?: string | null;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.crossOrigin = 'anonymous';
    image.src = url;
  });

async function getCroppedImg(imageSrc: string, pixelCrop: { x: number; y: number; width: number; height: number }): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const size = Math.min(pixelCrop.width, 512);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, size, size
  );
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/webp', 0.85);
  });
}

async function getPreviewUrl(imageSrc: string, pixelCrop: { x: number; y: number; width: number; height: number }): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const size = 128;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, size, size
  );
  return canvas.toDataURL('image/jpeg', 0.8);
}

const AvatarUploadDialog = ({ open, onOpenChange, onAvatarUpdated, currentAvatarUrl, fullName }: AvatarUploadDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Generate preview when crop changes
  useEffect(() => {
    if (imageSrc && croppedAreaPixels) {
      const timer = setTimeout(async () => {
        try {
          const url = await getPreviewUrl(imageSrc, croppedAreaPixels);
          setPreviewUrl(url);
        } catch (e) {
          console.error('Preview generation failed:', e);
        }
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setPreviewUrl(null);
    }
  }, [imageSrc, croppedAreaPixels]);

  const handleDeleteAvatar = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const { data: existingFiles } = await supabase.storage.from('avatars').list(user.id);
      if (existingFiles && existingFiles.length > 0) {
        await supabase.storage.from('avatars').remove(existingFiles.map(f => `${user.id}/${f.name}`));
      }
      await supabase.from('profiles').update({ avatar_url: null }).eq('user_id', user.id);
      onAvatarUpdated('');
      toast({ title: t('common.success'), description: t('avatar.delete.success') });
      handleClose();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: t('common.error'), description: t('avatar.error.type'), variant: 'destructive' });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: t('common.error'), description: t('avatar.error.size'), variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels || !user) return;
    setSaving(true);

    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const fileName = `${user.id}/avatar_${Date.now()}.webp`;

      // Delete old avatar files
      const { data: existingFiles } = await supabase.storage
        .from('avatars')
        .list(user.id);

      if (existingFiles && existingFiles.length > 0) {
        await supabase.storage
          .from('avatars')
          .remove(existingFiles.map(f => `${user.id}/${f.name}`));
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, { contentType: 'image/webp', upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl + '?t=' + Date.now();

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      onAvatarUpdated(publicUrl);
      toast({ title: t('common.success'), description: t('avatar.updated') });
      handleClose();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message || t('avatar.error.update'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setPreviewUrl(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('avatar.update')}</DialogTitle>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={handleFileSelect}
        />

        {!imageSrc ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <UserAvatar avatarUrl={currentAvatarUrl} fullName={fullName} size="xl" />
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              {t('avatar.upload')}
            </Button>
            {currentAvatarUrl && (
              <Button
                onClick={handleDeleteAvatar}
                variant="ghost"
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={deleting}
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {t('avatar.delete._')}
              </Button>
            )}
            <p className="text-xs text-muted-foreground text-center">
              {t('avatar.format')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-muted">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="flex items-center gap-3 px-2">
              <ZoomOut className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.1}
                onValueChange={(val) => setZoom(val[0])}
                className="flex-1"
              />
              <ZoomIn className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </div>

            <div className="flex items-center justify-center">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">{t('avatar.preview')}</p>
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary mx-auto bg-muted">
                  {previewUrl && (
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setImageSrc(null)}>
                {t('common.cancel')}
              </Button>
              <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('avatar.save')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AvatarUploadDialog;
