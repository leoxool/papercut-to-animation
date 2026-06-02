const SUPABASE_URL = process.env.SUPABASE_URL || 'http://teacherliliang.xyz:8001';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYXV0aGVudGljYXRlZCIsImlhdCI6MTc3ODA3MjE5OCwiZXhwIjoxODA5NjA4MTk4fQ.kiUbjnrhHHvR7RlngL96djqVLZpUAJKuiZEFPjiwxeE';

// Supabase REST API 封装
async function supabaseRequest(endpoint, options = {}) {
    const url = `${SUPABASE_URL}/rest/v1${endpoint}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': options.prefer || 'return=representation',
            ...options.headers
        }
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Supabase API Error: ${response.status} - ${error}`);
    }

    // 处理 DELETE 请求（通常没有返回体）
    if (options.method === 'DELETE') {
        return response.status === 204 ? {} : await response.json();
    }

    return response.json();
}

// 转换 snake_case -> camelCase
function toCamelCase(obj) {
    if (!obj) return obj;
    if (Array.isArray(obj)) return obj.map(toCamelCase);
    return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [
            k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
            v
        ])
    );
}

// 用户相关操作
const db = {
    // 创建用户
    async createUser(userData) {
        return supabaseRequest('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },

    // 根据 username 查询用户
    async getUserByUsername(username) {
        const result = await supabaseRequest(`/users?username=eq.${encodeURIComponent(username)}&select=*`);
        return toCamelCase(result[0] || null);
    },

    // 根据 id 查询用户
    async getUserById(id) {
        const result = await supabaseRequest(`/users?id=eq.${id}&select=*`);
        return toCamelCase(result[0] || null);
    },

    // 获取所有用户
    async getAllUsers() {
        const result = await supabaseRequest('/users?select=*');
        return toCamelCase(result);
    },

    // 更新用户
    async updateUser(id, updates) {
        return supabaseRequest(`/users?id=eq.${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    },

    // 删除用户
    async deleteUser(id) {
        return supabaseRequest(`/users?id=eq.${id}`, {
            method: 'DELETE'
        });
    }
};

module.exports = { db, supabaseRequest };