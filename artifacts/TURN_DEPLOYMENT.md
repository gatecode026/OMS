# Coturn STUN/TURN Production Deployment Guide
This guide provides a comprehensive walkthrough to deploy a highly secure, high-performance Coturn STUN/TURN server on a Linux instance (Ubuntu/Debian) to serve as a fallback signaling proxy for the OMS calling system.

---

## 1. System Requirements & Port Allocation
WebRTC direct P2P connections fail in ~15-20% of cases due to strict symmetric NATs, firewalls, and proxy setups. A TURN server relays media packets to guarantee connection success.

### Required Ports & Firewalls
You must open the following ports on your cloud provider (e.g. AWS Security Groups, DigitalOcean Firewalls, or UFW):

| Port | Protocol | Type | Description |
|---|---|---|---|
| **3478** | UDP & TCP | Inbound | Default STUN/TURN Listening Port |
| **5349** | UDP & TCP | Inbound | Secure TLS (TURNS) Port (Bypasses Firewalls) |
| **49152-65535** | UDP | Inbound | Ephemeral Media Relay Range (Standard WebRTC) |

---

## 2. Installation on Linux
Update the package manager and install `coturn`:

```bash
sudo apt-get update
sudo apt-get install -y coturn
```

Ensure the Coturn service is configured to start automatically on system boot:

```bash
# Edit the default daemon setting
sudo nano /etc/default/coturn
```

Find the line containing `TURNSERVER_ENABLED` and ensure it is uncommented and set to `1`:
```ini
TURNSERVER_ENABLED=1
```

---

## 3. Configuration Setup
Create or overwrite the main configuration file at `/etc/coturn/turnserver.conf` using the template provided in [coturn.conf](file:///r:/OMS/backend/coturn.conf):

```bash
sudo mv /etc/coturn/turnserver.conf /etc/coturn/turnserver.conf.backup
sudo nano /etc/coturn/turnserver.conf
```

### Dynamic Credential Generation (HMAC-SHA1)
To prevent unauthorized users from abusing your TURN server bandwidth, configure long-term credentials using a dynamic token mechanism.

1. Generate a secure, 32-character shared secret key:
   ```bash
   openssl rand -hex 16
   # Example Output: 4e9d30afb120c156d89fa300bc8efc98
   ```

2. Add the following parameters to `/etc/coturn/turnserver.conf`:
   ```ini
   use-auth-secret
   static-auth-secret=4e9d30afb120c156d89fa300bc8efc98
   realm=gatexpay.co.in
   ```

3. Restart the server to apply configurations:
   ```bash
   sudo systemctl restart coturn
   sudo systemctl status coturn
   ```

---

## 4. SSL/TLS Certificate Setup (TURNS)
To support `turns://` (TURN over TLS on port `5349`), Coturn needs access to a valid SSL certificate. You can obtain one for free using Let's Encrypt Certbot.

1. Install Certbot and request a certificate:
   ```bash
   sudo apt install -y certbot
   sudo certbot certonly --standalone -d turn.gatexpay.co.in
   ```

2. Point Coturn to your certificate path:
   ```ini
   # Add to /etc/coturn/turnserver.conf
   cert=/etc/letsencrypt/live/turn.gatexpay.co.in/fullchain.pem
   pkey=/etc/letsencrypt/live/turn.gatexpay.co.in/privkey.pem
   ```

3. Because Coturn runs under the `turnserver` user, grant permission to read Let's Encrypt directories:
   ```bash
   sudo chown -R turnserver:turnserver /etc/letsencrypt/archive/
   sudo chown -R turnserver:turnserver /etc/letsencrypt/live/
   ```

---

## 5. Integrating with useWebRTC.js
In your React client, update the iceServers configuration inside [useWebRTC.js](file:///r:/OMS/frontend/src/hooks/useWebRTC.js) to leverage your newly deployed TURN servers:

```javascript
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:turn.gatexpay.co.in:3478',
      username: 'oms_user',
      credential: 'YOUR_PRODUCTION_SHARED_SECRET_2026'
    },
    {
      urls: 'turns:turn.gatexpay.co.in:5349',
      username: 'oms_user',
      credential: 'YOUR_PRODUCTION_SHARED_SECRET_2026'
    }
  ]
};
```

---

## 6. Verification & Diagnostics
Use the free online [Trickle ICE tool](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/) to test your deployment:
1. Open the page and select "Add Server".
2. Enter your TURN URL (e.g., `turn:turn.gatexpay.co.in:3478`), your configured username, and your secret.
3. Click "Gather Candidates".
4. Verify that candidates of type `relay` are successfully gathered. If you see `relay` candidates, your TURN server is working!
