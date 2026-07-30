import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Image, Tag, Folder } from 'lucide-react';
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
import { MOCK_BOARDS } from '@/data/blog';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

interface CreatePostPageProps {
  isEdit?: boolean;
}

export default function CreatePostPage({ isEdit = false }: CreatePostPageProps) {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [boardId, setBoardId] = useState<string>('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login?redirect=' + encodeURIComponent('/post/create'));
    }
  }, [isLoggedIn, navigate]);

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
    // 模拟提交
    await new Promise((r) => setTimeout(r, 800));

    toast.success(status === 'published' ? '发布成功' : '已保存为草稿');
    navigate('/');
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* 顶部栏 */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/50 bg-background/80 px-4 py-3 backdrop-blur-md">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-medium">发布文章</h1>
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
            <Send className="h-3.5 w-3.5" />
            发布
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
          maxLength={100}
        />

        {/* 板块选择 */}
        <div className="flex items-center gap-3">
          <Folder className="h-4 w-4 text-muted-foreground" />
          <Select value={boardId} onValueChange={setBoardId}>
            <SelectTrigger className="h-9 flex-1 border-0 bg-transparent px-0 text-sm focus:ring-0">
              <SelectValue placeholder="选择板块" />
            </SelectTrigger>
            <SelectContent>
              {MOCK_BOARDS.map((board) => (
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
          <Image className="h-4 w-4 text-muted-foreground" />
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground">
            添加封面图
          </Button>
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
