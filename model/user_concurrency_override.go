package model

import (
	"errors"
	"sync"
	"time"

	"gorm.io/gorm"
)

// UserConcurrencyOverride 管理员为指定用户设置的并发覆盖值
type UserConcurrencyOverride struct {
	Id            int    `json:"id" gorm:"primaryKey"`
	UserId        int    `json:"user_id" gorm:"uniqueIndex"`
	MaxConcurrent int    `json:"max_concurrent"`
	Reason        string `json:"reason" gorm:"type:varchar(255)"`
	SetBy         int    `json:"set_by"` // 操作人 userId
	CreatedAt     int64  `json:"created_at" gorm:"bigint;autoCreateTime"`
	UpdatedAt     int64  `json:"updated_at" gorm:"bigint;autoUpdateTime"`
}

// ===== 覆盖值内存缓存（避免每次请求查库） =====

var overrideCache sync.Map // key: userId(int), value: *overrideCacheEntry

type overrideCacheEntry struct {
	override *UserConcurrencyOverride // nil 表示数据库中无记录
	expireAt int64
}

const overrideCacheTTLSeconds = 300 // 5 分钟缓存

// GetConcurrencyOverride 获取指定用户的并发覆盖值，不存在返回 nil
// 结果带内存缓存，避免高频请求路径重复查库
func GetConcurrencyOverride(userId int) (*UserConcurrencyOverride, error) {
	// 1. 查缓存
	if entry, ok := overrideCache.Load(userId); ok {
		cached := entry.(*overrideCacheEntry)
		if time.Now().Unix() < cached.expireAt {
			return cached.override, nil
		}
		overrideCache.Delete(userId)
	}

	// 2. 查数据库
	var override UserConcurrencyOverride
	err := DB.Where("user_id = ?", userId).First(&override).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		// 缓存"无记录"状态，避免缓存穿透
		overrideCache.Store(userId, &overrideCacheEntry{
			override: nil,
			expireAt: time.Now().Unix() + overrideCacheTTLSeconds,
		})
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	// 3. 写入缓存
	overrideCache.Store(userId, &overrideCacheEntry{
		override: &override,
		expireAt: time.Now().Unix() + overrideCacheTTLSeconds,
	})
	return &override, nil
}

// InvalidateOverrideCache 使指定用户的覆盖值缓存失效
func InvalidateOverrideCache(userId int) {
	overrideCache.Delete(userId)
}

// GetAllConcurrencyOverrides 获取所有用户的并发覆盖值（管理员列表）
func GetAllConcurrencyOverrides() ([]*UserConcurrencyOverride, error) {
	var overrides []*UserConcurrencyOverride
	err := DB.Order("id desc").Find(&overrides).Error
	return overrides, err
}

// SetConcurrencyOverride 设置或更新用户的并发覆盖值
func SetConcurrencyOverride(userId, maxConcurrent, setBy int, reason string) error {
	if userId <= 0 {
		return errors.New("无效的用户 ID")
	}
	if maxConcurrent <= 0 {
		return errors.New("并发数必须大于 0")
	}

	var existing UserConcurrencyOverride
	err := DB.Where("user_id = ?", userId).First(&existing).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		// 新建
		override := UserConcurrencyOverride{
			UserId:        userId,
			MaxConcurrent: maxConcurrent,
			Reason:        reason,
			SetBy:         setBy,
		}
		err = DB.Create(&override).Error
	} else if err == nil {
		// 更新
		err = DB.Model(&existing).Updates(map[string]interface{}{
			"max_concurrent": maxConcurrent,
			"reason":         reason,
			"set_by":         setBy,
		}).Error
	}

	if err == nil {
		// 清除缓存
		InvalidateOverrideCache(userId)
	}
	return err
}

// DeleteConcurrencyOverride 删除用户的并发覆盖值
func DeleteConcurrencyOverride(userId int) error {
	result := DB.Where("user_id = ?", userId).Delete(&UserConcurrencyOverride{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("该用户没有并发覆盖设置")
	}
	// 清除缓存
	InvalidateOverrideCache(userId)
	return nil
}
