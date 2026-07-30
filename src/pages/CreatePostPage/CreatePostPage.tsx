import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, Image as ImageIcon, Tag, Folder, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MarkdownEditor from '@/components/MarkdownEditor';
import { postApi, boardApi, storageApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import type { IBoard } from '@/data/blog';

interface CreatePostPageProps {
  isEdit?: boolean;
}

export default function CreatePostPage({ isEdit = false }: CreatePostPageProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isLoggedIn, isLoading } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [boardId, setBoardId] = useState<string>('');
  const [tags, setTags] = useState('');
  const [coverImage, setCoverImage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPost, setIsLoadingPost] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [boards, setBoards] = useState<IBoard[]>([]);

  // 获取板块列表
  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const res = await boardApi.list();
        if (res.success && res.data) {
          setBoards(res.data as unknown as IBoard[]);
        }
      } catch {
        toast.error('加载板块失败');
      }
    };
    fetchBoards();
  }, []);

  // 编辑模式：加载已有文章
  useEffect(() => {
    if (!isEdit || !id) return;
    const loadPost = async () => {
      setIsLoadingPost(true);
      try {
        const res = await postApi.get(parseInt(id, 10));
        if (res.success && res.data) {
          const data = res.data as unknown as {
            title: string;
            content_md: string;
            board_id: number | null;
            tags: string[];
            cover_image: string | null;
          };
          setTitle(data.title);
          setContent(data.content_md);
          setBoardId(data.board_id ? String(data.board_id) : '');
          setTags(data.tags?.join(', ') || '');
          setCoverImage(data.cover_image || '');
        } else {
          toast.error('文章不存在');
          navigate(-1);
        }
      } catch {
        toast.error('加载文章失败');
        navigate(-1);
      } finally {
        setIsLoadingPost(false);
      }
    };
    loadPost();
  }, [isEdit, id, navigate]);

  // 登录检查（等加载完成后再判断）
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      navigate('/login?redirect=' + encodeURIComponent(isEdit ? `/post/${id}/edit` : '/post/create'));
    }
  }, [isLoading, isLoggedIn, navigate, isEdit, id]);

  // 图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const res = await storageApi.uploadImage(file);
      if (res.success && res.data) {
        const url = (res.data as unknown as { url: string }).url;
        setCoverImage(url);
        toast.success('封面图上传成功');
      } else {
        toast.error(res.message || '上传失败');
      }
    } catch {
      toast.error('上传失败，请稍后重试');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // 编辑器内图片上传
  const handleEditorImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const res = await storageApi.uploadImage(file);
      if (res.success && res.data) {
        const url = (res.data as unknown as { url: string }).url;
        const markdown = `![${file.name}](${url})`;
        setContent((prev) => prev + '\n' + markdown + '\n');
        toast.success('图片已插入');
      } else {
        toast.error(res.message || '上传失败');
      }
    } catch {
      toast.error('上传失败');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (status: 'published' | 'draft') => {
    if (!title.trim()) {
      toast.error('请输入文章标题');
      return;
    }
    if (!content.trim()) {
      toast.error('请输入文章内容');
      return;
    }
    if (!boardId) {
      toast.error('请选择板块');
      return;
    }

    setIsSubmitting(true);
    try {
      const tagList = tags
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean);
      const postData = {
        title: title.trim(),
        content_md: content,
        board_id: parseInt(boardId, 10),
        tags: tagList,
        cover_image: coverImage || undefined,
        status,
      };

      let res;
      if (isEdit && id) {
        res = await postApi.update(parseInt(id, 10), postData);
      } else {
        res = await postApi.create(postData);
      }

      if (res.success) {
        toast.success(
          status === 'published'
            ? isEdit ? '更新成功' : '发布成功'
            : '已保存为草稿'
        );
        const postId = isEdit ? id : (res.data as unknown as { id: number })?.id;
        navigate(postId ? `/post/${postId}` : '/');
      } else {
        toast.error(res.message || '操作失败');
      }
    } catch {
      toast.error('操作失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoggedIn) {
    return null;
  }

  if (isLoadingPost) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* 顶部栏 */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/50 bg-background/80 px-4 py-3 backdrop-blur-md">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-medium">{isEdit ? '编辑文章' : '发布文章'}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => handleSubmit('draft')}
            disabled={isSubmitting}
          >
            草稿
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => handleSubmit('published')}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {isEdit ? '更新' : '发布'}
          </Button>
        </div>
      </header>

      {/* 编辑区 */}
      <div className="flex-1 space-y-4 px-4 py-4">
        {/* 标题 */}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="输入文章标题..."
          className="border-0 bg-transparent px-0 text-xl font-bold focus-visible:ring-0 focus-visible:ring-offset-0"
          maxLength={200}
        />

        {/* 板块选择 */}
        <div className="flex items-center gap-3">
          <Folder className="h-4 w-4 text-muted-foreground" />
          <Select value={boardId} onValueChange={setBoardId}>
            <SelectTrigger className="h-9 flex-1 border-0 bg-transparent px-0 text-sm focus:ring-0">
              <SelectValue placeholder="选择板块" />
            </SelectTrigger>
            <SelectContent>
              {boards.map((board) => (
                <SelectItem key={board.id} value={String(board.id)}>
                  {board.icon} {board.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 标签 */}
        <div className="flex items-center gap-3">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="标签（用逗号分隔）"
            className="h-9 border-0 bg-transparent px-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        {/* 封面图 */}
        <div className="flex items-center gap-3">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          {coverImage ? (
            <div className="flex items-center gap-2">
              <img
                src={coverImage}
                alt="封面"
                className="h-12 w-12 rounded object-cover"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => setCoverImage('')}
              >
                移除
              </Button>
            </div>
          ) : (
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={isUploading}
              />
              <span className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                {isUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                {isUploading ? '上传中...' : '添加封面图'}
              </span>
            </label>
          )}
        </div>

        {/* 插入图片 */}
        <div className="flex items-center gap-3">
          <Upload className="h-4 w-4 text-muted-foreground" />
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleEditorImageUpload}
              disabled={isUploading}
            />
            <span className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5" />
              )}
              {isUploading ? '上传中...' : '插入图片到正文'}
            </span>
          </label>
        </div>

        <div className="h-px bg-border" />

        {/* Markdown 编辑器 */}
        <MarkdownEditor
          value={content}
          onChange={setContent}
          placeholder="开始写作，支持 Markdown 语法..."
          minHeight="400px"
        />
      </div>
    </div>
  );
}
