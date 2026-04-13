# New-API-Plus 部署文档

## 环境信息

| 项目 | 信息 |
|------|------|
| 服务器 IP | `45.207.220.152` |
| 操作系统 | Ubuntu 24.04（1Panel 管理面板） |
| 数据库 | MySQL（宿主机，用户 `newapi`，端口 3306，库 `oneapi`） |
| 缓存 | Redis（宿主机，1Panel 安装，端口 6379） |
| 部署方式 | Docker 容器（host 网络模式） |
| 服务端口 | 5678 |
| 数据目录 | `/data/new-api` → 容器内 `/data` |
| 镜像名 | `new-api-plus:latest` |

---

## 一、本地已完成的构建

以下文件位于项目 `bin/` 目录下：

```
bin/
├── Dockerfile              # Docker 构建文件
├── docker-compose.yml      # 编排配置（已对齐现有部署）
├── new-api-linux-amd64     # Go 二进制（linux/amd64, ~66MB）
└── dist/                   # 前端静态文件
    ├── index.html
    ├── assets/
    └── ...
```

本地路径：`c:\Users\onlyWjt\Documents\yer\new-api-plus\new-api-plus\bin\`

---

## 二、上传文件到服务器

> 使用 FinalShell / 1Panel 文件管理器 / WinSCP

**目标路径：** `/opt/new-api/`

将 `bin/` 目录下的以下内容上传到服务器 `/opt/new-api/`：

```
/opt/new-api/
├── Dockerfile
├── docker-compose.yml
├── new-api-linux-amd64
└── dist/
    ├── index.html
    ├── assets/
    └── ...
```

> 注意：`dist/` 需完整上传（含所有子文件和 `assets/` 目录）。

---

## 三、停止旧服务

```bash
docker stop new-api
docker rm new-api
```

---

## 四、构建并启动

```bash
cd /opt/new-api
docker compose up -d --build
```

> 这会构建新的 `new-api-plus:latest` 镜像并自动覆盖旧镜像。
> 数据目录 `/data/new-api` 保持不变，不会丢失数据。

---

## 五、验证部署

### 5.1 检查容器

```bash
docker ps | grep new-api
```

### 5.2 查看日志

```bash
docker logs --tail 50 new-api
```

正常应看到：数据库连接成功、Redis 连接成功、监听 `:5678`

### 5.3 健康检查

```bash
curl http://localhost:5678/api/status
```

### 5.4 外网访问

浏览器打开 `http://45.207.220.152:5678`

---

## 六、回滚

```bash
docker compose down

# 用旧镜像启动
docker run -d --name new-api --restart always \
  --network host \
  -v /data/new-api:/data \
  -e SQL_DSN="newapi:newapi_password_2026@tcp(127.0.0.1:3306)/oneapi?charset=utf8mb4&parseTime=True&loc=Local" \
  -e SESSION_SECRET="0e7c7788d2da9bbe6cba09949bc60a665dfb4cc503d3914636c6231fe1842956" \
  -e BATCH_UPDATE_ENABLED=true \
  -e TZ=Asia/Shanghai \
  -e PORT=5678 \
  旧镜像ID
```

---

## 七、与旧配置的差异

| 配置项 | 旧值 | 新值 |
|--------|------|------|
| REDIS_CONN_STRING | （无） | `redis://:redis_onlywjt@127.0.0.1:6379` |
| 其他所有配置 | — | 保持不变 |
