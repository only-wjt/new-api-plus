package operation_setting

import (
	"github.com/QuantumNous/new-api/setting/config"
)

// ConcurrencySetting 用户并发限制全局配置
type ConcurrencySetting struct {
	Enabled     bool `json:"enabled"`      // 全局开关
	FreeDefault int  `json:"free_default"` // 未付费用户默认并发数（默认 1）
	PaidDefault int  `json:"paid_default"` // 付费用户默认并发数（默认 5）
}

var concurrencySetting ConcurrencySetting

func init() {
	concurrencySetting = ConcurrencySetting{
		Enabled:     false,
		FreeDefault: 1,
		PaidDefault: 5,
	}
	config.GlobalConfig.Register("concurrency_setting", &concurrencySetting)
}

// GetConcurrencySetting 获取当前并发限制配置（供管理 API 和中间件使用）
func GetConcurrencySetting() *ConcurrencySetting {
	return &concurrencySetting
}
