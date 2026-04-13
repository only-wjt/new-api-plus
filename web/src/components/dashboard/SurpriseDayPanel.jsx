import React, { useState, useEffect } from 'react';
import { Card, Tag, Typography, Empty, Spin, Avatar, Tooltip } from '@douyinfe/semi-ui';
import { Trophy, Sparkles, Gift, Crown, Gem, Flame, Clover, Clock } from 'lucide-react';
import { API, showError, renderQuota } from '../../helpers';
import { useTranslation } from 'react-i18next';

// 奖项图标和颜色映射
const RANK_CONFIG = {
  1: { icon: Crown, color: '#FFD700', bg: 'from-yellow-500/20 to-amber-500/20', border: 'border-yellow-500/30', label: '🥇' },
  2: { icon: Gem, color: '#C0C0C0', bg: 'from-slate-400/20 to-gray-500/20', border: 'border-slate-400/30', label: '🥈' },
  3: { icon: Flame, color: '#CD7F32', bg: 'from-orange-500/20 to-amber-600/20', border: 'border-orange-500/30', label: '🥉' },
};

const SurpriseDayPanel = ({ CARD_PROPS }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // 获取惊喜日数据
  const fetchSurpriseDayData = async () => {
    try {
      setLoading(true);
      const res = await API.get('/api/surprise_day/current');
      const { success, data: respData } = res.data;
      if (success) {
        setData(respData);
      }
    } catch (error) {
      // 静默处理，不干扰用户
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurpriseDayData();
  }, []);

  // 如果功能未启用或数据未加载，不渲染
  if (!loading && (!data || !data.enabled)) {
    return null;
  }

  // 渲染中奖名单
  const renderWinnerList = (winners) => {
    if (!winners || winners.length === 0) return null;

    // 分离消费榜和参与奖
    const consumeWinners = winners.filter(w => w.award_type === 1);
    const luckyWinners = winners.filter(w => w.award_type === 2);

    return (
      <div className='space-y-3'>
        {/* 消费榜 TOP3 */}
        {consumeWinners.length > 0 && (
          <div>
            <div className='flex items-center gap-1.5 mb-2'>
              <Trophy size={14} className='text-yellow-500' />
              <Typography.Text className='text-xs font-semibold'>
                {t('消费榜 TOP3')}
              </Typography.Text>
            </div>
            <div className='space-y-1.5'>
              {consumeWinners.map((winner, idx) => {
                const config = RANK_CONFIG[winner.rank] || RANK_CONFIG[3];
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded-lg bg-gradient-to-r ${config.bg} border ${config.border} transition-all hover:scale-[1.01]`}
                  >
                    <div className='flex items-center gap-2'>
                      <span className='text-lg'>{config.label}</span>
                      <div>
                        <div className='text-sm font-medium'>
                          {winner.username}
                        </div>
                        <div className='text-xs text-gray-500'>
                          {winner.title}
                        </div>
                      </div>
                    </div>
                    <div className='text-right'>
                      <Tooltip content={`${t('当日消费')} ${renderQuota(winner.day_quota)} | ${t('减免')} ${winner.refund_percent}%`}>
                        <Tag color='green' size='small' className='cursor-help'>
                          +{renderQuota(winner.refund_quota)}
                        </Tag>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 参与奖 */}
        {luckyWinners.length > 0 && (
          <div>
            <div className='flex items-center gap-1.5 mb-2'>
              <Clover size={14} className='text-green-500' />
              <Typography.Text className='text-xs font-semibold'>
                {t('参与奖')} · {t('天选之人')}
              </Typography.Text>
            </div>
            <div className='flex flex-wrap gap-1.5'>
              {luckyWinners.map((winner, idx) => (
                <Tag
                  key={idx}
                  color='green'
                  size='small'
                  className='!rounded-full'
                >
                  🍀 {winner.username} +{renderQuota(winner.refund_quota)}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 渲染活动规则
  const renderRules = (rules) => {
    if (!rules) return null;
    return (
      <div className='p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs'>
        <div className='flex items-center gap-1 mb-1.5 font-semibold text-gray-700 dark:text-gray-300'>
          <Sparkles size={12} />
          {t('活动规则')}
        </div>
        <ul className='list-disc list-inside space-y-0.5 text-gray-500 dark:text-gray-400'>
          <li>{t('每周一至周五随机一天为惊喜日')}</li>
          <li>{t('当晚')} {rules.settlement_hour}:{String(rules.settlement_minute).padStart(2, '0')} {t('公布中奖名单')}</li>
          <li>{t('消费榜 TOP1/2/3 分别减免')} {rules.top1_refund_percent}%/{rules.top2_refund_percent}%/{rules.top3_refund_percent}%</li>
          <li>{t('随机抽取')} {rules.lucky_draw_count} {t('位用户各奖励')} {renderQuota(rules.lucky_draw_quota)}</li>
          <li>{t('当日有使用记录即可参与抽奖')}</li>
        </ul>
      </div>
    );
  };

  const latestResult = data?.latest_result;
  const latestEvent = latestResult?.event;
  const latestWinners = latestResult?.winners;

  return (
    <Card
      {...CARD_PROPS}
      className='shadow-sm !rounded-2xl lg:col-span-2 surprise-day-card'
      title={
        <div className='flex items-center justify-between w-full'>
          <div className='flex items-center gap-2'>
            <Avatar size='extra-small' className='!bg-gradient-to-br !from-yellow-400 !to-orange-500 shadow-md'>
              <Gift size={14} className='text-white' />
            </Avatar>
            <span className='font-semibold'>{t('惊喜日活动')}</span>
            <Tag color='orange' size='small' className='!rounded-full animate-pulse'>
              🎉 {t('进行中')}
            </Tag>
          </div>
          {data?.has_upcoming && (
            <Tooltip content={t('本周有惊喜日等待揭晓')}>
              <div className='flex items-center gap-1 text-xs text-orange-500 cursor-help'>
                <Clock size={12} />
                <span>{t('惊喜待揭晓')}</span>
              </div>
            </Tooltip>
          )}
        </div>
      }
      bodyStyle={{ padding: '12px 16px' }}
    >
      <style>{`
        .surprise-day-card {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.03) 0%, rgba(255, 140, 0, 0.03) 100%);
        }
        @keyframes shimmer {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
      `}</style>

      <Spin spinning={loading}>
        <div className='space-y-3'>
          {/* 最近一期中奖名单 */}
          {latestEvent ? (
            <div>
              <div className='flex items-center justify-between mb-2'>
                <Typography.Text className='text-xs text-gray-500'>
                  📅 {latestEvent.event_date} {t('中奖名单')}
                </Typography.Text>
                <Tag size='small' color='blue'>
                  {latestEvent.source === 'manual' ? t('管理员指定') : t('随机抽取')}
                </Tag>
              </div>
              {renderWinnerList(latestWinners)}
            </div>
          ) : (
            <Empty
              title={t('暂无惊喜日记录')}
              description={t('敬请期待下一期惊喜日活动')}
              style={{ padding: '16px 0' }}
            />
          )}

          {/* 活动规则 */}
          {renderRules(data?.rules)}
        </div>
      </Spin>
    </Card>
  );
};

export default SurpriseDayPanel;
