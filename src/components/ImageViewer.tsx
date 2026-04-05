import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/untypedClient';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, Loader2, ImageOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ImageViewerProps {
  images?: string[];
  initialIndex?: number;
  alt?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src?: string;
}

const ImageViewer = ({ images: imagesProp, initialIndex = 0, alt = 'Ảnh', open, onOpenChange, src }: ImageViewerProps) => {
  const images = (imagesProp && imagesProp.length > 0) ? imagesProp : (src ? [src] : []);
  
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Map<number, string>>(new Map());
  const isMobile = useIsMobile();
  const touchRef = useRef<{ startX: number; startY: number }>({ startX: 0, startY: 0 });
  const thumbnailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
    }
  }, [open, initialIndex]);

  useEffect(() => {
    if (!open || images.length === 0) return;
    setLoading(true);
    setError(false);
    resolveUrl(currentIndex);
  }, [currentIndex, open, images]);

  const resolveUrl = async (idx: number) => {
    if (signedUrls.has(idx)) {
      setLoading(false);
      return;
    }
    const url = images[idx];
    try {
      const match = url.match(/tutor-documents\/(.+)$/);
      if (match) {
        const { data } = await supabase.storage.from('tutor-documents').createSignedUrl(match[1], 3600);
        if (data?.signedUrl) {
          setSignedUrls(prev => new Map(prev).set(idx, data.signedUrl));
          return;
        }
      }
      setSignedUrls(prev => new Map(prev).set(idx, url));
    } catch {
      setSignedUrls(prev => new Map(prev).set(idx, url));
    }
  };

  const currentUrl = signedUrls.get(currentIndex) || images[currentIndex] || '';

  const goTo = useCallback((idx: number) => {
    if (idx >= 0 && idx < images.length) {
      setCurrentIndex(idx);
      setLoading(true);
      setError(false);
      // Scroll thumbnail into view
      setTimeout(() => {
        const thumb = document.getElementById(`thumb-${idx}`);
        thumb?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }, 50);
    }
  }, [images.length]);

  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);
  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, goPrev, goNext]);

  // Touch swipe for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchRef.current.startX;
    const dy = Math.abs(e.changedTouches[0].clientY - touchRef.current.startY);
    if (Math.abs(dx) > 50 && dy < 80) {
      if (dx < 0) goNext();
      else goPrev();
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(currentUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${alt}-${currentIndex + 1}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  if (images.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 bg-black/95 border-none rounded-none [&>button.absolute]:hidden">
        <div className="relative w-full h-full flex flex-col"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-3">
            <span className="text-white/80 text-sm font-medium bg-black/40 px-3 py-1 rounded-full">
              {currentIndex + 1} / {images.length}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon"
                className="bg-black/40 hover:bg-black/60 text-white h-9 w-9"
                onClick={handleDownload}>
                <Download className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon"
                className="bg-black/40 hover:bg-black/60 text-white h-9 w-9"
                onClick={() => onOpenChange(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Main image area */}
          <div className="flex-1 flex items-center justify-center relative min-h-0">
            {/* Desktop arrows */}
            {!isMobile && images.length > 1 && (
              <>
                <Button variant="ghost" size="icon"
                  className="absolute left-3 z-40 bg-black/40 hover:bg-black/60 text-white h-10 w-10 rounded-full"
                  onClick={goPrev} disabled={currentIndex === 0}>
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button variant="ghost" size="icon"
                  className="absolute right-3 z-40 bg-black/40 hover:bg-black/60 text-white h-10 w-10 rounded-full"
                  onClick={goNext} disabled={currentIndex === images.length - 1}>
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </>
            )}

            {loading && !error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center text-white">
                <ImageOff className="w-16 h-16 mb-4 opacity-50" />
                <p>Không thể tải ảnh</p>
              </div>
            )}

            {!error && (
              <img
                src={currentUrl}
                alt={`${alt} ${currentIndex + 1}`}
                className={`max-w-full max-h-[calc(100vh-120px)] object-contain select-none ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
                onLoad={() => setLoading(false)}
                onError={() => { setError(true); setLoading(false); }}
                draggable={false}
              />
            )}
          </div>

          {/* Thumbnail strip at bottom */}
          {images.length > 1 && (
            <div className="flex-shrink-0 bg-black/60 px-2 py-2">
              <div ref={thumbnailRef} className="flex gap-1.5 overflow-x-auto justify-center scrollbar-hide">
                {images.map((url, i) => (
                  <button
                    key={i}
                    id={`thumb-${i}`}
                    onClick={() => goTo(i)}
                    className={`flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${
                      i === currentIndex ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-90'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewer;
