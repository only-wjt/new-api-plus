package operation_setting

import (
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/setting/config"
)

// SurpriseDaySetting 惊喜日活动配置
type SurpriseDaySetting struct {
	Enabled           bool   `json:"enabled"`              // 是否启用惊喜日活动
	Visibility        string `json:"visibility"`           // 看板可见性: "all"=全部用户, "admin"=仅管理员
	Top1RefundPercent int    `json:"top1_refund_percent"`  // 第1名减免比例
	Top2RefundPercent int    `json:"top2_refund_percent"`  // 第2名减免比例
	Top3RefundPercent int    `json:"top3_refund_percent"`  // 第3名减免比例
	LuckyDrawCount    int    `json:"lucky_draw_count"`     // 参与奖抽取人数
	LuckyDrawQuota    int    `json:"lucky_draw_quota"`     // 参与奖每人额度（quota 值）
	SettlementHour    int    `json:"settlement_hour"`      // 结算时间（小时，24小时制）
	SettlementMinute  int    `json:"settlement_minute"`    // 结算时间（分钟）
	Timezone          string `json:"timezone"`             // 时区
	ExcludeUserIds    string `json:"exclude_user_ids"`     // 排除的用户 ID（逗号分隔，如 "1,5,10"）
}

// 默认配置
var surpriseDaySetting = SurpriseDaySetting{
	Enabled:           false,     // 默认关闭
	Visibility:        "all",     // 默认全部用户可见
	Top1RefundPercent: 50,        // 第1名减免 50%
	Top2RefundPercent: 35,        // 第2名减免 35%
	Top3RefundPercent: 20,        // 第3名减免 20%
	LuckyDrawCount:    3,         // 默认抽取 3 人
	LuckyDrawQuota:    2500000,   // 默认 $5 = 2,500,000 quota
	SettlementHour:    21,        // 默认 21:00 结算
	SettlementMinute:  0,         // 默认整点
	Timezone:          "Asia/Shanghai",
	ExcludeUserIds:    "",        // 默认不排除任何用户
}

func init() {
	// 注册到全局配置管理器
	config.GlobalConfig.Register("surprise_day_setting", &surpriseDaySetting)
}

// GetSurpriseDaySetting 获取惊喜日配置
func GetSurpriseDaySetting() *SurpriseDaySetting {
	return &surpriseDaySetting
}

// IsSurpriseDayEnabled 是否启用惊喜日活动
func IsSurpriseDayEnabled() bool {
	return surpriseDaySetting.Enabled
}

// IsSurpriseDayVisibleToAll 看板是否对全部用户可见
func IsSurpriseDayVisibleToAll() bool {
	return surpriseDaySetting.Visibility == "all"
}

// GetExcludeUserIdList 解析排除的用户 ID 列表
func GetExcludeUserIdList() []int {
	if surpriseDaySetting.ExcludeUserIds == "" {
		return nil
	}
	parts := strings.Split(surpriseDaySetting.ExcludeUserIds, ",")
	var ids []int
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		id, err := strconv.Atoi(p)
		if err == nil && id > 0 {
			ids = append(ids, id)
		}
	}
	return ids
}

