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
      description: '获取密钥、查看接入方式，快速完成 API 对接。',
      button_text: '获取密钥',
      link: '/console',
    },
    {
      title: '我是普通用户',
      description: '直接开始聊天体验，感受模型效果后再决定是否升级。',
      button_text: '开始体验',
      link: '/console',
    },
    {
      title: '我是群主',
      description: '结合 QQ 群机器人玩法，做签到、红包与更多互动运营。',
      button_text: '进入控制台',
      link: '/console',
    },
  ],
  scenarios: [
    {
      title: 'API 接入',
      description: '统一模型入口，减少切换不同上游时的接入成本。',
      button_text: '获取密钥',
      link: '/console',
    },
    {
      title: '在线聊天',
      description: '先体验常用模型效果，再决定是否充值或长期使用。',
      button_text: '立即体验',
      link: '/console',
    },
    {
      title: '社群玩法',
      description: '支持群机器人活动与运营场景，适合做活跃和转化。',
      button_text: '进入后台',
      link: '/console',
    },
  ],
  show_default_providers: true,
  bottom_cta_title: '先领取试用额度，再决定是否升级',
  bottom_cta_subtitle:
    '把首页做成真正的转化入口，让新用户更快理解价值、开始体验并完成付费。',
  bottom_primary_text: '免费开始',
  bottom_primary_link: '/register',
  bottom_secondary_text: '进入控制台',
  bottom_secondary_link: '/console',
};

const normalizeMarketingConfig = (config = {}) => ({
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
});

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
  const serverAddress =
    statusState?.status?.server_address || `${window.location.origin}`;
  const endpointItems = API_ENDPOINTS.map((e) => ({ value: e }));
  const [endpointIndex, setEndpointIndex] = useState(0);
  const isChinese = i18n.language.startsWith('zh');

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
    const [contentRes, marketingRes] = await Promise.all([
      API.get('/api/home_page_content'),
      API.get('/api/home_marketing_config'),
    ]);

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
    <div className='mt-12 md:mt-16 lg:mt-20 w-full'>
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
      <div className='w-full border-b border-semi-color-border min-h-[560px] md:min-h-[660px] relative overflow-x-hidden'>
        <div className='blur-ball blur-ball-indigo' />
        <div className='blur-ball blur-ball-teal' />
        <div className='flex items-center justify-center h-full px-4 py-20 md:py-24 lg:py-32 mt-10'>
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

            <div className='flex flex-row gap-4 justify-center items-center flex-wrap'>
              <Button
                theme='solid'
                type='primary'
                size={isMobile ? 'default' : 'large'}
                className='!rounded-3xl px-8 py-2'
                icon={<IconPlay />}
                onClick={() => openLink(homeMarketingConfig.primary_button_link)}
              >
                {homeMarketingConfig.primary_button_text}
              </Button>
              {homeMarketingConfig.secondary_button_text ? (
                <Button
                  size={isMobile ? 'default' : 'large'}
                  className='flex items-center !rounded-3xl px-6 py-2'
                  icon={docsLink ? <IconFile /> : <IconGithubLogo />}
                  onClick={() =>
                    openLink(
                      homeMarketingConfig.secondary_button_link ||
                        docsLink ||
                        'https://github.com/QuantumNous/new-api',
                    )
                  }
                >
                  {homeMarketingConfig.secondary_button_text}
                </Button>
              ) : null}
            </div>

            {homeMarketingConfig.show_default_providers
              ? renderProviderIcons()
              : null}
          </div>
        </div>
      </div>

      <div className='max-w-6xl mx-auto px-4 py-10 md:py-16'>
        <div className='text-center mb-8 md:mb-10'>
          <Text className='text-2xl md:text-3xl font-semibold'>
            {t('快速开始')}
          </Text>
          <div className='text-semi-color-text-2 mt-2'>
            {t('根据你的使用场景，直接进入合适的入口')}
          </div>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6'>
          {homeMarketingConfig.quick_starts.map((item, index) => (
            <Card key={index} shadows='hover' className='rounded-2xl'>
              <div className='flex flex-col gap-4 h-full'>
                <div>
                  <div className='text-xl font-semibold text-semi-color-text-0'>
                    {item.title}
                  </div>
                  <div className='text-semi-color-text-2 mt-2 min-h-[48px]'>
                    {item.description}
                  </div>
                </div>
                <Button
                  theme='solid'
                  type='tertiary'
                  onClick={() => openLink(item.link)}
                >
                  {item.button_text}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className='max-w-6xl mx-auto px-4 pb-10 md:pb-16'>
        <div className='text-center mb-8 md:mb-10'>
          <Text className='text-2xl md:text-3xl font-semibold'>
            {t('常见使用场景')}
          </Text>
          <div className='text-semi-color-text-2 mt-2'>
            {t('把首页从信息展示页升级成真正的转化入口')}
          </div>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6'>
          {homeMarketingConfig.scenarios.map((item, index) => (
            <Card key={index} shadows='hover' className='rounded-2xl'>
              <div className='flex flex-col gap-4 h-full'>
                <div>
                  <div className='text-xl font-semibold text-semi-color-text-0'>
                    {item.title}
                  </div>
                  <div className='text-semi-color-text-2 mt-2 min-h-[48px]'>
                    {item.description}
                  </div>
                </div>
                <Button onClick={() => openLink(item.link)}>
                  {item.button_text}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className='max-w-6xl mx-auto px-4 pb-16'>
        <Card className='rounded-3xl' bordered={false}>
          <div className='flex flex-col md:flex-row items-center justify-between gap-6'>
            <div className='max-w-3xl'>
              <div className='text-2xl md:text-3xl font-semibold text-semi-color-text-0'>
                {homeMarketingConfig.bottom_cta_title}
              </div>
              <div className='text-semi-color-text-2 mt-3'>
                {homeMarketingConfig.bottom_cta_subtitle}
              </div>
            </div>
            <div className='flex flex-wrap gap-3 justify-center'>
              <Button
                theme='solid'
                type='primary'
                size='large'
                onClick={() => openLink(homeMarketingConfig.bottom_primary_link)}
              >
                {homeMarketingConfig.bottom_primary_text}
              </Button>
              <Button
                size='large'
                onClick={() =>
                  openLink(homeMarketingConfig.bottom_secondary_link)
                }
              >
                {homeMarketingConfig.bottom_secondary_text}
              </Button>
            </div>
          </div>
        </Card>
      </div>
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
