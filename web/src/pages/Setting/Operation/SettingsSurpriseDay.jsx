import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button, Col, Form, Row, Spin, Typography, Select, Table, DatePicker, Popconfirm, Tag, Modal } from '@douyinfe/semi-ui';
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
  const [userList, setUserList] = useState([]);
  const [excludeIds, setExcludeIds] = useState([]);
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

  // 活动管理状态
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [createDate, setCreateDate] = useState(null);
  const [settlingId, setSettlingId] = useState(null);
  const [winnersModalVisible, setWinnersModalVisible] = useState(false);
  const [currentWinners, setCurrentWinners] = useState([]);
  const [currentEventDate, setCurrentEventDate] = useState('');

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

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await API.get('/api/surprise_day/admin/events?page_size=50');
      const { success, data } = res.data;
      if (success && data && data.items) {
        setEvents(data.items);
      }
    } catch (e) {
      console.error('加载活动列表失败', e);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const handleCreateEvent = async () => {
    if (!createDate) {
      showWarning('请选择日期');
      return;
    }
    const dateStr = typeof createDate === 'string'
      ? createDate
      : new Date(createDate).toISOString().split('T')[0];
    try {
      const res = await API.post('/api/surprise_day/admin/event', { event_date: dateStr });
      if (res.data.success) {
        showSuccess('活动创建成功');
        setCreateDate(null);
        loadEvents();
      } else {
        showError(res.data.message || '创建失败');
      }
    } catch (e) {
      showError('创建失败: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleSettle = async (id) => {
    setSettlingId(id);
    try {
      const res = await API.post(`/api/surprise_day/admin/settle/${id}`);
      if (res.data.success) {
        showSuccess('结算完成！');
        loadEvents();
      } else {
        showError(res.data.message || '结算失败');
      }
    } catch (e) {
      showError('结算失败: ' + (e.response?.data?.message || e.message));
    } finally {
      setSettlingId(null);
    }
  };

  const handleCancel = async (id) => {
    try {
      const res = await API.delete(`/api/surprise_day/admin/event/${id}`);
      if (res.data.success) {
        showSuccess('活动已取消');
        loadEvents();
      } else {
        showError(res.data.message || '取消失败');
      }
    } catch (e) {
      showError('取消失败: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleViewWinners = (item) => {
    setCurrentWinners(item.winners || []);
    setCurrentEventDate(item.event?.event_date || '');
    setWinnersModalVisible(true);
  };

  const parseExcludeIds = (str) => {
    if (!str || str === '') return [];
    return str.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
  };

  const serializeExcludeIds = (ids) => ids.join(',');

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
      return API.put('/api/option/', { key: item.key, value });
    });
    setLoading(true);
    Promise.all(requestQueue)
      .then((res) => {
        if (requestQueue.length === 1) {
          if (res.includes(undefined)) return;
        } else if (requestQueue.length > 1) {
          if (res.includes(undefined)) return showError(t('部分保存失败，请重试'));
        }
        showSuccess(t('保存成功'));
        props.refresh();
      })
      .catch(() => showError(t('保存失败，请重试')))
      .finally(() => setLoading(false));
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
    setExcludeIds(parseExcludeIds(currentInputs['surprise_day_setting.exclude_user_ids']));
    loadUsers();
    loadEvents();
  }, [props.options]);

  const isEnabled = inputs['surprise_day_setting.enabled'];

  const statusTag = (status) => {
    const map = {
      pending: { color: 'blue', text: '待结算' },
      settled: { color: 'green', text: '已结算' },
      cancelled: { color: 'grey', text: '已取消' },
    };
    const cfg = map[status] || { color: 'grey', text: status };
    return <Tag color={cfg.color}>{cfg.text}</Tag>;
  };

  const eventColumns = [
    { title: 'ID', dataIndex: 'event.id', key: 'id', width: 60, render: (_, record) => record.event?.id },
    { title: '日期', dataIndex: 'event.event_date', key: 'date', width: 120, render: (_, record) => record.event?.event_date },
    { title: '状态', dataIndex: 'event.status', key: 'status', width: 100, render: (_, record) => statusTag(record.event?.status) },
    { title: '创建时间', dataIndex: 'event.created_at', key: 'created', width: 180, render: (_, record) => {
      const ts = record.event?.created_at;
      return ts ? new Date(ts * 1000).toLocaleString('zh-CN') : '-';
    }},
    { title: '操作', key: 'action', width: 200, render: (_, record) => {
      const event = record.event;
      if (!event) return null;
      if (event.status === 'pending') {
        return (
          <div style={{ display: 'flex', gap: 8 }}>
            <Popconfirm title="确认结算此活动？结算后将自动发放奖励。" onConfirm={() => handleSettle(event.id)}>
              <Button theme="solid" type="primary" size="small" loading={settlingId === event.id}>
                结算
              </Button>
            </Popconfirm>
            <Popconfirm title="确认取消此活动？" onConfirm={() => handleCancel(event.id)}>
              <Button theme="borderless" type="danger" size="small">取消</Button>
            </Popconfirm>
          </div>
        );
      }
      if (event.status === 'settled' && record.winners?.length > 0) {
        return (
          <Button theme="borderless" size="small" onClick={() => handleViewWinners(record)}>
            查看中奖者
          </Button>
        );
      }
      return '-';
    }},
  ];

  return (
    <>
      <Spin spinning={loading}>
        <Form
          values={inputs}
          getFormApi={(formAPI) => (refForm.current = formAPI)}
          style={{ marginBottom: 15 }}
        >
          <Form.Section text={t('惊喜日活动设置')}>
            <Typography.Text type='tertiary' style={{ marginBottom: 16, display: 'block' }}>
              {t('每周随机一天为惊喜日，当晚自动统计消费排名并发放奖励')}
            </Typography.Text>

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

            <Typography.Text type='tertiary' style={{ marginTop: 16, marginBottom: 8, display: 'block' }}>
              {t('消费榜 TOP3 减免比例 (%)')}
            </Typography.Text>
            <Row gutter={16}>
              <Col xs={24} sm={8} md={8} lg={8} xl={8}>
                <Form.InputNumber field={'surprise_day_setting.top1_refund_percent'} label={t('🥇 第1名减免 %')} onChange={handleFieldChange('surprise_day_setting.top1_refund_percent')} min={0} max={100} disabled={!isEnabled} />
              </Col>
              <Col xs={24} sm={8} md={8} lg={8} xl={8}>
                <Form.InputNumber field={'surprise_day_setting.top2_refund_percent'} label={t('🥈 第2名减免 %')} onChange={handleFieldChange('surprise_day_setting.top2_refund_percent')} min={0} max={100} disabled={!isEnabled} />
              </Col>
              <Col xs={24} sm={8} md={8} lg={8} xl={8}>
                <Form.InputNumber field={'surprise_day_setting.top3_refund_percent'} label={t('🥉 第3名减免 %')} onChange={handleFieldChange('surprise_day_setting.top3_refund_percent')} min={0} max={100} disabled={!isEnabled} />
              </Col>
            </Row>

            <Typography.Text type='tertiary' style={{ marginTop: 16, marginBottom: 8, display: 'block' }}>
              {t('参与奖设置')}
            </Typography.Text>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.InputNumber field={'surprise_day_setting.lucky_draw_count'} label={t('抽取人数')} onChange={handleFieldChange('surprise_day_setting.lucky_draw_count')} min={0} disabled={!isEnabled} />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.InputNumber field={'surprise_day_setting.lucky_draw_quota'} label={t('每人奖励额度 (quota)')} placeholder='2500000 = $5' onChange={handleFieldChange('surprise_day_setting.lucky_draw_quota')} min={0} disabled={!isEnabled} />
              </Col>
            </Row>

            <Typography.Text type='tertiary' style={{ marginTop: 16, marginBottom: 8, display: 'block' }}>
              {t('结算时间')}
            </Typography.Text>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.InputNumber field={'surprise_day_setting.settlement_hour'} label={t('时 (0-23)')} onChange={handleFieldChange('surprise_day_setting.settlement_hour')} min={0} max={23} disabled={!isEnabled} />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.InputNumber field={'surprise_day_setting.settlement_minute'} label={t('分 (0-59)')} onChange={handleFieldChange('surprise_day_setting.settlement_minute')} min={0} max={59} disabled={!isEnabled} />
              </Col>
            </Row>

            <Typography.Text type='tertiary' style={{ marginTop: 16, marginBottom: 8, display: 'block' }}>
              {t('排除用户')}
            </Typography.Text>
            <Row gutter={16}>
              <Col xs={24} sm={24} md={16} lg={16} xl={16}>
                <div style={{ marginBottom: 12 }}>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 4 }}>
                    {t('排除的用户')}
                  </Typography.Text>
                  <Select
                    multiple filter style={{ width: '100%' }}
                    placeholder={t('搜索并选择要排除的用户')}
                    value={excludeIds} disabled={!isEnabled}
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
              <Button size='default' onClick={onSubmit}>{t('保存惊喜日设置')}</Button>
            </Row>
          </Form.Section>

          {/* ========== 活动管理 ========== */}
          <Form.Section text={t('活动管理')} style={{ marginTop: 24 }}>
            <Typography.Text type='tertiary' style={{ marginBottom: 16, display: 'block' }}>
              创建活动后可手动触发结算，结算将统计当天消费数据并发放奖励
            </Typography.Text>

            <Row gutter={16} style={{ marginBottom: 16, alignItems: 'flex-end' }}>
              <Col>
                <Typography.Text strong style={{ display: 'block', marginBottom: 4 }}>选择日期</Typography.Text>
                <DatePicker
                  type="date" value={createDate}
                  onChange={(date) => setCreateDate(date)}
                  style={{ width: 200 }} placeholder="选择惊喜日日期"
                />
              </Col>
              <Col>
                <Button theme="solid" onClick={handleCreateEvent} style={{ marginBottom: 1 }}>创建活动</Button>
              </Col>
              <Col>
                <Button theme="borderless" onClick={loadEvents} style={{ marginBottom: 1 }}>刷新</Button>
              </Col>
            </Row>

            <Table
              columns={eventColumns}
              dataSource={events}
              loading={eventsLoading}
              rowKey={(record) => record.event?.id}
              pagination={false}
              size="small"
              empty="暂无活动"
              style={{ marginTop: 8 }}
            />
          </Form.Section>
        </Form>
      </Spin>

      <Modal
        title={`${currentEventDate} 中奖名单`}
        visible={winnersModalVisible}
        onCancel={() => setWinnersModalVisible(false)}
        footer={null} width={500}
      >
        {currentWinners.length === 0 ? (
          <Typography.Text type="tertiary">无中奖记录</Typography.Text>
        ) : (
          <Table
            dataSource={currentWinners} rowKey="id" pagination={false} size="small"
            columns={[
              { title: '用户ID', dataIndex: 'user_id', width: 80 },
              { title: '类型', dataIndex: 'reward_type', width: 100, render: (text) => {
                const map = { top1: '🥇 第1名', top2: '🥈 第2名', top3: '🥉 第3名', lucky: '🎉 参与奖' };
                return map[text] || text;
              }},
              { title: '奖励额度', dataIndex: 'reward_quota', width: 100 },
            ]}
          />
        )}
      </Modal>
    </>
  );
}
