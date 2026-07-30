import { useState, useEffect } from 'react';
import { Save, Mail, Shield, Globe, Database, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { adminApi, setupApi } from '@/lib/api';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isBuiltin, setIsBuiltin] = useState(false);
  const [settings, setSettings] = useState({
    site_name: '轻社区博客',
    site_description: '一个基于 Cloudflare Worker + D1 的轻量级社区博客系统',
    site_logo: '',
    registration_enabled: true,
    comment_requires_approval: false,
    comment_requires_login: true,
    email_verification_required: true,
    captcha_enabled: true,
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    max_posts_per_day: '10',
    max_comments_per_day: '50',
  });

  // 加载设置
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // 先检查是否是内置账号模式
      const statusRes = await setupApi.status();
      if (statusRes.success && statusRes.data) {
        setIsBuiltin(!statusRes.data.initialized);
        if (statusRes.data.settings && Object.keys(statusRes.data.settings).length > 0) {
          const s = statusRes.data.settings;
          setSettings((prev) => ({
            ...prev,
            ...s,
            registration_enabled: s.registration_enabled === 'true',
            comment_requires_approval: s.comment_requires_approval === 'true',
            comment_requires_login: s.comment_requires_login === 'true',
            email_verification_required: s.email_verification_required === 'true',
            captcha_enabled: s.captcha_enabled === 'true',
          }));
        }
      }
    } catch {
      // 如果 setup 接口不可用，尝试从 admin 接口加载
      try {
        const res = await adminApi.getSettings();
        if (res.success && res.data) {
          const s = res.data as Record<string, string>;
          setSettings((prev) => ({
            ...prev,
            ...s,
            registration_enabled: s.registration_enabled === 'true',
            comment_requires_approval: s.comment_requires_approval === 'true',
            comment_requires_login: s.comment_requires_login === 'true',
            email_verification_required: s.email_verification_required === 'true',
            captcha_enabled: s.captcha_enabled === 'true',
          }));
        }
      } catch {
        // 使用默认值
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsData: Record<string, string> = {
        site_name: settings.site_name,
        site_description: settings.site_description,
        site_logo: settings.site_logo,
        registration_enabled: String(settings.registration_enabled),
        comment_requires_approval: String(settings.comment_requires_approval),
        comment_requires_login: String(settings.comment_requires_login),
        email_verification_required: String(settings.email_verification_required),
        captcha_enabled: String(settings.captcha_enabled),
        smtp_host: settings.smtp_host,
        smtp_port: settings.smtp_port,
        smtp_user: settings.smtp_user,
        smtp_pass: settings.smtp_pass,
        smtp_from: settings.smtp_from,
        max_posts_per_day: settings.max_posts_per_day,
        max_comments_per_day: settings.max_comments_per_day,
      };

      const res = await adminApi.updateSettings(settingsData);
      if (res.success) {
        toast.success('设置已保存');
      } else {
        toast.error(res.message || '保存失败');
      }
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveToDb = async () => {
    setSaving(true);
    try {
      const settingsData: Record<string, string> = {
        site_name: settings.site_name,
        site_description: settings.site_description,
        site_logo: settings.site_logo,
        registration_enabled: String(settings.registration_enabled),
        comment_requires_approval: String(settings.comment_requires_approval),
        comment_requires_login: String(settings.comment_requires_login),
        email_verification_required: String(settings.email_verification_required),
        captcha_enabled: String(settings.captcha_enabled),
        smtp_host: settings.smtp_host,
        smtp_port: settings.smtp_port,
        smtp_user: settings.smtp_user,
        smtp_pass: settings.smtp_pass,
        smtp_from: settings.smtp_from,
        max_posts_per_day: settings.max_posts_per_day,
        max_comments_per_day: settings.max_comments_per_day,
      };

      const res = await setupApi.save({ settings: settingsData });
      if (res.success) {
        toast.success('设置已写入数据库');
        setIsBuiltin(false);
      } else {
        toast.error(res.message || '写入失败');
      }
    } catch {
      toast.error('写入失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">系统设置</h2>
        <div className="flex gap-2">
          {isBuiltin && (
            <Button
              size="sm"
              className="h-8 gap-1"
              variant="default"
              onClick={handleSaveToDb}
              disabled={saving}
            >
              <Database className="h-4 w-4" />
              {saving ? '写入中...' : '写入数据库'}
            </Button>
          )}
          <Button size="sm" className="h-8 gap-1" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? '保存中...' : '保存设置'}
          </Button>
        </div>
      </div>

      {isBuiltin && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              ⚠️ 当前为测试模式（内置账号）。请点击「写入数据库」将管理员账号和设置保存到 D1 数据库，
              之后内置测试账号将失效，所有数据以数据库为准。
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general" className="text-xs">
            <Globe className="mr-1.5 h-3.5 w-3.5" />
            基本设置
          </TabsTrigger>
          <TabsTrigger value="content" className="text-xs">
            内容设置
          </TabsTrigger>
          <TabsTrigger value="email" className="text-xs">
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            邮件设置
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs">
            <Shield className="mr-1.5 h-3.5 w-3.5" />
            安全设置
          </TabsTrigger>
        </TabsList>

        {/* 基本设置 */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">站点信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">站点名称</Label>
                <Input
                  value={settings.site_name}
                  onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">站点描述</Label>
                <Textarea
                  value={settings.site_description}
                  onChange={(e) => setSettings({ ...settings, site_description: e.target.value })}
                  className="min-h-[80px] text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">站点 Logo URL</Label>
                <Input
                  value={settings.site_logo}
                  onChange={(e) => setSettings({ ...settings, site_logo: e.target.value })}
                  placeholder="https://..."
                  className="h-9 text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 内容设置 */}
        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">内容与评论</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">开放注册</div>
                  <div className="text-xs text-muted-foreground">允许新用户注册账号</div>
                </div>
                <Switch
                  checked={settings.registration_enabled}
                  onCheckedChange={(v) => setSettings({ ...settings, registration_enabled: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">评论需登录</div>
                  <div className="text-xs text-muted-foreground">只有登录用户才能发表评论</div>
                </div>
                <Switch
                  checked={settings.comment_requires_login}
                  onCheckedChange={(v) => setSettings({ ...settings, comment_requires_login: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">评论需审核</div>
                  <div className="text-xs text-muted-foreground">新评论需管理员审核后才显示</div>
                </div>
                <Switch
                  checked={settings.comment_requires_approval}
                  onCheckedChange={(v) => setSettings({ ...settings, comment_requires_approval: v })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs">每日发帖上限</Label>
                  <Input
                    type="number"
                    value={settings.max_posts_per_day}
                    onChange={(e) => setSettings({ ...settings, max_posts_per_day: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">每日评论上限</Label>
                  <Input
                    type="number"
                    value={settings.max_comments_per_day}
                    onChange={(e) => setSettings({ ...settings, max_comments_per_day: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 邮件设置 */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SMTP 邮件配置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">SMTP 服务器</Label>
                  <Input
                    value={settings.smtp_host}
                    onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                    placeholder="smtp.example.com"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">端口</Label>
                  <Input
                    value={settings.smtp_port}
                    onChange={(e) => setSettings({ ...settings, smtp_port: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">发件人地址</Label>
                <Input
                  value={settings.smtp_from}
                  onChange={(e) => setSettings({ ...settings, smtp_from: e.target.value })}
                  placeholder="noreply@example.com"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">用户名</Label>
                <Input
                  value={settings.smtp_user}
                  onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">密码 / 授权码</Label>
                <Input
                  type="password"
                  value={settings.smtp_pass}
                  onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={async () => {
                  const to = prompt('请输入测试收件邮箱:');
                  if (!to) return;
                  try {
                    const res = await adminApi.sendTestEmail({
                      to,
                      subject: '轻社区博客 - 邮件测试',
                      content: '<h2>邮件测试成功！</h2><p>如果你看到这封邮件，说明 SMTP 配置正确。</p>',
                    });
                    if (res.success) {
                      toast.success('测试邮件发送成功');
                    } else {
                      toast.error(res.message || '发送失败');
                    }
                  } catch {
                    toast.error('发送失败，请检查 SMTP 配置');
                  }
                }}
              >
                发送测试邮件
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 安全设置 */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">安全与防护</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">邮箱验证</div>
                  <div className="text-xs text-muted-foreground">注册时需要验证邮箱</div>
                </div>
                <Switch
                  checked={settings.email_verification_required}
                  onCheckedChange={(v) => setSettings({ ...settings, email_verification_required: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">验证码</div>
                  <div className="text-xs text-muted-foreground">登录注册评论启用验证码</div>
                </div>
                <Switch
                  checked={settings.captcha_enabled}
                  onCheckedChange={(v) => setSettings({ ...settings, captcha_enabled: v })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
