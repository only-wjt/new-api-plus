package model

import (
	"fmt"

	"github.com/QuantumNous/new-api/common"
)

// migrateConcurrencyOverridesToUser 一次性迁移：
// 1. 将 user_concurrency_overrides 表的覆盖值迁移到 users.max_concurrent
// 2. 将有成功充值记录的用户标记为付费（is_paid = true）
//
// 该函数幂等安全：多次执行不会重复修改已迁移的数据。
// 当旧表不存在时静默跳过。
func migrateConcurrencyOverridesToUser() {
	overrideTable := "user_concurrency_overrides"

	// 检查旧表是否存在
	if !DB.Migrator().HasTable(overrideTable) {
		return
	}

	// 检查是否已经迁移过（看旧表中是否还有记录）
	var count int64
	DB.Table(overrideTable).Count(&count)
	if count == 0 {
		return
	}

	common.SysLog("开始迁移 user_concurrency_overrides 数据到 users.max_concurrent ...")

	// 1. 将覆盖值迁移到 users 表
	// 逐行更新，兼容 SQLite/MySQL/PostgreSQL
	type overrideRow struct {
		UserId        int `gorm:"column:user_id"`
		MaxConcurrent int `gorm:"column:max_concurrent"`
	}
	var rows []overrideRow
	if err := DB.Table(overrideTable).Select("user_id, max_concurrent").Find(&rows).Error; err != nil {
		common.SysError("读取覆盖表失败: " + err.Error())
		return
	}

	migrated := 0
	for _, row := range rows {
		if row.MaxConcurrent <= 0 {
			continue
		}
		// 只更新还是默认值(0)的用户，避免覆盖已手动设置的值
		result := DB.Model(&User{}).Where("id = ? AND max_concurrent = 0", row.UserId).
			Update("max_concurrent", row.MaxConcurrent)
		if result.Error != nil {
			common.SysError(fmt.Sprintf("迁移用户 %d 并发覆盖失败: %s", row.UserId, result.Error.Error()))
			continue
		}
		if result.RowsAffected > 0 {
			migrated++
		}
	}
	common.SysLog(fmt.Sprintf("并发覆盖迁移完成，共迁移 %d 个用户", migrated))

	// 2. 将有成功充值记录的用户标记为付费
	paidResult := DB.Model(&User{}).
		Where("id IN (SELECT DISTINCT user_id FROM top_ups WHERE status = ?)", common.TopUpStatusSuccess).
		Update("is_paid", true)
	if paidResult.Error != nil {
		common.SysError("标记付费用户失败: " + paidResult.Error.Error())
	} else {
		common.SysLog(fmt.Sprintf("标记付费用户完成，共标记 %d 个用户", paidResult.RowsAffected))
	}

	// 注意：不再在迁移中硬编码设置付费用户的 max_concurrent 值。
	// 运行时由 resolveMaxConcurrent() 根据 is_paid + 全局 paid_default 动态决定。
}
