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

		// 4. 确定该用户的并发上限
		maxConcurrent := resolveMaxConcurrent(userId, setting)

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

// resolveMaxConcurrent 按优先级确定用户的并发上限：
// 覆盖值 > 付费默认 > 免费默认
func resolveMaxConcurrent(userId int, setting *operation_setting.ConcurrencySetting) int {
	// 优先级 1：用户级覆盖
	override, err := model.GetConcurrencyOverride(userId)
	if err == nil && override != nil && override.MaxConcurrent > 0 {
		return override.MaxConcurrent
	}

	// 优先级 2：付费/免费用户默认值
	if model.HasSuccessfulTopUp(userId) {
		if setting.PaidDefault > 0 {
			return setting.PaidDefault
		}
		return 5 // 兜底
	}

	if setting.FreeDefault > 0 {
		return setting.FreeDefault
	}
	return 1 // 兜底
}

// GetUserCurrentConcurrency 获取用户当前并发数（供管理 API 查询）
func GetUserCurrentConcurrency(userId int) int32 {
	if counter, ok := concurrencyCounters.Load(userId); ok {
		return counter.(*atomic.Int32).Load()
	}
	return 0
}
