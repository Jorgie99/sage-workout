import { useRef, useState } from 'react';
import { Download, Info, KeyRound, Upload } from 'lucide-react';
import { ProfileFields } from '../components/ProfileFields';
import { ICON_SM, Sheet, Switch, useToast } from '../components/ui';
import { eraseAll, exportAll, importAll, saveProfile, saveSettings, validateBackup } from '../lib/db';
import { DEFAULT_SETTINGS, type Settings as SettingsT } from '../lib/types';
import { useData } from '../state';

export default function Settings() {
  const { profile, settings, routines, sessions } = useData();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<unknown>(null);
  const [confirmErase, setConfirmErase] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const setS = (patch: Partial<SettingsT>) => void saveSettings({ ...settings, ...patch });

  const doExport = async () => {
    const data = await exportAll();
    const name = `sage-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const file = new File([blob], name, { type: 'application/json' });
    // On iPhone the share sheet ("Save to Files") is the reliable way to keep a file.
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Sage backup' });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast.show('Backup downloaded');
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data: unknown = JSON.parse(await file.text());
      if (!validateBackup(data)) throw new Error('not a backup');
      setPending(data);
    } catch {
      toast.show('That file isn’t a Sage backup');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <h1>Settings</h1>
          <p className="sub">Everything is stored on this device only.</p>
        </div>
      </div>

      <section className="stack">
        <span className="eyebrow">Profile</span>
        <div className="card">
          <ProfileFields profile={profile} onChange={(p) => void saveProfile(p)} />
        </div>
      </section>

      <section className="stack">
        <span className="eyebrow">Workout</span>
        <div className="card stack-lg">
          <div className="row between">
            <div className="grow">
              <div className="label">Start sets automatically</div>
              <div className="hint">Off: when a rest ends, the screen washes to the next set and waits for you, so your real rest is logged. On: the set timer starts by itself.</div>
            </div>
            <Switch label="Start sets automatically" checked={settings.autoStart} onChange={(autoStart) => setS({ autoStart })} />
          </div>
          <div className="note">
            <Info {...ICON_SM} />
            <span>The screen stays awake during a workout (iOS 18.4 or later). There are no sounds or vibrations — every cue is visual.</span>
          </div>
        </div>
      </section>

      <section className="stack">
        <span className="eyebrow">Ask Claude · optional</span>
        <div className="card stack-lg">
          <label className="field">
            <span className="label">Anthropic API key</span>
            <div className="input-row">
              <input
                className="input"
                type={showKey ? 'text' : 'password'}
                value={settings.apiKey}
                placeholder="sk-ant-…"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => setS({ apiKey: e.target.value })}
              />
              <button className="btn secondary sm" type="button" onClick={() => setShowKey((v) => !v)}>{showKey ? 'Hide' : 'Show'}</button>
            </div>
            <span className="hint">
              Stored only on this device, in the app’s local database. It never leaves your phone except in requests sent directly to Anthropic when you tap “Ask Claude for a review”. It is not included in backups.
            </span>
          </label>
          <label className="field">
            <span className="label">Model ID</span>
            <input className="input" value={settings.model} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false}
              onChange={(e) => setS({ model: e.target.value })} onBlur={(e) => !e.target.value.trim() && setS({ model: DEFAULT_SETTINGS.model })} />
            <span className="hint">Defaults to {DEFAULT_SETTINGS.model}, a small, inexpensive model. A review costs a fraction of a cent.</span>
          </label>
          <div className="note">
            <KeyRound {...ICON_SM} />
            <span>
              {settings.apiKey.trim()
                ? 'A review button now appears on each routine’s Coach tab. Remove the key to hide it.'
                : 'Without a key the review button stays hidden. The built-in coach works fully offline either way.'}
            </span>
          </div>
          {settings.apiKey && <button className="btn quiet danger sm" onClick={() => setS({ apiKey: '' })}>Remove key</button>}
        </div>
      </section>

      <section className="stack">
        <span className="eyebrow">Your data</span>
        <div className="card stack">
          <p className="small muted">{routines.length} routine{routines.length === 1 ? '' : 's'} · {sessions.length} session{sessions.length === 1 ? '' : 's'}. iOS can clear a web app’s storage if it goes unused for a long time, so export a backup now and then.</p>
          <button className="btn secondary block" onClick={doExport}><Download {...ICON_SM} /> Export backup (JSON)</button>
          <button className="btn secondary block" onClick={() => fileRef.current?.click()}><Upload {...ICON_SM} /> Import backup</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
          <button className="btn quiet danger sm" onClick={() => setConfirmErase(true)}>Erase everything</button>
        </div>
      </section>

      <p className="hint center">
        Sage v{__APP_VERSION__} · Coaching rules follow ACSM and NSCA guidance and peer-reviewed research; sources are listed on each coach card. General fitness information, not medical advice.
      </p>

      {pending != null && (
        <Sheet title="Replace your data?" onClose={() => setPending(null)}>
          <p className="muted">Importing replaces the routines, history and profile on this device with the backup. Your API key stays as it is.</p>
          <button className="btn primary block" onClick={async () => {
            try {
              await importAll(pending);
              toast.show('Backup imported');
            } catch {
              toast.show('Import failed — nothing was changed');
            }
            setPending(null);
          }}>Import and replace</button>
          <button className="btn quiet block" onClick={() => setPending(null)}>Cancel</button>
        </Sheet>
      )}

      {confirmErase && (
        <Sheet title="Erase everything?" onClose={() => setConfirmErase(false)}>
          <p className="muted">This deletes your profile, routines, history, learned timings and API key from this device. It can’t be undone.</p>
          <button className="btn block" style={{ background: 'var(--danger)', color: '#fff' }} onClick={async () => { await eraseAll(); setConfirmErase(false); }}>Erase all data</button>
          <button className="btn quiet block" onClick={() => setConfirmErase(false)}>Cancel</button>
        </Sheet>
      )}
      {toast.node}
    </div>
  );
}
