import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/untypedClient';
import logoImg from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, BookOpen, Play, X, ChevronRight } from 'lucide-react';

const GuidesPage = () => {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [guides, setGuides] = useState<any[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<any>(null);
  const [videoFullscreen, setVideoFullscreen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchGuides = async () => {
      if (!role) return;
      const targetRole = role === 'tutor' ? 'tutor' : 'student';
      const { data } = await supabase
        .from('guides')
        .select('*')
        .eq('target_role', targetRole)
        .order('created_at', { ascending: false });
      setGuides(data || []);
    };
    fetchGuides();
  }, [role]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <img src={logoImg} alt="Logo" className="w-8 h-8 rounded-lg object-cover" loading="eager" />
          <h1 className="font-bold text-lg">Hướng dẫn sử dụng</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {!selectedGuide ? (
          <div className="space-y-3">
            {guides.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">Chưa có hướng dẫn nào.</p>
              </div>
            ) : (
              guides.map(g => (
                <Card
                  key={g.id}
                  className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  onClick={() => setSelectedGuide(g)}
                >
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium text-sm break-words">{g.title}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div>
            <Button variant="ghost" size="sm" className="mb-4 gap-1" onClick={() => setSelectedGuide(null)}>
              <ArrowLeft className="w-4 h-4" /> Quay lại
            </Button>
            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-bold">{selectedGuide.title}</h2>
                {selectedGuide.content && (
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{selectedGuide.content}</p>
                )}
                {selectedGuide.video_url && (
                  <div
                    className="relative rounded-xl overflow-hidden bg-muted cursor-pointer group aspect-video"
                    onClick={() => setVideoFullscreen(true)}
                  >
                    <video
                      src={selectedGuide.video_url}
                      className="w-full h-full object-cover"
                      preload="metadata"
                    />
                    <div className="absolute inset-0 bg-foreground/20 flex items-center justify-center group-hover:bg-foreground/30 transition-colors">
                      <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
                        <Play className="w-7 h-7 text-primary-foreground ml-1" />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Video Fullscreen Modal */}
      {videoFullscreen && selectedGuide?.video_url && (
        <div className="fixed inset-0 z-[200] bg-foreground/95 flex items-center justify-center" onClick={() => setVideoFullscreen(false)}>
          <button
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-card/20 flex items-center justify-center hover:bg-card/40 transition-colors"
            onClick={() => setVideoFullscreen(false)}
          >
            <X className="w-6 h-6 text-background" />
          </button>
          <video
            src={selectedGuide.video_url}
            className="w-full h-full max-w-[95vw] max-h-[90vh] object-contain rounded-lg"
            controls
            autoPlay
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default GuidesPage;
