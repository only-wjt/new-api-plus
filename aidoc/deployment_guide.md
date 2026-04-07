# NewAPI-Plus 部署指南

## 服务器架构

| 角色 | IP | 说明 |
|------|-----|------|
| 🇭🇰 香港（主） | — | 主数据库 + 主服务 |
| 🇺🇸 美国（从） | 38.38.248.212 | 从数据库（只读副本）+ 备用服务（暂不更新） |
| 🧪 测试服务器 | 45.207.220.152 | 代码构建 + 镜像打包 |

**运行容器**：

| 容器名 | 说明 |
|--------|------|
| `new-api` | NewAPI-Plus 主服务（监听 5678 端口） |
| `nginx-proxy-manager` | Nginx 反向代理管理 |
| `cli-proxy-api-plus` | CLI 代理服务 |

---

## 前置要求

| 组件 | 最低版本 | 说明 |
|------|----------|------|
| Docker | 20.10+ | 容器化部署 |
| MySQL | 8.0+ | 已安装并运行，主从已配置 |

---

## 部署步骤（香港主服务器）

### 1. 从测试服务器导出镜像

```bash
# 在测试服务器（45.207.220.152）上导出镜像
docker save new-api-plus:latest | gzip > /tmp/new-api-plus.tar.gz

# 传输到香港主服务器
scp /tmp/new-api-plus.tar.gz root@香港服务器IP:/tmp/
```

### 2. 在香港服务器上导入并替换

```bash
# 导入新镜像
docker load < /tmp/new-api-plus.tar.gz

# 备份旧镜像（首次部署可跳过）
docker tag new-api-plus:latest new-api-plus:stable-backup 2>/dev/null

# 停止并删除旧容器
docker stop new-api && docker rm new-api

# 启动新容器
docker run -d \
  --name new-api \
  --restart always \
  --network host \
  -v /data/new-api:/data \
  -e SQL_DSN="newapi:newapi_password_2026@tcp(127.0.0.1:3306)/oneapi?charset=utf8mb4&parseTime=True&loc=Local" \
  -e SESSION_SECRET="0e7c7788d2da9bbe6cba09949bc60a665dfb4cc503d3914636c6231fe1842956" \
  -e BATCH_UPDATE_ENABLED=true \
  -e TZ=Asia/Shanghai \
  -e PORT=5678 \
  new-api-plus:latest
```

> **容器名 `new-api` 和镜像名 `new-api-plus:latest` 是独立的。** 容器名只是标签，镜像决定运行的版本。

### 3. 验证

```bash
docker logs -f new-api
curl http://localhost:5678/api/status
```

---

## 环境变量参考

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `SQL_DSN` | ✅ | — | `newapi:newapi_password_2026@tcp(127.0.0.1:3306)/oneapi?charset=utf8mb4&parseTime=True&loc=Local` |
| `SESSION_SECRET` | ✅ | — | 会话密钥 |
| `BATCH_UPDATE_ENABLED` | 推荐 | false | 额度批量更新优化 |
| `TZ` | 推荐 | UTC | 设为 `Asia/Shanghai` |
| `PORT` | 可选 | 3000 | 设为 `5678` |
| `MEMORY_CACHE_ENABLED` | 可选 | true | 内存缓存 |
| `SYNC_FREQUENCY` | 可选 | 60 | 配置同步频率（秒） |
| `SQL_MAX_IDLE_CONNS` | 可选 | 100 | DB 最大空闲连接数 |
| `SQL_MAX_OPEN_CONNS` | 可选 | 1000 | DB 最大打开连接数 |

---

## 更新部署

```bash
# 1. 在测试服务器上：拉取代码、构建、导出
cd new-api-plus
git pull origin main
docker build -t new-api-plus:latest .
docker save new-api-plus:latest | gzip > /tmp/new-api-plus.tar.gz

# 2. 传输到香港主服务器
scp /tmp/new-api-plus.tar.gz root@香港服务器IP:/tmp/

# 3. 在香港服务器上：备份旧镜像、导入新镜像、替换容器
docker tag new-api-plus:latest new-api-plus:stable-backup
docker load < /tmp/new-api-plus.tar.gz
docker stop new-api && docker rm new-api

# 4. 重新启动（同上面的 docker run 命令）
```

> 数据库变更通过 AutoMigrate 自动处理，不影响已有数据。

---

## 数据库备份

每日自动备份到 `/data/mysql_backup/`。

```bash
# 手动备份
mysqldump -u newapi -pnewapi_password_2026 oneapi > /data/mysql_backup/new-api-$(date +%Y%m%d%H%M%S).sql
```

---

## 监控

每 5 分钟自动检测，异常通过 Server 酱微信通知。脚本路径：`/root/monitor.sh`

| 检查项 | 阈值 |
|--------|------|
| 容器状态 | `new-api`、`nginx-proxy-manager`、`cli-proxy-api-plus` 必须 running |
| API 可用性 | `http://127.0.0.1:5678/api/status` 返回 200 |
| MySQL 连接 | 能正常查询 |
| 主从状态 | IO/SQL 线程 Yes，延迟 < 60 秒 |
| 磁盘 | < 85% |
| 内存 | < 90% |
| 每日备份 | `/data/mysql_backup/` 下有当日文件 |

---

## 故障排查

| 问题 | 排查方式 |
|------|----------|
| 容器无法启动 | `docker logs new-api` |
| 数据库连接失败 | 检查 `SQL_DSN`，`mysql -u root -pmysql_onlywjt -e "SELECT 1"` |
| 前端页面空白 | 确认镜像构建时前端编译成功 |
| 主从同步异常 | `mysql -u root -pmysql_onlywjt -e "SHOW SLAVE STATUS\G"` |

---

## 新功能配置

### 用户并发限制

控制每个用户同时在执行的 API 请求数量。超限返回 `429`。

**后台路径**：系统设置 → 并发限制

| 配置项 | 默认值 |
|--------|--------|
| 全局开关 | 关闭 |
| 免费用户并发数 | 1 |
| 付费用户并发数 | 5 |

> 管理员不受限制。可为指定用户设置独立上限。

### 时间段动态倍率

根据时间段、模型、分组自动调整计费倍率（如夜间打折）。

**后台路径**：系统设置 → 时间动态倍率

- 使用**服务器本地时间**，确保 `TZ=Asia/Shanghai`
- 支持跨午夜、通配符匹配
- 仅影响服务端计费，客户端零影响

---

## 回退方案

> [!CAUTION]
> 上线新版本前，务必准备好回退手段。

### 第一级：功能级回退（无需重启）

在管理后台关闭功能开关即可，**实时生效**：

| 功能 | 效果 |
|------|------|
| 并发限制 → 关闭 | 所有用户不再受限 |
| 时间段倍率 → 关闭 | 按原价计费 |

### 第二级：版本级回退

```bash
# 1. 备份数据库
mysqldump -u newapi -pnewapi_password_2026 oneapi > /data/mysql_backup/new-api-rollback-$(date +%Y%m%d%H%M%S).sql

# 2. 用旧镜像重新启动
docker stop new-api && docker rm new-api
docker run -d \
  --name new-api \
  --restart always \
  --network host \
  -v /data/new-api:/data \
  -e SQL_DSN="newapi:newapi_password_2026@tcp(127.0.0.1:3306)/oneapi?charset=utf8mb4&parseTime=True&loc=Local" \
  -e SESSION_SECRET="0e7c7788d2da9bbe6cba09949bc60a665dfb4cc503d3914636c6231fe1842956" \
  -e BATCH_UPDATE_ENABLED=true \
  -e TZ=Asia/Shanghai \
  -e PORT=5678 \
  new-api-plus:stable-backup
```

**清理新版本数据（可选）**：

```sql
DROP TABLE IF EXISTS user_concurrency_overrides;
DELETE FROM options WHERE `key` LIKE 'concurrency_setting.%';
DELETE FROM options WHERE `key` LIKE 'time_dynamic_ratio_setting.%';
```

### 回退检查清单

- [ ] 旧镜像 `new-api-plus:stable-backup` 存在
- [ ] 数据库已备份
- [ ] 用旧镜像启动容器
- [ ] `curl http://localhost:5678/api/status` 返回正常
- [ ] 用户 API 请求无异常
- [ ] 监控脚本正常（`/root/monitor.sh`）
