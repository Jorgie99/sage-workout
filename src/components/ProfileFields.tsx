import { NumField, Segmented } from './ui';
import type { Experience, Profile, Sex } from '../lib/types';
import { cmToFtIn, ftInToCm, kgToLb, lbToKg } from '../lib/units';

/** Height, weight, sex and experience — each with a one-line note on how it is actually used. */
export function ProfileFields({ profile, onChange }: { profile: Profile; onChange: (p: Profile) => void }) {
  const set = (patch: Partial<Profile>) => onChange({ ...profile, ...patch });
  const ftIn = profile.heightCm != null ? cmToFtIn(profile.heightCm) : null;

  return (
    <div className="stack-lg">
      <div className="field">
        <div className="row between">
          <span className="label">Weight</span>
          <div style={{ width: 132 }}>
            <Segmented label="Weight unit" value={profile.weightUnit} onChange={(weightUnit) => set({ weightUnit })}
              options={[{ value: 'lb', label: 'lb' }, { value: 'kg', label: 'kg' }]} />
          </div>
        </div>
        <div className="input-suffix">
          <NumField
            ariaLabel={`Weight in ${profile.weightUnit}`}
            placeholder={profile.weightUnit === 'lb' ? '140' : '64'}
            max={700}
            value={profile.weightKg == null ? null : Math.round((profile.weightUnit === 'lb' ? kgToLb(profile.weightKg) : profile.weightKg) * 10) / 10}
            onChange={(v) => set({ weightKg: v == null ? null : profile.weightUnit === 'lb' ? lbToKg(v) : v })}
          />
          <span>{profile.weightUnit}</span>
        </div>
        <span className="hint">Used for calorie estimates, counting bodyweight moves in your volume (a push-up is about 64% of body weight), and cautious starting weights.</span>
      </div>

      <div className="field">
        <div className="row between">
          <span className="label">Height</span>
          <div style={{ width: 132 }}>
            <Segmented label="Height unit" value={profile.heightUnit} onChange={(heightUnit) => set({ heightUnit })}
              options={[{ value: 'ft', label: 'ft / in' }, { value: 'cm', label: 'cm' }]} />
          </div>
        </div>
        {profile.heightUnit === 'ft' ? (
          <div className="input-row">
            <div className="input-suffix">
              <NumField ariaLabel="Height, feet" decimal={false} max={8} placeholder="5" value={ftIn?.ft ?? null}
                onChange={(v) => set({ heightCm: v == null ? null : ftInToCm(v, ftIn?.inch ?? 0) })} />
              <span>ft</span>
            </div>
            <div className="input-suffix">
              <NumField ariaLabel="Height, inches" decimal={false} max={11} placeholder="5" value={ftIn?.inch ?? null}
                onChange={(v) => set({ heightCm: ftInToCm(ftIn?.ft ?? 0, v ?? 0) || null })} />
              <span>in</span>
            </div>
          </div>
        ) : (
          <div className="input-suffix">
            <NumField ariaLabel="Height in centimetres" max={260} placeholder="165" value={profile.heightCm == null ? null : Math.round(profile.heightCm)}
              onChange={(v) => set({ heightCm: v })} />
            <span>cm</span>
          </div>
        )}
        <span className="hint">Kept with your profile and included in an AI review if you ask for one. Nothing else uses it — the calorie formula only needs weight.</span>
      </div>

      <div className="field">
        <span className="label">Sex</span>
        <Segmented<Sex> label="Sex" value={profile.sex} onChange={(sex) => set({ sex })}
          options={[{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }, { value: 'na', label: 'Prefer not to say' }]} />
        <span className="hint">Only adjusts suggested starting weights. Training itself isn’t programmed differently — the research shows similar responses.</span>
      </div>

      <div className="field">
        <span className="label">Experience <span className="muted" style={{ fontWeight: 400 }}>· optional</span></span>
        <Segmented<Experience | 'none'>
          label="Experience"
          value={profile.experience ?? 'none'}
          onChange={(v) => set({ experience: v === 'none' ? null : v })}
          options={[{ value: 'new', label: 'New' }, { value: 'some', label: 'Some' }, { value: 'experienced', label: 'Experienced' }, { value: 'none', label: 'Skip' }]}
        />
        <span className="hint">New lifters get slightly slower tempos and a little more rest in the time estimates, and lighter starting weights.</span>
      </div>
    </div>
  );
}
