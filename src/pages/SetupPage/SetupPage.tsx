import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  Shield,
  Settings,
  CheckCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Save,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { setupApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

type Step = 'check' | 'login' | 'database' | 'settings' | 'save' | 'done';

export default function SetupPage() {
  const navigate = useNavigate();
  const { login } = useAuth(); // 仅在最终保存时使用
  const [step, setStep] = useState<Step>('check');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 系统状态
  const [systemStatus, setSystemStatus] = useState<{
    initialized: boolean;
    has_settings: boolean;
    settings: Record<string, string>;
  } | null>(null);

  // 登录表单
  const [loginUsername, setLoginUsername] = useState('zmzaxg');
  const [loginPassword, setLoginPassword] = useState('mmaA123456');

  // 管理员信息
  const [adminUsername, setAdminUsername] = useState('zmzaxg');
  const [adminPassword, setAdminPassword] = useState('mmaA123456');
  const [adminEmail, setAdminEmail] = useState('admin@lightblog.local');
  const [adminNickname, setAdminNickname] = useState('系统管理员');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // 系统设置
  const [settings, setSettings] = useState({
    site_name: '轻社区博客',
    site_description: '一个基于 Cloudflare Worker + D1 的轻社区博客系统',
    site_logo: '',
    registration_enabled: 'true',
    comment_requires_approval: 'false',
    comment_requires_login: 'true',
    email_verification_required: 'false',
    captcha_enabled: 'false',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    max_posts_per_day: '10',
    max_comments_per_day: '50',
  });

  // 检查系统状态
  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    setLoading(true);
    try {
      const res = await setupApi.status();
      if (res.success && res.data) {
        setSystemStatus(res.data);
        if (res.data.initialized) {
          // 系统已初始化，直接跳转首页
          toast.info('系统已完成初始化');
          navigate('/');
          return;
        }
        // 合并已有设置
        if (res.data.settings) {
          setSettings((prev) => ({ ...prev, ...res.data!.settings }));
        }
        setStep('login');
      }
    } catch {
      toast.error('检查系统状态失败');
    } finally {
      setLoading(false);
    }
  };

  // 使用测试账号登录 (token 存入 sessionStorage，不污染主 auth)
  const handleTestLogin = async () => {
    if (!loginUsername || !loginPassword) {
      toast.error('请输入账号和密码');
      return;
    }
    setLoading(true);
    try {
      const res = await setupApi.login({
        username: loginUsername,
        password: loginPassword,
      });
      if (res.success && res.data) {
        // 存入 sessionStorage，setup 阶段使用
        sessionStorage.setItem('setup_token', res.data.token);
        toast.success('测试账号登录成功');
        setStep('database');
      } else {
        toast.error(res.message || '登录失败');
      }
    } catch {
      toast.error('登录失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化数据库 (使用 sessionStorage 中的 setup token)
  const handleInitDb = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('setup_token');
      const res = await fetch('/api/setup/init-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }).then((r) => r.json());
      if (res.success) {
        toast.success('数据库初始化成功');
        setStep('settings');
      } else {
        toast.error(res.message || '数据库初始化失败');
      }
    } catch {
      toast.error('数据库初始化失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存到数据库 (使用 sessionStorage 中的 setup token)
  const handleSave = async () => {
    if (!adminUsername || !adminPassword || !adminEmail) {
      toast.error('请填写完整的管理员信息');
      return;
    }
    if (adminPassword.length < 6) {
      toast.error('密码至少 6 位');
      return;
    }

    setLoading(true);
    try {
      const token = sessionStorage.getItem('setup_token');
      const res = await fetch('/api/setup/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          username: adminUsername,
          password: adminPassword,
          email: adminEmail,
          nickname: adminNickname,
          settings,
        }),
      }).then((r) => r.json());

      if (res.success && res.data) {
        // 清除 setup token
        sessionStorage.removeItem('setup_token');
        // 用新创建的正式账号 token 更新登录状态
        login(res.data.token, res.data.user as any);
        toast.success('初始化完成！测试账号已转为正式管理员');
        setStep('done');
      } else {
        toast.error(res.message || '保存失败');
      }
    } catch {
      toast.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = ['check', 'login', 'database', 'settings', 'save', 'done'].indexOf(step);

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-lg">
        {/* 标题 */}
        <div className="mb-8 text-center">
          <div className="mb-3 text-4xl">🚀</div>
          <h1 className="text-2xl font-bold">轻社区博客 · 首次配置</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            欢迎使用！请完成以下步骤来初始化系统
          </p>
        </div>

        {/* 步骤指示器 */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {['登录', '数据库', '设置', '保存'].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  i + 1 < stepIndex
                    ? 'bg-green-500 text-white'
                    : i + 1 === stepIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1 < stepIndex ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`text-xs ${
                  i + 1 <= stepIndex ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
              {i < 3 && (
                <div
                  className={`h-px w-6 ${
                    i + 1 < stepIndex ? 'bg-green-500' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* 检查中 */}
        {step === 'check' && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">正在检查系统状态...</p>
            </CardContent>
          </Card>
        )}

        {/* 步骤 1: 测试账号登录 */}
        {step === 'login' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5" />
                步骤 1：测试账号登录
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  系统首次配置，使用内置测试超管账号登录。此账号仅用于初始配置，
                  完成配置并写入数据库后将自动失效。
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">用户名</Label>
                <Input
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">密码</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                className="h-10 w-full"
                onClick={handleTestLogin}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                {loading ? '登录中...' : '登录'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 步骤 2: 初始化数据库 */}
        {step === 'database' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-5 w-5" />
                步骤 2：初始化数据库
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                      即将初始化 D1 数据库
                    </p>
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      将创建所有必要的数据表和默认数据（板块、系统设置等）。如果表已存在，不会覆盖。
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="mb-2 text-sm font-medium">将创建以下数据表：</h4>
                <div className="grid grid-cols-2 gap-2">
                  {['users', 'boards', 'posts', 'comments', 'likes', 'sessions', 'settings', 'plugins', 'themes', 'storage_configs', 'notifications', 'verification_codes'].map(
                    (table) => (
                      <div key={table} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        {table}
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-10 flex-1"
                  onClick={() => setStep('login')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  返回
                </Button>
                <Button
                  className="h-10 flex-1"
                  onClick={handleInitDb}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Database className="mr-2 h-4 w-4" />
                  )}
                  {loading ? '初始化中...' : '初始化数据库'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 步骤 3: 系统设置 */}
        {step === 'settings' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-5 w-5" />
                步骤 3：系统设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 管理员信息 */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">管理员账号信息</h4>
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
                  <p className="text-xs text-green-700 dark:text-green-300">
                    以下信息将作为正式管理员账号写入数据库。写入成功后，内置测试账号将失效。
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">用户名</Label>
                    <Input
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">昵称</Label>
                    <Input
                      value={adminNickname}
                      onChange={(e) => setAdminNickname(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">邮箱</Label>
                  <Input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">密码</Label>
                  <div className="relative">
                    <Input
                      type={showAdminPassword ? 'text' : 'password'}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="h-9 pr-10 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showAdminPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* 站点设置 */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">站点信息</h4>
                <div className="space-y-1.5">
                  <Label className="text-xs">站点名称</Label>
                  <Input
                    value={settings.site_name}
                    onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">站点描述</Label>
                  <Textarea
                    value={settings.site_description}
                    onChange={(e) =>
                      setSettings({ ...settings, site_description: e.target.value })
                    }
                    className="min-h-[60px] text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">站点 Logo URL（可选）</Label>
                  <Input
                    value={settings.site_logo}
                    onChange={(e) => setSettings({ ...settings, site_logo: e.target.value })}
                    placeholder="https://..."
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* 功能开关 */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">功能开关</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm">开放注册</div>
                      <div className="text-xs text-muted-foreground">允许新用户注册</div>
                    </div>
                    <Switch
                      checked={settings.registration_enabled === 'true'}
                      onCheckedChange={(v) =>
                        setSettings({ ...settings, registration_enabled: String(v) })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm">评论需登录</div>
                      <div className="text-xs text-muted-foreground">登录后才能评论</div>
                    </div>
                    <Switch
                      checked={settings.comment_requires_login === 'true'}
                      onCheckedChange={(v) =>
                        setSettings({ ...settings, comment_requires_login: String(v) })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm">评论需审核</div>
                      <div className="text-xs text-muted-foreground">新评论需管理员审核</div>
                    </div>
                    <Switch
                      checked={settings.comment_requires_approval === 'true'}
                      onCheckedChange={(v) =>
                        setSettings({ ...settings, comment_requires_approval: String(v) })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm">邮箱验证</div>
                      <div className="text-xs text-muted-foreground">注册时需要验证邮箱</div>
                    </div>
                    <Switch
                      checked={settings.email_verification_required === 'true'}
                      onCheckedChange={(v) =>
                        setSettings({ ...settings, email_verification_required: String(v) })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-10 flex-1"
                  onClick={() => setStep('database')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  返回
                </Button>
                <Button
                  className="h-10 flex-1"
                  onClick={() => setStep('save')}
                  disabled={!adminUsername || !adminPassword || !adminEmail}
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  下一步
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 步骤 4: 确认并保存 */}
        {step === 'save' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Save className="h-5 w-5" />
                步骤 4：确认并写入数据库
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  ⚠️ 确认后将执行以下操作：
                </p>
                <ul className="mt-2 space-y-1 text-xs text-green-600 dark:text-green-400">
                  <li>• 将管理员账号 <strong>{adminUsername}</strong> 写入 D1 数据库</li>
                  <li>• 保存所有系统设置到数据库</li>
                  <li>• 内置测试账号 zmzaxg 将自动失效</li>
                  <li>• 后续登录将使用数据库中的账号密码</li>
                </ul>
              </div>

              <div className="space-y-2 rounded-lg border p-4">
                <h4 className="text-sm font-medium">管理员信息</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">用户名：</span>
                    {adminUsername}
                  </div>
                  <div>
                    <span className="text-muted-foreground">昵称：</span>
                    {adminNickname}
                  </div>
                  <div>
                    <span className="text-muted-foreground">邮箱：</span>
                    {adminEmail}
                  </div>
                  <div>
                    <span className="text-muted-foreground">密码：</span>
                    {'•'.repeat(adminPassword.length)}
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border p-4">
                <h4 className="text-sm font-medium">站点设置</h4>
                <div className="space-y-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">站点名称：</span>
                    {settings.site_name}
                  </div>
                  <div>
                    <span className="text-muted-foreground">开放注册：</span>
                    {settings.registration_enabled === 'true' ? '是' : '否'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">邮箱验证：</span>
                    {settings.email_verification_required === 'true' ? '是' : '否'}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-10 flex-1"
                  onClick={() => setStep('settings')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  返回修改
                </Button>
                <Button
                  className="h-10 flex-1"
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {loading ? '写入中...' : '确认写入数据库'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 完成 */}
        {step === 'done' && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold">🎉 初始化完成！</h2>
              <p className="text-center text-sm text-muted-foreground">
                管理员账号已写入数据库，内置测试账号已失效。
                <br />
                您现在可以使用 <strong>{adminUsername}</strong> 登录系统。
              </p>
              <Badge variant="outline" className="text-xs">
                测试账号 zmzaxg 已失效
              </Badge>
              <Button
                className="h-10 w-full"
                onClick={() => navigate('/admin')}
              >
                进入管理后台
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
