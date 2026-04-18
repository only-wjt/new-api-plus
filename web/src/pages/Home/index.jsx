/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Typography,
  Input,
  ScrollList,
  ScrollItem,
  Card,
  Tag,
  Space,
} from '@douyinfe/semi-ui';
import { API, showError, copy, showSuccess } from '../../helpers';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import { API_ENDPOINTS } from '../../constants/common.constant';
import { StatusContext } from '../../context/Status';
import { useActualTheme } from '../../context/Theme';
import { marked } from 'marked';
import { useTranslation } from 'react-i18next';
import {
  IconGithubLogo,
  IconPlay,
  IconFile,
  IconCopy,
} from '@douyinfe/semi-icons';
import { Link } from 'react-router-dom';
import NoticeModal from '../../components/layout/NoticeModal';
import {
  Moonshot,
  OpenAI,
  XAI,
  Zhipu,
  Volcengine,
  Cohere,
  Claude,
  Gemini,
  Suno,
  Minimax,
  Wenxin,
  Spark,
  Qingyan,
  DeepSeek,
  Qwen,
  Midjourney,
  Grok,
  AzureAI,
  Hunyuan,
  Xinference,
} from '@lobehub/icons';

const { Text } = Typography;

// 数字滚动动画组件
const AnimatedNumber = ({ value }) => {
  const [display, setDisplay] = React.useState(0);
  React.useEffect(() => {
    if (value <= 0) return;
    const duration = 1200;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display.toLocaleString()}+</span>;
};

const DEFAULT_HOME_MARKETING_CONFIG = {
  enabled: true,
  announcement: 'AI API / 在线体验 / 群机器人',
  title: '一个入口，快速开始你的 AI 能力体验',
  subtitle:
    '支持 API 接入、在线聊天体验与 QQ 群机器人玩法，帮助开发者、普通用户和群主都能快速找到自己的使用路径。',
  primary_button_text: '立即体验',
  primary_button_link: '/console',
  secondary_button_text: '查看文档',
  secondary_button_link: '/docs',
  benefits: [
    '统一接入多模型，切换更省心',
    '支持在线体验，先试再接入',
    '适合开发者、普通用户和社群运营',
  ],
  quick_starts: [
    {
      title: '我是开发者',
      description: '获取 API 密钥，查看接入文档，快速完成对接。',
      button_text: '获取密钥',
      link: '/console/token',
    },
    {
      title: '我是普通用户',
      description: '直接开始对话体验，感受 AI 模型效果。',
      button_text: '开始体验',
      link: '/console/playground',
    },
  ],
  scenarios: [
    {
      title: 'API 接入',
      description: '统一模型入口，减少切换不同上游时的接入成本。',
      button_text: '获取密钥',
      link: '/console/token',
    },
    {
      title: '在线聊天',
      description: '先体验常用模型效果，再决定是否充值。',
      button_text: '立即体验',
      link: '/console/playground',
    },
  ],
  show_default_providers: true,
  show_stats: true,
  bottom_cta_title: '加入社群，免费领取体验额度',
  bottom_cta_subtitle:
    '注册账号后加入 QQ 群绑定即可获得免费额度，每日签到还能持续领取，立即开始你的 AI 体验之旅。',
  bottom_primary_text: '加入 QQ 群',
  bottom_primary_link: 'https://qm.qq.com/q/wT4W0Klk1U',
  bottom_secondary_text: '进入控制台',
  bottom_secondary_link: '/console',
  onboarding: {
    enabled: true,
    title: '🎁 注册即可领取免费体验额度',
    subtitle:
      '加入我们的 QQ 群，绑定你的网站账号，即可领取免费额度开始体验',
    qq_group_link: 'https://qm.qq.com/q/wT4W0Klk1U',
    steps: [
      '注册网站账号',
      '加入 QQ 群',
      '群内发送 /绑定 你的站内ID',
      '自动获得免费额度',
    ],
    button_text: '加入 QQ 群领取',
    features: [
      '每日签到：发送 /签到 即可领取额度',
      '额度红包：群内不定期发放，/抢红包 参与',
      '惊喜日：每周消费榜前三可享额度减免',
      '余额查询：发送 /查询余额 随时掌握',
    ],
  },
};

const normalizeMarketingConfig = (config = {}) => {
  const defaultOnboarding = DEFAULT_HOME_MARKETING_CONFIG.onboarding;
  const rawOnboarding = config.onboarding || {};
  return {
    ...DEFAULT_HOME_MARKETING_CONFIG,
    ...config,
    benefits:
      Array.isArray(config.benefits) && config.benefits.length > 0
        ? config.benefits
        : DEFAULT_HOME_MARKETING_CONFIG.benefits,
    quick_starts:
      Array.isArray(config.quick_starts) && config.quick_starts.length > 0
        ? config.quick_starts
        : DEFAULT_HOME_MARKETING_CONFIG.quick_starts,
    scenarios:
      Array.isArray(config.scenarios) && config.scenarios.length > 0
        ? config.scenarios
        : DEFAULT_HOME_MARKETING_CONFIG.scenarios,
    onboarding: {
      ...defaultOnboarding,
      ...rawOnboarding,
      steps:
        Array.isArray(rawOnboarding.steps) && rawOnboarding.steps.length > 0
          ? rawOnboarding.steps
          : defaultOnboarding.steps,
      features:
        Array.isArray(rawOnboarding.features) &&
        rawOnboarding.features.length > 0
          ? rawOnboarding.features
          : defaultOnboarding.features,
    },
  };
};

const Home = () => {
  const { t, i18n } = useTranslation();
  const [statusState] = useContext(StatusContext);
  const actualTheme = useActualTheme();
  const [homePageContentLoaded, setHomePageContentLoaded] = useState(false);
  const [homePageContent, setHomePageContent] = useState('');
  const [homeMarketingConfig, setHomeMarketingConfig] = useState(
    DEFAULT_HOME_MARKETING_CONFIG,
  );
  const [noticeVisible, setNoticeVisible] = useState(false);
  const isMobile = useIsMobile();
  const isDemoSiteMode = statusState?.status?.demo_site_enabled || false;
  const docsLink = statusState?.status?.docs_link || '';
  const homeStatsEnabled = statusState?.status?.home_stats_enabled !== false;
  const serverAddress =
    statusState?.status?.server_address || `${window.location.origin}`;
  const endpointItems = API_ENDPOINTS.map((e) => ({ value: e }));
  const [endpointIndex, setEndpointIndex] = useState(0);
  const isChinese = i18n.language.startsWith('zh');
  const [homeStats, setHomeStats] = useState({ user_count: 0, channel_count: 0, model_count: 0 });

  const providerIcons = useMemo(
    () => [
      <Moonshot size={40} key='moonshot' />,
      <OpenAI size={40} key='openai' />,
      <XAI size={40} key='xai' />,
      <Zhipu.Color size={40} key='zhipu' />,
      <Volcengine.Color size={40} key='volcengine' />,
      <Cohere.Color size={40} key='cohere' />,
      <Claude.Color size={40} key='claude' />,
      <Gemini.Color size={40} key='gemini' />,
      <Suno size={40} key='suno' />,
      <Minimax.Color size={40} key='minimax' />,
      <Wenxin.Color size={40} key='wenxin' />,
      <Spark.Color size={40} key='spark' />,
      <Qingyan.Color size={40} key='qingyan' />,
      <DeepSeek.Color size={40} key='deepseek' />,
      <Qwen.Color size={40} key='qwen' />,
      <Midjourney size={40} key='midjourney' />,
      <Grok size={40} key='grok' />,
      <AzureAI.Color size={40} key='azure' />,
      <Hunyuan.Color size={40} key='hunyuan' />,
      <Xinference size={40} key='xinference' />,
    ],
    [],
  );

  const openLink = (link) => {
    if (!link) {
      return;
    }
    if (link.startsWith('http://') || link.startsWith('https://')) {
      window.open(link, '_blank');
      return;
    }
    window.location.href = link;
  };

  const displayHomePageContent = async () => {
    setHomePageContent(localStorage.getItem('home_page_content') || '');
    const [contentRes, marketingRes, statsRes] = await Promise.all([
      API.get('/api/home_page_content'),
      API.get('/api/home_marketing_config'),
      // 静默获取统计数据，接口失败时不弹错误
      API.get('/api/home_stats', { skipErrorHandler: true }).then(res => res.data).catch(() => ({ success: false })),
    ]);

    // 处理统计数据
    if (statsRes?.success) {
      setHomeStats(statsRes.data);
    }

    const { success, message, data } = contentRes.data;
    if (success) {
      let content = data;
      if (!data.startsWith('https://')) {
        content = marked.parse(data);
      }
      setHomePageContent(content);
      localStorage.setItem('home_page_content', content);

      if (data.startsWith('https://')) {
        const iframe = document.querySelector('iframe');
        if (iframe) {
          iframe.onload = () => {
            iframe.contentWindow.postMessage({ themeMode: actualTheme }, '*');
            iframe.contentWindow.postMessage({ lang: i18n.language }, '*');
          };
        }
      }
    } else {
      showError(message);
      setHomePageContent('加载首页内容失败...');
    }

    const {
      success: marketingSuccess,
      message: marketingMessage,
      data: marketingData,
    } = marketingRes.data;
    if (marketingSuccess) {
      try {
        const parsedConfig = JSON.parse(marketingData || '{}');
        setHomeMarketingConfig(normalizeMarketingConfig(parsedConfig));
      } catch (error) {
        showError(t('首页营销配置解析失败'));
        setHomeMarketingConfig(DEFAULT_HOME_MARKETING_CONFIG);
      }
    } else {
      showError(marketingMessage);
      setHomeMarketingConfig(DEFAULT_HOME_MARKETING_CONFIG);
    }

    setHomePageContentLoaded(true);
  };

  const handleCopyBaseURL = async () => {
    const ok = await copy(serverAddress);
    if (ok) {
      showSuccess(t('已复制到剪切板'));
    }
  };

  useEffect(() => {
    const checkNoticeAndShow = async () => {
      const lastCloseDate = localStorage.getItem('notice_close_date');
      const today = new Date().toDateString();
      if (lastCloseDate !== today) {
        try {
          const res = await API.get('/api/notice');
          const { success, data } = res.data;
          if (success && data && data.trim() !== '') {
            setNoticeVisible(true);
          }
        } catch (error) {
          console.error('获取公告失败:', error);
        }
      }
    };

    checkNoticeAndShow();
  }, []);

  useEffect(() => {
    displayHomePageContent().then();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setEndpointIndex((prev) => (prev + 1) % endpointItems.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [endpointItems.length]);

  const renderProviderIcons = () => (
    <div className='mt-4 md:mt-6 lg:mt-8 w-full'>
      <div className='flex items-center mb-6 md:mb-8 justify-center'>
        <Text
          type='tertiary'
          className='text-lg md:text-xl lg:text-2xl font-light'
        >
          {t('支持众多的大模型供应商')}
        </Text>
      </div>
      <div className='flex flex-wrap items-center justify-center gap-3 sm:gap-4 md:gap-6 lg:gap-8 max-w-5xl mx-auto px-4'>
        {providerIcons.map((icon, index) => (
          <div
            key={index}
            className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center'
          >
            {icon}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStructuredHome = () => (
    <div className='w-full overflow-x-hidden'>
      <div className='w-full relative overflow-x-hidden'>
        <div className='blur-ball blur-ball-indigo' />
        <div className='blur-ball blur-ball-teal' />
        <div className='flex items-center justify-center h-full px-4 pt-14 pb-8 md:pt-18 md:pb-10 lg:pt-24 lg:pb-12 mt-10'>
          <div className='flex flex-col items-center justify-center text-center max-w-5xl mx-auto w-full'>
            {homeMarketingConfig.announcement ? (
              <Tag color='light-blue' size='large'>
                {homeMarketingConfig.announcement}
              </Tag>
            ) : null}
            <div className='flex flex-col items-center justify-center mt-6 mb-6 md:mb-8'>
              <h1
                className={`text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-semi-color-text-0 leading-tight ${isChinese ? 'tracking-wide md:tracking-wider' : ''}`}
              >
                {homeMarketingConfig.title}
              </h1>
              <p className='text-base md:text-lg lg:text-xl text-semi-color-text-1 mt-4 md:mt-6 max-w-3xl'>
                {homeMarketingConfig.subtitle}
              </p>
              <Space wrap className='justify-center mt-6'>
                {homeMarketingConfig.benefits.map((benefit, index) => (
                  <Tag key={index} color='cyan' shape='circle'>
                    {benefit}
                  </Tag>
                ))}
              </Space>
              <div className='flex flex-col md:flex-row items-center justify-center gap-4 w-full mt-6 max-w-md'>
                <Input
                  readonly
                  value={serverAddress}
                  className='flex-1 !rounded-full'
                  size={isMobile ? 'default' : 'large'}
                  suffix={
                    <div className='flex items-center gap-2'>
                      <ScrollList
                        bodyHeight={32}
                        style={{ border: 'unset', boxShadow: 'unset' }}
                      >
                        <ScrollItem
                          mode='wheel'
                          cycled={true}
                          list={endpointItems}
                          selectedIndex={endpointIndex}
                          onSelect={({ index }) => setEndpointIndex(index)}
                        />
                      </ScrollList>
                      <Button
                        type='primary'
                        onClick={handleCopyBaseURL}
                        icon={<IconCopy />}
                        className='!rounded-full'
                      />
                    </div>
                  }
                />
              </div>
            </div>
            {/* 身份选择卡片 — 替代原来的按钮和独立的快速开始/场景区 */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-3xl mx-auto mt-2'>
              {homeMarketingConfig.quick_starts.map((item, index) => {
                const icons = ['🔑', '💬'];
                return (
                  <Card
                    key={index}
                    shadows='hover'
                    className='rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.02]'
                    onClick={() => openLink(item.link)}
                    bodyStyle={{ padding: isMobile ? '16px' : '24px' }}
                  >
                    <div className='flex flex-col gap-3'>
                      <div className='text-2xl'>
                        {icons[index % icons.length]}
                      </div>
                      <div className='text-lg font-semibold text-semi-color-text-0'>
                        {item.title}
                      </div>
                      <div className='text-semi-color-text-2 text-sm'>
                        {item.description}
                      </div>
                      <Button
                        theme='solid'
                        type='tertiary'
                        className='mt-1'
                        onClick={(e) => {
                          e.stopPropagation();
                          openLink(item.link);
                        }}
                      >
                        {item.button_text}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* 查看文档链接 */}
            {homeMarketingConfig.secondary_button_text ? (
              <div className='flex justify-center mt-4'>
                <Button
                  theme='solid'
                  type='primary'
                  size='large'
                  icon={<IconFile />}
                  className='!rounded-3xl px-10 py-3'
                  onClick={() => {
                    const link = homeMarketingConfig.secondary_button_link;
                    const resolvedLink =
                      !link || link === '/docs' ? docsLink : link;
                    openLink(
                      resolvedLink ||
                        'https://github.com/QuantumNous/new-api',
                    );
                  }}
                >
                  {homeMarketingConfig.secondary_button_text}
                </Button>
              </div>
            ) : null}

            {/* 实时数据看板 */}
            {homeStatsEnabled ? (
              <div
                className='flex flex-wrap justify-center gap-8 md:gap-16 mt-6 mb-2 px-8 py-4 rounded-2xl'
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(139,92,246,0.06) 50%, rgba(236,72,153,0.06) 100%)',
                  border: '1px solid rgba(var(--semi-blue-5), 0.15)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {[
                  { value: homeStats.user_count, label: t('注册用户'), icon: '👥' },
                  { value: homeStats.model_count, label: t('支持模型'), icon: '🤖' },
                  { value: homeStats.channel_count, label: t('接入渠道'), icon: '🚀' },
                ].map((stat, index) => (
                  <div key={index} className='flex flex-col items-center gap-1'>
                    <div className='text-2xl md:text-3xl font-bold' style={{ color: 'var(--semi-color-primary)' }}>
                      {stat.icon}{' '}
                      <AnimatedNumber value={stat.value} />
                    </div>
                    <div className='text-sm text-semi-color-text-2'>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 加群领额度引导区块 */}
      {homeMarketingConfig.onboarding?.enabled ? (
        <div className='max-w-6xl mx-auto px-4 pt-6 md:pt-10 pb-4 md:pb-6'>
          <Card
            className='rounded-3xl overflow-hidden'
            bordered={false}
            style={{
              background:
                'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.08) 50%, rgba(236,72,153,0.08) 100%)',
            }}
          >
            <div className='py-4 md:py-8'>
              <div className='text-center mb-8 md:mb-10'>
                <div className='text-2xl md:text-3xl font-bold text-semi-color-text-0'>
                  {homeMarketingConfig.onboarding.title}
                </div>
                <div className='text-semi-color-text-2 mt-3 text-base md:text-lg'>
                  {homeMarketingConfig.onboarding.subtitle}
                </div>
              </div>

              {/* 步骤条 */}
              <div className='flex flex-col md:flex-row items-start md:items-center justify-center gap-4 md:gap-2 mb-8 md:mb-10 px-4'>
                {(homeMarketingConfig.onboarding.steps || []).map(
                  (step, index, arr) => (
                    <React.Fragment key={index}>
                      <div className='flex items-center gap-3'>
                        <div
                          className='flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm'
                          style={{
                            background:
                              'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                          }}
                        >
                          {index + 1}
                        </div>
                        <Text className='text-sm md:text-base font-medium whitespace-nowrap'>
                          {step}
                        </Text>
                      </div>
                      {index < arr.length - 1 && (
                        <div className='hidden md:block w-8 lg:w-12 h-px bg-semi-color-border flex-shrink-0' />
                      )}
                    </React.Fragment>
                  ),
                )}
              </div>

              {/* 特色玩法卡片 */}
              {(homeMarketingConfig.onboarding.features || []).length > 0 && (
                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8 md:mb-10 px-4'>
                  {homeMarketingConfig.onboarding.features.map(
                    (feature, index) => {
                      const featureEmojis = [
                        '📝',
                        '🧧',
                        '🎉',
                        '💰',
                      ];
                      return (
                        <Card
                          key={index}
                          shadows='hover'
                          className='rounded-xl'
                          bodyStyle={{ padding: '16px' }}
                        >
                          <div className='text-2xl mb-2'>
                            {featureEmojis[index % featureEmojis.length]}
                          </div>
                          <Text className='text-sm text-semi-color-text-1'>
                            {feature}
                          </Text>
                        </Card>
                      );
                    },
                  )}
                </div>
              )}

              {/* CTA按钮 */}
              {homeMarketingConfig.onboarding.qq_group_link && (
                <div className='flex justify-center'>
                  <Button
                    theme='solid'
                    type='primary'
                    size='large'
                    className='!rounded-3xl px-10 py-3'
                    onClick={() =>
                      openLink(homeMarketingConfig.onboarding.qq_group_link)
                    }
                  >
                    {homeMarketingConfig.onboarding.button_text}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      ) : null}

      {/* 供应商图标区 — 放在底部CTA之前 */}
      {homeMarketingConfig.show_default_providers
        ? renderProviderIcons()
        : null}

    </div>
  );

  const renderDefaultHome = () => (
    <div className='w-full overflow-x-hidden'>
      <div className='w-full border-b border-semi-color-border min-h-[500px] md:min-h-[600px] lg:min-h-[700px] relative overflow-x-hidden'>
        <div className='blur-ball blur-ball-indigo' />
        <div className='blur-ball blur-ball-teal' />
        <div className='flex items-center justify-center h-full px-4 py-20 md:py-24 lg:py-32 mt-10'>
          <div className='flex flex-col items-center justify-center text-center max-w-4xl mx-auto'>
            <div className='flex flex-col items-center justify-center mb-6 md:mb-8'>
              <h1
                className={`text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-semi-color-text-0 leading-tight ${isChinese ? 'tracking-wide md:tracking-wider' : ''}`}
              >
                <>
                  {t('统一的')}
                  <br />
                  <span className='shine-text'>{t('大模型接口网关')}</span>
                </>
              </h1>
              <p className='text-base md:text-lg lg:text-xl text-semi-color-text-1 mt-4 md:mt-6 max-w-xl'>
                {t('更好的价格，更好的稳定性，只需要将模型基址替换为：')}
              </p>
              <div className='flex flex-col md:flex-row items-center justify-center gap-4 w-full mt-4 md:mt-6 max-w-md'>
                <Input
                  readonly
                  value={serverAddress}
                  className='flex-1 !rounded-full'
                  size={isMobile ? 'default' : 'large'}
                  suffix={
                    <div className='flex items-center gap-2'>
                      <ScrollList
                        bodyHeight={32}
                        style={{ border: 'unset', boxShadow: 'unset' }}
                      >
                        <ScrollItem
                          mode='wheel'
                          cycled={true}
                          list={endpointItems}
                          selectedIndex={endpointIndex}
                          onSelect={({ index }) => setEndpointIndex(index)}
                        />
                      </ScrollList>
                      <Button
                        type='primary'
                        onClick={handleCopyBaseURL}
                        icon={<IconCopy />}
                        className='!rounded-full'
                      />
                    </div>
                  }
                />
              </div>
            </div>

            <div className='flex flex-row gap-4 justify-center items-center'>
              <Link to='/console'>
                <Button
                  theme='solid'
                  type='primary'
                  size={isMobile ? 'default' : 'large'}
                  className='!rounded-3xl px-8 py-2'
                  icon={<IconPlay />}
                >
                  {t('获取密钥')}
                </Button>
              </Link>
              {isDemoSiteMode && statusState?.status?.version ? (
                <Button
                  size={isMobile ? 'default' : 'large'}
                  className='flex items-center !rounded-3xl px-6 py-2'
                  icon={<IconGithubLogo />}
                  onClick={() =>
                    window.open(
                      'https://github.com/QuantumNous/new-api',
                      '_blank',
                    )
                  }
                >
                  {statusState.status.version}
                </Button>
              ) : (
                docsLink && (
                  <Button
                    size={isMobile ? 'default' : 'large'}
                    className='flex items-center !rounded-3xl px-6 py-2'
                    icon={<IconFile />}
                    onClick={() => window.open(docsLink, '_blank')}
                  >
                    {t('文档')}
                  </Button>
                )
              )}
            </div>

            {renderProviderIcons()}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className='w-full overflow-x-hidden'>
      <NoticeModal
        visible={noticeVisible}
        onClose={() => setNoticeVisible(false)}
        isMobile={isMobile}
      />
      {homePageContentLoaded && homeMarketingConfig.enabled
        ? renderStructuredHome()
        : homePageContentLoaded && homePageContent === ''
          ? renderDefaultHome()
          : (
            <div className='overflow-x-hidden w-full'>
              {homePageContent.startsWith('https://') ? (
                <iframe src={homePageContent} className='w-full h-screen border-none' />
              ) : (
                <div
                  className='mt-[60px]'
                  dangerouslySetInnerHTML={{ __html: homePageContent }}
                />
              )}
            </div>
          )}
    </div>
  );
};

export default Home;
