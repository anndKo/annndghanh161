import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Image, Clock, CheckCircle2, AlertCircle, Eye, Trash2 } from 'lucide-react';

interface PostFile {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  tutor_id: string;
  created_at: string;
  files?: PostFile[];
  deadline?: string | null;
  status?: 'active' | 'completed' | 'overdue';
}

interface ImprovedPostCardProps {
  post: Post;
  onSelect: (post: Post) => void;
  onDelete?: (postId: string) => void;
  isTutor?: boolean;
}

const ImprovedPostCard = ({ post, onSelect, onDelete, isTutor }: ImprovedPostCardProps) => {
  const getStatusBadge = () => {
    if (!post.deadline) return null;
    
    const now = new Date();
    const deadline = new Date(post.deadline);
    
    if (post.status === 'completed') {
      return (
        <Badge variant="default" className="bg-green-500/20 text-green-700 border-green-500/30">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Hoàn thành
        </Badge>
      );
    }
    
    if (deadline < now) {
      return (
        <Badge variant="destructive" className="bg-red-500/20 text-red-700 border-red-500/30">
          <AlertCircle className="w-3 h-3 mr-1" />
          Quá hạn
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary" className="bg-blue-500/20 text-blue-700 border-blue-500/30">
        <Clock className="w-3 h-3 mr-1" />
        Còn hạn
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const imageFiles = post.files?.filter(f => f.file_type === 'image') || [];
  const otherFiles = post.files?.filter(f => f.file_type !== 'image') || [];

  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary/60 hover:border-l-primary cursor-pointer overflow-hidden"
      onClick={() => onSelect(post)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">
              {post.title}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(post.created_at)}
              </span>
              {getStatusBadge()}
            </div>
          </div>
          
          {isTutor && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(post.id);
              }}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {truncateContent(post.content)}
        </p>
        
        {/* Preview images */}
        {imageFiles.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-hidden">
            {imageFiles.slice(0, 3).map((file, idx) => (
              <div 
                key={file.id} 
                className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative"
              >
                <img 
                  src={file.file_url} 
                  alt={file.file_name}
                  className="w-full h-full object-cover"
                />
                {idx === 2 && imageFiles.length > 3 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-medium">
                    +{imageFiles.length - 3}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* File indicators */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {imageFiles.length > 0 && (
            <span className="flex items-center gap-1">
              <Image className="w-3.5 h-3.5" />
              {imageFiles.length} ảnh
            </span>
          )}
          {otherFiles.length > 0 && (
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              {otherFiles.length} tài liệu
            </span>
          )}
          
          <span className="ml-auto flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            <Eye className="w-3.5 h-3.5" />
            Xem chi tiết
          </span>
        </div>
        
        {/* Deadline display */}
        {post.deadline && (
          <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs">
            <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-muted-foreground">Hạn nộp:</span>
            <span className="font-medium">{formatDate(post.deadline)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ImprovedPostCard;
