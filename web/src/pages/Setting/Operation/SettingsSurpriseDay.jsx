import React, { useEffect, useState, useRef } from 'react';
import { Button, Col, Form, Row, Spin, Typography, Select } from '@douyinfe/semi-ui';
import {
  compareObjects,
  API,
  showError,
  showSuccess,
  showWarning,
} from '../../../helpers';
import { useTranslation } from 'react-i18next';

export default function SettingsSurpriseDay(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [userList, setUserList] = useState([]); // 用户列表
  const [excludeIds, setExcludeIds] = useState([]); // 当前选中的排除用户 ID 数组
  const [inputs, setInputs] = useState({
    'surprise_day_setting.enabled': false,
    'surprise_day_setting.visibility': 'all',
    'surprise_day_setting.top1_refund_percent': 50,
    'surprise_day_setting.top2_refund_percent': 35,
    'surprise_day_setting.top3_refund_percent': 20,
    'surprise_day_setting.lucky_draw_count': 3,
    'surprise_day_setting.lucky_draw_quota': 2500000,
    'surprise_day_setting.settlement_hour': 21,
    'surprise_day_setting.settlement_minute': 0,
    'surprise_day_setting.timezone': 'Asia/Shanghai',
    'surprise_day_setting.exclude_user_ids': '',
  });
  const refForm = useRef();
  const [inputsRow, setInputsRow] = useState(inputs);

  // 加载用户列表
  const loadUsers = async () => {
    try {
      const res = await API.get('/api/user/?p=1&page_size=1000');
      const { success, data } = res.data;
      if (success && data && data.items) {
        setUserList(data.items);
      }
    } catch (e) {
      console.error('加载用户列表失败', e);
    }
  };

  // 将逗号分隔的字符串解析为数字数组
  const parseExcludeIds = (str) => {
    if (!str || str === '') return [];
    return str.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
  };

  // 将数字数组转为逗号分隔字符串
  const serializeExcludeIds = (ids) => {
    return ids.join(',');
  };

  function handleFieldChange(fieldName) {
    return (value) => {
      setInputs((inputs) => ({ ...inputs, [fieldName]: value }));
    };
  }

  function onSubmit() {
    const updateArray = compareObjects(inputs, inputsRow);
    if (!updateArray.length) return showWarning(t('你似乎并没有修改什么'));
    const requestQueue = updateArray.map((item) => {
      let value = String(inputs[item.key]);
      return API.put('/api/option/', {
        key: item.key,
        value,
      });
    });
    setLoading(true);
    Promise.all(requestQueue)
      .then((res) => {
        if (requestQueue.length === 1) {
          if (res.includes(undefined)) return;
        } else if (requestQueue.length > 1) {
          if (res.includes(undefined))
            return showError(t('部分保存失败，请重试'));
        }
        showSuccess(t('保存成功'));
        props.refresh();
      })
      .catch(() => {
        showError(t('保存失败，请重试'));
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    const currentInputs = {};
    for (let key in props.options) {
      if (Object.keys(inputs).includes(key)) {
        currentInputs[key] = props.options[key];
      }
    }
    setInputs(currentInputs);
    setInputsRow(structuredClone(currentInputs));
    refForm.current.setValues(currentInputs);
    // 初始化排除用户 ID 数组
    setExcludeIds(parseExcludeIds(currentInputs['surprise_day_setting.exclude_user_ids']));
    // 加载用户列表
    loadUsers();
  }, [props.options]);

  const isEnabled = inputs['surprise_day_setting.enabled'];

  return (
    <>
      <Spin spinning={loading}>
        <Form
          values={inputs}
          getFormApi={(formAPI) => (refForm.current = formAPI)}
          style={{ marginBottom: 15 }}
        >
          <Form.Section text={t('惊喜日活动设置')}>
            <Typography.Text
              type='tertiary'
              style={{ marginBottom: 16, display: 'block' }}
            >
              {t('每周随机一天为惊喜日，当晚自动统计消费排名并发放奖励')}
            </Typography.Text>

            {/* 基本开关 */}
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Switch
                  field={'surprise_day_setting.enabled'}
                  label={t('启用惊喜日活动')}
                  size='default'
                  checkedText='｜'
                  uncheckedText='〇'
                  onChange={handleFieldChange('surprise_day_setting.enabled')}
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Select
                  field={'surprise_day_setting.visibility'}
                  label={t('看板可见性')}
                  onChange={handleFieldChange('surprise_day_setting.visibility')}
                  disabled={!isEnabled}
                  style={{ width: '100%' }}
                >
                  <Select.Option value='all'>{t('全部用户可见')}</Select.Option>
                  <Select.Option value='admin'>{t('仅管理员可见')}</Select.Option>
                </Form.Select>
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Input
                  field={'surprise_day_setting.timezone'}
                  label={t('时区')}
                  placeholder='Asia/Shanghai'
                  onChange={handleFieldChange('surprise_day_setting.timezone')}
                  disabled={!isEnabled}
                />
              </Col>
            </Row>

            {/* 消费榜减免比例 */}
            <Typography.Text
              type='tertiary'
              style={{ marginTop: 16, marginBottom: 8, display: 'block' }}
            >
              {t('消费榜 TOP3 减免比例 (%)')}
            </Typography.Text>
            <Row gutter={16}>
              <Col xs={24} sm={8} md={8} lg={8} xl={8}>
                <Form.InputNumber
                  field={'surprise_day_setting.top1_refund_percent'}
                  label={t('🥇 第1名减免 %')}
                  onChange={handleFieldChange('surprise_day_setting.top1_refund_percent')}
                  min={0}
                  max={100}
                  disabled={!isEnabled}
                />
              </Col>
              <Col xs={24} sm={8} md={8} lg={8} xl={8}>
                <Form.InputNumber
                  field={'surprise_day_setting.top2_refund_percent'}
                  label={t('🥈 第2名减免 %')}
                  onChange={handleFieldChange('surprise_day_setting.top2_refund_percent')}
                  min={0}
                  max={100}
                  disabled={!isEnabled}
                />
              </Col>
              <Col xs={24} sm={8} md={8} lg={8} xl={8}>
                <Form.InputNumber
                  field={'surprise_day_setting.top3_refund_percent'}
                  label={t('🥉 第3名减免 %')}
                  onChange={handleFieldChange('surprise_day_setting.top3_refund_percent')}
                  min={0}
                  max={100}
                  disabled={!isEnabled}
                />
              </Col>
            </Row>

            {/* 参与奖设置 */}
            <Typography.Text
              type='tertiary'
              style={{ marginTop: 16, marginBottom: 8, display: 'block' }}
            >
              {t('参与奖设置')}
            </Typography.Text>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.InputNumber
                  field={'surprise_day_setting.lucky_draw_count'}
                  label={t('抽取人数')}
                  onChange={handleFieldChange('surprise_day_setting.lucky_draw_count')}
                  min={0}
                  disabled={!isEnabled}
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.InputNumber
                  field={'surprise_day_setting.lucky_draw_quota'}
                  label={t('每人奖励额度 (quota)')}
                  placeholder='2500000 = $5'
                  onChange={handleFieldChange('surprise_day_setting.lucky_draw_quota')}
                  min={0}
                  disabled={!isEnabled}
                />
              </Col>
            </Row>

            {/* 结算时间 */}
            <Typography.Text
              type='tertiary'
              style={{ marginTop: 16, marginBottom: 8, display: 'block' }}
            >
              {t('结算时间')}
            </Typography.Text>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.InputNumber
                  field={'surprise_day_setting.settlement_hour'}
                  label={t('时 (0-23)')}
                  onChange={handleFieldChange('surprise_day_setting.settlement_hour')}
                  min={0}
                  max={23}
                  disabled={!isEnabled}
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.InputNumber
                  field={'surprise_day_setting.settlement_minute'}
                  label={t('分 (0-59)')}
                  onChange={handleFieldChange('surprise_day_setting.settlement_minute')}
                  min={0}
                  max={59}
                  disabled={!isEnabled}
                />
              </Col>
            </Row>

            {/* 排除用户 */}
            <Typography.Text
              type='tertiary'
              style={{ marginTop: 16, marginBottom: 8, display: 'block' }}
            >
              {t('排除用户')}
            </Typography.Text>
            <Row gutter={16}>
              <Col xs={24} sm={24} md={16} lg={16} xl={16}>
                <div style={{ marginBottom: 12 }}>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 4 }}>
                    {t('排除的用户')}
                  </Typography.Text>
                  <Select
                    multiple
                    filter
                    style={{ width: '100%' }}
                    placeholder={t('搜索并选择要排除的用户')}
                    value={excludeIds}
                    disabled={!isEnabled}
                    onChange={(values) => {
                      setExcludeIds(values);
                      const str = serializeExcludeIds(values);
                      setInputs((prev) => ({ ...prev, 'surprise_day_setting.exclude_user_ids': str }));
                    }}
                  >
                    {userList.map((user) => (
                      <Select.Option key={user.id} value={user.id}>
                        {user.username} (ID: {user.id})
                      </Select.Option>
                    ))}
                  </Select>
                  <Typography.Text type='tertiary' style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                    {t('这些用户不会参与消费榜排名和参与奖抽取')}
                  </Typography.Text>
                </div>
              </Col>
            </Row>

            <Row style={{ marginTop: 16 }}>
              <Button size='default' onClick={onSubmit}>
                {t('保存惊喜日设置')}
              </Button>
            </Row>
          </Form.Section>
        </Form>
      </Spin>
    </>
  );
}
