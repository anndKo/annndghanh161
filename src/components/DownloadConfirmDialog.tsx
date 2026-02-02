import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DownloadConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string;
  fileName?: string;
}

const DownloadConfirmDialog = ({
  open,
  onOpenChange,
  fileUrl,
  fileName,
}: DownloadConfirmDialogProps) => {
  useEffect(() => {
    if (open && fileUrl) {
      handleDownload();
    }
  }, [open, fileUrl]);

  const handleDownload = async () => {
    try {
      // Check if it's a Supabase storage URL and get signed URL if needed
      let downloadUrl = fileUrl;
      
      const tutorDocsMatch = fileUrl.match(/tutor-documents\/(.+)$/);
      if (tutorDocsMatch) {
        const { data } = await supabase.storage
          .from('tutor-documents')
          .createSignedUrl(tutorDocsMatch[1], 3600);
        if (data?.signedUrl) {
          downloadUrl = data.signedUrl;
        }
      }

      // Extract file extension from URL
      const urlPath = new URL(downloadUrl).pathname;
      const extension = urlPath.split('.').pop() || '';
      const finalFileName = fileName 
        ? (fileName.includes('.') ? fileName : `${fileName}.${extension}`)
        : `file_${Date.now()}.${extension}`;

      // Fetch and force download
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = finalFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      // Fallback - open in new tab
      window.open(fileUrl, '_blank');
    }
    onOpenChange(false);
  };

  // No UI needed - downloads immediately
  return null;
};

export default DownloadConfirmDialog;
