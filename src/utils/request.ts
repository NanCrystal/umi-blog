import { extend } from 'umi-request';
import { message } from 'antd';

const request = extend({
  prefix: '/api',
  timeout: 10000,
});

// 状态码默认提示映射
const STATUS_TEXT_MAP: Record<number, string> = {
  400: '请求参数错误',
  401: '登录已过期，请重新登录',
  403: '没有操作权限',
  404: '请求的资源不存在',
  405: '请求方法不被允许',
  408: '请求超时，请重试',
  409: '数据冲突，请稍后重试',
  422: '请求格式验证失败',
  429: '请求过于频繁，请稍后再试',
  500: '服务器内部错误',
  502: '网关错误，请稍后重试',
  503: '服务暂时不可用',
  504: '网关超时，请重试',
};

// 从 NestJS 异常响应中提取错误信息
function extractErrorMessage(data: any, status: number): string {
  if (Array.isArray(data?.message)) return data.message.join('; ');
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  return STATUS_TEXT_MAP[status] || `请求失败 (${status})`;
}

// 请求拦截器
request.interceptors.request.use((url, options) => {
  return {
    url,
    options: { ...options },
  };
});

// 响应拦截器（统一处理返回结构 + 错误提示）
request.interceptors.response.use(async (response) => {
  const data = await response.clone().json();

  // 非 2xx 统一抛错并显示提示
  if (!response.ok) {
    const errMsg = extractErrorMessage(data, response.status);
    // 401 不弹 toast（由路由守卫处理跳转）
    if (response.status !== 401) {
      message.error({ content: errMsg, duration: 6 });
    }
    throw new Error(errMsg);
  }

  // 后端统一返回 { code, data, message } 结构
  if (data?.code === 0) {
    return data.data;
  }

  return data;
});

export default request;
