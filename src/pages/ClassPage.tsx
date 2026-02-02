import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Send,
  FileText,
  Image,
  Paperclip,
  Plus,
  MessageCircle,
  Trash2,
  Edit,
  Download,
  Loader2,
  User,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TrialEnrollmentBadge from '@/components/TrialEnrollmentBadge';
import useTrialExpiration from '@/hooks/useTrialExpiration';

interface ClassInfo {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  grade: string;
  tutor_id: string | null;
  display_id: string | null;
  address?: string | null;
}

interface Post {
  id: string;
  title: string;
  content: string;
  tutor_id: string;
  created_at: string;
  files?: PostFile[];
}

interface PostFile {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name?: string;
}

interface Submission {
  id: string;
  student_id: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  grade: string | null;
  feedback: string | null;
  created_at: string;
  student_name?: string;
}

interface GroupMessage {
  id: string;
  class_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
}

const ClassPage = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const postFileInputRef = useRef<HTMLInputElement>(null);

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [tutorName, setTutorName] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isTutor, setIsTutor] = useState(false);
  const [enrollmentInfo, setEnrollmentInfo] = useState<{
    enrollment_type: string | null;
    trial_expires_at: string | null;
  } | null>(null);

  // Post creation
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [postFiles, setPostFiles] = useState<File[]>([]);
  const [creatingPost, setCreatingPost] = useState(false);

  // Post detail view
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submissionContent, setSubmissionContent] = useState('');
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // In-class group messaging
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [senderNames, setSenderNames] = useState<Map<string, string>>(new Map());
  const [newGroupMessage, setNewGroupMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Grading dialog
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [gradeValue, setGradeValue] = useState('');
  const [feedbackValue, setFeedbackValue] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && classId) {
      checkAccessAndFetchData();
    }
  }, [user, classId]);

  useEffect(() => {
    if (hasAccess && classId) {
      // Subscribe to group messages realtime
      const channel = supabase
        .channel(`group-messages-${classId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'class_group_messages',
            filter: `class_id=eq.${classId}`,
          },
          async (payload) => {
            const newMsg = payload.new as GroupMessage;
            // Get sender name if not cached
            let senderName = senderNames.get(newMsg.sender_id);
            if (!senderName) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('user_id', newMsg.sender_id)
                .single();
              if (profile) {
                senderName = profile.full_name;
                setSenderNames(prev => new Map(prev).set(newMsg.sender_id, profile.full_name));
              }
            }
            setGroupMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, { ...newMsg, sender_name: senderName || senderNames.get(newMsg.sender_id) }];
            });
            
            // Create notification for new group message if not from current user
            if (newMsg.sender_id !== user?.id && senderName) {
              try {
                await supabase.from('notifications').insert({
                  user_id: user?.id,
                  type: 'group_message',
                  title: 'Tin nhắn mới trong lớp',
                  message: `${senderName} đã gửi tin nhắn trong lớp học`,
                  related_id: classId,
                });
              } catch (e) {
                console.error('Error creating notification:', e);
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [hasAccess, classId, senderNames]);

  // Scroll to bottom when messages load or change
  useEffect(() => {
    if (groupMessages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [groupMessages]);

  const checkAccessAndFetchData = async () => {
    if (!user || !classId) return;

    setLoading(true);
    try {
      // Fetch class info
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .maybeSingle();

      if (classError || !classData) {
        toast({
          variant: 'destructive',
          title: 'Lỗi',
          description: 'Không tìm thấy lớp học',
        });
        navigate(-1);
        return;
      }

      setClassInfo(classData);

      // Check if user is the tutor
      const userIsTutor = classData.tutor_id === user.id;
      setIsTutor(userIsTutor);

      // Check if user has access (tutor, enrolled student, or admin)
      let access = userIsTutor;

      if (!access) {
        // Check if admin
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (roleData?.role === 'admin') {
          access = true;
        }
      }

      if (!access) {
        // Check if enrolled student (not removed/expired)
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('status, enrollment_type, trial_expires_at')
          .eq('class_id', classId)
          .eq('student_id', user.id)
          .eq('status', 'approved')
          .maybeSingle();

        if (enrollment) {
          // Check if trial has expired
          if (enrollment.enrollment_type === 'trial' && enrollment.trial_expires_at) {
            const expiresAt = new Date(enrollment.trial_expires_at);
            if (expiresAt < new Date()) {
              // Trial expired, update enrollment status
              await supabase
                .from('enrollments')
                .update({ status: 'removed', removal_reason: 'Hết hạn học thử' })
                .eq('class_id', classId)
                .eq('student_id', user.id);

              toast({
                variant: 'destructive',
                title: 'Hết hạn học thử',
                description: 'Thời gian học thử của bạn đã hết. Vui lòng đăng ký chính thức để tiếp tục.',
              });
              navigate(-1);
              return;
            }
          }
          
          access = true;
          setEnrollmentInfo({
            enrollment_type: enrollment.enrollment_type,
            trial_expires_at: enrollment.trial_expires_at,
          });
        }
      }

      if (!access) {
        toast({
          variant: 'destructive',
          title: 'Không có quyền',
          description: 'Bạn không có quyền truy cập lớp học này',
        });
        navigate(-1);
        return;
      }

      setHasAccess(true);

      // Fetch tutor name
      if (classData.tutor_id) {
        const { data: tutorProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', classData.tutor_id)
          .maybeSingle();

        if (tutorProfile) {
          setTutorName(tutorProfile.full_name);
        }
      }

      // Fetch posts
      await fetchPosts();

      // Fetch group messages
      await fetchGroupMessages();
    } catch (error) {
      console.error('Error checking access:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    if (!classId) return;

    const { data: postsData, error } = await supabase
      .from('class_posts')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });

    if (!error && postsData) {
      // Fetch files for each post
      const postsWithFiles = await Promise.all(
        postsData.map(async (post) => {
          const { data: files } = await supabase
            .from('class_post_files')
            .select('*')
            .eq('post_id', post.id);
          return { ...post, files: files || [] };
        })
      );
      setPosts(postsWithFiles);
    }
  };

  const fetchGroupMessages = async () => {
    if (!classId) return;

    const { data, error } = await supabase
      .from('class_group_messages')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      // Get sender names
      const senderIds = [...new Set(data.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', senderIds);

      const nameMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      setSenderNames(nameMap);

      const messagesWithNames = data.map(m => ({
        ...m,
        sender_name: nameMap.get(m.sender_id) || 'Ẩn danh',
      }));
      setGroupMessages(messagesWithNames);
      
      // Scroll to bottom after loading messages
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 100);
    }
  };

  const handleCreatePost = async () => {
    if (!user || !classId || !newPostTitle.trim() || !newPostContent.trim()) return;

    setCreatingPost(true);
    try {
      // Create post
      const { data: post, error: postError } = await supabase
        .from('class_posts')
        .insert({
          class_id: classId,
          tutor_id: user.id,
          title: newPostTitle.trim(),
          content: newPostContent.trim(),
        })
        .select()
        .single();

      if (postError) throw postError;

      // Upload files
      for (const file of postFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `posts/${post.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('assignments')
          .upload(fileName, file);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('assignments')
            .getPublicUrl(fileName);

          await supabase.from('class_post_files').insert({
            post_id: post.id,
            file_url: urlData.publicUrl,
            file_name: file.name,
            file_type: file.type.startsWith('image/') ? 'image' : 'file',
          });
        }
      }

      toast({ title: 'Thành công', description: 'Đã đăng bài viết' });
      setShowCreatePost(false);
      setNewPostTitle('');
      setNewPostContent('');
      setPostFiles([]);
      await fetchPosts();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message || 'Không thể đăng bài viết',
      });
    } finally {
      setCreatingPost(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Bạn có chắc muốn xóa bài viết này?')) return;

    const { error } = await supabase.from('class_posts').delete().eq('id', postId);

    if (!error) {
      toast({ title: 'Đã xóa', description: 'Bài viết đã được xóa' });
      await fetchPosts();
      setSelectedPost(null);
    }
  };

  const handleSelectPost = async (post: Post) => {
    setSelectedPost(post);

    // Fetch comments
    const { data: commentsData } = await supabase
      .from('class_comments')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    if (commentsData) {
      const userIds = [...new Set(commentsData.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]) || []);

      setComments(
        commentsData.map((c) => ({
          ...c,
          user_name: profileMap.get(c.user_id) || 'Ẩn danh',
        }))
      );
    }

    // Fetch submissions (for tutor) or own submission (for student)
    if (isTutor) {
      const { data: subsData } = await supabase
        .from('class_submissions')
        .select('*')
        .eq('post_id', post.id)
        .order('created_at', { ascending: false });

      if (subsData) {
        const studentIds = [...new Set(subsData.map((s) => s.student_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', studentIds);

        const profileMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]) || []);

        setSubmissions(
          subsData.map((s) => ({
            ...s,
            student_name: profileMap.get(s.student_id) || 'Ẩn danh',
          }))
        );
      }
    } else {
      const { data: mySubmission } = await supabase
        .from('class_submissions')
        .select('*')
        .eq('post_id', post.id)
        .eq('student_id', user?.id)
        .maybeSingle();

      setSubmissions(mySubmission ? [mySubmission] : []);
    }
  };

  const handleAddComment = async () => {
    if (!user || !selectedPost || !newComment.trim()) return;

    const { error } = await supabase.from('class_comments').insert({
      post_id: selectedPost.id,
      user_id: user.id,
      content: newComment.trim(),
    });

    if (!error) {
      setNewComment('');
      await handleSelectPost(selectedPost);
    }
  };

  const handleSubmitAssignment = async () => {
    if (!user || !selectedPost || (!submissionContent.trim() && !submissionFile)) return;

    setSubmitting(true);
    try {
      let fileUrl = null;
      let fileName = null;

      if (submissionFile) {
        const fileExt = submissionFile.name.split('.').pop();
        const uploadName = `submissions/${selectedPost.id}/${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('assignments')
          .upload(uploadName, submissionFile);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('assignments')
            .getPublicUrl(uploadName);
          fileUrl = urlData.publicUrl;
          fileName = submissionFile.name;
        }
      }

      const { error } = await supabase.from('class_submissions').insert({
        post_id: selectedPost.id,
        student_id: user.id,
        content: submissionContent.trim() || null,
        file_url: fileUrl,
        file_name: fileName,
      });

      if (error) throw error;

      toast({ title: 'Thành công', description: 'Đã nộp bài tập' });
      setSubmissionContent('');
      setSubmissionFile(null);
      await handleSelectPost(selectedPost);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: error.message || 'Không thể nộp bài',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGradeSubmission = async () => {
    if (!gradingSubmission || !gradeValue.trim()) return;

    const { error } = await supabase
      .from('class_submissions')
      .update({
        grade: gradeValue.trim(),
        feedback: feedbackValue.trim() || null,
      })
      .eq('id', gradingSubmission.id);

    if (!error) {
      toast({ title: 'Thành công', description: 'Đã chấm điểm' });
      setGradingSubmission(null);
      setGradeValue('');
      setFeedbackValue('');
      if (selectedPost) await handleSelectPost(selectedPost);
    }
  };

  const handleSendGroupMessage = async () => {
    if (!user || !classId || !newGroupMessage.trim()) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase.from('class_group_messages').insert({
        class_id: classId,
        sender_id: user.id,
        content: newGroupMessage.trim(),
      });

      if (error) throw error;
      setNewGroupMessage('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể gửi tin nhắn',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold truncate">{classInfo?.name}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {classInfo?.subject} - {classInfo?.grade} | Mã lớp: {classInfo?.display_id}
              </p>
              {classInfo?.address && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{classInfo.address}</span>
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <TrialEnrollmentBadge 
                trialExpiresAt={enrollmentInfo?.trial_expires_at || null}
                enrollmentType={enrollmentInfo?.enrollment_type || null}
              />
              <Badge variant={isTutor ? 'default' : 'secondary'}>
                {isTutor ? 'Gia sư' : 'Học viên'}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="posts" className="space-y-6">
          <TabsList className="grid grid-cols-2 max-w-md w-full">
            <TabsTrigger value="posts" className="text-xs sm:text-sm">Bài viết</TabsTrigger>
            <TabsTrigger value="messages" className="text-xs sm:text-sm">Nhắn tin hỏi bài</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-6">
            {/* Create post button (tutor only) */}
            {isTutor && (
              <Button onClick={() => setShowCreatePost(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Đăng bài mới
              </Button>
            )}

            {/* Posts list */}
            {posts.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Chưa có bài viết nào</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <Card
                    key={post.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors border-2 border-primary/20 hover:border-primary/40"
                    onClick={() => handleSelectPost(post)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{post.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(post.created_at)}
                          </CardDescription>
                        </div>
                        {post.files && post.files.length > 0 && (
                          <Badge variant="outline" className="gap-1">
                            <Paperclip className="w-3 h-3" />
                            {post.files.length}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground line-clamp-2">{post.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Nhắn tin hỏi gia sư
                </CardTitle>
                <CardDescription>
                  {isTutor
                    ? 'Xem và trả lời câu hỏi từ học viên'
                    : `Gửi câu hỏi cho gia sư: ${tutorName}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  {groupMessages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Chưa có tin nhắn</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {groupMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              msg.sender_id === user?.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {msg.sender_id !== user?.id && (
                              <p className="text-xs font-semibold mb-1 opacity-80">
                                {msg.sender_name || senderNames.get(msg.sender_id) || 'Ẩn danh'}
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                msg.sender_id === user?.id
                                  ? 'text-primary-foreground/70'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {formatTime(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendGroupMessage();
                  }}
                  className="flex gap-2 mt-4"
                >
                  <Input
                    placeholder="Nhập tin nhắn..."
                    value={newGroupMessage}
                    onChange={(e) => setNewGroupMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={!newGroupMessage.trim() || sendingMessage}>
                    {sendingMessage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Post Dialog */}
      <Dialog open={showCreatePost} onOpenChange={setShowCreatePost}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Đăng bài mới</DialogTitle>
            <DialogDescription>Tạo bài viết mới cho lớp học</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tiêu đề</Label>
              <Input
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                placeholder="Nhập tiêu đề bài viết"
              />
            </div>
            <div className="space-y-2">
              <Label>Nội dung</Label>
              <Textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Nhập nội dung bài viết"
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label>Tệp đính kèm</Label>
              <input
                ref={postFileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setPostFiles((prev) => [...prev, ...files]);
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => postFileInputRef.current?.click()}
                className="w-full gap-2"
              >
                <Paperclip className="w-4 h-4" /> Thêm tệp
              </Button>
              {postFiles.length > 0 && (
                <div className="space-y-2">
                  {postFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm truncate">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPostFiles((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCreatePost(false)} className="flex-1">
                Hủy
              </Button>
              <Button
                onClick={handleCreatePost}
                disabled={!newPostTitle.trim() || !newPostContent.trim() || creatingPost}
                className="flex-1"
              >
                {creatingPost ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Đăng bài
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Post Detail Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedPost && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle>{selectedPost.title}</DialogTitle>
                    <DialogDescription>{formatTime(selectedPost.created_at)}</DialogDescription>
                  </div>
                  {isTutor && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePost(selectedPost.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {/* Content */}
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{selectedPost.content}</p>
                </div>

                {/* Files */}
                {selectedPost.files && selectedPost.files.length > 0 && (
                  <div className="space-y-2">
                    <Label>Tệp đính kèm</Label>
                    <div className="grid gap-2">
                      {selectedPost.files.map((file) => (
                        <a
                          key={file.id}
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 bg-muted rounded hover:bg-muted/80"
                        >
                          {file.file_type === 'image' ? (
                            <Image className="w-5 h-5 text-blue-500" />
                          ) : (
                            <FileText className="w-5 h-5 text-blue-500" />
                          )}
                          <span className="flex-1 truncate">{file.file_name}</span>
                          <Download className="w-4 h-4" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comments */}
                <div className="space-y-3">
                  <Label>Bình luận ({comments.length})</Label>
                  <ScrollArea className="h-[150px]">
                    {comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Chưa có bình luận</p>
                    ) : (
                      <div className="space-y-2">
                        {comments.map((comment) => (
                          <div key={comment.id} className="p-2 bg-muted rounded">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-3 h-3" />
                              <span className="text-sm font-medium">{comment.user_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(comment.created_at)}
                              </span>
                            </div>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Viết bình luận..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                      Gửi
                    </Button>
                  </div>
                </div>

                {/* Submissions */}
                <div className="space-y-3">
                  <Label>Bài nộp</Label>

                  {/* Student submission form */}
                  {!isTutor && submissions.length === 0 && (
                    <div className="space-y-3 p-4 border rounded">
                      <Textarea
                        placeholder="Nội dung bài làm..."
                        value={submissionContent}
                        onChange={(e) => setSubmissionContent(e.target.value)}
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="gap-2"
                        >
                          <Paperclip className="w-4 h-4" />
                          {submissionFile ? submissionFile.name : 'Đính kèm tệp'}
                        </Button>
                        <Button
                          onClick={handleSubmitAssignment}
                          disabled={(!submissionContent.trim() && !submissionFile) || submitting}
                        >
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Nộp bài
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* View submissions */}
                  {submissions.length > 0 && (
                    <div className="space-y-2">
                      {submissions.map((sub) => (
                        <div key={sub.id} className="p-3 border rounded space-y-2">
                          {isTutor && (
                            <p className="text-sm font-medium">{sub.student_name}</p>
                          )}
                          {sub.content && <p className="text-sm">{sub.content}</p>}
                          {sub.file_url && (
                            <a
                              href={sub.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" /> {sub.file_name}
                            </a>
                          )}
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">
                              Nộp lúc: {formatTime(sub.created_at)}
                            </span>
                            {sub.grade ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="w-3 h-3" /> Điểm: {sub.grade}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1">
                                <Clock className="w-3 h-3" /> Chưa chấm
                              </Badge>
                            )}
                          </div>
                          {sub.feedback && (
                            <p className="text-sm text-muted-foreground">
                              Nhận xét: {sub.feedback}
                            </p>
                          )}
                          {isTutor && !sub.grade && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setGradingSubmission(sub)}
                            >
                              Chấm điểm
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Grading Dialog */}
      <Dialog open={!!gradingSubmission} onOpenChange={() => setGradingSubmission(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chấm điểm</DialogTitle>
            <DialogDescription>
              Học viên: {gradingSubmission?.student_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Điểm</Label>
              <Input
                placeholder="VD: 9/10, A+, Giỏi..."
                value={gradeValue}
                onChange={(e) => setGradeValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nhận xét (tùy chọn)</Label>
              <Textarea
                placeholder="Nhận xét về bài làm..."
                value={feedbackValue}
                onChange={(e) => setFeedbackValue(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setGradingSubmission(null)} className="flex-1">
                Hủy
              </Button>
              <Button onClick={handleGradeSubmission} disabled={!gradeValue.trim()} className="flex-1">
                Lưu điểm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassPage;
