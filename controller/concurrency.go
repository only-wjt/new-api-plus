package controller

import (
	"net/http"
	"strconv"

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

