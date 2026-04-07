package model

import (
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
)

// 付费用户判断缓存
// key: userId, value: *paidCacheEntry
var paidUserCache sync.Map

type paidCacheEntry struct {
	isPaid   bool
	expireAt int64 // Unix 秒级时间戳
}

const paidCacheTTLSeconds = 600 // 10 分钟缓存

// HasSuccessfulTopUp 判断用户是否有成功的充值记录（用于区分付费/免费用户）
// 结果会缓存到内存中，避免每次请求都查库
func HasSuccessfulTopUp(userId int) bool {
	// 1. 先查缓存
	if entry, ok := paidUserCache.Load(userId); ok {
		cached := entry.(*paidCacheEntry)
		if time.Now().Unix() < cached.expireAt {
			return cached.isPaid
		}
		// 缓存过期，删除后继续查库
		paidUserCache.Delete(userId)
	}

	// 2. 查数据库
	var count int64
	err := DB.Model(&TopUp{}).
		Where("user_id = ? AND status = ?", userId, common.TopUpStatusSuccess).
		Limit(1).
		Count(&count).Error

	isPaid := err == nil && count > 0

	// 3. 写入缓存
	paidUserCache.Store(userId, &paidCacheEntry{
		isPaid:   isPaid,
		expireAt: time.Now().Unix() + paidCacheTTLSeconds,
	})

	return isPaid
}

// InvalidatePaidUserCache 使某用户的付费缓存失效（充值成功后调用）
func InvalidatePaidUserCache(userId int) {
	paidUserCache.Delete(userId)
}
