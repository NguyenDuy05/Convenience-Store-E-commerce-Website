import { useId, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function MemberPass({ code, name }) {
  const qrRef = useRef(null);
  const titleId = useId();
  const download = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = `${code}.svg`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="membership-counter-pass membership-digital-pass" id="member-pass" aria-labelledby={titleId}>
    <h2 id={titleId}>YOUR MEMBER PASS</h2><p>Present this QR code at the counter.</p>
    <div className="membership-real-qr" ref={qrRef}><QRCodeSVG value={code} size={196} level="M" marginSize={4} title={`Membership code for ${name}`} /></div>
    <strong>{name}</strong><code>{code}</code>
    <button type="button" onClick={download}>Download QR code</button>
    <p>Staff can scan the QR or enter your member code to find your account.</p>
  </section>;
}
