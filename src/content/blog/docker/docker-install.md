---
title: "Docker 完全安装指南"
pubDate: 2024-01-15
description: "涵盖 CentOS、Ubuntu 常见系统的 Docker 安装教程，包含详细步骤和常见问题排查"
tags: ["docker", "教程", "DevOps", "容器化"]
#coverImage: "/images/docker-cover.jpg"
readingTime: 15
pinned: true

# 系列文章
series:
  name: "Docker 入门到实战"
  order: 1
---


# Docker 安装指南

Docker 是一个开源的应用容器引擎，让开发者可以打包他们的应用以及依赖包到一个可移植的容器中。本文将详细介绍在各种主流操作系统上安装 Docker 的方法。

> [!info] 安装前须知
> - **系统要求**：64 位操作系统，内核版本 3.10 以上
> - **检查命令**：`uname -r` 查看内核版本
> - **内存建议**：至少 2GB 可用内存

---

## 一、CentOS/RHEL 系统安装

### 1.1 卸载旧版本

如果系统中存在旧版本的 Docker，建议先卸载：

```bash
sudo yum remove docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine
```

### 1.2 安装依赖工具

```bash
sudo yum install -y yum-utils device-mapper-persistent-data lvm2
```

### 1.3 配置 Docker 仓库

使用阿里云镜像源加速下载：

```bash
sudo yum-config-manager \
    --add-repo \
    https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
```

### 1.4 安装 Docker Engine

```bash
# 安装最新版本
sudo yum install -y docker-ce docker-ce-cli containerd.io

# 或者安装指定版本
# 查看可用版本
yum list docker-ce --showduplicates | sort -r

# 安装特定版本（例如 20.10.9）
sudo yum install -y docker-ce-20.10.9 docker-ce-cli-20.10.9 containerd.io
```

### 1.5 启动并验证

```bash
# 启动 Docker 服务
sudo systemctl start docker

# 设置开机自启
sudo systemctl enable docker

# 验证安装
docker --version
docker run hello-world
```

> [!tip] 阿里云镜像加速
> 编辑 `/etc/docker/daemon.json` 配置镜像加速：
> ```json
> {
>   "registry-mirrors": ["https://你的ID.mirror.aliyuncs.com"]
> }
> ```

---

## 二、Ubuntu/Debian 系统安装

### 2.1 卸载旧版本

```bash
sudo apt-get remove docker docker-engine docker.io containerd runc
```

### 2.2 更新包索引

```bash
sudo apt-get update
```

### 2.3 安装必要依赖

```bash
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release
```

### 2.4 添加 Docker 官方 GPG 密钥

```bash
curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
```

### 2.5 设置稳定版仓库

```bash
echo \
  "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://mirrors.aliyun.com/docker-ce/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

### 2.6 安装 Docker

```bash
# 更新包索引
sudo apt-get update

# 安装最新版本
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# 查看可用版本
apt-cache madison docker-ce

# 安装特定版本
sudo apt-get install -y docker-ce=5:20.10.9~3-0~ubuntu-focal docker-ce-cli=5:20.10.9~3-0~ubuntu-focal containerd.io
```

### 2.7 验证安装

```bash
# 检查版本
docker --version

# 运行测试容器
sudo docker run hello-world

# 查看 Docker 状态
sudo systemctl status docker
```

---

## 三、安装后配置

### 3.1 非 root 用户使用 Docker

> [!note] 安全提示
> 默认情况下，只有 root 用户和 docker 组的用户才能运行 Docker 命令。

```bash
# 创建 docker 组（通常已存在）
sudo groupadd docker

# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER

# 应用更改（重新登录或执行）
newgrp docker

# 验证
docker run hello-world
```

### 3.2 配置镜像加速

#### Linux 系统

```bash
# 创建/编辑配置文件
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ],
  "exec-opts": ["native.cgroupdriver=systemd"],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m"
  },
  "storage-driver": "overlay2"
}
EOF

# 重启 Docker
sudo systemctl daemon-reload
sudo systemctl restart docker
```

### 3.3 常用 Docker 命令

```bash
# 查看 Docker 信息
docker info

# 查看容器列表
docker ps -a

# 查看镜像列表
docker images

# 拉取镜像
docker pull nginx:latest

# 运行容器
docker run -d -p 80:80 --name my-nginx nginx

# 停止容器
docker stop my-nginx

# 删除容器
docker rm my-nginx

# 删除镜像
docker rmi nginx
```

---

## 四、常见问题排查

### 4.1 Docker 服务无法启动

```bash
# 查看详细错误信息
sudo journalctl -u docker.service

# 检查配置文件语法
sudo dockerd --debug
```

### 4.2 权限 denied 错误

```bash
# 错误：Got permission denied while trying to connect to Docker daemon
# 解决：将用户加入 docker 组并重新登录
sudo usermod -aG docker $USER
```

### 4.3 镜像拉取失败

```bash
# 检查网络连接
ping registry-1.docker.io

# 配置镜像加速（见上文）
# 或使用代理
sudo mkdir -p /etc/systemd/system/docker.service.d
sudo tee /etc/systemd/system/docker.service.d/http-proxy.conf <<EOF
[Service]
Environment="HTTP_PROXY=http://proxy.example.com:8080/"
Environment="HTTPS_PROXY=http://proxy.example.com:8080/"
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
```

### 4.4 存储驱动问题

```bash
# 检查当前存储驱动
docker info | grep "Storage Driver"

# 如果使用的是 vfs，建议切换到 overlay2
# 编辑 /etc/docker/daemon.json
{
  "storage-driver": "overlay2"
}
```

---

## 五、卸载 Docker

### 5.1 CentOS/RHEL

```bash
sudo yum remove docker-ce docker-ce-cli containerd.io
docker-images
sudo rm -rf /var/lib/docker
sudo rm -rf /var/lib/containerd
```

### 5.2 Ubuntu/Debian

```bash
sudo apt-get purge docker-ce docker-ce-cli containerd.io
docker-images
sudo rm -rf /var/lib/docker
sudo rm -rf /var/lib/containerd
```

---

## 总结

本文详细介绍了在主流操作系统上安装 Docker 的方法，包括：

| 系统 | 推荐安装方式 |
|------|-------------|
| CentOS 7/8 | yum + 阿里云镜像源 |
| Ubuntu/Debian | apt + 阿里云镜像源 |

安装完成后，建议配置镜像加速以获得更好的使用体验。如果在安装过程中遇到问题，可以参考本文的常见问题排查章节。

> [!tip] 下一步
> 完成安装后，建议学习 [Docker 常用命令](./docker-commands) 和 [Dockerfile 编写指南](./dockerfile-guide)，开始你的容器化之旅！
