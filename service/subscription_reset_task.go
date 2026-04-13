package service

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"

	"github.com/bytedance/gopkg/util/gopool"
)

const (
	subscriptionResetTickInterval = 1 * time.Minute
	subscriptionResetBatchSize    = 300
	subscriptionCleanupInterval   = 30 * time.Minute
)

var (
	subscriptionResetOnce    sync.Once
	subscriptionResetRunning atomic.Bool
	subscriptionCleanupLast  atomic.Int64
	// 日/周限重置标志：存储上次重置的日期编号（自 Unix epoch 起的天数/周数）
	lastDailyResetDay  atomic.Int64
	lastWeeklyResetWeek atomic.Int64
)

func StartSubscriptionQuotaResetTask() {
	subscriptionResetOnce.Do(func() {
		if !common.IsMasterNode {
			return
		}
		// 初始化日/周重置标志为当前日/周，避免启动时立即触发重置
		now := time.Now()
		lastDailyResetDay.Store(dayNumber(now))
		lastWeeklyResetWeek.Store(weekNumber(now))

		gopool.Go(func() {
			logger.LogInfo(context.Background(), fmt.Sprintf("subscription quota reset task started: tick=%s", subscriptionResetTickInterval))
			ticker := time.NewTicker(subscriptionResetTickInterval)
			defer ticker.Stop()

			runSubscriptionQuotaResetOnce()
			for range ticker.C {
				runSubscriptionQuotaResetOnce()
			}
		})
	})
}

// dayNumber 返回自 Unix epoch 起的天数（UTC+8 时区）
func dayNumber(t time.Time) int64 {
	loc := time.FixedZone("CST", 8*3600)
	y, m, d := t.In(loc).Date()
	return time.Date(y, m, d, 0, 0, 0, 0, loc).Unix() / 86400
}

// weekNumber 返回自 Unix epoch 起的周数（周一为周起始，UTC+8 时区）
func weekNumber(t time.Time) int64 {
	loc := time.FixedZone("CST", 8*3600)
	local := t.In(loc)
	// 回退到本周一 00:00:00
	weekday := local.Weekday()
	if weekday == time.Sunday {
		weekday = 7
	}
	monday := local.AddDate(0, 0, -int(weekday-time.Monday))
	monday = time.Date(monday.Year(), monday.Month(), monday.Day(), 0, 0, 0, 0, loc)
	return monday.Unix() / (7 * 86400)
}

func runSubscriptionQuotaResetOnce() {
	if !subscriptionResetRunning.CompareAndSwap(false, true) {
		return
	}
	defer subscriptionResetRunning.Store(false)

	ctx := context.Background()
	totalReset := 0
	totalExpired := 0
	for {
		n, err := model.ExpireDueSubscriptions(subscriptionResetBatchSize)
		if err != nil {
			logger.LogWarn(ctx, fmt.Sprintf("subscription expire task failed: %v", err))
			return
		}
		if n == 0 {
			break
		}
		totalExpired += n
		if n < subscriptionResetBatchSize {
			break
		}
	}
	for {
		n, err := model.ResetDueSubscriptions(subscriptionResetBatchSize)
		if err != nil {
			logger.LogWarn(ctx, fmt.Sprintf("subscription quota reset task failed: %v", err))
			return
		}
		if n == 0 {
			break
		}
		totalReset += n
		if n < subscriptionResetBatchSize {
			break
		}
	}
	lastCleanup := time.Unix(subscriptionCleanupLast.Load(), 0)
	if time.Since(lastCleanup) >= subscriptionCleanupInterval {
		if _, err := model.CleanupSubscriptionPreConsumeRecords(7 * 24 * 3600); err == nil {
			subscriptionCleanupLast.Store(time.Now().Unix())
		}
	}

	// 日限重置：检查是否跨越了自然日边界
	now := time.Now()
	currentDay := dayNumber(now)
	if currentDay > lastDailyResetDay.Load() {
		result := model.DB.Model(&model.UserSubscription{}).
			Where("status = ? AND daily_used > 0", "active").
			Update("daily_used", 0)
		if result.Error == nil && result.RowsAffected > 0 {
			logger.LogInfo(ctx, fmt.Sprintf("subscription daily limit reset: %d rows", result.RowsAffected))
		}
		lastDailyResetDay.Store(currentDay)
	}

	// 周限重置：检查是否跨越了周一边界
	currentWeek := weekNumber(now)
	if currentWeek > lastWeeklyResetWeek.Load() {
		result := model.DB.Model(&model.UserSubscription{}).
			Where("status = ? AND weekly_used > 0", "active").
			Update("weekly_used", 0)
		if result.Error == nil && result.RowsAffected > 0 {
			logger.LogInfo(ctx, fmt.Sprintf("subscription weekly limit reset: %d rows", result.RowsAffected))
		}
		lastWeeklyResetWeek.Store(currentWeek)
	}

	if common.DebugEnabled && (totalReset > 0 || totalExpired > 0) {
		logger.LogDebug(ctx, "subscription maintenance: reset_count=%d, expired_count=%d", totalReset, totalExpired)
	}
}
