package controller

import (
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/oauth"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/console_setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"

	"github.com/gin-gonic/gin"
)

type HomeMarketingConfigQuickStart struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	ButtonText  string `json:"button_text"`
	Link        string `json:"link"`
}

type HomeMarketingConfig struct {
	Enabled              bool                            `json:"enabled"`
	Announcement         string                          `json:"announcement"`
	Title                string                          `json:"title"`
	Subtitle             string                          `json:"subtitle"`
	PrimaryButtonText    string                          `json:"primary_button_text"`
	PrimaryButtonLink    string                          `json:"primary_button_link"`
	SecondaryButtonText  string                          `json:"secondary_button_text"`
	SecondaryButtonLink  string                          `json:"secondary_button_link"`
	Benefits             []string                        `json:"benefits"`
	QuickStarts          []HomeMarketingConfigQuickStart `json:"quick_starts"`
	Scenarios            []HomeMarketingConfigQuickStart `json:"scenarios"`
	ShowDefaultProviders bool                            `json:"show_default_providers"`
	BottomCTATitle       string                          `json:"bottom_cta_title"`
	BottomCTASubtitle    string                          `json:"bottom_cta_subtitle"`
	BottomPrimaryText    string                          `json:"bottom_primary_text"`
	BottomPrimaryLink    string                          `json:"bottom_primary_link"`
	BottomSecondaryText  string                          `json:"bottom_secondary_text"`
	BottomSecondaryLink  string                          `json:"bottom_secondary_link"`
}

func defaultHomeMarketingConfig() HomeMarketingConfig {
	return HomeMarketingConfig{
		Enabled:             true,
		Announcement:        "AI API / 在线体验 / 群机器人",
		Title:               "一个入口，快速开始你的 AI 能力体验",
		Subtitle:            "支持 API 接入、在线聊天体验与 QQ 群机器人玩法，帮助开发者、普通用户和群主都能快速找到自己的使用路径。",
		PrimaryButtonText:   "立即体验",
		PrimaryButtonLink:   "/console",
		SecondaryButtonText: "查看文档",
		SecondaryButtonLink: "/docs",
		Benefits: []string{
			"统一接入多模型，切换更省心",
			"支持在线体验，先试再接入",
			"适合开发者、普通用户和社群运营",
		},
		QuickStarts: []HomeMarketingConfigQuickStart{
			{
				Title:       "我是开发者",
				Description: "获取密钥、查看接入方式，快速完成 API 对接。",
				ButtonText:  "获取密钥",
				Link:        "/console",
			},
			{
				Title:       "我是普通用户",
				Description: "直接开始聊天体验，感受模型效果后再决定是否升级。",
				ButtonText:  "开始体验",
				Link:        "/console",
			},
			{
				Title:       "我是群主",
				Description: "结合 QQ 群机器人玩法，做签到、红包与更多互动运营。",
				ButtonText:  "进入控制台",
				Link:        "/console",
			},
		},
		Scenarios: []HomeMarketingConfigQuickStart{
			{
				Title:       "API 接入",
				Description: "统一模型入口，减少切换不同上游时的接入成本。",
				ButtonText:  "获取密钥",
				Link:        "/console",
			},
			{
				Title:       "在线聊天",
				Description: "先体验常用模型效果，再决定是否充值或长期使用。",
				ButtonText:  "立即体验",
				Link:        "/console",
			},
			{
				Title:       "社群玩法",
				Description: "支持群机器人活动与运营场景，适合做活跃和转化。",
				ButtonText:  "进入后台",
				Link:        "/console",
			},
		},
		ShowDefaultProviders: true,
		BottomCTATitle:       "先领取试用额度，再决定是否升级",
		BottomCTASubtitle:    "把首页做成真正的转化入口，让新用户更快理解价值、开始体验并完成付费。",
		BottomPrimaryText:    "免费开始",
		BottomPrimaryLink:    "/register",
		BottomSecondaryText:  "进入控制台",
		BottomSecondaryLink:  "/console",
	}
}

func normalizeHomeMarketingConfig(config *HomeMarketingConfig) {
	defaultConfig := defaultHomeMarketingConfig()
	if len(config.Benefits) == 0 {
		config.Benefits = defaultConfig.Benefits
	}
	if len(config.QuickStarts) == 0 {
		config.QuickStarts = defaultConfig.QuickStarts
	}
	if len(config.Scenarios) == 0 {
		config.Scenarios = defaultConfig.Scenarios
	}
	if config.Title == "" {
		config.Title = defaultConfig.Title
	}
	if config.Subtitle == "" {
		config.Subtitle = defaultConfig.Subtitle
	}
	if config.PrimaryButtonText == "" {
		config.PrimaryButtonText = defaultConfig.PrimaryButtonText
	}
	if config.PrimaryButtonLink == "" {
		config.PrimaryButtonLink = defaultConfig.PrimaryButtonLink
	}
	if config.SecondaryButtonText == "" {
		config.SecondaryButtonText = defaultConfig.SecondaryButtonText
	}
	if config.SecondaryButtonLink == "" {
		config.SecondaryButtonLink = defaultConfig.SecondaryButtonLink
	}
	if config.BottomCTATitle == "" {
		config.BottomCTATitle = defaultConfig.BottomCTATitle
	}
	if config.BottomCTASubtitle == "" {
		config.BottomCTASubtitle = defaultConfig.BottomCTASubtitle
	}
	if config.BottomPrimaryText == "" {
		config.BottomPrimaryText = defaultConfig.BottomPrimaryText
	}
	if config.BottomPrimaryLink == "" {
		config.BottomPrimaryLink = defaultConfig.BottomPrimaryLink
	}
	if config.BottomSecondaryText == "" {
		config.BottomSecondaryText = defaultConfig.BottomSecondaryText
	}
	if config.BottomSecondaryLink == "" {
		config.BottomSecondaryLink = defaultConfig.BottomSecondaryLink
	}
}

func getHomeMarketingConfigResponse() string {
	common.OptionMapRWMutex.RLock()
	rawConfig := common.OptionMap["HomeMarketingConfig"]
	common.OptionMapRWMutex.RUnlock()

	config := defaultHomeMarketingConfig()
	if strings.TrimSpace(rawConfig) != "" {
		if err := common.UnmarshalJsonStr(rawConfig, &config); err != nil {
			common.SysError("failed to unmarshal HomeMarketingConfig: " + err.Error())
		}
	}
	normalizeHomeMarketingConfig(&config)
	jsonBytes, err := common.Marshal(config)
	if err != nil {
		common.SysError("failed to marshal HomeMarketingConfig: " + err.Error())
		fallbackBytes, fallbackErr := common.Marshal(defaultHomeMarketingConfig())
		if fallbackErr != nil {
			return "{}"
		}
		return string(fallbackBytes)
	}
	return string(jsonBytes)
}

func TestStatus(c *gin.Context) {
	err := model.PingDB()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"message": "数据库连接失败",
		})
		return
	}
	// 获取HTTP统计信息
	httpStats := middleware.GetStats()
	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"message":    "Server is running",
		"http_stats": httpStats,
	})
	return
}

func GetStatus(c *gin.Context) {

	cs := console_setting.GetConsoleSetting()
	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()

	passkeySetting := system_setting.GetPasskeySettings()
	legalSetting := system_setting.GetLegalSettings()

	data := gin.H{
		"version":                       common.Version,
		"start_time":                    common.StartTime,
		"email_verification":            common.EmailVerificationEnabled,
		"github_oauth":                  common.GitHubOAuthEnabled,
		"github_client_id":              common.GitHubClientId,
		"discord_oauth":                 system_setting.GetDiscordSettings().Enabled,
		"discord_client_id":             system_setting.GetDiscordSettings().ClientId,
		"linuxdo_oauth":                 common.LinuxDOOAuthEnabled,
		"linuxdo_client_id":             common.LinuxDOClientId,
		"linuxdo_minimum_trust_level":   common.LinuxDOMinimumTrustLevel,
		"telegram_oauth":                common.TelegramOAuthEnabled,
		"telegram_bot_name":             common.TelegramBotName,
		"system_name":                   common.SystemName,
		"logo":                          common.Logo,
		"footer_html":                   common.Footer,
		"wechat_qrcode":                 common.WeChatAccountQRCodeImageURL,
		"wechat_login":                  common.WeChatAuthEnabled,
		"server_address":                system_setting.ServerAddress,
		"turnstile_check":               common.TurnstileCheckEnabled,
		"turnstile_site_key":            common.TurnstileSiteKey,
		"top_up_link":                   common.TopUpLink,
		"docs_link":                     operation_setting.GetGeneralSetting().DocsLink,
		"quota_per_unit":                common.QuotaPerUnit,
		"display_in_currency":           operation_setting.IsCurrencyDisplay(),
		"quota_display_type":            operation_setting.GetQuotaDisplayType(),
		"custom_currency_symbol":        operation_setting.GetGeneralSetting().CustomCurrencySymbol,
		"custom_currency_exchange_rate": operation_setting.GetGeneralSetting().CustomCurrencyExchangeRate,
		"enable_batch_update":           common.BatchUpdateEnabled,
		"enable_drawing":                common.DrawingEnabled,
		"enable_task":                   common.TaskEnabled,
		"enable_data_export":            common.DataExportEnabled,
		"data_export_default_time":      common.DataExportDefaultTime,
		"default_collapse_sidebar":      common.DefaultCollapseSidebar,
		"mj_notify_enabled":             setting.MjNotifyEnabled,
		"chats":                         setting.Chats,
		"demo_site_enabled":             operation_setting.DemoSiteEnabled,
		"self_use_mode_enabled":         operation_setting.SelfUseModeEnabled,
		"default_use_auto_group":        setting.DefaultUseAutoGroup,

		"usd_exchange_rate": operation_setting.USDExchangeRate,
		"price":             operation_setting.Price,
		"stripe_unit_price": setting.StripeUnitPrice,

		"api_info_enabled":      cs.ApiInfoEnabled,
		"uptime_kuma_enabled":   cs.UptimeKumaEnabled,
		"announcements_enabled": cs.AnnouncementsEnabled,
		"faq_enabled":           cs.FAQEnabled,

		"HeaderNavModules":    common.OptionMap["HeaderNavModules"],
		"SidebarModulesAdmin": common.OptionMap["SidebarModulesAdmin"],

		"oidc_enabled":                system_setting.GetOIDCSettings().Enabled,
		"oidc_client_id":              system_setting.GetOIDCSettings().ClientId,
		"oidc_authorization_endpoint": system_setting.GetOIDCSettings().AuthorizationEndpoint,
		"passkey_login":               passkeySetting.Enabled,
		"passkey_display_name":        passkeySetting.RPDisplayName,
		"passkey_rp_id":               passkeySetting.RPID,
		"passkey_origins":             passkeySetting.Origins,
		"passkey_allow_insecure":      passkeySetting.AllowInsecureOrigin,
		"passkey_user_verification":   passkeySetting.UserVerification,
		"passkey_attachment":          passkeySetting.AttachmentPreference,
		"setup":                       constant.Setup,
		"user_agreement_enabled":      legalSetting.UserAgreement != "",
		"privacy_policy_enabled":      legalSetting.PrivacyPolicy != "",
		"checkin_enabled":             operation_setting.GetCheckinSetting().Enabled,
		"maintenance":                 system_setting.GetMaintenancePublicInfo(),
	}

	if cs.ApiInfoEnabled {
		data["api_info"] = console_setting.GetApiInfo()
	}
	if cs.AnnouncementsEnabled {
		data["announcements"] = console_setting.GetAnnouncements()
	}
	if cs.FAQEnabled {
		data["faq"] = console_setting.GetFAQ()
	}

	customProviders := oauth.GetEnabledCustomProviders()
	if len(customProviders) > 0 {
		type CustomOAuthInfo struct {
			Id                    int    `json:"id"`
			Name                  string `json:"name"`
			Slug                  string `json:"slug"`
			Icon                  string `json:"icon"`
			ClientId              string `json:"client_id"`
			AuthorizationEndpoint string `json:"authorization_endpoint"`
			Scopes                string `json:"scopes"`
		}
		providersInfo := make([]CustomOAuthInfo, 0, len(customProviders))
		for _, p := range customProviders {
			config := p.GetConfig()
			providersInfo = append(providersInfo, CustomOAuthInfo{
				Id:                    config.Id,
				Name:                  config.Name,
				Slug:                  config.Slug,
				Icon:                  config.Icon,
				ClientId:              config.ClientId,
				AuthorizationEndpoint: config.AuthorizationEndpoint,
				Scopes:                config.Scopes,
			})
		}
		data["custom_oauth_providers"] = providersInfo
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    data,
	})
	return
}

func GetNotice(c *gin.Context) {
	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    common.OptionMap["Notice"],
	})
	return
}

func GetAbout(c *gin.Context) {
	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    common.OptionMap["About"],
	})
	return
}

func GetUserAgreement(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    system_setting.GetLegalSettings().UserAgreement,
	})
	return
}

func GetPrivacyPolicy(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    system_setting.GetLegalSettings().PrivacyPolicy,
	})
	return
}

func GetMidjourney(c *gin.Context) {
	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    common.OptionMap["Midjourney"],
	})
	return
}

func GetHomePageContent(c *gin.Context) {
	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    common.OptionMap["HomePageContent"],
	})
	return
}

func GetHomeMarketingConfig(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    getHomeMarketingConfigResponse(),
	})
	return
}
