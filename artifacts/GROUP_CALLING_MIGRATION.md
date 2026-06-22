# Group Calling Migration Blueprint: P2P to SFU (LiveKit)

This blueprint documents the strategic roadmap, technology evaluation, and technical design required to transition the OMS call and video engine from Peer-to-Peer (P2P Mesh) to a Selective Forwarding Unit (SFU) architecture. This shift allows the system to scale from 2 participants to 100+ concurrent users per room with adaptive WebRTC quality.

---

## 1. Why Move from P2P Mesh to SFU?

The current system uses P2P (SimplePeer) where every participant connects directly to every other participant. While P2P is cost-effective and low-latency for 1-on-1 calls, it fails to scale for group calls due to client-side network and CPU limitations.

### Mesh vs. SFU Resource Consumption

```
P2P Mesh (N=5)                      SFU Server (N=5)
  
     [Client A]                          [Client A]
    /  |   |  \                            |   ^
[B] ── [C] ── [D]                          v   |
    \  |   |  /                     [Client B] <-> [ SFU Server ] <-> [Client D]
     [Client E]                            ^   |
                                           |   v
                                         [Client C]
```

- **P2P Mesh**: Each client must upload $N-1$ video streams and download $N-1$ video streams. For a 5-person call, that's 4 uploads and 4 downloads per client. CPU and bandwidth utilization scale **quadratically** ($O(N^2)$).
- **SFU**: Each client uploads exactly **1** stream to the SFU server, and downloads $N-1$ streams from the server. The SFU forwards packets without transcoding, lowering server CPU consumption. Client upload bandwidth scales **constantly** ($O(1)$) and download scales **linearly** ($O(N)$).

---

## 2. WebRTC SFU Media Server Comparison

| Metric / Feature | **LiveKit** (Recommended) | **Mediasoup** | **Janus** | **Jitsi Videobridge** |
|---|---|---|---|---|
| **Language** | Go | C++ / Node.js | C | Java |
| **Scaling Model** | Node-to-Node Cluster | Multi-core workers | Thread-per-connection | JVM Clustering |
| **Simulcast support** | Built-in (Automatic) | Manual setup | Manual setup | Built-in |
| **SDK Quality** | Excellent (React, iOS, Android) | Low-level (Complex) | Very basic JS | Custom JS libraries |
| **Deployment Ease** | High (Single Binary / Docker) | Medium (NPM bindings) | Complex (C deps) | Complex |

---

## 3. Recommended SFU: LiveKit

We recommend **LiveKit** because:
1. **Developer Experience**: Modern SDKs for React, React Native, Node.js, and iOS/Android.
2. **Automatic Simulcast**: Automatically uploads three qualities (high, medium, low) and serves the appropriate resolution based on the receiver's window size and network conditions.
3. **P2P Fallback**: Automatically falls back to P2P if the server is unreachable or for 1-to-1 rooms to minimize infrastructure cost.

---

## 4. Integration Roadmap: P2P to LiveKit

### Step 1: Install SDKs
Install the server and client packages:

```bash
# Frontend
npm install @livekit/components-react livekit-client

# Backend
npm install livekit-server-sdk
```

### Step 2: Backend Room Token Generator
Create a new module `backend/src/modules/call/livekit.controller.js` to issue access tokens for rooms:

```javascript
import { AccessToken } from 'livekit-server-sdk';

export const getLiveKitToken = async (req, res) => {
  const { roomName, participantName } = req.query;

  if (!roomName || !participantName) {
    return res.status(400).json({ error: 'roomName and participantName are required' });
  }

  // Set up token settings
  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity: participantName,
      ttl: '2h', // Token expires in 2 hours
    }
  );

  // Grant permissions
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  res.json({ token: await at.toJwt() });
};
```

### Step 3: Frontend Integration
Create a new React screen component utilizing `@livekit/components-react`:

```jsx
import React, { useState, useEffect } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  formatStartEndTime
} from '@livekit/components-react';
import '@livekit/components-styles';

const LIVEKIT_URL = 'wss://your-livekit-server.gatexpay.co.in';

export const LiveKitCallScreen = ({ roomName, userName, onLeave }) => {
  const [token, setToken] = useState('');

  useEffect(() => {
    // Fetch JWT from your backend
    fetch(`/api/call/livekit-token?roomName=${roomName}&participantName=${userName}`)
      .then(res => res.json())
      .then(data => setToken(data.token))
      .catch(console.error);
  }, [roomName, userName]);

  if (!token) {
    return <div>Generating secure call token...</div>;
  }

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={LIVEKIT_URL}
      onDisconnected={onLeave}
      data-lk-theme="default"
      style={{ height: '100vh' }}
    >
      {/* Renders full Zoom/Teams-style video grid with screen-share and controls */}
      <VideoConference />
      
      {/* Handles audio output routing */}
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
};
```

---

## 5. Production Infrastructure Architecture

For deployment, LiveKit runs inside Docker and can scale horizontally behind an Nginx or HAProxy load balancer:

```
[ Clients ] ── HTTPS/WSS ──> [ Load Balancer ] 
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
      [ LiveKit Node 1 (Go) ]         [ LiveKit Node 2 (Go) ]
                 │                               │
                 └───────────────┬───────────────┘
                                 ▼
                         [ Redis Cluster ]
                         (State Sync / PubSub)
```
- **Redis**: Syncs room state and routes traffic between multiple LiveKit nodes.
- **Auto-Scaler**: Spawns new nodes when aggregate network bandwidth exceeds 80% capacity.
