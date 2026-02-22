**Architecture:** IPFS Cluster
**Network:** Cloudflare Tunnel (Zero Trust)  
**Domain:** `ipfs.snbhowmik.dev`

---


This deployment runs an **always-on IPFS node** on a headless Raspberry Pi.

Instead of exposing ports via traditional port forwarding, it uses a **Cloudflare Tunnel (`cloudflared`)** to create a secure, outbound-only connection to the public internet.


| Service | Port | Purpose |
|----------|------|----------|
| **RPC API** | `5001` | Management & WebUI |
| **Gateway** | `8080` | Public content delivery |
| **Swarm** | `4001` | Peer-to-peer discovery |

---


wget https://github.com/ipfs/kubo/releases/download/v0.32.0/kubo_v0.32.0_linux-arm64.tar.gz
tar -xvzf kubo_v0.32.0_linux-arm64.tar.gz
cd kubo && sudo ./install.sh

ipfs init --profile server
```

---


Create the service file:

`/etc/systemd/system/ipfs.service`

[Unit]
Description=IPFS Daemon
After=network.target

[Service]
User=server
Group=server
Environment=IPFS_PATH=/home/server/.ipfs
ExecStart=/usr/local/bin/ipfs daemon --migrate=true
Restart=on-failure

[Install]
WantedBy=multi-user.target

Enable and start the service:

sudo systemctl enable --now ipfs





A single tunnel is used with **path-based routing** to separate:

- Management traffic (API & WebUI)
- Public content (Gateway)

---


**Path:** `/etc/cloudflared/config.yml`

tunnel: d6dd7460-c076-48d7-9f56-d0d1bbba7cef
credentials-file: /etc/cloudflared/d6dd7460-c076-48d7-9f56-d0d1bbba7cef.json

ingress:
  # Management Access (RPC API & WebUI)
  - hostname: ipfs.snbhowmik.dev
    path: /api/v0
    service: http://localhost:5001

  - hostname: ipfs.snbhowmik.dev
    path: /webui
    service: http://localhost:5001

  # Public Content Delivery (Gateway)
  - hostname: ipfs.snbhowmik.dev
    service: http://localhost:8080
    originRequest:
      httpHostHeader: ipfs.snbhowmik.dev

  - service: http_status:404
```

---


sudo cloudflared service install
sudo systemctl enable --now cloudflared


---


# Allow API interaction via public domain
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["https://ipfs.snbhowmik.dev", "http://10.211.171.140:5001"]'

ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "POST", "GET"]'

# Configure domain as Public Gateway
ipfs config --json Gateway.PublicGateways '{"ipfs.snbhowmik.dev": {"Paths": ["/ipfs", "/ipns"], "UseOrigin": true}}'

sudo systemctl restart ipfs

---



| Interface | URL |
|------------|------|
| **Local Dashboard** | `http://10.211.171.140:5001/webui` |
| **Public Dashboard** | `https://ipfs.snbhowmik.dev/webui` |
| **Public Gateway** | `https://ipfs.snbhowmik.dev/ipfs/[CID]` |

---

Monitoring Services
sudo systemctl status ipfs
sudo systemctl status cloudflared
```

Live logs:
sudo journalctl -u cloudflared -f


---
