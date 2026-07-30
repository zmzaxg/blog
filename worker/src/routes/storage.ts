// 存储配置路由 (WebDAV / S3 等)
import {
  successResponse,
  errorResponse,
  parseBody,
  generateStorageKey,
  parseStorageKey,
} from '../lib/utils';
import { authMiddleware, requireAdmin, requireAuth } from '../middleware/auth';
import type { Env } from '../types';

interface StorageConfig {
  id: number;
  name: string;
  type: string;
  config: string; // JSON
  is_default: number;
  status: string;
  created_at: string;
  updated_at: string;
}

// WebDAV 基础操作
async function webdavRequest(
  url: string,
  method: string,
  config: { url: string; username: string; password: string },
  body?: BodyInit,
  contentType = 'text/markdown'
): Promise<Response> {
  const authHeader = `Basic ${btoa(`${config.username}:${config.password}`)}`;
  return fetch(url, {
    method,
    headers: {
      Authorization: authHeader,
      'Content-Type': contentType,
    },
    body,
  });
}

// 获取默认存储配置
async function getDefaultStorageConfig(env: Env) {
  const config = await env.DB.prepare(
    "SELECT * FROM storage_configs WHERE is_default = 1 AND status = 'active' LIMIT 1"
  ).first<StorageConfig>();
  if (!config) return null;
  return { config, data: JSON.parse(config.config) as { url: string; username: string; password: string } };
}

// 从 WebDAV 读取文件内容
export async function readFromWebDAV(
  config: { url: string; username: string; password: string },
  storageKey: string
): Promise<string | null> {
  const fileUrl = `${config.url.replace(/\/$/, '')}/${storageKey}`;
  try {
    const resp = await webdavRequest(fileUrl, 'GET', config);
    if (resp.ok) {
      return await resp.text();
    }
    return null;
  } catch {
    return null;
  }
}

// 写入内容到 WebDAV
export async function writeToWebDAV(
  config: { url: string; username: string; password: string },
  storageKey: string,
  content: string,
  contentType = 'text/markdown'
): Promise<boolean> {
  const fileUrl = `${config.url.replace(/\/$/, '')}/${storageKey}`;
  try {
    const resp = await webdavRequest(fileUrl, 'PUT', config, content, contentType);
    return resp.ok;
  } catch {
    return false;
  }
}

// 列出存储配置
export async function listStorageConfigsHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const result = await env.DB.prepare(
    'SELECT id, name, type, is_default, status, created_at, updated_at FROM storage_configs ORDER BY id DESC'
  ).all();

  return successResponse(result.results);
}

// 创建存储配置
export async function createStorageConfigHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const body = await parseBody<{
    name: string;
    type: string;
    config: Record<string, string>;
    is_default?: boolean;
  }>(request);

  if (!body?.name || !body?.type || !body?.config) {
    return errorResponse('名称、类型和配置不能为空');
  }

  const now = new Date().toISOString();
  const isDefault = body.is_default ? 1 : 0;

  // 如果设为默认，先取消其他默认
  if (isDefault) {
    await env.DB.prepare('UPDATE storage_configs SET is_default = 0').run();
  }

  const result = await env.DB.prepare(
    'INSERT INTO storage_configs (name, type, config, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(body.name, body.type, JSON.stringify(body.config), isDefault, now, now)
    .run();

  return successResponse({ id: result.meta.last_row_id }, '创建成功');
}

// 更新存储配置
export async function updateStorageConfigHandler(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const body = await parseBody<Partial<{
    name: string;
    type: string;
    config: Record<string, string>;
    is_default: boolean;
    status: string;
  }>>(request);

  if (!body) return errorResponse('无效的请求数据');

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (body.name !== undefined) {
    fields.push('name = ?');
    values.push(body.name);
  }
  if (body.type !== undefined) {
    fields.push('type = ?');
    values.push(body.type);
  }
  if (body.config !== undefined) {
    fields.push('config = ?');
    values.push(JSON.stringify(body.config));
  }
  if (body.status !== undefined) {
    fields.push('status = ?');
    values.push(body.status);
  }
  if (body.is_default !== undefined) {
    if (body.is_default) {
      await env.DB.prepare('UPDATE storage_configs SET is_default = 0').run();
    }
    fields.push('is_default = ?');
    values.push(body.is_default ? 1 : 0);
  }

  if (fields.length === 0) {
    return errorResponse('没有要更新的字段');
  }

  fields.push('updated_at = datetime(\"now\")');
  values.push(parseInt(id, 10));

  await env.DB.prepare(`UPDATE storage_configs SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  return successResponse(null, '更新成功');
}

// 删除存储配置
export async function deleteStorageConfigHandler(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  await env.DB.prepare('DELETE FROM storage_configs WHERE id = ?')
    .bind(parseInt(id, 10))
    .run();

  return successResponse(null, '删除成功');
}

// 测试存储连接
export async function testStorageConnectionHandler(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const config = await env.DB.prepare('SELECT * FROM storage_configs WHERE id = ?')
    .bind(parseInt(id, 10))
    .first<StorageConfig>();

  if (!config) {
    return errorResponse('存储配置不存在', 404);
  }

  const configData = JSON.parse(config.config);

  if (config.type === 'webdav') {
    try {
      const resp = await webdavRequest(configData.url, 'PROPFIND', configData);
      if (resp.ok || resp.status === 207) {
        return successResponse({ connected: true }, '连接成功');
      }
      return errorResponse(`连接失败: HTTP ${resp.status}`);
    } catch (e) {
      return errorResponse(`连接失败: ${String(e)}`);
    }
  }

  return errorResponse('不支持的存储类型');
}

// 列出某用户某功能的存储文件 (用于获取最新版本)
export async function listStorageFilesHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAuth(auth);
  if (err) return err;

  const url = new URL(request.url);
  const functionName = url.searchParams.get('function') || 'post';

  const storage = await getDefaultStorageConfig(env);
  if (!storage) {
    return successResponse({ files: [], enabled: false }, '存储功能未启用');
  }

  const configData = storage.data;

  if (storage.config.type === 'webdav') {
    try {
      const prefix = `${auth.userId}_${functionName}_`;
      // WebDAV PROPFIND 列出目录
      const resp = await webdavRequest(configData.url, 'PROPFIND', configData);
      const text = await resp.text();

      // 简单解析 XML 提取文件名
      const fileRegex = /<d:href>([^<]+)<\/d:href>/g;
      const files: { name: string; timestamp: number }[] = [];
      let match;
      while ((match = fileRegex.exec(text)) !== null) {
        const href = decodeURIComponent(match[1]);
        const fileName = href.split('/').pop() || '';
        if (fileName.startsWith(prefix) && fileName.endsWith('.md')) {
          const parsed = parseStorageKey(fileName);
          if (parsed) {
            files.push({ name: fileName, timestamp: parsed.timestamp });
          }
        }
      }

      files.sort((a, b) => b.timestamp - a.timestamp);
      return successResponse({ files, enabled: true, config_id: storage.config.id });
    } catch (e) {
      return errorResponse(`获取文件列表失败: ${String(e)}`);
    }
  }

  return successResponse({ files: [], enabled: false });
}

// 保存内容到存储 (带版本管理)
export async function saveToStorageHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAuth(auth);
  if (err) return err;

  const body = await parseBody<{
    function_name: string;
    content: string;
    reference_id?: number; // 关联的文章/评论ID
  }>(request);

  if (!body?.function_name || !body?.content) {
    return errorResponse('功能名称和内容不能为空');
  }

  const storage = await getDefaultStorageConfig(env);
  if (!storage) {
    return errorResponse('存储功能未启用');
  }

  const configData = storage.data;
  const timestamp = Date.now();
  const fileName = generateStorageKey(auth.userId!, body.function_name, timestamp);
  const fileUrl = `${configData.url.replace(/\/$/, '')}/${fileName}`;

  if (storage.config.type === 'webdav') {
    try {
      // 上传新文件
      const uploadResp = await webdavRequest(fileUrl, 'PUT', configData, body.content);
      if (!uploadResp.ok) {
        return errorResponse(`上传失败: HTTP ${uploadResp.status}`);
      }

      // 清理旧版本 (保留最近 3 个版本以防误删)
      const prefix = `${auth.userId}_${body.function_name}_`;
      const listResp = await webdavRequest(configData.url, 'PROPFIND', configData);
      const listText = await listResp.text();

      const fileRegex = /<d:href>([^<]+)<\/d:href>/g;
      const oldFiles: string[] = [];
      let match;
      while ((match = fileRegex.exec(listText)) !== null) {
        const href = decodeURIComponent(match[1]);
        const fn = href.split('/').pop() || '';
        if (fn.startsWith(prefix) && fn.endsWith('.md') && fn !== fileName) {
          oldFiles.push(fn);
        }
      }

      // 按时间戳排序，删除除最新 3 个外的旧文件
      oldFiles.sort((a, b) => {
        const pa = parseStorageKey(a);
        const pb = parseStorageKey(b);
        return (pb?.timestamp || 0) - (pa?.timestamp || 0);
      });

      const toDelete = oldFiles.slice(3); // 保留最近 3 个
      for (const oldFile of toDelete) {
        const oldUrl = `${configData.url.replace(/\/$/, '')}/${oldFile}`;
        try {
          await webdavRequest(oldUrl, 'DELETE', configData);
        } catch {
          // 忽略单个删除失败
        }
      }

      return successResponse(
        {
          storage_key: fileName,
          storage_url: fileUrl,
          timestamp,
          kept_versions: Math.min(3, oldFiles.length + 1),
        },
        '保存成功'
      );
    } catch (e) {
      return errorResponse(`存储失败: ${String(e)}`);
    }
  }

  return errorResponse('不支持的存储类型');
}

// 图片上传
export async function uploadImageHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAuth(auth);
  if (err) return err;

  const storage = await getDefaultStorageConfig(env);
  if (!storage) {
    return errorResponse('存储功能未启用，请先配置 WebDAV 存储');
  }

  const contentType = request.headers.get('Content-Type') || '';
  let imageBuffer: ArrayBuffer;
  let fileName: string;
  let mimeType: string;

  if (contentType.includes('multipart/form-data')) {
    // multipart 上传
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return errorResponse('请选择要上传的文件');
    }
    imageBuffer = await file.arrayBuffer();
    fileName = file.name;
    mimeType = file.type || 'image/jpeg';
  } else {
    // JSON 上传 (base64)
    const body = await parseBody<{ data: string; filename?: string; mime?: string }>(request);
    if (!body?.data) {
      return errorResponse('请提供图片数据');
    }
    const base64 = body.data.includes(',') ? body.data.split(',')[1] : body.data;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    imageBuffer = bytes.buffer;
    fileName = body.filename || `upload_${Date.now()}.jpg`;
    mimeType = body.mime || 'image/jpeg';
  }

  // 验证文件大小 (5MB)
  if (imageBuffer.byteLength > 5 * 1024 * 1024) {
    return errorResponse('文件大小不能超过 5MB');
  }

  // 验证文件类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (!allowedTypes.includes(mimeType)) {
    return errorResponse('仅支持 JPG/PNG/GIF/WebP/SVG 格式');
  }

  // 生成存储路径
  const ext = fileName.split('.').pop() || 'jpg';
  const date = new Date();
  const datePath = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
  const storageKey = `images/${datePath}/${auth.userId}_${Date.now()}.${ext}`;
  const configData = storage.data;
  const fileUrl = `${configData.url.replace(/\/$/, '')}/${storageKey}`;

  try {
    const resp = await webdavRequest(fileUrl, 'PUT', configData, imageBuffer, mimeType);
    if (!resp.ok) {
      return errorResponse(`上传失败: HTTP ${resp.status}`);
    }

    // 返回可访问的 URL
    const publicUrl = `/api/storage/images/${storageKey}`;
    return successResponse({
      url: publicUrl,
      storage_key: storageKey,
      size: imageBuffer.byteLength,
      mime: mimeType,
    }, '上传成功');
  } catch (e) {
    return errorResponse(`上传失败: ${String(e)}`);
  }
}

// 图片代理读取
export async function serveImageHandler(
  request: Request,
  env: Env,
  storageKey: string
): Promise<Response> {
  const storage = await getDefaultStorageConfig(env);
  if (!storage) {
    return errorResponse('存储未配置', 404);
  }

  const configData = storage.data;
  const fileUrl = `${configData.url.replace(/\/$/, '')}/${storageKey}`;

  try {
    const authHeader = `Basic ${btoa(`${configData.username}:${configData.password}`)}`;
    const resp = await fetch(fileUrl, {
      method: 'GET',
      headers: { Authorization: authHeader },
    });

    if (!resp.ok) {
      return errorResponse('图片不存在', 404);
    }

    const body = await resp.arrayBuffer();
    const ct = resp.headers.get('Content-Type') || 'image/jpeg';

    return new Response(body, {
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return errorResponse('读取图片失败', 500);
  }
}
