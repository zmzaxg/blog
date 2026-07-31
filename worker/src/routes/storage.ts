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

interface WebDAVConfig {
  url: string;
  username: string;
  password: string;
  path?: string; // 子目录路径
  stores?: string[]; // 存储的数据类型: posts, comments, users, images
}

// WebDAV 基础操作
async function webdavRequest(
  url: string,
  method: string,
  config: WebDAVConfig,
  body?: BodyInit,
  contentType = 'text/markdown'
): Promise<Response> {
  const authHeader = `Basic ${btoa(`${config.username}:${config.password}`)}`;
  const headers: Record<string, string> = {
    Authorization: authHeader,
  };
  if (method === 'PUT' || method === 'POST' || method === 'MKCOL') {
    headers['Content-Type'] = contentType;
  }
  // PROPFIND 需要 Depth 头
  if (method === 'PROPFIND') {
    headers['Depth'] = '1';
  }
  return fetch(url, {
    method,
    headers,
    body,
  });
}

// 构建完整的 WebDAV URL（含子目录）
function buildWebDAVUrl(config: WebDAVConfig, subPath = ''): string {
  let baseUrl = config.url.replace(/\/$/, '');
  if (config.path) {
    const dirPath = config.path.replace(/^\/|\/$/g, '');
    if (dirPath) {
      baseUrl += '/' + dirPath;
    }
  }
  if (subPath) {
    baseUrl += '/' + subPath.replace(/^\//, '');
  }
  return baseUrl;
}

// 确保 WebDAV 目录存在
async function ensureWebDAVDir(config: WebDAVConfig, dirPath: string): Promise<boolean> {
  const url = buildWebDAVUrl(config, dirPath);
  try {
    // 先检查目录是否存在
    const checkResp = await webdavRequest(url, 'PROPFIND', config);
    if (checkResp.ok || checkResp.status === 207) {
      return true;
    }
    // 创建目录
    const resp = await webdavRequest(url, 'MKCOL', config);
    return resp.ok || resp.status === 201;
  } catch {
    return false;
  }
}

// 获取存储配置（含完整 config 字段）
async function getStorageConfigById(env: Env, id: number) {
  return await env.DB.prepare('SELECT * FROM storage_configs WHERE id = ?')
    .bind(id)
    .first<StorageConfig>();
}

// 获取默认存储配置
async function getDefaultStorageConfig(env: Env) {
  const config = await env.DB.prepare(
    "SELECT * FROM storage_configs WHERE is_default = 1 AND status = 'active' LIMIT 1"
  ).first<StorageConfig>();
  if (!config) return null;
  return { config, data: JSON.parse(config.config) as WebDAVConfig };
}

// 从 WebDAV 读取文件内容
export async function readFromWebDAV(
  config: WebDAVConfig,
  storageKey: string
): Promise<string | null> {
  const fileUrl = buildWebDAVUrl(config, storageKey);
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
  config: WebDAVConfig,
  storageKey: string,
  content: string,
  contentType = 'text/markdown'
): Promise<boolean> {
  const fileUrl = buildWebDAVUrl(config, storageKey);
  try {
    const resp = await webdavRequest(fileUrl, 'PUT', config, content, contentType);
    return resp.ok;
  } catch {
    return false;
  }
}

// 解析 WebDAV PROPFIND XML 响应
function parseWebDAVXml(xml: string, baseUrl: string): Array<{
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  lastModified: string;
}> {
  const items: Array<{
    name: string;
    path: string;
    isDir: boolean;
    size: number;
    lastModified: string;
  }> = [];

  // 支持多种命名空间前缀: d:, D:, 或无前缀
  const responseRegex = /<(?:d:|D:)?response>([\s\S]*?)<\/(?:d:|D:)?response>/gi;
  let match;
  while ((match = responseRegex.exec(xml)) !== null) {
    const block = match[1];

    // 提取 href (支持 d:, D:, 无前缀)
    const hrefMatch = block.match(/<(?:d:|D:)?href>([^<]+)<\/(?:d:|D:)?href>/i);
    if (!hrefMatch) continue;
    const href = decodeURIComponent(hrefMatch[1]);

    // 提取资源类型 - 检测是否为目录
    // 判断策略（优先级从高到低）:
    // 1. resourcetype 中包含 collection → 一定是目录
    // 2. href 结尾是 / → 一定是目录
    // 3. MIME 类型是 httpd/unix-directory → 是目录
    // 4. 有 getcontentlength → 一定是文件
    // 5. 有已知文件扩展名 → 是文件
    // 6. 其他情况默认为文件

    // 提取 resourcetype 内容
    const resourcetypeBlock = block.match(/<(?:d:|D:)?resourcetype[^>]*>([\s\S]*?)<\/(?:d:|D:)?resourcetype>/i);
    const resourcetypeContent = resourcetypeBlock ? resourcetypeBlock[1] : '';
    const hasCollection = /collection/i.test(resourcetypeContent);
    const endsWithSlash = href.endsWith('/');
    const hasContentLength = /<(?:d:|D:)?getcontentlength>\d+<\/(?:d:|D:)?getcontentlength>/i.test(block);

    // 提取 MIME 类型
    const mimeMatchBlock = block.match(/<(?:d:|D:)?getcontenttype>([^<]+)<\/(?:d:|D:)?getcontenttype>/i);
    const mimeType = mimeMatchBlock ? mimeMatchBlock[1].trim() : '';
    const isMimeDirectory = mimeType === 'httpd/unix-directory';

    // 检查是否有已知文件扩展名
    const lastSegment = href.split('/').filter(Boolean).pop() || '';
    const fileExtMatch = lastSegment.match(/\.([a-zA-Z0-9]{1,10})(?:\?|$)/);
    const hasFileExtension = !!fileExtMatch;
    const knownFileExts = ['md', 'txt', 'json', 'xml', 'html', 'css', 'js', 'ts', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'zip', 'tar', 'gz', 'mp3', 'mp4', 'wav', 'ogg', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'yml', 'yaml', 'toml', 'ini', 'cfg', 'conf', 'log', 'bak', 'sql', 'db'];
    const isKnownFileExt = fileExtMatch && knownFileExts.includes(fileExtMatch[1].toLowerCase());

    let isDir: boolean;
    if (hasCollection) {
      isDir = true;
    } else if (endsWithSlash) {
      isDir = true;
    } else if (isMimeDirectory) {
      isDir = true;
    } else if (hasContentLength) {
      isDir = false;
    } else if (isKnownFileExt) {
      isDir = false;
    } else if (hasFileExtension) {
      isDir = false;
    } else {
      isDir = false;
    }

    // 提取大小
    const sizeMatch = block.match(/<(?:d:|D:)?getcontentlength>(\d+)<\/(?:d:|D:)?getcontentlength>/i);
    const size = sizeMatch ? parseInt(sizeMatch[1], 10) : 0;

    // 提取最后修改时间
    const modifiedMatch = block.match(/<(?:d:|D:)?getlastmodified>([^<]+)<\/(?:d:|D:)?getlastmodified>/i);
    const lastModified = modifiedMatch ? modifiedMatch[1] : '';

    // 计算相对路径和文件名
    // baseUrl 是 PROPFIND 请求的完整 URL
    // href 可能是绝对 URL 或相对路径
    const normalizedBase = baseUrl.replace(/\/$/, '');
    let relativePath = href;

    try {
      const baseUrlObj = new URL(normalizedBase);
      const basePath = baseUrlObj.pathname.replace(/\/$/, '');

      if (href.startsWith('http://') || href.startsWith('https://')) {
        const hrefUrl = new URL(href);
        if (hrefUrl.pathname.startsWith(basePath + '/')) {
          relativePath = hrefUrl.pathname.slice(basePath.length + 1);
        } else if (hrefUrl.pathname.startsWith(basePath)) {
          relativePath = hrefUrl.pathname.slice(basePath.length);
        }
      } else {
        const resolvedUrl = new URL(href, normalizedBase);
        if (resolvedUrl.pathname.startsWith(basePath + '/')) {
          relativePath = resolvedUrl.pathname.slice(basePath.length + 1);
        } else if (resolvedUrl.pathname.startsWith(basePath)) {
          relativePath = resolvedUrl.pathname.slice(basePath.length);
        }
      }
    } catch {
      // 解析失败，保持原值
    }

    relativePath = relativePath.replace(/^\//, '').replace(/\/$/, '');

    // 跳过空路径（目录自身）
    if (!relativePath || relativePath === '') continue;

    const name = relativePath.split('/').filter(Boolean).pop() || relativePath;

    items.push({
      name,
      path: relativePath,
      isDir,
      size,
      lastModified,
    });
  }

  return items;
}

// 列出存储配置（返回完整信息）
export async function listStorageConfigsHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const result = await env.DB.prepare(
    'SELECT * FROM storage_configs ORDER BY id DESC'
  ).all<StorageConfig>();

  // 解析 config JSON 并返回完整信息
  const configs = result.results.map((c) => {
    const configData = JSON.parse(c.config) as WebDAVConfig;
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      is_default: c.is_default,
      status: c.status,
      config: {
        url: configData.url || '',
        username: configData.username || '',
        path: configData.path || '',
        stores: configData.stores || [],
      },
      created_at: c.created_at,
      updated_at: c.updated_at,
    };
  });

  return successResponse(configs);
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
    config: WebDAVConfig;
    is_default?: boolean;
  }>(request);

  if (!body?.name || !body?.type || !body?.config) {
    return errorResponse('名称、类型和配置不能为空');
  }

  if (!body.config.url) {
    return errorResponse('WebDAV URL 不能为空');
  }

  const now = new Date().toISOString();
  const isDefault = body.is_default ? 1 : 0;

  // 如果设为默认，先取消其他默认
  if (isDefault) {
    await env.DB.prepare('UPDATE storage_configs SET is_default = 0').run();
  }

  // 保存完整配置（含 path 和 stores）
  const configToSave: WebDAVConfig = {
    url: body.config.url.replace(/\/$/, ''),
    username: body.config.username || '',
    password: body.config.password || '',
    path: body.config.path || '',
    stores: body.config.stores || [],
  };

  const result = await env.DB.prepare(
    'INSERT INTO storage_configs (name, type, config, is_default, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(body.name, body.type, JSON.stringify(configToSave), isDefault, 'active', now, now)
    .run();

  // 如果有子目录，尝试创建
  if (configToSave.path) {
    await ensureWebDAVDir(configToSave, '');
  }

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
    config: WebDAVConfig;
    is_default: boolean;
    status: string;
  }>>(request);

  if (!body) return errorResponse('无效的请求数据');

  // 获取现有配置
  const existing = await getStorageConfigById(env, parseInt(id, 10));
  if (!existing) {
    return errorResponse('存储配置不存在', 404);
  }

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
    // 合并配置（保留未修改的字段）
    const existingConfig = JSON.parse(existing.config) as WebDAVConfig;
    const mergedConfig: WebDAVConfig = {
      url: body.config.url !== undefined ? body.config.url.replace(/\/$/, '') : existingConfig.url,
      username: body.config.username !== undefined ? body.config.username : existingConfig.username,
      password: body.config.password !== undefined ? body.config.password : existingConfig.password,
      path: body.config.path !== undefined ? body.config.path : existingConfig.path,
      stores: body.config.stores !== undefined ? body.config.stores : existingConfig.stores,
    };
    fields.push('config = ?');
    values.push(JSON.stringify(mergedConfig));
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

  fields.push('updated_at = datetime("now")');
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

  const config = await getStorageConfigById(env, parseInt(id, 10));
  if (!config) {
    return errorResponse('存储配置不存在', 404);
  }

  const configData = JSON.parse(config.config) as WebDAVConfig;

  if (config.type === 'webdav') {
    try {
      const testUrl = buildWebDAVUrl(configData, '');
      const resp = await webdavRequest(testUrl, 'PROPFIND', configData);

      if (resp.ok || resp.status === 207) {
        // 解析响应获取目录信息
        const text = await resp.text();
        const items = parseWebDAVXml(text, testUrl);

        return successResponse({
          connected: true,
          message: '连接成功',
          url: testUrl,
          items_count: items.length,
          has_path: !!configData.path,
        }, '连接成功');
      }

      // 尝试创建目录后重试
      if (resp.status === 404 && configData.path) {
        const created = await ensureWebDAVDir(configData, '');
        if (created) {
          return successResponse({
            connected: true,
            message: '连接成功（已自动创建目录）',
            url: testUrl,
            created_dir: true,
          }, '连接成功');
        }
      }

      return errorResponse(`连接失败: HTTP ${resp.status}`);
    } catch (e) {
      return errorResponse(`连接失败: ${String(e)}`);
    }
  }

  return errorResponse('不支持的存储类型');
}

// 浏览 WebDAV 目录
export async function browseWebDAVHandler(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const url = new URL(request.url);
  const subPath = url.searchParams.get('path') || '';

  const config = await getStorageConfigById(env, parseInt(id, 10));
  if (!config) {
    return errorResponse('存储配置不存在', 404);
  }

  const configData = JSON.parse(config.config) as WebDAVConfig;

  if (config.type !== 'webdav') {
    return errorResponse('仅支持 WebDAV 类型');
  }

  try {
    const browseUrl = buildWebDAVUrl(configData, subPath);
    const resp = await webdavRequest(browseUrl, 'PROPFIND', configData);

    if (!resp.ok && resp.status !== 207) {
      return errorResponse(`读取目录失败: HTTP ${resp.status}`);
    }

    const text = await resp.text();
    const items = parseWebDAVXml(text, browseUrl);

    return successResponse({
      path: subPath,
      items,
      url: browseUrl,
    });
  } catch (e) {
    return errorResponse(`读取目录失败: ${String(e)}`);
  }
}

// 创建 WebDAV 目录
export async function createWebDAVDirHandler(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const body = await parseBody<{ path: string }>(request);
  if (!body?.path) {
    return errorResponse('目录路径不能为空');
  }

  const config = await getStorageConfigById(env, parseInt(id, 10));
  if (!config) {
    return errorResponse('存储配置不存在', 404);
  }

  const configData = JSON.parse(config.config) as WebDAVConfig;

  try {
    const dirUrl = buildWebDAVUrl(configData, body.path);
    const resp = await webdavRequest(dirUrl, 'MKCOL', configData);

    if (resp.ok || resp.status === 201) {
      return successResponse(null, '目录创建成功');
    }
    return errorResponse(`创建目录失败: HTTP ${resp.status}`);
  } catch (e) {
    return errorResponse(`创建目录失败: ${String(e)}`);
  }
}

// 删除 WebDAV 文件或目录
export async function deleteWebDAVItemHandler(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const body = await parseBody<{ path: string }>(request);
  if (!body?.path) {
    return errorResponse('路径不能为空');
  }

  const config = await getStorageConfigById(env, parseInt(id, 10));
  if (!config) {
    return errorResponse('存储配置不存在', 404);
  }

  const configData = JSON.parse(config.config) as WebDAVConfig;

  try {
    const itemUrl = buildWebDAVUrl(configData, body.path);
    const resp = await webdavRequest(itemUrl, 'DELETE', configData);

    if (resp.ok || resp.status === 204) {
      return successResponse(null, '删除成功');
    }
    return errorResponse(`删除失败: HTTP ${resp.status}`);
  } catch (e) {
    return errorResponse(`删除失败: ${String(e)}`);
  }
}

// 重命名 WebDAV 文件或目录
export async function renameWebDAVItemHandler(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const body = await parseBody<{ oldPath: string; newName: string }>(request);
  if (!body?.oldPath || !body?.newName) {
    return errorResponse('原路径和新名称不能为空');
  }

  const config = await getStorageConfigById(env, parseInt(id, 10));
  if (!config) {
    return errorResponse('存储配置不存在', 404);
  }

  const configData = JSON.parse(config.config) as WebDAVConfig;

  // 计算新路径（同目录下）
  const pathParts = body.oldPath.split('/');
  pathParts.pop(); // 移除旧文件名
  pathParts.push(body.newName); // 添加新文件名
  const newPath = pathParts.join('/');

  try {
    const oldUrl = buildWebDAVUrl(configData, body.oldPath);
    const newUrl = buildWebDAVUrl(configData, newPath);

    // WebDAV MOVE 方法用于重命名
    const authHeader = `Basic ${btoa(`${configData.username}:${configData.password}`)}`;
    const resp = await fetch(oldUrl, {
      method: 'MOVE',
      headers: {
        Authorization: authHeader,
        Destination: newUrl,
        Overwrite: 'T',
      },
    });

    if (resp.ok || resp.status === 201 || resp.status === 204) {
      return successResponse({ newPath }, '重命名成功');
    }
    return errorResponse(`重命名失败: HTTP ${resp.status}`);
  } catch (e) {
    return errorResponse(`重命名失败: ${String(e)}`);
  }
}

// 读取 WebDAV 文件内容
export async function readWebDAVFileHandler(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const url = new URL(request.url);
  const filePath = url.searchParams.get('path') || '';

  if (!filePath) {
    return errorResponse('文件路径不能为空');
  }

  const config = await getStorageConfigById(env, parseInt(id, 10));
  if (!config) {
    return errorResponse('存储配置不存在', 404);
  }

  const configData = JSON.parse(config.config) as WebDAVConfig;

  try {
    const fileUrl = buildWebDAVUrl(configData, filePath);
    const resp = await webdavRequest(fileUrl, 'GET', configData);

    if (!resp.ok) {
      return errorResponse(`读取文件失败: HTTP ${resp.status}`);
    }

    const content = await resp.text();
    const contentType = resp.headers.get('Content-Type') || 'text/plain';

    return successResponse({
      path: filePath,
      content,
      content_type: contentType,
      size: content.length,
    });
  } catch (e) {
    return errorResponse(`读取文件失败: ${String(e)}`);
  }
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
      const listUrl = buildWebDAVUrl(configData, '');
      const resp = await webdavRequest(listUrl, 'PROPFIND', configData);
      const text = await resp.text();

      const items = parseWebDAVXml(text, listUrl);
      const files = items
        .filter((item) => !item.isDir && item.name.startsWith(prefix) && item.name.endsWith('.md'))
        .map((item) => {
          const parsed = parseStorageKey(item.name);
          return { name: item.name, timestamp: parsed?.timestamp || 0 };
        })
        .sort((a, b) => b.timestamp - a.timestamp);

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
    reference_id?: number;
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

  // 确保目录存在
  await ensureWebDAVDir(configData, body.function_name);

  const fileUrl = buildWebDAVUrl(configData, `${body.function_name}/${fileName}`);

  if (storage.config.type === 'webdav') {
    try {
      const uploadResp = await webdavRequest(fileUrl, 'PUT', configData, body.content);
      if (!uploadResp.ok) {
        return errorResponse(`上传失败: HTTP ${uploadResp.status}`);
      }

      // 清理旧版本
      const prefix = `${auth.userId}_${body.function_name}_`;
      const listUrl = buildWebDAVUrl(configData, body.function_name);
      const listResp = await webdavRequest(listUrl, 'PROPFIND', configData);
      const listText = await listResp.text();

      const items = parseWebDAVXml(listText, listUrl);
      const oldFiles = items
        .filter((item) => !item.isDir && item.name.startsWith(prefix) && item.name.endsWith('.md') && item.name !== fileName)
        .map((item) => item.name)
        .sort((a, b) => {
          const pa = parseStorageKey(a);
          const pb = parseStorageKey(b);
          return (pb?.timestamp || 0) - (pa?.timestamp || 0);
        });

      const toDelete = oldFiles.slice(3);
      for (const oldFile of toDelete) {
        const oldUrl = buildWebDAVUrl(configData, `${body.function_name}/${oldFile}`);
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

// 数据迁移：D1 → WebDAV
export async function migrateToWebDAVHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const body = await parseBody<{
    config_id: number;
    type: string; // posts, comments, users
    limit?: number;
  }>(request);

  if (!body?.config_id || !body?.type) {
    return errorResponse('配置ID和数据类型不能为空');
  }

  const config = await getStorageConfigById(env, body.config_id);
  if (!config) {
    return errorResponse('存储配置不存在', 404);
  }

  const configData = JSON.parse(config.config) as WebDAVConfig;
  const limit = body.limit || 100;

  try {
    let migrated = 0;
    let errors = 0;

    if (body.type === 'posts') {
      // 迁移文章内容到 WebDAV
      const posts = await env.DB.prepare(
        "SELECT id, author_id, content_md, storage_key FROM posts WHERE status != 'deleted' AND (storage_key IS NULL OR storage_key = '') LIMIT ?"
      ).bind(limit).all<{ id: number; author_id: number; content_md: string; storage_key: string | null }>();

      for (const post of posts.results) {
        const storageKey = `posts/${post.author_id}_post_${Date.now()}_${post.id}.md`;
        const saved = await writeToWebDAV(configData, storageKey, post.content_md);
        if (saved) {
          await env.DB.prepare(
            "UPDATE posts SET storage_key = ?, storage_version = 1 WHERE id = ?"
          ).bind(storageKey, post.id).run();
          migrated++;
        } else {
          errors++;
        }
      }
    } else if (body.type === 'comments') {
      // 迁移评论内容到 WebDAV
      const comments = await env.DB.prepare(
        "SELECT id, author_id, content_md, storage_key FROM comments WHERE status != 'deleted' AND (storage_key IS NULL OR storage_key = '') LIMIT ?"
      ).bind(limit).all<{ id: number; author_id: number; content_md: string; storage_key: string | null }>();

      for (const comment of comments.results) {
        const storageKey = `comments/${comment.author_id}_comment_${Date.now()}_${comment.id}.md`;
        const saved = await writeToWebDAV(configData, storageKey, comment.content_md);
        if (saved) {
          await env.DB.prepare(
            "UPDATE comments SET storage_key = ?, storage_version = 1 WHERE id = ?"
          ).bind(storageKey, comment.id).run();
          migrated++;
        } else {
          errors++;
        }
      }
    } else if (body.type === 'users') {
      // 迁移用户资料到 WebDAV（使用确定性文件名，便于后续读取）
      const users = await env.DB.prepare(
        "SELECT id, username, nickname, bio, avatar FROM users WHERE status != 'banned' LIMIT ?"
      ).bind(limit).all<{ id: number; username: string; nickname: string | null; bio: string | null; avatar: string | null }>();

      for (const user of users.results) {
        const storageKey = `users/${user.id}_profile.json`;
        const profileData = JSON.stringify({
          id: user.id,
          username: user.username,
          nickname: user.nickname || '',
          bio: user.bio || '',
          avatar: user.avatar || '',
          migrated_at: new Date().toISOString(),
        });
        const saved = await writeToWebDAV(configData, storageKey, profileData, 'application/json');
        if (saved) {
          migrated++;
        } else {
          errors++;
        }
      }
    } else {
      return errorResponse('不支持的数据类型');
    }

    return successResponse({
      type: body.type,
      migrated,
      errors,
      limit,
    }, `迁移完成: 成功 ${migrated} 条，失败 ${errors} 条`);
  } catch (e) {
    return errorResponse(`迁移失败: ${String(e)}`);
  }
}

// 数据迁移：WebDAV → D1（反向迁移）
export async function migrateFromWebDAVHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const body = await parseBody<{
    config_id: number;
    type: string; // posts, comments, users
    limit?: number;
  }>(request);

  if (!body?.config_id || !body?.type) {
    return errorResponse('配置ID和数据类型不能为空');
  }

  const config = await getStorageConfigById(env, body.config_id);
  if (!config) {
    return errorResponse('存储配置不存在', 404);
  }

  const configData = JSON.parse(config.config) as WebDAVConfig;
  const limit = body.limit || 100;

  try {
    let migrated = 0;
    let errors = 0;
    let skipped = 0;

    if (body.type === 'posts') {
      // 获取 WebDAV 中的文章文件列表
      const dirUrl = buildWebDAVUrl(configData, 'posts');
      const resp = await webdavRequest(dirUrl, 'PROPFIND', configData);
      if (!resp.ok && resp.status !== 207) {
        return errorResponse(`读取 WebDAV 目录失败: HTTP ${resp.status}`);
      }
      const text = await resp.text();
      const items = parseWebDAVXml(text, dirUrl);
      const mdFiles = items.filter(i => !i.isDir && i.name.endsWith('.md')).slice(0, limit);

      for (const file of mdFiles) {
        try {
          // 从文件名解析信息 (格式: userId_post_timestamp_postId.md)
          const match = file.name.match(/^(\d+)_post_(\d+)_(\d+)\.md$/);
          if (!match) { skipped++; continue; }
          const [, authorId, , postId] = match;

          // 检查 D1 中是否已存在
          const existing = await env.DB.prepare(
            'SELECT id, storage_key FROM posts WHERE id = ?'
          ).bind(parseInt(postId, 10)).first<{ id: number; storage_key: string | null }>();

          if (existing && existing.storage_key) {
            skipped++;
            continue; // 已有数据，跳过
          }

          // 从 WebDAV 读取内容
          const content = await readFromWebDAV(configData, `posts/${file.name}`);
          if (!content) { errors++; continue; }

          if (existing) {
            // 更新现有记录
            await env.DB.prepare(
              "UPDATE posts SET content_md = ?, storage_key = ? WHERE id = ?"
            ).bind(content, `posts/${file.name}`, existing.id).run();
          } else {
            // 创建新记录（如果不存在）
            await env.DB.prepare(
              "INSERT INTO posts (id, author_id, content_md, storage_key, storage_version, title, summary, status, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?, 'published', datetime('now'), datetime('now'))"
            ).bind(
              parseInt(postId, 10),
              parseInt(authorId, 10),
              content,
              `posts/${file.name}`,
              `迁移文章 #${postId}`,
              content.substring(0, 100)
            ).run();
          }
          migrated++;
        } catch {
          errors++;
        }
      }
    } else if (body.type === 'comments') {
      const dirUrl = buildWebDAVUrl(configData, 'comments');
      const resp = await webdavRequest(dirUrl, 'PROPFIND', configData);
      if (!resp.ok && resp.status !== 207) {
        return errorResponse(`读取 WebDAV 目录失败: HTTP ${resp.status}`);
      }
      const text = await resp.text();
      const items = parseWebDAVXml(text, dirUrl);
      const mdFiles = items.filter(i => !i.isDir && i.name.endsWith('.md')).slice(0, limit);

      for (const file of mdFiles) {
        try {
          const match = file.name.match(/^(\d+)_comment_(\d+)_(\d+)\.md$/);
          if (!match) { skipped++; continue; }
          const [, authorId, , commentId] = match;

          const existing = await env.DB.prepare(
            'SELECT id, storage_key FROM comments WHERE id = ?'
          ).bind(parseInt(commentId, 10)).first<{ id: number; storage_key: string | null }>();

          if (existing && existing.storage_key) {
            skipped++;
            continue;
          }

          const content = await readFromWebDAV(configData, `comments/${file.name}`);
          if (!content) { errors++; continue; }

          if (existing) {
            await env.DB.prepare(
              "UPDATE comments SET content_md = ?, storage_key = ? WHERE id = ?"
            ).bind(content, `comments/${file.name}`, existing.id).run();
          } else {
            await env.DB.prepare(
              "INSERT INTO comments (id, author_id, post_id, content_md, storage_key, storage_version, status, created_at, updated_at) VALUES (?, ?, 0, ?, ?, 1, 'approved', datetime('now'), datetime('now'))"
            ).bind(
              parseInt(commentId, 10),
              parseInt(authorId, 10),
              content,
              `comments/${file.name}`
            ).run();
          }
          migrated++;
        } catch {
          errors++;
        }
      }
    } else if (body.type === 'users') {
      const dirUrl = buildWebDAVUrl(configData, 'users');
      const resp = await webdavRequest(dirUrl, 'PROPFIND', configData);
      if (!resp.ok && resp.status !== 207) {
        return errorResponse(`读取 WebDAV 目录失败: HTTP ${resp.status}`);
      }
      const text = await resp.text();
      const items = parseWebDAVXml(text, dirUrl);
      const jsonFiles = items.filter(i => !i.isDir && i.name.endsWith('.json')).slice(0, limit);

      for (const file of jsonFiles) {
        try {
          // 支持新格式 (1_profile.json) 和旧格式 (1_profile_xxx.json)
          const match = file.name.match(/^(\d+)_profile(?:_\d+)?\.json$/);
          if (!match) { skipped++; continue; }
          const userId = match[1];

          const fileContent = await readFromWebDAV(configData, `users/${file.name}`);
          if (!fileContent) { errors++; continue; }

          const data = JSON.parse(fileContent);
          // 更新用户资料字段
          const updates: string[] = [];
          const values: (string | number)[] = [];
          if (data.bio !== undefined) { updates.push('bio = ?'); values.push(data.bio); }
          if (data.nickname !== undefined) { updates.push('nickname = ?'); values.push(data.nickname); }
          if (data.avatar !== undefined) { updates.push('avatar = ?'); values.push(data.avatar); }
          if (updates.length > 0) {
            values.push(parseInt(userId, 10));
            await env.DB.prepare(
              `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
            ).bind(...values).run();
            migrated++;
          } else {
            skipped++;
          }
        } catch {
          errors++;
        }
      }
    } else {
      return errorResponse('不支持的数据类型');
    }

    return successResponse({
      type: body.type,
      migrated,
      errors,
      skipped,
      limit,
    }, `反向迁移完成: 成功 ${migrated} 条，跳过 ${skipped} 条，失败 ${errors} 条`);
  } catch (e) {
    return errorResponse(`迁移失败: ${String(e)}`);
  }
}

// 浏览 D1 数据库数据
export async function browseD1DataHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'posts';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(url.searchParams.get('page_size') || '20', 10), 100);
  const offset = (page - 1) * pageSize;
  const keyword = url.searchParams.get('keyword') || '';

  try {
    let data: unknown[] = [];
    let total = 0;

    if (type === 'posts') {
      let where = "WHERE status != 'deleted'";
      const params: (string | number)[] = [];
      if (keyword) {
        where += ' AND (title LIKE ? OR content_md LIKE ?)';
        params.push(`%${keyword}%`, `%${keyword}%`);
      }
      const countResult = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM posts ${where}`)
        .bind(...params).first<{ cnt: number }>();
      total = countResult?.cnt || 0;

      const result = await env.DB.prepare(
        `SELECT id, author_id, title, storage_key, storage_version, status, created_at, updated_at FROM posts ${where} ORDER BY id DESC LIMIT ? OFFSET ?`
      ).bind(...params, pageSize, offset).all();
      data = result.results;
    } else if (type === 'comments') {
      let where = "WHERE status != 'deleted'";
      const params: (string | number)[] = [];
      if (keyword) {
        where += ' AND content_md LIKE ?';
        params.push(`%${keyword}%`);
      }
      const countResult = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM comments ${where}`)
        .bind(...params).first<{ cnt: number }>();
      total = countResult?.cnt || 0;

      const result = await env.DB.prepare(
        `SELECT id, author_id, post_id, storage_key, storage_version, status, created_at FROM comments ${where} ORDER BY id DESC LIMIT ? OFFSET ?`
      ).bind(...params, pageSize, offset).all();
      data = result.results;
    } else if (type === 'users') {
      let where = "WHERE status != 'banned'";
      const params: (string | number)[] = [];
      if (keyword) {
        where += ' AND (username LIKE ? OR nickname LIKE ? OR bio LIKE ?)';
        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      }
      const countResult = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM users ${where}`)
        .bind(...params).first<{ cnt: number }>();
      total = countResult?.cnt || 0;

      const result = await env.DB.prepare(
        `SELECT id, username, nickname, bio, created_at FROM users ${where} ORDER BY id DESC LIMIT ? OFFSET ?`
      ).bind(...params, pageSize, offset).all();
      data = result.results;
    } else {
      return errorResponse('不支持的数据类型');
    }

    return successResponse({
      type,
      data,
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize),
    });
  } catch (e) {
    return errorResponse(`查询失败: ${String(e)}`);
  }
}

// 清理 D1 数据库数据
export async function cleanupD1DataHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const body = await parseBody<{
    type: string; // posts, comments, users
    only_migrated?: boolean; // 仅清理已迁移到 WebDAV 的数据
    ids?: number[]; // 指定清理的 ID
  }>(request);

  if (!body?.type) {
    return errorResponse('数据类型不能为空');
  }

  try {
    let deleted = 0;

    if (body.type === 'posts') {
      if (body.ids && body.ids.length > 0) {
        // 按 ID 清理
        for (const id of body.ids) {
          await env.DB.prepare("UPDATE posts SET status = 'deleted' WHERE id = ?").bind(id).run();
          deleted++;
        }
      } else if (body.only_migrated) {
        // 仅清理已迁移的（有 storage_key 的）
        const result = await env.DB.prepare(
          "UPDATE posts SET status = 'deleted' WHERE storage_key IS NOT NULL AND storage_key != '' AND status != 'deleted'"
        ).run();
        deleted = result.meta.changes || 0;
      } else {
        return errorResponse('请指定要清理的数据 ID 或设置 only_migrated = true');
      }
    } else if (body.type === 'comments') {
      if (body.ids && body.ids.length > 0) {
        for (const id of body.ids) {
          await env.DB.prepare("UPDATE comments SET status = 'deleted' WHERE id = ?").bind(id).run();
          deleted++;
        }
      } else if (body.only_migrated) {
        const result = await env.DB.prepare(
          "UPDATE comments SET status = 'deleted' WHERE storage_key IS NOT NULL AND storage_key != '' AND status != 'deleted'"
        ).run();
        deleted = result.meta.changes || 0;
      } else {
        return errorResponse('请指定要清理的数据 ID 或设置 only_migrated = true');
      }
    } else if (body.type === 'users') {
      return errorResponse('用户数据不支持批量清理，请逐个管理');
    } else {
      return errorResponse('不支持的数据类型');
    }

    return successResponse({
      type: body.type,
      deleted,
    }, `清理完成: ${deleted} 条数据已标记为删除`);
  } catch (e) {
    return errorResponse(`清理失败: ${String(e)}`);
  }
}

// 数据清理：清理 WebDAV 中的旧数据
export async function cleanupWebDAVHandler(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const body = await parseBody<{
    config_id: number;
    type: string; // posts, comments, users, images
    keep_latest?: number; // 保留最近N个版本
  }>(request);

  if (!body?.config_id || !body?.type) {
    return errorResponse('配置ID和数据类型不能为空');
  }

  const config = await getStorageConfigById(env, body.config_id);
  if (!config) {
    return errorResponse('存储配置不存在', 404);
  }

  const configData = JSON.parse(config.config) as WebDAVConfig;
  const keepLatest = body.keep_latest || 3;

  try {
    const dirUrl = buildWebDAVUrl(configData, body.type);
    const resp = await webdavRequest(dirUrl, 'PROPFIND', configData);

    if (!resp.ok && resp.status !== 207) {
      return errorResponse(`读取目录失败: HTTP ${resp.status}`);
    }

    const text = await resp.text();
    const items = parseWebDAVXml(text, dirUrl);

    // 按用户分组
    const userFiles: Record<string, string[]> = {};
    for (const item of items) {
      if (item.isDir) continue;
      const match = item.name.match(/^(\d+)_/);
      if (match) {
        const userId = match[1];
        if (!userFiles[userId]) userFiles[userId] = [];
        userFiles[userId].push(item.name);
      }
    }

    let deleted = 0;
    let kept = 0;

    // 每个用户保留最新N个，删除其余
    for (const userId of Object.keys(userFiles)) {
      const files = userFiles[userId].sort((a, b) => {
        const pa = parseStorageKey(a);
        const pb = parseStorageKey(b);
        return (pb?.timestamp || 0) - (pa?.timestamp || 0);
      });

      const toDelete = files.slice(keepLatest);
      const toKeep = files.slice(0, keepLatest);

      for (const file of toDelete) {
        const fileUrl = buildWebDAVUrl(configData, `${body.type}/${file}`);
        try {
          await webdavRequest(fileUrl, 'DELETE', configData);
          deleted++;
        } catch {
          // 忽略
        }
      }
      kept += toKeep.length;
    }

    return successResponse({
      type: body.type,
      deleted,
      kept,
    }, `清理完成: 删除 ${deleted} 个文件，保留 ${kept} 个`);
  } catch (e) {
    return errorResponse(`清理失败: ${String(e)}`);
  }
}

// 获取存储统计信息
export async function storageStatsHandler(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const auth = await authMiddleware(request, env);
  const err = requireAdmin(auth);
  if (err) return err;

  const config = await getStorageConfigById(env, parseInt(id, 10));
  if (!config) {
    return errorResponse('存储配置不存在', 404);
  }

  const configData = JSON.parse(config.config) as WebDAVConfig;

  try {
    const stats: Record<string, { count: number; size: number }> = {};

    // 统计各目录
    for (const dir of ['posts', 'comments', 'users', 'images']) {
      const dirUrl = buildWebDAVUrl(configData, dir);
      try {
        const resp = await webdavRequest(dirUrl, 'PROPFIND', configData);
        if (resp.ok || resp.status === 207) {
          const text = await resp.text();
          const items = parseWebDAVXml(text, dirUrl);
          const files = items.filter((i) => !i.isDir);
          stats[dir] = {
            count: files.length,
            size: files.reduce((sum, f) => sum + f.size, 0),
          };
        } else {
          stats[dir] = { count: 0, size: 0 };
        }
      } catch {
        stats[dir] = { count: 0, size: 0 };
      }
    }

    return successResponse({ config_id: config.id, stats });
  } catch (e) {
    return errorResponse(`获取统计失败: ${String(e)}`);
  }
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
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return errorResponse('请选择要上传的文件');
    }
    imageBuffer = await file.arrayBuffer();
    fileName = file.name;
    mimeType = file.type || 'image/jpeg';
  } else {
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

  if (imageBuffer.byteLength > 5 * 1024 * 1024) {
    return errorResponse('文件大小不能超过 5MB');
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (!allowedTypes.includes(mimeType)) {
    return errorResponse('仅支持 JPG/PNG/GIF/WebP/SVG 格式');
  }

  const ext = fileName.split('.').pop() || 'jpg';
  const date = new Date();
  const datePath = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
  const storageKey = `images/${datePath}/${auth.userId}_${Date.now()}.${ext}`;

  // 确保目录存在
  await ensureWebDAVDir(storage.data, `images/${datePath}`);

  const fileUrl = buildWebDAVUrl(storage.data, storageKey);

  try {
    const resp = await webdavRequest(fileUrl, 'PUT', storage.data, imageBuffer, mimeType);
    if (!resp.ok) {
      return errorResponse(`上传失败: HTTP ${resp.status}`);
    }

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

  const fileUrl = buildWebDAVUrl(storage.data, storageKey);

  try {
    const authHeader = `Basic ${btoa(`${storage.data.username}:${storage.data.password}`)}`;
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
