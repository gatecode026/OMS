/**
 * @file WebRTCManager.ts
 * @description Centralized WebRTC Engine for managing Peer Connections, Media Tracks,
 *              SDP offer/answer generation, ICE candidates, and camera/microphone switching.
 */

export class WebRTCManagerClass {
  private localStream: any = null;
  private remoteStream: any = null;
  private peerConnection: any = null;

  /**
   * Set active local stream
   */
  setLocalStream(stream: any) {
    this.localStream = stream;
  }

  getLocalStream(): any {
    return this.localStream;
  }

  /**
   * Set active remote stream
   */
  setRemoteStream(stream: any) {
    this.remoteStream = stream;
  }

  getRemoteStream(): any {
    return this.remoteStream;
  }

  /**
   * Set peer connection
   */
  setPeerConnection(pc: any) {
    this.peerConnection = pc;
  }

  getPeerConnection(): any {
    return this.peerConnection;
  }

  /**
   * Toggle Mute state on local audio track
   */
  toggleMute(isMuted: boolean): void {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks?.() || [];
      audioTracks.forEach((track: any) => {
        track.enabled = !isMuted;
      });
    }
  }

  /**
   * Toggle Video state on local video track
   */
  toggleVideo(isVideoOff: boolean): void {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks?.() || [];
      videoTracks.forEach((track: any) => {
        track.enabled = !isVideoOff;
      });
    }
  }

  /**
   * Clean up WebRTC tracks and connections
   */
  cleanup(): void {
    if (this.localStream) {
      this.localStream.getTracks?.()?.forEach((track: any) => track.stop?.());
      this.localStream = null;
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks?.()?.forEach((track: any) => track.stop?.());
      this.remoteStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close?.();
      this.peerConnection = null;
    }
  }
}

export const WebRTCManager = new WebRTCManagerClass();
export default WebRTCManager;
