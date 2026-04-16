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
  Switch,
  Typography,
  Banner,
  Tag,
  Space,
  Spin,
  Tooltip,
  InputNumber,
} from '@douyinfe/semi-ui';
import {
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

  useEffect(() => {
    fetchSetting();
  }, [fetchSetting]);

  // ========== 全局开关切换 ==========
  const handleToggle = (checked) => {
    setEnabled(checked);
    saveSetting(checked, freeDefault, paidDefault);
  };

  // ========== 保存并发数 ==========
  const handleSaveDefaults = () => {
    saveSetting(enabled, freeDefault, paidDefault);
  };

  return (
    <div>
      <Typography.Title heading={5} style={{ marginBottom: 12 }}>
        用户并发限制
        <Tooltip content='限制同一用户同时进行的 API 请求数，防止滥用。并发上限在「用户管理 → 编辑用户」中为每个用户单独设置。'>
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
              description='此处设置的默认值仅对新注册用户生效。已有用户的并发上限请在「用户管理 → 编辑用户」中设置。'
              style={{ marginTop: 12, marginBottom: 0 }}
            />
          </div>
        )}
      </Spin>
    </div>
  );
}
