/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/

import React, { useEffect, useState, useCallback } from 'react';
import {
  Button,
  Table,
  Modal,
  Form,
  Switch,
  Typography,
  Banner,
  Tag,
  Space,
  Spin,
  Popconfirm,
  Tooltip,
  InputNumber,
} from '@douyinfe/semi-ui';
import {
  IconPlus,
  IconDelete,
  IconTick,
  IconClose,
  IconInfoCircle,
} from '@douyinfe/semi-icons';
import { API, showError, showSuccess } from '../../../helpers';

export default function SettingsConcurrency () {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 全局配置
  const [enabled, setEnabled] = useState(false);
  const [freeDefault, setFreeDefault] = useState(1);
  const [paidDefault, setPaidDefault] = useState(5);

  // 用户覆盖列表
  const [overrides, setOverrides] = useState([]);
  const [overrideLoading, setOverrideLoading] = useState(false);

  // 新增覆盖弹窗
  const [modalVisible, setModalVisible] = useState(false);
  const [formApi, setFormApi] = useState(null);

  // ========== 获取全局配置 ==========
  const fetchSetting = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/concurrency/setting');
      if (res.data.success && res.data.data) {
        const data = res.data.data;
        setEnabled(data.enabled || false);
        setFreeDefault(data.free_default || 1);
        setPaidDefault(data.paid_default || 5);
      }
    } catch {
      showError('获取并发限制配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // ========== 保存全局配置 ==========
  const saveSetting = async (newEnabled, newFree, newPaid) => {
    setSaving(true);
    try {
      const res = await API.put('/api/concurrency/setting', {
        enabled: newEnabled ?? enabled,
        free_default: newFree ?? freeDefault,
        paid_default: newPaid ?? paidDefault,
      });
      if (res.data.success) {
        showSuccess('配置已保存');
        await fetchSetting();
      } else {
        showError(res.data.message || '保存失败');
      }
    } catch {
      showError('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // ========== 获取用户覆盖列表 ==========
  const fetchOverrides = useCallback(async () => {
    setOverrideLoading(true);
    try {
      const res = await API.get('/api/concurrency/override');
      if (res.data.success) {
        setOverrides(res.data.data || []);
      }
    } catch {
      showError('获取用户覆盖列表失败');
    } finally {
      setOverrideLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSetting();
    fetchOverrides();
  }, [fetchSetting, fetchOverrides]);

  // ========== 全局开关切换 ==========
  const handleToggle = (checked) => {
    setEnabled(checked);
    saveSetting(checked, freeDefault, paidDefault);
  };

  // ========== 保存并发数 ==========
  const handleSaveDefaults = () => {
    saveSetting(enabled, freeDefault, paidDefault);
  };

  // ========== 新增用户覆盖 ==========
  const handleAddOverride = () => {
    if (!formApi) return;
    formApi.validate().then(async (values) => {
      try {
        const res = await API.put(`/api/concurrency/override/${values.user_id}`, {
          max_concurrent: values.max_concurrent,
          reason: values.reason || '',
        });
        if (res.data.success) {
          showSuccess('用户并发覆盖已设置');
          setModalVisible(false);
          await fetchOverrides();
        } else {
          showError(res.data.message || '设置失败');
        }
      } catch {
        showError('设置失败');
      }
    });
  };

  // ========== 删除用户覆盖 ==========
  const handleDeleteOverride = async (userId) => {
    try {
      const res = await API.delete(`/api/concurrency/override/${userId}`);
      if (res.data.success) {
        showSuccess('已删除');
        await fetchOverrides();
      } else {
        showError(res.data.message || '删除失败');
      }
    } catch {
      showError('删除失败');
    }
  };

  // ========== 覆盖列表表格 ==========
  const overrideColumns = [
    {
      title: '用户 ID',
      dataIndex: 'user_id',
      width: 100,
    },
    {
      title: '最大并发数',
      dataIndex: 'max_concurrent',
      width: 120,
      render: (val) => <Tag color='blue' size='large'>{val}</Tag>,
    },
    {
      title: '当前并发',
      dataIndex: 'current_concurrency',
      width: 100,
      render: (val) => <Tag color={val > 0 ? 'orange' : 'grey'}>{val || 0}</Tag>,
    },
    {
      title: '原因',
      dataIndex: 'reason',
      render: (val) => (
        <Typography.Text ellipsis={{ showTooltip: true }} style={{ width: 200 }}>
          {val || '-'}
        </Typography.Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Popconfirm
          title='确认删除此用户的并发覆盖？'
          onConfirm={() => handleDeleteOverride(record.user_id)}
        >
          <Button
            icon={<IconDelete />}
            size='small'
            theme='borderless'
            type='danger'
          />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title heading={5} style={{ marginBottom: 12 }}>
        用户并发限制
        <Tooltip content='限制同一用户同时进行的 API 请求数，防止滥用。未付费用户默认 1 并发，付费用户默认 5 并发。'>
          <IconInfoCircle style={{ marginLeft: 6, color: 'var(--semi-color-text-2)' }} />
        </Tooltip>
      </Typography.Title>

      <Spin spinning={loading}>
        {/* 全局开关 */}
        <div style={{ marginBottom: 16 }}>
          <Space align='center'>
            <Typography.Text strong>全局开关</Typography.Text>
            <Switch checked={enabled} onChange={handleToggle} loading={saving} />
            {enabled
              ? <Tag color='green' prefixIcon={<IconTick />}>已启用</Tag>
              : <Tag color='grey' prefixIcon={<IconClose />}>已关闭</Tag>
            }
          </Space>
        </div>

        {!enabled && (
          <Banner
            type='info'
            description='关闭状态下，所有用户不受并发限制。'
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 默认并发数配置 */}
        {enabled && (
          <div style={{ marginBottom: 24 }}>
            <Space align='end' spacing={16}>
              <div>
                <Typography.Text size='small' style={{ display: 'block', marginBottom: 4 }}>
                  未付费用户默认并发
                </Typography.Text>
                <InputNumber
                  value={freeDefault}
                  min={1}
                  max={100}
                  onChange={(val) => setFreeDefault(val)}
                  style={{ width: 120 }}
                  suffix='个'
                />
              </div>
              <div>
                <Typography.Text size='small' style={{ display: 'block', marginBottom: 4 }}>
                  付费用户默认并发
                </Typography.Text>
                <InputNumber
                  value={paidDefault}
                  min={1}
                  max={100}
                  onChange={(val) => setPaidDefault(val)}
                  style={{ width: 120 }}
                  suffix='个'
                />
              </div>
              <Button theme='solid' onClick={handleSaveDefaults} loading={saving}>
                保存
              </Button>
            </Space>

            <Banner
              type='info'
              description='付费用户 = 有过成功充值记录的用户。管理员和 Root 用户不受并发限制。'
              style={{ marginTop: 12, marginBottom: 0 }}
            />
          </div>
        )}

        {/* 用户级覆盖列表 */}
        {enabled && (
          <>
            <Typography.Title heading={6} style={{ marginBottom: 12 }}>
              用户级覆盖
              <Tooltip content='为特定用户单独设置并发上限，覆盖默认值'>
                <IconInfoCircle style={{ marginLeft: 6, color: 'var(--semi-color-text-2)' }} />
              </Tooltip>
            </Typography.Title>

            <div style={{ marginBottom: 12 }}>
              <Button
                icon={<IconPlus />}
                theme='solid'
                onClick={() => setModalVisible(true)}
              >
                新增覆盖
              </Button>
            </div>

            <Spin spinning={overrideLoading}>
              <Table
                columns={overrideColumns}
                dataSource={overrides}
                rowKey='id'
                pagination={false}
                size='small'
                empty='暂无用户级覆盖'
              />
            </Spin>
          </>
        )}
      </Spin>

      {/* 新增覆盖弹窗 */}
      <Modal
        title='新增用户并发覆盖'
        visible={modalVisible}
        onOk={handleAddOverride}
        onCancel={() => setModalVisible(false)}
        okText='确定'
        cancelText='取消'
        width={420}
      >
        <Form
          getFormApi={(api) => setFormApi(api)}
          labelPosition='left'
          labelWidth={100}
          initValues={{ user_id: '', max_concurrent: 10, reason: '' }}
        >
          <Form.InputNumber
            field='user_id'
            label='用户 ID'
            min={1}
            placeholder='输入用户 ID'
            rules={[{ required: true, message: '请输入用户 ID' }]}
            style={{ width: '100%' }}
          />
          <Form.InputNumber
            field='max_concurrent'
            label='最大并发数'
            min={1}
            max={1000}
            rules={[{ required: true, message: '请输入最大并发数' }]}
            style={{ width: '100%' }}
          />
          <Form.Input
            field='reason'
            label='原因'
            placeholder='可选，如：VIP 用户'
          />
        </Form>
      </Modal>
    </div>
  );
}
