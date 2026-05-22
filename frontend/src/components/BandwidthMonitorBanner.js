/**
 * BandwidthMonitorBanner.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Animated banner that appears when the useBandwidthMonitor hook detects
 * that the user's available outgoing bitrate has dropped below the threshold
 * and the meeting has been switched to Audio Only mode.
 *
 * Props:
 *   isAudioOnlyMode {boolean}   – whether audio-only is currently active
 *   bandwidthKbps   {number}    – current measured bandwidth in kbps
 *   jitterMs        {number}    – current avg jitter in ms
 *   packetLossPct   {number}    – current avg packet loss %
 *   onReenableVideo {Function}  – callback when user clicks "Re-enable Camera"
 *   onDismiss       {Function}  – callback to dismiss the banner manually
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState, useRef } from 'react';
import { FaWifi, FaVideoSlash, FaVideo, FaTimes, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';

const BandwidthMonitorBanner = ({
  isAudioOnlyMode = false,
  bandwidthKbps   = 0,
  jitterMs        = 0,
  packetLossPct   = 0,
  onReenableVideo,
  onDismiss,
}) => {
  const [visible, setVisible]       = useState(false);
  const [animating, setAnimating]   = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const prevMode = useRef(false);

  // Animate in/out when isAudioOnlyMode changes
  useEffect(() => {
    if (isAudioOnlyMode && !prevMode.current) {
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
    } else if (!isAudioOnlyMode && prevMode.current) {
      setAnimating(false);
      const t = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(t);
    }
    prevMode.current = isAudioOnlyMode;
  }, [isAudioOnlyMode]);

  if (!visible) return null;

  const qualityColor =
    packetLossPct > 10 || jitterMs > 60 ? '#ef4444'
    : packetLossPct > 5  || jitterMs > 30 ? '#f59e0b'
    : '#10b981';

  const bwBarWidth = Math.min(100, Math.round((bandwidthKbps / 300) * 100));

  return (
    <div
      style={{
        position:        'fixed',
        bottom:          '88px',
        left:            '50%',
        transform:       animating ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(120%)',
        transition:      'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        zIndex:          9999,
        width:           'min(520px, 92vw)',
        background:      'linear-gradient(135deg, rgba(15,15,25,0.97) 0%, rgba(30,15,45,0.97) 100%)',
        border:          '1px solid rgba(239,68,68,0.5)',
        borderRadius:    '16px',
        padding:         '16px 20px',
        backdropFilter:  'blur(20px)',
        boxShadow:       '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(239,68,68,0.2)',
        fontFamily:      'Inter, system-ui, sans-serif',
      }}
      role="alert"
      aria-live="polite"
      id="bandwidth-monitor-banner"
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'rgba(239,68,68,0.18)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <FaVideoSlash style={{ color: '#ef4444', fontSize: '16px' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            color: '#f8fafc', fontWeight: 700, fontSize: '14px', lineHeight: 1.2,
          }}>
            <FaExclamationTriangle style={{ color: '#f59e0b', fontSize: '12px', flexShrink: 0 }} />
            Audio Only Mode Active
          </div>
          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>
            Low bandwidth detected — camera paused to maintain call quality
          </div>
        </div>

        <button
          onClick={() => { setAnimating(false); onDismiss?.(); }}
          style={{
            background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px',
            color: '#94a3b8', cursor: 'pointer', padding: '6px', flexShrink: 0,
            transition: 'background 0.2s', display: 'flex', alignItems: 'center',
          }}
          title="Dismiss"
          id="bandwidth-banner-dismiss"
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
        >
          <FaTimes style={{ fontSize: '13px' }} />
        </button>
      </div>

      {/* Bandwidth bar */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          color: '#94a3b8', fontSize: '11px', marginBottom: '5px',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FaWifi style={{ fontSize: '10px' }} /> Available Bandwidth
          </span>
          <span style={{ color: qualityColor, fontWeight: 600 }}>
            {bandwidthKbps} kbps
          </span>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.08)', borderRadius: '99px',
          height: '6px', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${bwBarWidth}%`,
            background: `linear-gradient(90deg, #ef4444, ${qualityColor})`,
            borderRadius: '99px',
            transition: 'width 0.8s ease',
            boxShadow: `0 0 8px ${qualityColor}80`,
          }} />
        </div>
      </div>

      {/* Expandable stats detail */}
      <button
        onClick={() => setShowDetail(v => !v)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#64748b', fontSize: '11px', padding: '0 0 8px',
          display: 'flex', alignItems: 'center', gap: '4px',
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
        onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
      >
        {showDetail ? '▲' : '▼'} Network Details
      </button>

      {showDetail && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
          marginBottom: '12px',
        }}>
          {[
            { label: 'Jitter',       value: `${jitterMs} ms`,      warn: jitterMs > 30 },
            { label: 'Packet Loss',  value: `${packetLossPct}%`,   warn: packetLossPct > 5 },
          ].map(({ label, value, warn }) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,0.05)', borderRadius: '10px',
              padding: '8px 12px',
              border: `1px solid ${warn ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
            }}>
              <div style={{ color: '#64748b', fontSize: '10px', marginBottom: '2px' }}>{label}</div>
              <div style={{ color: warn ? '#ef4444' : '#e2e8f0', fontWeight: 700, fontSize: '14px' }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onReenableVideo}
          disabled={bandwidthKbps < 300}
          id="bandwidth-banner-reenable"
          style={{
            flex: 1, padding: '9px 16px', borderRadius: '10px', border: 'none',
            cursor: bandwidthKbps < 300 ? 'not-allowed' : 'pointer',
            background: bandwidthKbps >= 300
              ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
              : 'rgba(99,102,241,0.25)',
            color: bandwidthKbps >= 300 ? '#fff' : '#6366f180',
            fontSize: '13px', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            transition: 'opacity 0.2s, transform 0.15s',
          }}
          onMouseEnter={e => { if (bandwidthKbps >= 300) e.currentTarget.style.transform = 'scale(1.02)'; }}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <FaVideo style={{ fontSize: '12px' }} />
          {bandwidthKbps >= 300 ? 'Re-enable Camera' : 'Camera unavailable'}
        </button>

        <div style={{
          padding: '9px 14px', borderRadius: '10px',
          background: 'rgba(16,185,129,0.12)',
          border: '1px solid rgba(16,185,129,0.3)',
          display: 'flex', alignItems: 'center', gap: '6px',
          color: '#10b981', fontSize: '12px', fontWeight: 500,
        }}>
          <FaCheckCircle style={{ fontSize: '11px' }} />
          Audio active
        </div>
      </div>
    </div>
  );
};

export default BandwidthMonitorBanner;
