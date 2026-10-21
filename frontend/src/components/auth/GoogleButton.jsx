import { useEffect, useRef, useState } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
let scriptPromise = null;

// Nạp thư viện Google Identity Services 1 lần duy nhất
function loadGsi() {
    if (window.google?.accounts?.id) return Promise.resolve(window.google);
    if (!scriptPromise) {
        scriptPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://accounts.google.com/gsi/client';
            s.async = true;
            s.defer = true;
            s.onload = () => resolve(window.google);
            s.onerror = () => { scriptPromise = null; reject(new Error('Could not load Google script')); };
            document.head.appendChild(s);
        });
    }
    return scriptPromise;
}

// Nút "Continue with Google". text: 'signin_with' | 'signup_with' | 'continue_with'
export default function GoogleButton({ text = 'continue_with', onCredential }) {
    const box = useRef(null);
    const handler = useRef(onCredential);
    handler.current = onCredential;
    const [state, setState] = useState(CLIENT_ID ? 'loading' : 'missing');

    useEffect(() => {
        if (!CLIENT_ID) return undefined;
        let alive = true;
        loadGsi()
            .then((google) => {
                if (!alive || !box.current) return;
                google.accounts.id.initialize({ client_id: CLIENT_ID, callback: (res) => handler.current(res.credential) });
                google.accounts.id.renderButton(box.current, {
                    type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text,
                    logo_alignment: 'left', locale: 'en', width: Math.min(400, box.current.offsetWidth || 340),
                });
                setState('ready');
            })
            .catch(() => alive && setState('error'));
        return () => { alive = false; };
    }, [text]);

    if (state === 'missing') {
        return <div className="auth-google-off">Google sign-in is not set up yet (add VITE_GOOGLE_CLIENT_ID to frontend/.env)</div>;
    }
    return (
        <>
            <div ref={box} className="auth-google" />
            {state === 'error' && <p className="auth-field-error">Could not load Google sign-in. Check your internet connection and try again.</p>}
        </>
    );
}