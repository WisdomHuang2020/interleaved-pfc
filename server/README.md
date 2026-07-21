# Interleaved PFC Server

Express + SQLite 后端服务，为交错并联PFC设计工具提供API支持。

## 部署到 Render

1. 在 Render 创建新的 Web Service
2. 选择本 `server/` 目录作为根目录
3. 运行时选择 Node.js
4. 构建命令: `npm install`
5. 启动命令: `npm start`
6. 添加环境变量: `NODE_ENV=production`

或使用 `render.yaml` 蓝图自动部署。

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/designs` | 获取所有设计 |
| GET | `/api/designs/:id` | 获取单个设计 |
| POST | `/api/designs` | 创建设计 |
| PUT | `/api/designs/:id` | 更新设计 |
| DELETE | `/api/designs/:id` | 删除设计 |
| POST | `/api/calculate` | 计算PFC参数（无状态） |

## 本地开发

```bash
cd server
npm install
npm run dev
```
