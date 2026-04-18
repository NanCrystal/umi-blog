import { extend } from 'umi-request';

const request = extend({
  prefix: '/api', // 自动加 /api
  timeout: 10000,
});

// 请求拦截器
request.interceptors.request.use((url, options) => {
  return {
    url,
    options: {
      ...options,
    },
  };
});

// 响应拦截器（统一处理返回结构）
request.interceptors.response.use(async (response) => {
  const data = await response.clone().json();

  // 如果你后端以后统一返回 { code, data, message }
  if (data?.code === 0) {
    return data.data;
  }

  return data;
});

export default request;
