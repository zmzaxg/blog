import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Mail, Lock, User, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const { login } = useAuth();

  // 登录表单
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // 注册表单
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCode, setRegCode] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      toast.error('请输入账号和密码');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await authApi.login({ username: loginUsername, password: loginPassword });
      if (res.success && res.data) {
        login(res.data.token, res.data.user as any);
        toast.success('登录成功');
        navigate(redirect);
      } else {
        toast.error(res.message || '登录失败');
      }
    } catch {
      toast.error('登录失败，请稍后重试');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!regEmail) {
      toast.error('请输入邮箱');
      return;
    }
    if (countdown > 0) return;

    setCodeLoading(true);
    try {
      const res = await authApi.sendCode({ email: regEmail, type: 'register' });
      if (res.success) {
        toast.success(res.data?.code ? `验证码: ${res.data.code}` : '验证码已发送');
        // 倒计时
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        toast.error(res.message || '发送失败');
      }
    } catch {
      toast.error('发送失败，请稍后重试');
    } finally {
      setCodeLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regEmail || !regPassword) {
      toast.error('请填写完整信息');
      return;
    }
    if (regPassword.length < 6) {
      toast.error('密码至少 6 位');
      return;
    }

    setRegLoading(true);
    try {
      const res = await authApi.register({
        username: regUsername,
        email: regEmail,
        password: regPassword,
        code: regCode,
      });
      if (res.success && res.data) {
        login(res.data.token, res.data.user as any);
        toast.success('注册成功');
        navigate(redirect);
      } else {
        toast.error(res.message || '注册失败');
      }
    } catch {
      toast.error('注册失败，请稍后重试');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8">
      {/* 返回 */}
      <Button
        variant="ghost"
        size="icon"
        className="mb-6 h-9 w-9"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">欢迎回来</h1>
        <p className="mt-2 text-sm text-muted-foreground">登录后解锁更多功能</p>
      </div>

      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-4">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="mb-6 grid w-full grid-cols-2">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>

            {/* 登录 */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username" className="text-xs">
                    用户名 / 邮箱
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-username"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="请输入用户名或邮箱"
                      className="h-11 pl-10"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-xs">
                    密码
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="请输入密码"
                      className="h-11 pl-10 pr-10"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showLoginPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full"
                  disabled={loginLoading}
                >
                  {loginLoading ? '登录中...' : '登录'}
                </Button>
              </form>
            </TabsContent>

            {/* 注册 */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-username" className="text-xs">
                    用户名
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="reg-username"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="3-20 个字符"
                      className="h-10 pl-10"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-email" className="text-xs">
                    邮箱
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="reg-email"
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="h-10 pl-10"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-code" className="text-xs">
                    验证码
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="reg-code"
                      value={regCode}
                      onChange={(e) => setRegCode(e.target.value)}
                      placeholder="6 位验证码"
                      className="h-10 flex-1"
                      maxLength={6}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 shrink-0 text-xs"
                      onClick={handleSendCode}
                      disabled={codeLoading || countdown > 0}
                    >
                      <Send className="mr-1 h-3 w-3" />
                      {countdown > 0 ? `${countdown}s` : codeLoading ? '发送中' : '获取验证码'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-password" className="text-xs">
                    密码
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="reg-password"
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="至少 6 位"
                      className="h-10 pl-10 pr-10"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showRegPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full"
                  disabled={regLoading}
                >
                  {regLoading ? '注册中...' : '注册'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        注册即表示同意用户协议和隐私政策
      </p>
    </div>
  );
}
