package model

import (
	"errors"
	"time"
)

// SurpriseDayEvent 惊喜日事件记录
type SurpriseDayEvent struct {
	Id        int    `json:"id" gorm:"primaryKey;autoIncrement"`
	EventDate string `json:"event_date" gorm:"type:varchar(10);not null;uniqueIndex"` // 格式: YYYY-MM-DD
	WeekStart string `json:"week_start" gorm:"type:varchar(10);not null"`             // 所属周的周一日期
	Source    string `json:"source" gorm:"type:varchar(10);not null;default:'auto'"`   // 来源: auto=自动随机, manual=管理员指定
	Status    int    `json:"status" gorm:"not null;default:0;index"`                   // 状态: 0=待结算, 1=已结算, 2=已取消
	SettledAt int64  `json:"settled_at" gorm:"bigint;default:0"`                       // 结算时间戳
	CreatedAt int64  `json:"created_at" gorm:"bigint"`                                 // 创建时间
}

func (SurpriseDayEvent) TableName() string {
	return "surprise_day_events"
}

// 事件状态常量
const (
	SurpriseDayStatusPending  = 0 // 待结算
	SurpriseDayStatusSettled  = 1 // 已结算
	SurpriseDayStatusCanceled = 2 // 已取消
)

// 事件来源常量
const (
	SurpriseDaySourceAuto   = "auto"   // 自动随机
	SurpriseDaySourceManual = "manual" // 管理员指定
)

// SurpriseDayWinner 惊喜日中奖记录
type SurpriseDayWinner struct {
	Id            int    `json:"id" gorm:"primaryKey;autoIncrement"`
	EventId       int    `json:"event_id" gorm:"not null;index"`
	EventDate     string `json:"event_date" gorm:"type:varchar(10);not null;index"`
	UserId        int    `json:"user_id" gorm:"not null;index"`
	Username      string `json:"username" gorm:"type:varchar(64);not null"`
	AwardType     int    `json:"award_type" gorm:"not null"`                          // 奖项类型: 1=消费榜, 2=参与奖
	Rank          int    `json:"rank" gorm:"not null;default:0"`                      // 排名(消费榜 1/2/3, 参与奖 0)
	Title         string `json:"title" gorm:"type:varchar(64);not null"`              // 称号
	DayQuota      int    `json:"day_quota" gorm:"default:0"`                          // 当日消费额度(消费榜用)
	RefundPercent int    `json:"refund_percent" gorm:"default:0"`                     // 减免比例(消费榜用)
	RefundQuota   int    `json:"refund_quota" gorm:"not null;default:0"`              // 实际返还额度
	CreatedAt     int64  `json:"created_at" gorm:"bigint"`
}

func (SurpriseDayWinner) TableName() string {
	return "surprise_day_winners"
}

// 奖项类型常量
const (
	AwardTypeConsume   = 1 // 消费榜
	AwardTypeLuckyDraw = 2 // 参与奖
)

// DailyConsumer 当日消费用户统计结构
type DailyConsumer struct {
	UserId   int    `json:"user_id"`
	Username string `json:"username"`
	Quota    int    `json:"quota"` // 当日消费总额度
}

// GetDailyTopConsumers 获取指定日期消费排名（从 logs 表查询）
// date 格式: YYYY-MM-DD
// loc: 时区
// excludeUserIds: 排除的用户 ID 列表
func GetDailyTopConsumers(date string, limit int, loc *time.Location, excludeUserIds []int) ([]DailyConsumer, error) {
	// 解析日期获取时间范围
	dayStart, err := time.ParseInLocation("2006-01-02", date, loc)
	if err != nil {
		return nil, err
	}
	dayEnd := dayStart.Add(24 * time.Hour)

	startTimestamp := dayStart.Unix()
	endTimestamp := dayEnd.Unix()

	var consumers []DailyConsumer
	tx := LOG_DB.Table("logs").
		Select("user_id, username, SUM(quota) as quota").
		Where("type = ? AND created_at >= ? AND created_at < ? AND quota > 0", LogTypeConsume, startTimestamp, endTimestamp)

	if len(excludeUserIds) > 0 {
		tx = tx.Where("user_id NOT IN ?", excludeUserIds)
	}

	err = tx.Group("user_id, username").
		Order("quota DESC").
		Limit(limit).
		Find(&consumers).Error

	return consumers, err
}

// GetDailyActiveUserIds 获取指定日期有消费记录的所有用户 ID（排除指定用户）
func GetDailyActiveUserIds(date string, excludeUserIds []int, loc *time.Location) ([]DailyConsumer, error) {
	dayStart, err := time.ParseInLocation("2006-01-02", date, loc)
	if err != nil {
		return nil, err
	}
	dayEnd := dayStart.Add(24 * time.Hour)

	startTimestamp := dayStart.Unix()
	endTimestamp := dayEnd.Unix()

	var consumers []DailyConsumer
	tx := LOG_DB.Table("logs").
		Select("user_id, username, SUM(quota) as quota").
		Where("type = ? AND created_at >= ? AND created_at < ? AND quota > 0", LogTypeConsume, startTimestamp, endTimestamp)

	if len(excludeUserIds) > 0 {
		tx = tx.Where("user_id NOT IN ?", excludeUserIds)
	}

	err = tx.Group("user_id, username").Find(&consumers).Error
	return consumers, err
}

// CreateSurpriseDayEvent 创建惊喜日事件
func CreateSurpriseDayEvent(eventDate string, weekStart string, source string) (*SurpriseDayEvent, error) {
	event := &SurpriseDayEvent{
		EventDate: eventDate,
		WeekStart: weekStart,
		Source:    source,
		Status:    SurpriseDayStatusPending,
		CreatedAt: time.Now().Unix(),
	}
	err := DB.Create(event).Error
	if err != nil {
		return nil, err
	}
	return event, nil
}

// GetSurpriseDayEventByDate 根据日期获取惊喜日事件
func GetSurpriseDayEventByDate(date string) (*SurpriseDayEvent, error) {
	var event SurpriseDayEvent
	err := DB.Where("event_date = ?", date).First(&event).Error
	if err != nil {
		return nil, err
	}
	return &event, nil
}

// GetSurpriseDayEventsByWeek 获取某一周的惊喜日事件
func GetSurpriseDayEventsByWeek(weekStart string) ([]SurpriseDayEvent, error) {
	var events []SurpriseDayEvent
	err := DB.Where("week_start = ? AND status != ?", weekStart, SurpriseDayStatusCanceled).
		Order("event_date ASC").
		Find(&events).Error
	return events, err
}

// GetPendingSurpriseDayEvent 获取待结算的惊喜日事件（按日期）
func GetPendingSurpriseDayEvent(date string) (*SurpriseDayEvent, error) {
	var event SurpriseDayEvent
	err := DB.Where("event_date = ? AND status = ?", date, SurpriseDayStatusPending).First(&event).Error
	if err != nil {
		return nil, err
	}
	return &event, nil
}

// GetLatestSettledEvent 获取最近已结算的惊喜日事件
func GetLatestSettledEvent() (*SurpriseDayEvent, error) {
	var event SurpriseDayEvent
	err := DB.Where("status = ?", SurpriseDayStatusSettled).
		Order("event_date DESC").
		First(&event).Error
	if err != nil {
		return nil, err
	}
	return &event, nil
}

// GetSurpriseDayHistory 分页获取历史惊喜日结果（仅已结算）
func GetSurpriseDayHistory(startIdx int, num int) ([]SurpriseDayEvent, int64, error) {
	var total int64
	var events []SurpriseDayEvent

	err := DB.Model(&SurpriseDayEvent{}).
		Where("status = ?", SurpriseDayStatusSettled).
		Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	err = DB.Where("status = ?", SurpriseDayStatusSettled).
		Order("event_date DESC").
		Limit(num).Offset(startIdx).
		Find(&events).Error
	return events, total, err
}

// GetAllSurpriseDayEvents 管理员获取所有惊喜日事件（含待结算/已取消）
func GetAllSurpriseDayEvents(startIdx int, num int) ([]SurpriseDayEvent, int64, error) {
	var total int64
	var events []SurpriseDayEvent

	err := DB.Model(&SurpriseDayEvent{}).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	err = DB.Order("event_date DESC").
		Limit(num).Offset(startIdx).
		Find(&events).Error
	return events, total, err
}

// GetNextPendingEvent 获取下一个待结算的惊喜日（日期 >= 今天）
func GetNextPendingEvent(todayStr string) (*SurpriseDayEvent, error) {
	var event SurpriseDayEvent
	err := DB.Where("event_date >= ? AND status = ?", todayStr, SurpriseDayStatusPending).
		Order("event_date ASC").
		First(&event).Error
	if err != nil {
		return nil, err
	}
	return &event, nil
}

// SettleSurpriseDayEvent 标记事件为已结算
func SettleSurpriseDayEvent(eventId int) error {
	return DB.Model(&SurpriseDayEvent{}).
		Where("id = ? AND status = ?", eventId, SurpriseDayStatusPending).
		Updates(map[string]interface{}{
			"status":     SurpriseDayStatusSettled,
			"settled_at": time.Now().Unix(),
		}).Error
}

// CancelSurpriseDayEvent 取消惊喜日事件
func CancelSurpriseDayEvent(eventId int) error {
	// 只能取消待结算的事件
	result := DB.Model(&SurpriseDayEvent{}).
		Where("id = ? AND status = ?", eventId, SurpriseDayStatusPending).
		Update("status", SurpriseDayStatusCanceled)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("只能取消待结算的惊喜日事件")
	}
	return nil
}

// GetSurpriseDayEventById 根据 ID 获取事件
func GetSurpriseDayEventById(id int) (*SurpriseDayEvent, error) {
	var event SurpriseDayEvent
	err := DB.Where("id = ?", id).First(&event).Error
	if err != nil {
		return nil, err
	}
	return &event, nil
}

// CreateSurpriseDayWinners 批量创建中奖记录
func CreateSurpriseDayWinners(winners []SurpriseDayWinner) error {
	if len(winners) == 0 {
		return nil
	}
	return DB.Create(&winners).Error
}

// GetWinnersByEventId 获取指定事件的中奖记录
func GetWinnersByEventId(eventId int) ([]SurpriseDayWinner, error) {
	var winners []SurpriseDayWinner
	err := DB.Where("event_id = ?", eventId).
		Order("award_type ASC, rank ASC").
		Find(&winners).Error
	return winners, err
}

// GetWinnersByEventDate 获取指定日期的中奖记录
func GetWinnersByEventDate(eventDate string) ([]SurpriseDayWinner, error) {
	var winners []SurpriseDayWinner
	err := DB.Where("event_date = ?", eventDate).
		Order("award_type ASC, rank ASC").
		Find(&winners).Error
	return winners, err
}

// GetUserWinHistory 获取用户的中奖历史
func GetUserWinHistory(userId int, limit int) ([]SurpriseDayWinner, error) {
	var winners []SurpriseDayWinner
	err := DB.Where("user_id = ?", userId).
		Order("created_at DESC").
		Limit(limit).
		Find(&winners).Error
	return winners, err
}

// GetWeekStartDate 获取指定日期所在周的周一日期
func GetWeekStartDate(date time.Time) string {
	weekday := int(date.Weekday())
	if weekday == 0 {
		weekday = 7 // 将周日从 0 调整为 7
	}
	monday := date.AddDate(0, 0, -(weekday - 1))
	return monday.Format("2006-01-02")
}

// ResetSurpriseDayEvent 重置已结算事件为待结算状态
func ResetSurpriseDayEvent(eventId int) error {
	result := DB.Model(&SurpriseDayEvent{}).
		Where("id = ? AND status = ?", eventId, SurpriseDayStatusSettled).
		Updates(map[string]interface{}{
			"status":     SurpriseDayStatusPending,
			"settled_at": 0,
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("只能重置已结算的惊喜日事件")
	}
	return nil
}

// DeleteWinnersByEventId 删除指定事件的所有中奖记录
func DeleteWinnersByEventId(eventId int) ([]SurpriseDayWinner, error) {
	// 先查出中奖记录用于回退额度
	var winners []SurpriseDayWinner
	err := DB.Where("event_id = ?", eventId).Find(&winners).Error
	if err != nil {
		return nil, err
	}
	// 删除记录
	if len(winners) > 0 {
		err = DB.Where("event_id = ?", eventId).Delete(&SurpriseDayWinner{}).Error
		if err != nil {
			return nil, err
		}
	}
	return winners, nil
}

