import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, Loader2, ImageOff } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  alt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ImageViewer = ({ src, alt, open, onOpenChange }: ImageViewerProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string>(src);

  useEffect(() => {
    const getSignedUrl = async () => {
      try {
        // Check if it's a Supabase storage URL
        const match = src.match(/tutor-documents\/(.+)$/);
        if (match) {
          const { data } = await supabase.storage
            .from('tutor-documents')
            .createSignedUrl(match[1], 3600);
          if (data?.signedUrl) {
            setSignedUrl(data.signedUrl);
          }
        } else {
          setSignedUrl(src);
        }
      } catch {
        setSignedUrl(src);
      }
    };

    if (open) {
      setLoading(true);
      setError(false);
      getSignedUrl();
    }
  }, [src, open]);

  const handleDownload = async () => {
    try {
      const response = await fetch(signedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = alt || 'image';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
        <div className="relative w-full h-full min-h-[50vh] flex items-center justify-center">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-6 h-6" />
          </Button>

          {/* Download button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-16 z-50 bg-black/50 hover:bg-black/70 text-white"
            onClick={handleDownload}
          >
            <Download className="w-6 h-6" />
          </Button>

          {/* Loading state */}
          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex flex-col items-center justify-center text-white">
              <ImageOff className="w-16 h-16 mb-4 opacity-50" />
              <p>Không thể tải ảnh</p>
            </div>
          )}

          {/* Image */}
          {!error && (
            <img
              src={signedUrl}
              alt={alt}
              className={`max-w-full max-h-[90vh] object-contain ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
              onLoad={() => setLoading(false)}
              onError={() => {
                setError(true);
                setLoading(false);
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewer;
