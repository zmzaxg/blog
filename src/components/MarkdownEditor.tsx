import { useState, useRef, useCallback, type ChangeEvent } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Image,
  Table,
  Minus,
  Eye,
  Edit3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = '开始写作...',
  minHeight = '300px',
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<'edit' | 'preview' | 'split'>('edit');

  const insertText = useCallback(
    (before: string, after = '', placeholder = '') => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end) || placeholder;
      const newText =
        value.substring(0, start) + before + selectedText + after + value.substring(end);

      onChange(newText);

      // 设置光标位置
      setTimeout(() => {
        textarea.focus();
        const newPos = start + before.length + selectedText.length;
        textarea.setSelectionRange(newPos, newPos + after.length);
      }, 0);
    },
    [value, onChange]
  );

  const insertLine = useCallback(
    (prefix: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const newText =
        value.substring(0, lineStart) + prefix + value.substring(lineStart);

      onChange(newText);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length);
      }, 0);
    },
    [value, onChange]
  );

  const toolbarButtons = [
    { icon: Bold, title: '粗体', action: () => insertText('**', '**', '粗体文字') },
    { icon: Italic, title: '斜体', action: () => insertText('*', '*', '斜体文字') },
    { icon: Strikethrough, title: '删除线', action: () => insertText('~~', '~~', '删除线') },
    { type: 'divider' },
    { icon: Heading1, title: '一级标题', action: () => insertLine('# ') },
    { icon: Heading2, title: '二级标题', action: () => insertLine('## ') },
    { icon: Heading3, title: '三级标题', action: () => insertLine('### ') },
    { type: 'divider' },
    { icon: List, title: '无序列表', action: () => insertLine('- ') },
    { icon: ListOrdered, title: '有序列表', action: () => insertLine('1. ') },
    { icon: Quote, title: '引用', action: () => insertLine('> ') },
    { type: 'divider' },
    { icon: Code, title: '代码', action: () => insertText('`', '`', 'code') },
    { icon: Link, title: '链接', action: () => insertText('[', '](https://)', '链接文字') },
    { icon: Image, title: '图片', action: () => insertText('![', '](https://)', '图片描述') },
    { icon: Table, title: '表格', action: () => insertText('\n| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n| A   | B   | C   |\n', '', '') },
    { icon: Minus, title: '分割线', action: () => insertText('\n---\n', '', '') },
  ];

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/30 p-2">
        {toolbarButtons.map((btn, i) =>
          btn.type === 'divider' ? (
            <div key={i} className="mx-1 h-5 w-px bg-border" />
          ) : (
            <Button
              key={i}
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={btn.action}
              title={btn.title}
            >
              {btn.icon && <btn.icon className="h-4 w-4" />}
            </Button>
          )
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant={mode === 'edit' ? 'secondary' : 'ghost'}
            className="h-8 gap-1 text-xs"
            onClick={() => setMode('edit')}
          >
            <Edit3 className="h-3.5 w-3.5" />
            编辑
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'preview' ? 'secondary' : 'ghost'}
            className="h-8 gap-1 text-xs"
            onClick={() => setMode('preview')}
          >
            <Eye className="h-3.5 w-3.5" />
            预览
          </Button>
        </div>
      </div>

      {/* 编辑区 */}
      <div className="flex-1">
        {mode === 'edit' && (
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            className="min-h-[300px] resize-y border-0 bg-transparent p-4 font-mono text-sm focus-visible:ring-0"
            style={{ minHeight }}
          />
        )}
        {mode === 'preview' && (
          <div
            className="prose prose-sm max-w-none p-4 dark:prose-invert"
            style={{ minHeight }}
          >
            {value ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground">暂无内容，切换到编辑模式开始写作</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
