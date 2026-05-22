/**
 * useWebRTCEnterprise.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Enterprise-grade WebRTC utilities for JointRight.
 *
 * Provides:
 *   1. getEnterpriseICEServers()   – Authenticated TURN/STUN server list
 *                                    (UDP + TCP + TLS/443) read from .env
 *   2. applySimulcast(sender)      – Configure 3-layer simulcast encodings
 *                                    (180p / 360p / 720p) on an RTCRtpSender
 *   3. selectSimulcastLayer(stats) – Adaptive quality: choose rid based on
 *                                    jitter/packet-loss thresholds
 *   4. useICERestartManager()      – React hook: 3-second timer triggers
 *                                    peer.restartIce() on 'disconnected'
 *   5. useBandwidthMonitor()       – React hook: polls getStats() every 2 s,
 *                                    disables video when bitrate < 200 kbps
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useCallback } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum outgoing bitrate (kbps) before audio-only mode activates. */
const BANDWIDTH_THRESHOLD_KBPS =
  Number(process.env.REACT_APP_BANDWIDTH_THRESHOLD_KBPS) || 200;

/** Hysteresis: bitrate must recover above this to re-enable video. */
const BANDWIDTH_RECOVERY_KBPS =
  Number(process.env.REACT_APP_BANDWIDTH_RECOVERY_KBPS) || 300;

/** Jitter (ms) above this triggers simulcast layer downgrade. */
const JITTER_THRESHOLD_MS =
  Number(process.env.REACT_APP_JITTER_THRESHOLD_MS) || 30;

/** Packet loss (%) above this triggers simulcast layer downgrade. */
const LOSS_THRESHOLD_PCT =
  Number(process.env.REACT_APP_LOSS_THRESHOLD_PCT) || 5;

/** How long (ms) the connection must be in 'disconnected' before ICE restart. */
const ICE_DISCONNECT_TIMEOUT_MS = 3000;

/** getStats polling interval (ms). */
const STATS_POLL_INTERVAL_MS = 2000;

// ─── 1. Enterprise ICE Server Configuration ──────────────────────────────────

/**
 * Returns an RTCConfiguration.iceServers array with:
 *  - Google + Twilio STUN servers
 *  - TURN over UDP  (standard)
 *  - TURN over TCP  (corporate firewall fallback)
 *  - TURN over TLS  (port 443 — bypasses deep-packet-inspection)
 *
 * Credentials are read from env variables so they can be rotated without
 * code changes. Falls back to the free openrelay servers in development.
 */
export function getEnterpriseICEServers() {
  const username =
    process.env.REACT_APP_TURN_USERNAME || 'openrelayproject';
  const credential =
    process.env.REACT_APP_TURN_CREDENTIAL || 'openrelayproject';

  const turnUDP =
    process.env.REACT_APP_TURN_UDP_URL || 'turn:openrelay.metered.ca:80';
  const turnTCP =
    process.env.REACT_APP_TURN_TCP_URL || 'turn:openrelay.metered.ca:443';
  const turnsTLS =
    process.env.REACT_APP_TURN_TLS_URL || 'turns:openrelay.metered.ca:443';

  return [
    // ── STUN ──────────────────────────────────────────────────────────────
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },

    // ── TURN / UDP ─────────────────────────────────────────────────────────
    // Primary relay — works on most open networks
    { urls: turnUDP, username, credential },

    // ── TURN / TCP port 443 ────────────────────────────────────────────────
    // Fallback for networks that block all UDP and non-443 TCP
    { urls: turnTCP, username, credential },

    // ── TURNS / TLS port 443 ──────────────────────────────────────────────
    // Last resort: encrypted relay that appears as HTTPS to firewalls.
    // Critical for corporate proxies + guest Wi-Fi with DPI.
    { urls: turnsTLS, username, credential },
  ];
}

// ─── 2. Simulcast Configuration ───────────────────────────────────────────────

/**
 * Supported simulcast layer identifiers (RTP stream IDs).
 *   low    → 180p  ~  150 kbps
 *   medium → 360p  ~  500 kbps
 *   high   → 720p  ~ 1500 kbps
 */
export const SIMULCAST_LAYERS = {
  low:    { rid: 'low',    maxBitrate: 150_000,  scaleResolutionDownBy: 4 },
  medium: { rid: 'medium', maxBitrate: 500_000,  scaleResolutionDownBy: 2 },
  high:   { rid: 'high',   maxBitrate: 1_500_000, scaleResolutionDownBy: 1 },
};

/**
 * Check whether the browser supports simulcast via setParameters.
 * Chrome ≥ 73 and Edge Chromium support it.  Firefox is partial.  Safari: no.
 */
function supportsSimulcast() {
  try {
    const pc = new RTCPeerConnection();
    const supported = typeof pc.addTransceiver === 'function';
    pc.close();
    return supported;
  } catch {
    return false;
  }
}

/**
 * Apply 3-layer simulcast encodings to an RTCRtpSender.
 *
 * @param {RTCRtpSender} sender  – Video sender from peer._pc.getSenders()
 * @returns {Promise<boolean>}   – true if applied, false if not supported
 */
export async function applySimulcast(sender) {
  if (!sender || !sender.track || sender.track.kind !== 'video') return false;
  if (!supportsSimulcast()) {
    console.warn('[Simulcast] Browser does not support simulcast. Skipping.');
    return false;
  }

  try {
    const params = sender.getParameters();

    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [];
    }

    // Replace existing encodings with our 3-layer spec
    params.encodings = [
      {
        rid: SIMULCAST_LAYERS.low.rid,
        active: true,
        maxBitrate: SIMULCAST_LAYERS.low.maxBitrate,
        scaleResolutionDownBy: SIMULCAST_LAYERS.low.scaleResolutionDownBy,
        priority: 'low',
      },
      {
        rid: SIMULCAST_LAYERS.medium.rid,
        active: true,
        maxBitrate: SIMULCAST_LAYERS.medium.maxBitrate,
        scaleResolutionDownBy: SIMULCAST_LAYERS.medium.scaleResolutionDownBy,
        priority: 'medium',
      },
      {
        rid: SIMULCAST_LAYERS.high.rid,
        active: true,
        maxBitrate: SIMULCAST_LAYERS.high.maxBitrate,
        scaleResolutionDownBy: SIMULCAST_LAYERS.high.scaleResolutionDownBy,
        priority: 'high',
      },
    ];

    await sender.setParameters(params);
    console.log('[Simulcast] ✅ 3-layer encodings applied (180p/360p/720p)');
    return true;
  } catch (err) {
    console.warn('[Simulcast] ⚠️  setParameters failed:', err.message);
    // Graceful fallback: apply single-layer 500 kbps cap
    try {
      const params = sender.getParameters();
      if (!params.encodings) params.encodings = [{}];
      params.encodings[0].maxBitrate = 500_000;
      await sender.setParameters(params);
    } catch (fallbackErr) {
      console.warn('[Simulcast] Fallback bitrate cap also failed:', fallbackErr.message);
    }
    return false;
  }
}

// ─── 3. Adaptive Simulcast Layer Selector ────────────────────────────────────

/**
 * Given a network stats object, return the best simulcast rid.
 *
 * Downgrade logic:
 *   • jitter  > JITTER_THRESHOLD_MS  (default 30 ms)  → drop one layer
 *   • packetLoss > LOSS_THRESHOLD_PCT (default 5%)      → drop one layer
 *   • Both bad                                          → use 'low'
 *
 * @param {{ jitterMs: number, packetLossPct: number, bandwidthKbps: number }} stats
 * @param {string} currentRid  – 'low' | 'medium' | 'high'
 * @returns {string}  – recommended rid
 */
export function selectSimulcastLayer(stats, currentRid = 'high') {
  const { jitterMs = 0, packetLossPct = 0, bandwidthKbps = Infinity } = stats;

  const jitterBad = jitterMs > JITTER_THRESHOLD_MS;
  const lossBad   = packetLossPct > LOSS_THRESHOLD_PCT;
  const bwBad     = bandwidthKbps < 500;

  if (jitterBad && lossBad) return SIMULCAST_LAYERS.low.rid;
  if (jitterBad || lossBad || bwBad) {
    if (currentRid === 'high')   return SIMULCAST_LAYERS.medium.rid;
    if (currentRid === 'medium') return SIMULCAST_LAYERS.low.rid;
    return SIMULCAST_LAYERS.low.rid;
  }

  // Network is healthy — step up if possible
  if (currentRid === 'low' && bandwidthKbps > 600)    return SIMULCAST_LAYERS.medium.rid;
  if (currentRid === 'medium' && bandwidthKbps > 1600) return SIMULCAST_LAYERS.high.rid;

  return currentRid;
}

/**
 * Apply a simulcast layer switch to all video senders of a peer connection.
 * Deactivates layers above the target rid.
 *
 * @param {RTCPeerConnection} pc   – peer._pc
 * @param {string} targetRid       – 'low' | 'medium' | 'high'
 */
export async function switchSimulcastLayer(pc, targetRid) {
  if (!pc || !pc.getSenders) return;

  const layerOrder = ['low', 'medium', 'high'];
  const targetIndex = layerOrder.indexOf(targetRid);
  if (targetIndex === -1) return;

  const senders = pc.getSenders();
  for (const sender of senders) {
    if (!sender.track || sender.track.kind !== 'video') continue;
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length < 2) continue;

      let changed = false;
      params.encodings = params.encodings.map((enc) => {
        const encIndex = layerOrder.indexOf(enc.rid);
        const shouldBeActive = encIndex !== -1 && encIndex <= targetIndex;
        if (enc.active !== shouldBeActive) {
          changed = true;
          return { ...enc, active: shouldBeActive };
        }
        return enc;
      });

      if (changed) {
        await sender.setParameters(params);
        console.log(`[Simulcast] 🔀 Switched to layer "${targetRid}"`);
      }
    } catch (err) {
      console.warn('[Simulcast] Layer switch failed:', err.message);
    }
  }
}

// ─── 4. ICE Restart Manager Hook ─────────────────────────────────────────────

/**
 * React hook that monitors all peer connections for the 'disconnected' ICE
 * state and triggers an ICE restart after ICE_DISCONNECT_TIMEOUT_MS (3 s).
 *
 * Usage:
 *   const { restartStats } = useICERestartManager(peersRef, socketRef, showNotification);
 *
 * @param {React.MutableRefObject} peersRef         – ref to peersRef.current array
 * @param {React.MutableRefObject} socketRef        – ref to Socket.IO socket
 * @param {Function}               showNotification – UI notification callback
 */
export function useICERestartManager(peersRef, socketRef, showNotification) {
  // Map of peerID → timeout handle
  const restartTimers = useRef(new Map());
  const restartCount  = useRef(0);

  const scheduleRestart = useCallback((peer, peerID) => {
    if (restartTimers.current.has(peerID)) return; // already scheduled

    console.warn(`[ICE Restart] ⏳ Peer ${peerID} disconnected — restarting in ${ICE_DISCONNECT_TIMEOUT_MS / 1000}s`);

    const timer = setTimeout(async () => {
      restartTimers.current.delete(peerID);

      if (!peer || peer.destroyed) return;
      const pc = peer._pc;
      if (!pc) return;

      const state = pc.iceConnectionState;
      if (state !== 'disconnected' && state !== 'failed') {
        console.log(`[ICE Restart] Peer ${peerID} recovered on its own (state: ${state})`);
        return;
      }

      try {
        restartCount.current += 1;
        console.warn(`[ICE Restart] 🔄 Initiating ICE restart for peer ${peerID} (attempt #${restartCount.current})`);

        if (typeof pc.restartIce === 'function') {
          // Modern API (Chrome ≥ 77, Firefox ≥ 70)
          pc.restartIce();
        } else if (peer.initiator) {
          // Fallback: trigger re-negotiation via simple-peer internal
          peer._needsNegotiation?.();
        }

        showNotification?.('Reconnecting to a participant… Please wait.', 'warning', 4000);

        // Notify the signaling server so the remote peer knows to expect a new offer
        socketRef.current?.emit('ice-restart-offer', { targetPeerID: peerID });
      } catch (err) {
        console.error('[ICE Restart] Failed:', err.message);
      }
    }, ICE_DISCONNECT_TIMEOUT_MS);

    restartTimers.current.set(peerID, timer);
  }, [socketRef, showNotification]);

  const cancelRestart = useCallback((peerID) => {
    const timer = restartTimers.current.get(peerID);
    if (timer) {
      clearTimeout(timer);
      restartTimers.current.delete(peerID);
      console.log(`[ICE Restart] ✅ Cancelled restart for ${peerID} (recovered)`);
    }
  }, []);

  /**
   * Attach ICE state listeners to a newly created peer.
   * Call this inside createPeer / addPeer after the Peer object is made.
   *
   * @param {SimplePeer.Instance} peer
   * @param {string}              peerID
   */
  const attachToPeer = useCallback((peer, peerID) => {
    if (!peer?._pc) return;

    peer._pc.addEventListener('iceconnectionstatechange', () => {
      const state = peer._pc?.iceConnectionState;
      console.log(`[ICE] Peer ${peerID} → ${state}`);

      switch (state) {
        case 'disconnected':
          scheduleRestart(peer, peerID);
          break;
        case 'failed':
          // Immediate restart on 'failed' (no grace period needed)
          cancelRestart(peerID);
          scheduleRestart(peer, peerID);
          break;
        case 'connected':
        case 'completed':
          cancelRestart(peerID);
          break;
        default:
          break;
      }
    });
  }, [scheduleRestart, cancelRestart]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      restartTimers.current.forEach((timer) => clearTimeout(timer));
      restartTimers.current.clear();
    };
  }, []);

  return { attachToPeer, cancelRestart, restartCount };
}

// ─── 5. Bandwidth Monitor Hook ────────────────────────────────────────────────

/**
 * React hook that polls RTCPeerConnection.getStats() every STATS_POLL_INTERVAL_MS
 * and provides:
 *   - bandwidthKbps   – current estimated available outgoing bandwidth
 *   - jitterMs        – average jitter across all video outbound streams
 *   - packetLossPct   – current packet loss percentage
 *   - isAudioOnlyMode – true when bandwidth < BANDWIDTH_THRESHOLD_KBPS
 *
 * When bandwidth drops below threshold, automatically disables the local
 * video track and calls onAudioOnlyChange(true).
 *
 * @param {React.MutableRefObject} peersRef           – array of { peer, peerID }
 * @param {MediaStream|null}       userStream         – local media stream
 * @param {Function}               onAudioOnlyChange  – callback(isAudioOnly: bool)
 * @param {Function}               showNotification   – UI notification callback
 * @param {boolean}                enabled            – toggle monitoring on/off
 */
export function useBandwidthMonitor(peersRef, userStream, onAudioOnlyChange, showNotification, enabled = true) {
  const isAudioOnlyRef  = useRef(false);
  const pollInterval    = useRef(null);
  const prevStats       = useRef(new Map()); // ssrc → { bytesSent, timestamp }

  const stopPolling = useCallback(() => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
  }, []);

  const poll = useCallback(async () => {
    // Pick the first available peer connection to sample stats from
    const activePeers = (peersRef.current || []).filter(
      (p) => p?.peer && !p.peer.destroyed && p.peer._pc
    );
    if (activePeers.length === 0) return;

    let totalBandwidthBps  = 0;
    let totalJitterMs      = 0;
    let totalPacketLoss    = 0;
    let statCount          = 0;

    for (const { peer, peerID } of activePeers) {
      try {
        const pc    = peer._pc;
        const stats = await pc.getStats();

        stats.forEach((report) => {
          // ── Outbound RTP (video) ───────────────────────────────────────
          if (report.type === 'outbound-rtp' && report.mediaType === 'video') {
            const prev = prevStats.current.get(report.ssrc) || { bytesSent: 0, timestamp: report.timestamp };
            const bytesDelta  = report.bytesSent - prev.bytesSent;
            const timeDeltaMs = report.timestamp  - prev.timestamp;

            if (timeDeltaMs > 0) {
              const bps = (bytesDelta * 8 * 1000) / timeDeltaMs;
              totalBandwidthBps += bps;
              statCount++;
            }

            prevStats.current.set(report.ssrc, {
              bytesSent: report.bytesSent,
              timestamp: report.timestamp,
            });
          }

          // ── Candidate pair (available bitrate) ────────────────────────
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            if (report.availableOutgoingBitrate) {
              totalBandwidthBps = Math.max(totalBandwidthBps, report.availableOutgoingBitrate);
            }
          }

          // ── Inbound RTP (jitter + packet loss on receiving side) ───────
          if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
            if (report.jitter !== undefined) {
              totalJitterMs += report.jitter * 1000; // seconds → ms
            }
            if (report.packetsLost !== undefined && report.packetsReceived !== undefined) {
              const total = report.packetsLost + report.packetsReceived;
              if (total > 0) {
                totalPacketLoss += (report.packetsLost / total) * 100;
              }
            }
            statCount++;
          }
        });
      } catch (err) {
        // getStats can throw if the connection is torn down mid-poll
        console.warn(`[BandwidthMonitor] getStats failed for peer ${peerID}:`, err.message);
      }
    }

    const bandwidthKbps  = Math.round(totalBandwidthBps / 1000);
    const avgJitterMs    = statCount > 0 ? Math.round(totalJitterMs / statCount) : 0;
    const avgLossPct     = statCount > 0 ? Math.round(totalPacketLoss / statCount) : 0;

    // Emit a custom DOM event so the component can subscribe without prop drilling
    window.dispatchEvent(new CustomEvent('webrtc-stats-update', {
      detail: { bandwidthKbps, jitterMs: avgJitterMs, packetLossPct: avgLossPct }
    }));

    // ── Audio-only mode transition ─────────────────────────────────────────
    const wasAudioOnly = isAudioOnlyRef.current;

    if (!wasAudioOnly && bandwidthKbps > 0 && bandwidthKbps < BANDWIDTH_THRESHOLD_KBPS) {
      // Bandwidth degraded → enter audio-only mode
      isAudioOnlyRef.current = true;
      disableLocalVideo(userStream);
      onAudioOnlyChange?.(true, bandwidthKbps);
      showNotification?.(
        `⚠️ Low bandwidth detected (${bandwidthKbps} kbps). Switching to Audio Only to maintain call quality.`,
        'warning',
        8000
      );
      console.warn(`[BandwidthMonitor] 🔇 Audio-only mode ON — ${bandwidthKbps} kbps < ${BANDWIDTH_THRESHOLD_KBPS} kbps`);
    } else if (wasAudioOnly && bandwidthKbps >= BANDWIDTH_RECOVERY_KBPS) {
      // Bandwidth recovered → exit audio-only mode
      isAudioOnlyRef.current = false;
      onAudioOnlyChange?.(false, bandwidthKbps);
      showNotification?.(
        `✅ Bandwidth recovered (${bandwidthKbps} kbps). You can re-enable your camera.`,
        'success',
        5000
      );
      console.log(`[BandwidthMonitor] 📶 Bandwidth recovered — ${bandwidthKbps} kbps ≥ ${BANDWIDTH_RECOVERY_KBPS} kbps`);
    }
  }, [peersRef, userStream, onAudioOnlyChange, showNotification]);

  useEffect(() => {
    if (!enabled) {
      stopPolling();
      return;
    }

    // Start polling after a short delay to let connections stabilise
    const startDelay = setTimeout(() => {
      pollInterval.current = setInterval(poll, STATS_POLL_INTERVAL_MS);
    }, 5000);

    return () => {
      clearTimeout(startDelay);
      stopPolling();
      prevStats.current.clear();
    };
  }, [enabled, poll, stopPolling]);

  return { stopPolling };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function disableLocalVideo(userStream) {
  if (!userStream) return;
  userStream.getVideoTracks().forEach((track) => {
    track.enabled = false;
  });
}
