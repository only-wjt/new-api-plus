/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.
*/

package model

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/go-redis/redis/v8"
)

// slidingWindowKey 返回滑动窗口 Redis Key
// 格式: "new-api:sub_window:{userSubscriptionId}"
func slidingWindowKey(userSubscriptionId int) string {
	return fmt.Sprintf("new-api:sub_window:%d", userSubscriptionId)
}

// slidingWindowMember 构造 Sorted Set 的 member 值
// 格式: "{requestId}:{amount}"
func slidingWindowMember(requestId string, amount int64) string {
	return fmt.Sprintf("%s:%d", requestId, amount)
}

// parseSlidingWindowMember 从 member 字符串中解析出 amount
func parseSlidingWindowMember(member string) int64 {
	idx := strings.LastIndex(member, ":")
	if idx < 0 || idx >= len(member)-1 {
		return 0
	}
	val, err := strconv.ParseInt(member[idx+1:], 10, 64)
	if err != nil {
		return 0
	}
	return val
}

// GetSlidingWindowUsage 查询最近 windowHours 小时内的累计消耗额度。
// Redis 不可用时返回 (0, nil)，即降级放行。
func GetSlidingWindowUsage(userSubscriptionId int, windowHours int) (int64, error) {
	if !common.RedisEnabled || common.RDB == nil {
		// Redis 不可用，降级放行
		return 0, nil
	}
	if windowHours <= 0 {
		return 0, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	key := slidingWindowKey(userSubscriptionId)
	now := float64(time.Now().Unix())
	windowStart := now - float64(windowHours*3600)

	// 先清理过期数据（窗口之前的记录），保持 Sorted Set 干净
	_ = common.RDB.ZRemRangeByScore(ctx, key, "-inf", fmt.Sprintf("%f", windowStart)).Err()

	// 查询窗口内的所有 member
	members, err := common.RDB.ZRangeByScore(ctx, key, &redis.ZRangeBy{
		Min: fmt.Sprintf("%f", windowStart),
		Max: "+inf",
	}).Result()
	if err != nil {
		// Redis 查询失败，降级放行
		common.SysError(fmt.Sprintf("滑动窗口查询失败 (subId=%d): %s", userSubscriptionId, err.Error()))
		return 0, nil
	}

	var total int64
	for _, m := range members {
		total += parseSlidingWindowMember(m)
	}
	return total, nil
}

// AddSlidingWindowRecord 添加一条滑动窗口消耗记录。
// 应在 DB 事务成功后调用（最佳尽力，失败只记日志）。
func AddSlidingWindowRecord(userSubscriptionId int, requestId string, amount int64, windowHours int) error {
	if !common.RedisEnabled || common.RDB == nil {
		return nil
	}
	if windowHours <= 0 || amount <= 0 {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	key := slidingWindowKey(userSubscriptionId)
	member := slidingWindowMember(requestId, amount)
	score := float64(time.Now().Unix())

	// ZADD 添加记录
	if err := common.RDB.ZAdd(ctx, key, &redis.Z{
		Score:  score,
		Member: member,
	}).Err(); err != nil {
		common.SysError(fmt.Sprintf("滑动窗口记录写入失败 (subId=%d, reqId=%s): %s", userSubscriptionId, requestId, err.Error()))
		return err
	}

	// 设置 Key TTL = 窗口时长 + 1 小时缓冲，防止 Key 永久存在
	ttl := time.Duration(windowHours+1) * time.Hour
	_ = common.RDB.Expire(ctx, key, ttl).Err()

	return nil
}

// RemoveSlidingWindowRecord 移除指定 requestId 的滑动窗口记录（退款时调用）。
// 由于 member 格式为 "{requestId}:{amount}"，amount 未知，需遍历匹配。
// 应在退款事务成功后调用（最佳尽力，失败只记日志）。
func RemoveSlidingWindowRecord(userSubscriptionId int, requestId string) error {
	if !common.RedisEnabled || common.RDB == nil {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	key := slidingWindowKey(userSubscriptionId)

	// 获取所有 member，找到匹配 requestId 前缀的记录并删除
	members, err := common.RDB.ZRange(ctx, key, 0, -1).Result()
	if err != nil {
		common.SysError(fmt.Sprintf("滑动窗口退款查询失败 (subId=%d, reqId=%s): %s", userSubscriptionId, requestId, err.Error()))
		return err
	}

	prefix := requestId + ":"
	for _, m := range members {
		if strings.HasPrefix(m, prefix) {
			if err := common.RDB.ZRem(ctx, key, m).Err(); err != nil {
				common.SysError(fmt.Sprintf("滑动窗口退款删除失败 (subId=%d, reqId=%s): %s", userSubscriptionId, requestId, err.Error()))
			}
			return nil
		}
	}
	return nil
}
