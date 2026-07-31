import { useState, useEffect } from 'react';
import {
  FileText,
  MessageSquare,
  Users,
  Folder,
  TrendingUp,
  Eye,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { adminApi } from '@/lib/api';

interface Stats {
  total_posts: number;
  total_comments: number;
  total_users: number;
  total_boards: number;
  pending_comments: number;
  trend: { date: string; count: number }[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await adminApi.stats();
        if (res.success && res.data) {
          setStats(res.data as unknown as Stats);
        }
      } catch {
        // 使用 mock 数据
        setStats({
          total_posts: 128,
          total_comments: 356,
          total_users: 89,
          total_boards: 4,
          pending_comments: 3,
          trend: [
            { date: '01-22', count: 5 },
            { date: '01-23', count: 8 },
            { date: '01-24', count: 3 },
            { date: '01-25', count: 12 },
            { date: '01-26', count: 7 },
            { date: '01-27', count: 15 },
            { date: '01-28', count: 10 },
          ],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { label: '文章总数', value: stats?.total_posts || 0, icon: FileText, color: 'text-blue-500' },
    { label: '评论总数', value: stats?.total_comments || 0, icon: MessageSquare, color: 'text-green-500' },
    { label: '用户总数', value: stats?.total_users || 0, icon: Users, color: 'text-purple-500' },
    { label: '板块数量', value: stats?.total_boards || 0, icon: Folder, color: 'text-orange-500' },
  ];

  // 简单的柱状图
  const maxCount = Math.max(...(stats?.trend?.map((t) => t.count) || [1]));

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* 待审核提示 */}
      {stats && stats.pending_comments > 0 && (
        <Card className="border-warning/30 bg-warning/10">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-warning" />
              <div>
                <div className="text-sm font-medium">有待审核的评论</div>
                <div className="text-xs text-muted-foreground">
                  {stats.pending_comments} 条评论等待审核
                </div>
              </div>
            </div>
            <Button size="sm" variant="outline">
              去审核
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statCards.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
                <Badge variant="outline" className="text-[10px]">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  +12%
                </Badge>
              </div>
              <div className="mt-3 text-2xl font-bold tabular-nums">
                {loading ? '...' : stat.value}
              </div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 发布趋势 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">近 7 天发布趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-end gap-2">
            {stats?.trend?.map((item, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md bg-primary/80 transition-all hover:bg-primary"
                  style={{ height: `${(item.count / maxCount) * 100}%`, minHeight: '4px' }}
                  title={`${item.count} 篇`}
                />
                <span className="text-[10px] text-muted-foreground">{item.date}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 快捷操作 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">快捷操作</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-auto flex-col gap-1 py-4 text-xs">
              <FileText className="h-5 w-5" />
              新建文章
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-1 py-4 text-xs">
              <Users className="h-5 w-5" />
              添加用户
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-1 py-4 text-xs">
              <Folder className="h-5 w-5" />
              新建板块
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-1 py-4 text-xs">
              <Settings className="h-5 w-5" />
              系统设置
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">系统状态</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">数据库</span>
              <Badge className="bg-green-500/20 text-green-500">正常</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">存储服务</span>
              <Badge variant="outline">未配置</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">邮件服务</span>
              <Badge variant="outline">未配置</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">系统版本</span>
              <span className="font-mono text-xs">v1.0.0</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
