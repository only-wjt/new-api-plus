package controller

import (
	"net/http"
	"strconv"

	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"

	"github.com/gin-gonic/gin"
)

// GetConcurrencySetting 获取并发限制全局配置
func GetConcurrencySetting(c *gin.Context) {
	setting := operation_setting.GetConcurrencySetting()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    setting,
	})
}

// UpdateConcurrencySettingRequest 更新并发限制配置的请求体
type UpdateConcurrencySettingRequest struct {
	Enabled     bool `json:"enabled"`
	FreeDefault int  `json:"free_default"`
	PaidDefault int  `json:"paid_default"`
}

// UpdateConcurrencySetting 更新并发限制全局配置
func UpdateConcurrencySetting(c *gin.Context) {
	var req UpdateConcurrencySettingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的请求参数",
		})
		return
	}

	// 校验
	if req.FreeDefault < 1 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "未付费用户默认并发数不能小于 1",
		})
		return
	}
	if req.PaidDefault < 1 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "付费用户默认并发数不能小于 1",
		})
		return
	}

	// 使用 ConfigManager 的前缀格式保存配置
	err := model.UpdateOption("concurrency_setting.enabled", strconv.FormatBool(req.Enabled))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "保存全局开关失败: " + err.Error(),
		})
		return
	}

	err = model.UpdateOption("concurrency_setting.free_default", strconv.Itoa(req.FreeDefault))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "保存未付费用户默认并发数失败: " + err.Error(),
		})
		return
	}

	err = model.UpdateOption("concurrency_setting.paid_default", strconv.Itoa(req.PaidDefault))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "保存付费用户默认并发数失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "并发限制配置已更新",
	})
}

// GetConcurrencyOverrides 获取所有用户的并发覆盖列表
func GetConcurrencyOverrides(c *gin.Context) {
	overrides, err := model.GetAllConcurrencyOverrides()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "获取并发覆盖列表失败: " + err.Error(),
		})
		return
	}

	// 附加当前并发数信息
	type OverrideWithCurrent struct {
		*model.UserConcurrencyOverride
		CurrentConcurrency int32 `json:"current_concurrency"`
	}

	result := make([]OverrideWithCurrent, len(overrides))
	for i, o := range overrides {
		result[i] = OverrideWithCurrent{
			UserConcurrencyOverride: o,
			CurrentConcurrency:      middleware.GetUserCurrentConcurrency(o.UserId),
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    result,
	})
}

// SetConcurrencyOverrideRequest 设置用户并发覆盖的请求体
type SetConcurrencyOverrideRequest struct {
	MaxConcurrent int    `json:"max_concurrent" binding:"required"`
	Reason        string `json:"reason"`
}

// SetConcurrencyOverride 设置/更新某用户的并发覆盖
func SetConcurrencyOverride(c *gin.Context) {
	userIdStr := c.Param("userId")
	userId, err := strconv.Atoi(userIdStr)
	if err != nil || userId <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的用户 ID",
		})
		return
	}

	var req SetConcurrencyOverrideRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的请求参数",
		})
		return
	}

	if req.MaxConcurrent < 1 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "并发数必须大于 0",
		})
		return
	}

	// 获取操作人 ID
	setBy := c.GetInt("id")

	err = model.SetConcurrencyOverride(userId, req.MaxConcurrent, setBy, req.Reason)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "设置并发覆盖失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "用户并发覆盖已设置",
	})
}

// DeleteConcurrencyOverride 删除某用户的并发覆盖
func DeleteConcurrencyOverride(c *gin.Context) {
	userIdStr := c.Param("userId")
	userId, err := strconv.Atoi(userIdStr)
	if err != nil || userId <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的用户 ID",
		})
		return
	}

	err = model.DeleteConcurrencyOverride(userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "用户并发覆盖已删除",
	})
}
