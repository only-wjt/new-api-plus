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

import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Banner,
  Button,
  Col,
  Form,
  Row,
  Modal,
  Space,
  Card,
} from '@douyinfe/semi-ui';
import { API, showError, showSuccess, timestamp2string } from '../../helpers';
import { marked } from 'marked';
import { useTranslation } from 'react-i18next';
import { StatusContext } from '../../context/Status';
import Text from '@douyinfe/semi-ui/lib/es/typography/text';

const LEGAL_USER_AGREEMENT_KEY = 'legal.user_agreement';
const LEGAL_PRIVACY_POLICY_KEY = 'legal.privacy_policy';
const HOME_MARKETING_CONFIG_KEY = 'HomeMarketingConfig';

const DEFAULT_HOME_MARKETING_CONFIG = {
  enabled: false,
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

const createDefaultMarketingItem = () => ({
  title: '',
  description: '',
  button_text: '',
  link: '',
});

const normalizeMarketingItem = (item = {}) => ({
  title: item.title || '',
  description: item.description || '',
  button_text: item.button_text || '',
  link: item.link || '',
});

const normalizeMarketingConfig = (raw = {}) => ({
  ...DEFAULT_HOME_MARKETING_CONFIG,
  ...raw,
  enabled: Boolean(raw.enabled),
  benefits: Array.from({ length: 3 }, (_, index) => raw.benefits?.[index] || ''),
  quick_starts: Array.from({ length: 3 }, (_, index) =>
    normalizeMarketingItem(raw.quick_starts?.[index]),
  ),
  scenarios: Array.from({ length: 3 }, (_, index) =>
    normalizeMarketingItem(raw.scenarios?.[index]),
  ),
  show_default_providers:
    raw.show_default_providers === undefined
      ? DEFAULT_HOME_MARKETING_CONFIG.show_default_providers
      : Boolean(raw.show_default_providers),
});

const serializeMarketingConfig = (config) =>
  JSON.stringify(
    {
      ...config,
      benefits: (config.benefits || []).map((item) => item.trim()),
      quick_starts: (config.quick_starts || []).map((item) => ({
        title: item.title.trim(),
        description: item.description.trim(),
        button_text: item.button_text.trim(),
        link: item.link.trim(),
      })),
      scenarios: (config.scenarios || []).map((item) => ({
        title: item.title.trim(),
        description: item.description.trim(),
        button_text: item.button_text.trim(),
        link: item.link.trim(),
      })),
    },
    null,
    2,
  );

const OtherSetting = () => {
  const { t } = useTranslation();
  let [inputs, setInputs] = useState({
    Notice: '',
    [LEGAL_USER_AGREEMENT_KEY]: '',
    [LEGAL_PRIVACY_POLICY_KEY]: '',
    SystemName: '',
    Logo: '',
    Footer: '',
    About: '',
    HomePageContent: '',
    [HOME_MARKETING_CONFIG_KEY]: serializeMarketingConfig(
      DEFAULT_HOME_MARKETING_CONFIG,
    ),
  });
  let [loading, setLoading] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [statusState] = useContext(StatusContext);
  const [updateData, setUpdateData] = useState({
    tag_name: '',
    content: '',
  });
  const [homeMarketingConfig, setHomeMarketingConfig] = useState(
    normalizeMarketingConfig(DEFAULT_HOME_MARKETING_CONFIG),
  );

  const updateOption = async (key, value) => {
    setLoading(true);
    const res = await API.put('/api/option/', {
      key,
      value,
    });
    const { success, message } = res.data;
    if (success) {
      setInputs((inputs) => ({ ...inputs, [key]: value }));
    } else {
      showError(message);
    }
    setLoading(false);
  };

  const [loadingInput, setLoadingInput] = useState({
    Notice: false,
    [LEGAL_USER_AGREEMENT_KEY]: false,
    [LEGAL_PRIVACY_POLICY_KEY]: false,
    SystemName: false,
    Logo: false,
    HomePageContent: false,
    HomeMarketingConfig: false,
    About: false,
    Footer: false,
    CheckUpdate: false,
  });
  const handleInputChange = async (value, e) => {
    const name = e.target.id;
    setInputs((inputs) => ({ ...inputs, [name]: value }));
  };

  const setMarketingConfigValue = (nextConfig) => {
    const normalized = normalizeMarketingConfig(nextConfig);
    const serialized = serializeMarketingConfig(normalized);
    setHomeMarketingConfig(normalized);
    setInputs((prev) => ({
      ...prev,
      [HOME_MARKETING_CONFIG_KEY]: serialized,
    }));
  };

  const handleMarketingFieldChange = (field, value) => {
    setMarketingConfigValue({
      ...homeMarketingConfig,
      [field]: value,
    });
  };

  const handleMarketingBenefitChange = (index, value) => {
    const nextBenefits = [...homeMarketingConfig.benefits];
    nextBenefits[index] = value;
    setMarketingConfigValue({
      ...homeMarketingConfig,
      benefits: nextBenefits,
    });
  };

  const handleMarketingListItemChange = (field, index, key, value) => {
    const nextList = [...homeMarketingConfig[field]];
    nextList[index] = {
      ...nextList[index],
      [key]: value,
    };
    setMarketingConfigValue({
      ...homeMarketingConfig,
      [field]: nextList,
    });
  };

  const resetMarketingConfig = () => {
    setMarketingConfigValue(DEFAULT_HOME_MARKETING_CONFIG);
    showSuccess(t('已恢复首页营销默认模板'));
  };

  const submitHomeMarketingConfig = async () => {
    try {
      setLoadingInput((loadingInput) => ({
        ...loadingInput,
        HomeMarketingConfig: true,
      }));
      const serialized = serializeMarketingConfig(homeMarketingConfig);
      await updateOption(HOME_MARKETING_CONFIG_KEY, serialized);
      showSuccess(t('首页营销设置已更新'));
    } catch (error) {
      console.error('首页营销设置更新失败', error);
      showError(t('首页营销设置更新失败'));
    } finally {
      setLoadingInput((loadingInput) => ({
        ...loadingInput,
        HomeMarketingConfig: false,
      }));
    }
  };

  const renderMarketingEditor = (title, field) => (
    <Card style={{ marginTop: 16 }}>
      <Space vertical align='start' style={{ width: '100%' }} spacing='medium'>
        <Text strong>{title}</Text>
        {[0, 1, 2].map((index) => (
          <Card key={`${field}-${index}`} bodyStyle={{ padding: 16 }}>
            <Form.Input
              label={t('标题')}
              field={`${field}_${index}_title`}
              value={homeMarketingConfig[field][index]?.title || ''}
              onChange={(value) =>
                handleMarketingListItemChange(field, index, 'title', value)
              }
              placeholder={t('在此输入标题')}
            />
            <Form.Input
              label={t('描述')}
              field={`${field}_${index}_description`}
              value={homeMarketingConfig[field][index]?.description || ''}
              onChange={(value) =>
                handleMarketingListItemChange(field, index, 'description', value)
              }
              placeholder={t('在此输入描述')}
            />
            <Form.Input
              label={t('按钮文字')}
              field={`${field}_${index}_button_text`}
              value={homeMarketingConfig[field][index]?.button_text || ''}
              onChange={(value) =>
                handleMarketingListItemChange(field, index, 'button_text', value)
              }
              placeholder={t('在此输入按钮文字')}
            />
            <Form.Input
              label={t('跳转链接')}
              field={`${field}_${index}_link`}
              value={homeMarketingConfig[field][index]?.link || ''}
              onChange={(value) =>
                handleMarketingListItemChange(field, index, 'link', value)
              }
              placeholder={t('在此输入跳转链接')}
            />
          </Card>
        ))}
      </Space>
    </Card>
  );

  const formAPISettingGeneral = useRef();
  const submitNotice = async () => {
    try {
      setLoadingInput((loadingInput) => ({ ...loadingInput, Notice: true }));
      await updateOption('Notice', inputs.Notice);
      showSuccess(t('公告已更新'));
    } catch (error) {
      console.error(t('公告更新失败'), error);
      showError(t('公告更新失败'));
    } finally {
      setLoadingInput((loadingInput) => ({ ...loadingInput, Notice: false }));
    }
  };
  const submitUserAgreement = async () => {
    try {
      setLoadingInput((loadingInput) => ({
        ...loadingInput,
        [LEGAL_USER_AGREEMENT_KEY]: true,
      }));
      await updateOption(
        LEGAL_USER_AGREEMENT_KEY,
        inputs[LEGAL_USER_AGREEMENT_KEY],
      );
      showSuccess(t('用户协议已更新'));
    } catch (error) {
      console.error(t('用户协议更新失败'), error);
      showError(t('用户协议更新失败'));
    } finally {
      setLoadingInput((loadingInput) => ({
        ...loadingInput,
        [LEGAL_USER_AGREEMENT_KEY]: false,
      }));
    }
  };
  const submitPrivacyPolicy = async () => {
    try {
      setLoadingInput((loadingInput) => ({
        ...loadingInput,
        [LEGAL_PRIVACY_POLICY_KEY]: true,
      }));
      await updateOption(
        LEGAL_PRIVACY_POLICY_KEY,
        inputs[LEGAL_PRIVACY_POLICY_KEY],
      );
      showSuccess(t('隐私政策已更新'));
    } catch (error) {
      console.error(t('隐私政策更新失败'), error);
      showError(t('隐私政策更新失败'));
    } finally {
      setLoadingInput((loadingInput) => ({
        ...loadingInput,
        [LEGAL_PRIVACY_POLICY_KEY]: false,
      }));
    }
  };
  const formAPIPersonalization = useRef();
  const submitSystemName = async () => {
    try {
      setLoadingInput((loadingInput) => ({
        ...loadingInput,
        SystemName: true,
      }));
      await updateOption('SystemName', inputs.SystemName);
      showSuccess(t('系统名称已更新'));
    } catch (error) {
      console.error(t('系统名称更新失败'), error);
      showError(t('系统名称更新失败'));
    } finally {
      setLoadingInput((loadingInput) => ({
        ...loadingInput,
        SystemName: false,
      }));
    }
  };

  const submitLogo = async () => {
    try {
      setLoadingInput((loadingInput) => ({ ...loadingInput, Logo: true }));
      await updateOption('Logo', inputs.Logo);
      showSuccess('Logo 已更新');
    } catch (error) {
      console.error('Logo 更新失败', error);
      showError('Logo 更新失败');
    } finally {
      setLoadingInput((loadingInput) => ({ ...loadingInput, Logo: false }));
    }
  };
  const submitOption = async (key) => {
    try {
      setLoadingInput((loadingInput) => ({
        ...loadingInput,
        [key]: true,
      }));
      await updateOption(key, inputs[key]);
      showSuccess('首页内容已更新');
    } catch (error) {
      console.error('首页内容更新失败', error);
      showError('首页内容更新失败');
    } finally {
      setLoadingInput((loadingInput) => ({
        ...loadingInput,
        [key]: false,
      }));
    }
  };
  const submitAbout = async () => {
    try {
      setLoadingInput((loadingInput) => ({ ...loadingInput, About: true }));
      await updateOption('About', inputs.About);
      showSuccess('关于内容已更新');
    } catch (error) {
      console.error('关于内容更新失败', error);
      showError('关于内容更新失败');
    } finally {
      setLoadingInput((loadingInput) => ({ ...loadingInput, About: false }));
    }
  };
  const submitFooter = async () => {
    try {
      setLoadingInput((loadingInput) => ({ ...loadingInput, Footer: true }));
      await updateOption('Footer', inputs.Footer);
      showSuccess('页脚内容已更新');
    } catch (error) {
      console.error('页脚内容更新失败', error);
      showError('页脚内容更新失败');
    } finally {
      setLoadingInput((loadingInput) => ({ ...loadingInput, Footer: false }));
    }
  };

  const checkUpdate = async () => {
    try {
      setLoadingInput((loadingInput) => ({
        ...loadingInput,
        CheckUpdate: true,
      }));
      const res = await fetch(
        'https://api.github.com/repos/Calcium-Ion/new-api/releases/latest',
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'new-api-update-checker',
          },
        },
      ).then((response) => response.json());

      const { tag_name, body } = res;
      if (tag_name === statusState?.status?.version) {
        showSuccess(`已是最新版本：${tag_name}`);
      } else {
        setUpdateData({
          tag_name: tag_name,
          content: marked.parse(body),
        });
        setShowUpdateModal(true);
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      showError('检查更新失败，请稍后再试');
    } finally {
      setLoadingInput((loadingInput) => ({
        ...loadingInput,
        CheckUpdate: false,
      }));
    }
  };
  const getOptions = async () => {
    const res = await API.get('/api/option/');
    const { success, message, data } = res.data;
    if (success) {
      let newInputs = {};
      data.forEach((item) => {
        if (item.key in inputs) {
          newInputs[item.key] = item.value;
        }
      });
      const rawMarketingConfig =
        newInputs[HOME_MARKETING_CONFIG_KEY] ||
        serializeMarketingConfig(DEFAULT_HOME_MARKETING_CONFIG);
      let parsedMarketingConfig = DEFAULT_HOME_MARKETING_CONFIG;
      try {
        parsedMarketingConfig = rawMarketingConfig
          ? JSON.parse(rawMarketingConfig)
          : DEFAULT_HOME_MARKETING_CONFIG;
      } catch (error) {
        showError(t('首页营销配置解析失败'));
      }
      newInputs[HOME_MARKETING_CONFIG_KEY] = serializeMarketingConfig(
        normalizeMarketingConfig(parsedMarketingConfig),
      );
      setInputs((prev) => ({ ...prev, ...newInputs }));
      setHomeMarketingConfig(normalizeMarketingConfig(parsedMarketingConfig));
      formAPISettingGeneral.current.setValues(newInputs);
      formAPIPersonalization.current.setValues(newInputs);
    } else {
      showError(message);
    }
  };

  useEffect(() => {
    getOptions();
  }, []);

  const openGitHubRelease = () => {
    window.open(
      `https://github.com/Calcium-Ion/new-api/releases/tag/${updateData.tag_name}`,
      '_blank',
    );
  };

  const getStartTimeString = () => {
    const timestamp = statusState?.status?.start_time;
    return statusState.status ? timestamp2string(timestamp) : '';
  };

  return (
    <Row>
      <Col
        span={24}
        style={{
          marginTop: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <Form>
          <Card>
            <Form.Section text={t('系统信息')}>
              <Row>
                <Col span={16}>
                  <Space>
                    <Text>
                      {t('当前版本')}：
                      {statusState?.status?.version || t('未知')}
                    </Text>
                    <Button
                      type='primary'
                      onClick={checkUpdate}
                      loading={loadingInput['CheckUpdate']}
                    >
                      {t('检查更新')}
                    </Button>
                  </Space>
                </Col>
              </Row>
              <Row>
                <Col span={16}>
                  <Text>
                    {t('启动时间')}：{getStartTimeString()}
                  </Text>
                </Col>
              </Row>
            </Form.Section>
          </Card>
        </Form>
        <Form
          values={inputs}
          getFormApi={(formAPI) => (formAPISettingGeneral.current = formAPI)}
        >
          <Card>
            <Form.Section text={t('通用设置')}>
              <Form.TextArea
                label={t('公告')}
                placeholder={t(
                  '在此输入新的公告内容，支持 Markdown & HTML 代码',
                )}
                field={'Notice'}
                onChange={handleInputChange}
                style={{ fontFamily: 'JetBrains Mono, Consolas' }}
                autosize={{ minRows: 6, maxRows: 12 }}
              />
              <Button onClick={submitNotice} loading={loadingInput['Notice']}>
                {t('设置公告')}
              </Button>
              <Form.TextArea
                label={t('用户协议')}
                placeholder={t(
                  '在此输入用户协议内容，支持 Markdown & HTML 代码',
                )}
                field={LEGAL_USER_AGREEMENT_KEY}
                onChange={handleInputChange}
                style={{ fontFamily: 'JetBrains Mono, Consolas' }}
                autosize={{ minRows: 6, maxRows: 12 }}
                helpText={t(
                  '填写用户协议内容后，用户注册时将被要求勾选已阅读用户协议',
                )}
              />
              <Button
                onClick={submitUserAgreement}
                loading={loadingInput[LEGAL_USER_AGREEMENT_KEY]}
              >
                {t('设置用户协议')}
              </Button>
              <Form.TextArea
                label={t('隐私政策')}
                placeholder={t(
                  '在此输入隐私政策内容，支持 Markdown & HTML 代码',
                )}
                field={LEGAL_PRIVACY_POLICY_KEY}
                onChange={handleInputChange}
                style={{ fontFamily: 'JetBrains Mono, Consolas' }}
                autosize={{ minRows: 6, maxRows: 12 }}
                helpText={t(
                  '填写隐私政策内容后，用户注册时将被要求勾选已阅读隐私政策',
                )}
              />
              <Button
                onClick={submitPrivacyPolicy}
                loading={loadingInput[LEGAL_PRIVACY_POLICY_KEY]}
              >
                {t('设置隐私政策')}
              </Button>
            </Form.Section>
          </Card>
        </Form>
        <Form
          values={inputs}
          getFormApi={(formAPI) => (formAPIPersonalization.current = formAPI)}
        >
          <Card>
            <Form.Section text={t('个性化设置')}>
              <Form.Input
                label={t('系统名称')}
                placeholder={t('在此输入系统名称')}
                field={'SystemName'}
                onChange={handleInputChange}
              />
              <Button
                onClick={submitSystemName}
                loading={loadingInput['SystemName']}
              >
                {t('设置系统名称')}
              </Button>
              <Form.Input
                label={t('Logo 图片地址')}
                placeholder={t('在此输入 Logo 图片地址')}
                field={'Logo'}
                onChange={handleInputChange}
              />
              <Button onClick={submitLogo} loading={loadingInput['Logo']}>
                {t('设置 Logo')}
              </Button>
              <Form.TextArea
                label={t('首页内容')}
                placeholder={t(
                  '在此输入首页内容，支持 Markdown & HTML 代码，设置后首页的状态信息将不再显示。如果输入的是一个链接，则会使用该链接作为 iframe 的 src 属性，这允许你设置任意网页作为首页',
                )}
                field={'HomePageContent'}
                onChange={handleInputChange}
                style={{ fontFamily: 'JetBrains Mono, Consolas' }}
                autosize={{ minRows: 6, maxRows: 12 }}
              />
              <Button
                onClick={() => submitOption('HomePageContent')}
                loading={loadingInput['HomePageContent']}
              >
                {t('设置首页内容')}
              </Button>

              <Card style={{ marginTop: 16 }}>
                <Form.Section text={t('首页营销设置')}>
                  <Banner
                    fullMode={false}
                    type='info'
                    description={t(
                      '启用后首页将优先展示结构化营销页，未启用时继续使用首页内容或默认首页',
                    )}
                    closeIcon={null}
                    style={{ marginBottom: 16 }}
                  />
                  <Form.Switch
                    field='home_marketing_enabled'
                    label={t('启用首页营销页')}
                    checked={homeMarketingConfig.enabled}
                    onChange={(value) =>
                      handleMarketingFieldChange('enabled', value)
                    }
                  />
                  <Form.Switch
                    field='home_marketing_show_default_providers'
                    label={t('展示默认供应商 Logo 区')}
                    checked={homeMarketingConfig.show_default_providers}
                    onChange={(value) =>
                      handleMarketingFieldChange('show_default_providers', value)
                    }
                  />
                  <Form.Input
                    label={t('顶部标签')}
                    field='home_marketing_announcement'
                    value={homeMarketingConfig.announcement}
                    onChange={(value) =>
                      handleMarketingFieldChange('announcement', value)
                    }
                    placeholder={t('在此输入顶部标签')}
                  />
                  <Form.Input
                    label={t('主标题')}
                    field='home_marketing_title'
                    value={homeMarketingConfig.title}
                    onChange={(value) => handleMarketingFieldChange('title', value)}
                    placeholder={t('在此输入主标题')}
                  />
                  <Form.TextArea
                    label={t('副标题')}
                    field='home_marketing_subtitle'
                    value={homeMarketingConfig.subtitle}
                    onChange={(value) =>
                      handleMarketingFieldChange('subtitle', value)
                    }
                    placeholder={t('在此输入副标题')}
                    autosize={{ minRows: 3, maxRows: 6 }}
                  />
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Input
                        label={t('主按钮文案')}
                        field='home_marketing_primary_button_text'
                        value={homeMarketingConfig.primary_button_text}
                        onChange={(value) =>
                          handleMarketingFieldChange('primary_button_text', value)
                        }
                        placeholder={t('在此输入主按钮文案')}
                      />
                    </Col>
                    <Col span={12}>
                      <Form.Input
                        label={t('主按钮链接')}
                        field='home_marketing_primary_button_link'
                        value={homeMarketingConfig.primary_button_link}
                        onChange={(value) =>
                          handleMarketingFieldChange('primary_button_link', value)
                        }
                        placeholder={t('在此输入主按钮链接')}
                      />
                    </Col>
                  </Row>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Input
                        label={t('次按钮文案')}
                        field='home_marketing_secondary_button_text'
                        value={homeMarketingConfig.secondary_button_text}
                        onChange={(value) =>
                          handleMarketingFieldChange(
                            'secondary_button_text',
                            value,
                          )
                        }
                        placeholder={t('在此输入次按钮文案')}
                      />
                    </Col>
                    <Col span={12}>
                      <Form.Input
                        label={t('次按钮链接')}
                        field='home_marketing_secondary_button_link'
                        value={homeMarketingConfig.secondary_button_link}
                        onChange={(value) =>
                          handleMarketingFieldChange(
                            'secondary_button_link',
                            value,
                          )
                        }
                        placeholder={t('在此输入次按钮链接')}
                      />
                    </Col>
                  </Row>
                  <Card style={{ marginTop: 16 }}>
                    <Space vertical align='start' style={{ width: '100%' }}>
                      <Text strong>{t('首屏优势文案')}</Text>
                      {[0, 1, 2].map((index) => (
                        <Form.Input
                          key={`benefit-${index}`}
                          label={`${t('优势文案')} ${index + 1}`}
                          field={`home_marketing_benefit_${index}`}
                          value={homeMarketingConfig.benefits[index] || ''}
                          onChange={(value) =>
                            handleMarketingBenefitChange(index, value)
                          }
                          placeholder={t('在此输入优势文案')}
                        />
                      ))}
                    </Space>
                  </Card>
                  {renderMarketingEditor(t('快速引导卡片'), 'quick_starts')}
                  {renderMarketingEditor(t('场景卡片'), 'scenarios')}
                  <Card style={{ marginTop: 16 }}>
                    <Space vertical align='start' style={{ width: '100%' }}>
                      <Text strong>{t('底部转化区')}</Text>
                      <Form.Input
                        label={t('底部标题')}
                        field='home_marketing_bottom_cta_title'
                        value={homeMarketingConfig.bottom_cta_title}
                        onChange={(value) =>
                          handleMarketingFieldChange('bottom_cta_title', value)
                        }
                        placeholder={t('在此输入底部标题')}
                      />
                      <Form.TextArea
                        label={t('底部副标题')}
                        field='home_marketing_bottom_cta_subtitle'
                        value={homeMarketingConfig.bottom_cta_subtitle}
                        onChange={(value) =>
                          handleMarketingFieldChange(
                            'bottom_cta_subtitle',
                            value,
                          )
                        }
                        placeholder={t('在此输入底部副标题')}
                        autosize={{ minRows: 3, maxRows: 6 }}
                      />
                      <Row gutter={12}>
                        <Col span={12}>
                          <Form.Input
                            label={t('底部主按钮文案')}
                            field='home_marketing_bottom_primary_text'
                            value={homeMarketingConfig.bottom_primary_text}
                            onChange={(value) =>
                              handleMarketingFieldChange(
                                'bottom_primary_text',
                                value,
                              )
                            }
                            placeholder={t('在此输入底部主按钮文案')}
                          />
                        </Col>
                        <Col span={12}>
                          <Form.Input
                            label={t('底部主按钮链接')}
                            field='home_marketing_bottom_primary_link'
                            value={homeMarketingConfig.bottom_primary_link}
                            onChange={(value) =>
                              handleMarketingFieldChange(
                                'bottom_primary_link',
                                value,
                              )
                            }
                            placeholder={t('在此输入底部主按钮链接')}
                          />
                        </Col>
                      </Row>
                      <Row gutter={12}>
                        <Col span={12}>
                          <Form.Input
                            label={t('底部次按钮文案')}
                            field='home_marketing_bottom_secondary_text'
                            value={homeMarketingConfig.bottom_secondary_text}
                            onChange={(value) =>
                              handleMarketingFieldChange(
                                'bottom_secondary_text',
                                value,
                              )
                            }
                            placeholder={t('在此输入底部次按钮文案')}
                          />
                        </Col>
                        <Col span={12}>
                          <Form.Input
                            label={t('底部次按钮链接')}
                            field='home_marketing_bottom_secondary_link'
                            value={homeMarketingConfig.bottom_secondary_link}
                            onChange={(value) =>
                              handleMarketingFieldChange(
                                'bottom_secondary_link',
                                value,
                              )
                            }
                            placeholder={t('在此输入底部次按钮链接')}
                          />
                        </Col>
                      </Row>
                    </Space>
                  </Card>
                  <Space style={{ marginTop: 16 }}>
                    <Button onClick={resetMarketingConfig}>
                      {t('恢复默认模板')}
                    </Button>
                    <Button
                      type='primary'
                      onClick={submitHomeMarketingConfig}
                      loading={loadingInput['HomeMarketingConfig'] || loading}
                    >
                      {t('保存首页营销设置')}
                    </Button>
                  </Space>
                </Form.Section>
              </Card>

              <Form.TextArea
                label={t('关于')}
                placeholder={t(
                  '在此输入新的关于内容，支持 Markdown & HTML 代码。如果输入的是一个链接，则会使用该链接作为 iframe 的 src 属性，这允许你设置任意网页作为关于页面',
                )}
                field={'About'}
                onChange={handleInputChange}
                style={{ fontFamily: 'JetBrains Mono, Consolas' }}
                autosize={{ minRows: 6, maxRows: 12 }}
              />
              <Button onClick={submitAbout} loading={loadingInput['About']}>
                {t('设置关于')}
              </Button>
              <Banner
                fullMode={false}
                type='info'
                description={t(
                  '移除 One API 的版权标识必须首先获得授权，项目维护需要花费大量精力，如果本项目对你有意义，请主动支持本项目',
                )}
                closeIcon={null}
                style={{ marginTop: 15 }}
              />
              <Form.Input
                label={t('页脚')}
                placeholder={t(
                  '在此输入新的页脚，留空则使用默认页脚，支持 HTML 代码',
                )}
                field={'Footer'}
                onChange={handleInputChange}
              />
              <Button onClick={submitFooter} loading={loadingInput['Footer']}>
                {t('设置页脚')}
              </Button>
            </Form.Section>
          </Card>
        </Form>
      </Col>
      <Modal
        title={t('新版本') + '：' + updateData.tag_name}
        visible={showUpdateModal}
        onCancel={() => setShowUpdateModal(false)}
        footer={[
          <Button
            key='details'
            type='primary'
            onClick={() => {
              setShowUpdateModal(false);
              openGitHubRelease();
            }}
          >
            {t('详情')}
          </Button>,
        ]}
      >
        <div dangerouslySetInnerHTML={{ __html: updateData.content }}></div>
      </Modal>
    </Row>
  );
};

export default OtherSetting;
