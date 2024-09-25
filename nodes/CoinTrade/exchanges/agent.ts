import { SocksProxyAgent } from 'socks-proxy-agent';

// 创建一个缓存对象来存储代理实例
const agentCache: { [key: string]: { agent: SocksProxyAgent, lastUsed: number } } = {};

// 获取代理实例，如果缓存中不存在则创建新的实例, 给缓存设一个超时时间，超时后删除缓存
export function getAgent(proxy: string): SocksProxyAgent | null {
	if (!proxy) return null;
	const now = Date.now();
	const cacheTime = 1000 * 60 * 60 * 1; // 1小时
	// delete expired cache
	for (const key in agentCache) {
		if (now - agentCache[key].lastUsed > cacheTime) {
			delete agentCache[key];
		}
	}
	if (!agentCache[proxy] || now - agentCache[proxy].lastUsed > cacheTime) {
		agentCache[proxy] = { agent: new SocksProxyAgent(proxy), lastUsed: now };
  }
  agentCache[proxy].lastUsed = now;
  return agentCache[proxy].agent;
}

export default getAgent;
