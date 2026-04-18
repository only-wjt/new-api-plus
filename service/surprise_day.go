package service

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
)

// 消费榜称号
var surpriseDayTitles = map[int]string{
	1: "卷王之王 👑",
	2: "氪金大佬 💎",
	3: "消费达人 🔥",
}

// 参与奖称号
const luckyDrawTitle = "天选之人 🍀"

// StartSurpriseDayTask 启动惊喜日定时任务
func StartSurpriseDayTask() {
	go func() {
		common.SysLog("惊喜日定时任务已启动")
		// 等待 30 秒让系统完全启动
		time.Sleep(30 * time.Second)

		// 记录上次执行的日期，防止同一天重复执行
		lastSettledDate := ""
		lastAutoSelectWeek := ""

		for {
			checkAndExecuteSurpriseDayTasks(&lastSettledDate, &lastAutoSelectWeek)
			// 每 30 秒检查一次，确保不会错过时间窗口
			time.Sleep(30 * time.Second)
		}
	}()
}

// checkAndExecuteSurpriseDayTasks 检查并执行惊喜日任务
func checkAndExecuteSurpriseDayTasks(lastSettledDate *string, lastAutoSelectWeek *string) {
	setting := operation_setting.GetSurpriseDaySetting()
	if !setting.Enabled {
		return
	}

	loc, err := time.LoadLocation(setting.Timezone)
	if err != nil {
		common.SysError("惊喜日时区解析失败: " + err.Error())
		return
	}

	now := time.Now().In(loc)
	todayStr := now.Format("2006-01-02")

	// 1. 自动选日逻辑：每周日 23:00 之后检查下周是否需要自动创建惊喜日
	if now.Weekday() == time.Sunday && now.Hour() >= 23 {
		weekKey := todayStr // 用周日的日期作为去重标识
		if *lastAutoSelectWeek != weekKey {
			autoSelectSurpriseDay(now, loc)
			*lastAutoSelectWeek = weekKey
		}
	}

	// 2. 结算逻辑：到达结算时间后触发（同一天只执行一次）
	if now.Hour() > setting.SettlementHour || (now.Hour() == setting.SettlementHour && now.Minute() >= setting.SettlementMinute) {
		if *lastSettledDate != todayStr {
			event, err := model.GetPendingSurpriseDayEvent(todayStr)
			if err != nil {
				// 今天不是惊喜日或已结算，正常情况
				return
			}
			common.SysLog(fmt.Sprintf("惊喜日结算开始: %s", todayStr))
			if err := SettleSurpriseDay(event, loc); err != nil {
				common.SysError(fmt.Sprintf("惊喜日结算失败 [%s]: %s", todayStr, err.Error()))
			} else {
				common.SysLog(fmt.Sprintf("惊喜日结算完成: %s", todayStr))
			}
			*lastSettledDate = todayStr
		}
	}
}

// autoSelectSurpriseDay 自动选择下周的惊喜日
func autoSelectSurpriseDay(now time.Time, loc *time.Location) {
	// 计算下周一的日期
	daysUntilMonday := (8 - int(now.Weekday())) % 7
	if daysUntilMonday == 0 {
		daysUntilMonday = 1 // 周日时，下周一是明天
	}
	nextMonday := now.AddDate(0, 0, daysUntilMonday)
	weekStart := nextMonday.Format("2006-01-02")

	// 检查下周是否已经有惊喜日（管理员可能已手动指定）
	events, err := model.GetSurpriseDayEventsByWeek(weekStart)
	if err != nil {
		common.SysError("查询下周惊喜日事件失败: " + err.Error())
		return
	}
	if len(events) > 0 {
		common.SysLog(fmt.Sprintf("下周 (%s) 已有 %d 个惊喜日事件，跳过自动选择", weekStart, len(events)))
		return
	}

	// 从周一到周五中随机选一天（0=周一, 4=周五）
	randomDay := rand.Intn(5)
	surpriseDate := nextMonday.AddDate(0, 0, randomDay)
	surpriseDateStr := surpriseDate.Format("2006-01-02")

	_, err = model.CreateSurpriseDayEvent(surpriseDateStr, weekStart, model.SurpriseDaySourceAuto)
	if err != nil {
		common.SysError(fmt.Sprintf("自动创建惊喜日事件失败 [%s]: %s", surpriseDateStr, err.Error()))
		return
	}

	common.SysLog(fmt.Sprintf("自动选择下周惊喜日: %s (周%d)", surpriseDateStr, randomDay+1))
}

// SettleSurpriseDay 执行惊喜日结算
func SettleSurpriseDay(event *model.SurpriseDayEvent, loc *time.Location) error {
	setting := operation_setting.GetSurpriseDaySetting()

	// 防止重复结算
	if event.Status != model.SurpriseDayStatusPending {
		return fmt.Errorf("事件 %d 状态不是待结算 (status=%d)", event.Id, event.Status)
	}

	// 获取排除的用户 ID 列表
	excludeUserIds := operation_setting.GetExcludeUserIdList()

	// 1. 获取当日消费 TOP3（排除指定用户）
	topConsumers, err := model.GetDailyTopConsumers(event.EventDate, 3, loc, excludeUserIds)
	if err != nil {
		return fmt.Errorf("查询消费排名失败: %w", err)
	}

	if len(topConsumers) == 0 {
		common.SysLog(fmt.Sprintf("惊喜日 %s 当日无消费记录，跳过结算", event.EventDate))
		// 标记为已结算但无获奖者
		return model.SettleSurpriseDayEvent(event.Id)
	}

	// 2. 计算减免比例
	refundPercents := []int{setting.Top1RefundPercent, setting.Top2RefundPercent, setting.Top3RefundPercent}

	var winners []model.SurpriseDayWinner
	var topUserIds []int

	// 3. 处理消费榜 TOP3
	for i, consumer := range topConsumers {
		rank := i + 1
		percent := refundPercents[i]
		refundQuota := consumer.Quota * percent / 100

		title, ok := surpriseDayTitles[rank]
		if !ok {
			title = fmt.Sprintf("消费榜 #%d", rank)
		}

		winners = append(winners, model.SurpriseDayWinner{
			EventId:       event.Id,
			EventDate:     event.EventDate,
			UserId:        consumer.UserId,
			Username:      consumer.Username,
			AwardType:     model.AwardTypeConsume,
			Rank:          rank,
			Title:         title,
			DayQuota:      consumer.Quota,
			RefundPercent: percent,
			RefundQuota:   refundQuota,
			CreatedAt:     time.Now().Unix(),
		})
		topUserIds = append(topUserIds, consumer.UserId)

		// 返还额度
		err := model.IncreaseUserQuota(consumer.UserId, refundQuota, true)
		if err != nil {
			common.SysError(fmt.Sprintf("惊喜日返还额度失败 [user=%d, quota=%d]: %s", consumer.UserId, refundQuota, err.Error()))
		}

		// 记录系统日志
		model.RecordLog(consumer.UserId, model.LogTypeSystem,
			fmt.Sprintf("🎉 惊喜日消费榜 %s：当日消费 %s，减免 %d%%，返还 %s",
				title, logger.LogQuota(consumer.Quota), percent, logger.LogQuota(refundQuota)))
	}

	// 4. 抽取参与奖
	if setting.LuckyDrawCount > 0 && setting.LuckyDrawQuota > 0 {
		// 合并排除列表：TOP3 用户 + 配置中排除的用户
		allExcludeIds := make([]int, 0, len(topUserIds)+len(excludeUserIds))
		allExcludeIds = append(allExcludeIds, topUserIds...)
		allExcludeIds = append(allExcludeIds, excludeUserIds...)
		activeUsers, err := model.GetDailyActiveUserIds(event.EventDate, allExcludeIds, loc)
		if err != nil {
			common.SysError(fmt.Sprintf("查询当日活跃用户失败: %s", err.Error()))
		} else if len(activeUsers) > 0 {
			// 随机抽取
			luckyCount := setting.LuckyDrawCount
			if luckyCount > len(activeUsers) {
				luckyCount = len(activeUsers)
			}

			// Fisher-Yates 洗牌算法
			shuffled := make([]model.DailyConsumer, len(activeUsers))
			copy(shuffled, activeUsers)
			for i := len(shuffled) - 1; i > 0; i-- {
				j := rand.Intn(i + 1)
				shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
			}

			for k := 0; k < luckyCount; k++ {
				luckyUser := shuffled[k]
				winners = append(winners, model.SurpriseDayWinner{
					EventId:     event.Id,
					EventDate:   event.EventDate,
					UserId:      luckyUser.UserId,
					Username:    luckyUser.Username,
					AwardType:   model.AwardTypeLuckyDraw,
					Rank:        0,
					Title:       luckyDrawTitle,
					DayQuota:    0,
					RefundQuota: setting.LuckyDrawQuota,
					CreatedAt:   time.Now().Unix(),
				})

				// 返还额度
				err := model.IncreaseUserQuota(luckyUser.UserId, setting.LuckyDrawQuota, true)
				if err != nil {
					common.SysError(fmt.Sprintf("惊喜日参与奖返还额度失败 [user=%d]: %s", luckyUser.UserId, err.Error()))
				}

				// 记录系统日志
				model.RecordLog(luckyUser.UserId, model.LogTypeSystem,
					fmt.Sprintf("🎉 惊喜日参与奖 %s：随机抽中，奖励 %s",
						luckyDrawTitle, logger.LogQuota(setting.LuckyDrawQuota)))
			}
		} else {
			common.SysLog(fmt.Sprintf("惊喜日 %s 无符合条件的参与奖用户", event.EventDate))
		}
	}

	// 5. 批量保存中奖记录
	if len(winners) > 0 {
		if err := model.CreateSurpriseDayWinners(winners); err != nil {
			// 获奖记录保存失败，不标记事件为已结算，返回错误允许重试
			return fmt.Errorf("保存中奖记录失败: %w", err)
		}
	}

	// 6. 标记事件为已结算
	if err := model.SettleSurpriseDayEvent(event.Id); err != nil {
		return fmt.Errorf("标记事件已结算失败: %w", err)
	}

	common.SysLog(fmt.Sprintf("惊喜日 %s 结算完成: 消费榜 %d 人 + 参与奖 %d 人",
		event.EventDate, len(topConsumers), len(winners)-len(topConsumers)))

	return nil
}

// AdminCreateSurpriseDayEvent 管理员手动指定惊喜日
func AdminCreateSurpriseDayEvent(dateStr string) (*model.SurpriseDayEvent, error) {
	setting := operation_setting.GetSurpriseDaySetting()
	loc, err := time.LoadLocation(setting.Timezone)
	if err != nil {
		return nil, fmt.Errorf("时区解析失败: %w", err)
	}

	// 解析日期
	eventDate, err := time.ParseInLocation("2006-01-02", dateStr, loc)
	if err != nil {
		return nil, fmt.Errorf("日期格式无效，请使用 YYYY-MM-DD 格式: %w", err)
	}

	// 管理员可以创建任意日期的活动（包括过去的日期，用于回溯结算）

	// 检查该日期是否已存在事件
	existing, _ := model.GetSurpriseDayEventByDate(dateStr)
	if existing != nil {
		return nil, fmt.Errorf("该日期 %s 已存在惊喜日事件 (状态: %d)", dateStr, existing.Status)
	}

	weekStart := model.GetWeekStartDate(eventDate)

	event, err := model.CreateSurpriseDayEvent(dateStr, weekStart, model.SurpriseDaySourceManual)
	if err != nil {
		return nil, fmt.Errorf("创建惊喜日事件失败: %w", err)
	}

	common.SysLog(fmt.Sprintf("管理员手动指定惊喜日: %s", dateStr))
	return event, nil
}

// AdminCancelSurpriseDayEvent 管理员取消惊喜日
func AdminCancelSurpriseDayEvent(eventId int) error {
	err := model.CancelSurpriseDayEvent(eventId)
	if err != nil {
		return err
	}
	common.SysLog(fmt.Sprintf("管理员取消惊喜日事件: %d", eventId))
	return nil
}

// AdminSettleSurpriseDay 管理员手动触发结算
func AdminSettleSurpriseDay(eventId int) error {
	setting := operation_setting.GetSurpriseDaySetting()
	loc, err := time.LoadLocation(setting.Timezone)
	if err != nil {
		return fmt.Errorf("时区解析失败: %w", err)
	}

	event, err := model.GetSurpriseDayEventById(eventId)
	if err != nil {
		return fmt.Errorf("惊喜日事件不存在: %w", err)
	}

	if event.Status != model.SurpriseDayStatusPending {
		return fmt.Errorf("只能结算待结算状态的事件 (当前状态: %d)", event.Status)
	}

	return SettleSurpriseDay(event, loc)
}

// AdminResetSurpriseDayEvent 管理员重置已结算事件（回退奖励 + 重置状态）
func AdminResetSurpriseDayEvent(eventId int) error {
	event, err := model.GetSurpriseDayEventById(eventId)
	if err != nil {
		return fmt.Errorf("事件不存在: %w", err)
	}

	if event.Status != model.SurpriseDayStatusSettled {
		return fmt.Errorf("只能重置已结算的事件 (当前状态: %d)", event.Status)
	}

	// 1. 查出中奖记录并删除
	winners, err := model.DeleteWinnersByEventId(eventId)
	if err != nil {
		return fmt.Errorf("删除中奖记录失败: %w", err)
	}

	// 2. 回退已发放的奖励额度
	for _, w := range winners {
		if w.RefundQuota > 0 {
			err := model.DecreaseUserQuota(w.UserId, w.RefundQuota, true)
			if err != nil {
				common.SysError(fmt.Sprintf("惊喜日重置-回退额度失败 [user=%d, quota=%d]: %s", w.UserId, w.RefundQuota, err.Error()))
			}
		}
	}

	// 3. 重置事件状态为待结算
	if err := model.ResetSurpriseDayEvent(eventId); err != nil {
		return fmt.Errorf("重置事件状态失败: %w", err)
	}

	common.SysLog(fmt.Sprintf("管理员重置惊喜日事件: %d, 回退了 %d 条中奖记录", eventId, len(winners)))
	return nil
}
