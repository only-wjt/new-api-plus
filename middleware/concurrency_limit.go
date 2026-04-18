package middleware

import (
	"fmt"
	"net/http"
	"sync"
	"sync/atomic"

	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"

	"github.com/gin-gonic/gin"
)

// concurrencyCounters 存储每个用户当前的并发请求数
// key: userId(int), value: *atomic.Int32
var concurrencyCounters sync.Map

// getOrCreateCounter 获取或创建用户的并发计数器
func getOrCreateCounter(userId int) *atomic.Int32 {
	if counter, ok := concurrencyCounters.Load(userId); ok {
		return counter.(*atomic.Int32)
	}
	newCounter := &atomic.Int32{}
	actual, _ := concurrencyCounters.LoadOrStore(userId, newCounter)
	return actual.(*atomic.Int32)
}

// ConcurrencyLimit 用户并发限制中间件
// 必须挂载在 TokenAuth() 之后（需要 userId）
func ConcurrencyLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		setting := operation_setting.GetConcurrencySetting()

		// 1. 检查全局开关
		if !setting.Enabled {
			c.Next()
			return
		}

		// 2. 获取 userId
		userId := c.GetInt("id")
		if userId == 0 {
			// 没有 userId（不应该发生，因为 TokenAuth 已经设置了）
			c.Next()
			return
		}

		// 3. admin/root 不限制
		if model.IsAdmin(userId) {
			c.Next()
			return
		}

		// 4. 直接从用户缓存读取并发上限
		maxConcurrent := resolveMaxConcurrent(userId)

		// 5. 原子 +1 并检查是否超限
		counter := getOrCreateCounter(userId)
		current := counter.Add(1)

		if int(current) > maxConcurrent {
			// 超限，回退计数并拒绝
			counter.Add(-1)
			abortWithOpenAiMessage(c, http.StatusTooManyRequests,
				fmt.Sprintf("并发请求数已达上限（%d），请等待当前请求完成后重试", maxConcurrent))
			return
		}

		// 6. 请求完成后 -1（defer 保证 panic 也能释放）
		defer counter.Add(-1)

		// 7. 继续处理请求
		c.Next()
	}
}

// resolveMaxConcurrent 解析用户的并发上限
// 逻辑：
//   - 免费用户：若 max_concurrent >= 1 则使用该值，否则使用 free_default
//   - 付费用户：取 max(max_concurrent, paid_default)，保证付费用户不低于 paid_default
func resolveMaxConcurrent(userId int) int {
	setting := operation_setting.GetConcurrencySetting()
	userCache, err := model.GetUserCache(userId)
	if err != nil {
		return setting.FreeDefault // 查不到用户，使用未付费默认值
	}

	if userCache.IsPaid {
		// 付费用户：保底 paid_default，手动设值只有超过时才生效
		if userCache.MaxConcurrent > setting.PaidDefault {
			return userCache.MaxConcurrent
		}
		return setting.PaidDefault
	}

	// 免费用户：有独立设置则使用，否则走全局默认
	if userCache.MaxConcurrent >= 1 {
		return userCache.MaxConcurrent
	}
	return setting.FreeDefault
}

// GetUserCurrentConcurrency 获取用户当前并发数（供管理 API 查询）
func GetUserCurrentConcurrency(userId int) int32 {
	if counter, ok := concurrencyCounters.Load(userId); ok {
		return counter.(*atomic.Int32).Load()
	}
	return 0
}

// ResolveEffectiveConcurrency 供外部（controller）调用，返回用户的实际有效并发数
func ResolveEffectiveConcurrency(userId int) int {
	return resolveMaxConcurrent(userId)
}
