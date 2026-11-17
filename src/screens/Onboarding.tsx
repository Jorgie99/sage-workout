import { useState } from 'react';
import { ProfileFields } from '../components/ProfileFields';
import { Logo } from '../components/Logo';
import { saveProfile } from '../lib/db';
import { useData } from '../state';

export default function Onboarding() {
  const data = useData();
  const [profile, setProfile] = useState(data.profile);
  const [step, setStep] = useState<0 | 1>(0);

  if (step === 0) {
    return (
      <div className="screen no-tabs" style={{ justifyContent: 'center', gap: 28 }}>
        <div className="stack center" style={{ alignItems: 'center', gap: 20 }}>
          <Logo size={84} />
          <span className="wordmark">Sage</span>
          <h1>Build a routine.<br />Follow the ring.</h1>
          <p className="muted" style={{ maxWidth: 300 }}>
            A calm coach and visual timer for your workouts. Everything stays on this phone — no account, no sounds.
          </p>
        </div>
        <button className="btn primary block" onClick={() => setStep(1)}>Get started</button>
      </div>
    );
  }

  return (
    <div className="screen no-tabs">
      <div className="screen-head">
        <div>
          <span className="eyebrow">About you</span>
          <h1 style={{ marginTop: 8 }}>A few details</h1>
          <p className="sub">Only what the app actually uses. You can change any of it later in Settings.</p>
        </div>
      </div>
      <ProfileFields profile={profile} onChange={setProfile} />
      <div style={{ flex: 1 }} />
      <button className="btn primary block" onClick={() => saveProfile({ ...profile, onboarded: true })}>
        {profile.weightKg == null ? 'Skip for now' : 'Continue'}
      </button>
    </div>
  );
}
