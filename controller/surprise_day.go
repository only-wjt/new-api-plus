package controller

import (
	"net/http"
	"strconv"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
)

// GetCurrentSurpriseDay 获取当前惊喜日状态和最近结果
// 受 visibility 配置控制：
// - "all" -> 所有登录用户可见
// - "admin" -> 只有管理员可见，普通用户返回 enabled: false
func GetCurrentSurpriseDay(c *gin.Context) {
	setting := operation_setting.GetSurpriseDaySetting()

	// 检查功能是否启用
	if !setting.Enabled {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"enabled": false,
			},
		})
		return
	}

	// 检查可见性权限
	if setting.Visibility == "admin" {
		role := c.GetInt("role")
		if role < common.RoleAdminUser {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data": gin.H{
					"enabled": false,
				},
			})
			return
		}
	}

	// 获取最近已结算的事件
	latestEvent, err := model.GetLatestSettledEvent()
	var latestResult map[string]interface{}
	if err == nil && latestEvent != nil {
		winners, _ := model.GetWinnersByEventId(latestEvent.Id)
		latestResult = map[string]interface{}{
			"event":   latestEvent,
			"winners": winners,
		}
	}

	// 保密逻辑：不暴露具体惊喜日日期给普通用户，只告知是否有安排
	hasUpcoming := false
	todayStr := getCurrentTimeStr(setting)
	nextEvent, _ := model.GetNextPendingEvent(todayStr)
	if nextEvent != nil {
		hasUpcoming = true
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"enabled":       true,
			"has_upcoming":  hasUpcoming,
			"latest_result": latestResult,
			"rules": gin.H{
				"top1_refund_percent": setting.Top1RefundPercent,
				"top2_refund_percent": setting.Top2RefundPercent,
				"top3_refund_percent": setting.Top3RefundPercent,
				"lucky_draw_count":    setting.LuckyDrawCount,
				"lucky_draw_quota":    setting.LuckyDrawQuota,
				"settlement_hour":     setting.SettlementHour,
				"settlement_minute":   setting.SettlementMinute,
			},
		},
	})
}

// GetSurpriseDayHistory 分页获取历史惊喜日结果
func GetSurpriseDayHistory(c *gin.Context) {
	setting := operation_setting.GetSurpriseDaySetting()

	// 检查功能是否启用
	if !setting.Enabled {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"enabled": false,
			},
		})
		return
	}

	// 检查可见性权限
	if setting.Visibility == "admin" {
		role := c.GetInt("role")
		if role < common.RoleAdminUser {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data": gin.H{
					"enabled": false,
				},
			})
			return
		}
	}

	pageInfo := common.GetPageQuery(c)
	events, total, err := model.GetSurpriseDayHistory(pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}

	// 为每个事件附带中奖者信息
	var results []map[string]interface{}
	for _, event := range events {
		winners, _ := model.GetWinnersByEventId(event.Id)
		results = append(results, map[string]interface{}{
			"event":   event,
			"winners": winners,
		})
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(results)
	common.ApiSuccess(c, pageInfo)
}

// AdminGetSurpriseDayEvents 管理员获取所有惊喜日事件
func AdminGetSurpriseDayEvents(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	events, total, err := model.GetAllSurpriseDayEvents(pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}

	// 为每个已结算事件附带中奖者信息
	var results []map[string]interface{}
	for _, event := range events {
		result := map[string]interface{}{
			"event": event,
		}
		if event.Status == model.SurpriseDayStatusSettled {
			winners, _ := model.GetWinnersByEventId(event.Id)
			result["winners"] = winners
		}
		results = append(results, result)
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(results)
	common.ApiSuccess(c, pageInfo)
}

// AdminCreateSurpriseDayEvent 管理员手动指定惊喜日
func AdminCreateSurpriseDayEvent(c *gin.Context) {
	var req struct {
		EventDate string `json:"event_date"` // 格式: YYYY-MM-DD
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "请求参数错误")
		return
	}

	if req.EventDate == "" {
		common.ApiErrorMsg(c, "请指定惊喜日日期")
		return
	}

	event, err := service.AdminCreateSurpriseDayEvent(req.EventDate)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "惊喜日创建成功",
		"data":    event,
	})
}

// AdminCancelSurpriseDayEvent 管理员取消惊喜日
func AdminCancelSurpriseDayEvent(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		common.ApiErrorMsg(c, "无效的事件 ID")
		return
	}

	if err := service.AdminCancelSurpriseDayEvent(id); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "惊喜日已取消",
	})
}

// AdminSettleSurpriseDay 管理员手动触发结算
func AdminSettleSurpriseDay(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		common.ApiErrorMsg(c, "无效的事件 ID")
		return
	}

	if err := service.AdminSettleSurpriseDay(id); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "惊喜日结算完成",
	})
}

// AdminResetSurpriseDay 管理员重置已结算事件
func AdminResetSurpriseDay(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		common.ApiErrorMsg(c, "无效的事件 ID")
		return
	}

	if err := service.AdminResetSurpriseDayEvent(id); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "事件已重置，奖励已回退，可重新结算",
	})
}

// getCurrentTime 获取配置时区下的当前时间
func getCurrentTime(setting *operation_setting.SurpriseDaySetting) time.Time {
	loc, err := time.LoadLocation(setting.Timezone)
	if err != nil {
		return time.Now()
	}
	return time.Now().In(loc)
}

// getCurrentTimeStr 获取配置时区下的当前日期字符串
func getCurrentTimeStr(setting *operation_setting.SurpriseDaySetting) string {
	return getCurrentTime(setting).Format("2006-01-02")
}
