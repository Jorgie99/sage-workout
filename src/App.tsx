import { HashRouter, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { History as HistoryIcon, LayoutList, Settings as SettingsIcon, Timer } from 'lucide-react';
import { Logo } from './components/Logo';
import { ICON } from './components/ui';
import { getActiveWorkout } from './lib/db';
import History from './screens/History';
import Onboarding from './screens/Onboarding';
import RoutineEditor from './screens/RoutineEditor';
import Routines from './screens/Routines';
import SessionView from './screens/SessionView';
import Settings from './screens/Settings';
import WorkoutTab from './screens/WorkoutTab';
import { DataProvider, useData } from './state';

const TABS = [
  { to: '/', label: 'Routines', icon: LayoutList, end: true },
  { to: '/workout', label: 'Workout', icon: Timer, end: false },
  { to: '/history', label: 'History', icon: HistoryIcon, end: false },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, end: true },
];

function TabBar() {
  const { pathname } = useLocation();
  const inProgress = useLiveQuery(async () => !!(await getActiveWorkout()), [], false);
  // Full-screen flows hide the tab bar.
  if (pathname.startsWith('/routine/') || pathname.startsWith('/summary/') || /^\/history\/.+/.test(pathname)) return null;
  return (
    <nav className="tabbar" aria-label="Main">
      <div className="tabbar-inner">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
            <Icon {...ICON} />
            {to === '/workout' && inProgress && <span className="tab-dot" aria-label="Workout in progress" />}
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function Shell() {
  const { profile } = useData();
  if (!profile.onboarded) return <Onboarding />;
  return (
    <>
      <Routes>
        <Route path="/" element={<Routines />} />
        <Route path="/routine/:id" element={<RoutineEditor />} />
        <Route path="/workout" element={<WorkoutTab />} />
        <Route path="/summary/:id" element={<SessionView fresh />} />
        <Route path="/history" element={<History />} />
        <Route path="/history/:id" element={<SessionView />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <TabBar />
    </>
  );
}

export default function App() {
  return (
    <div className="app">
      <DataProvider fallback={<div className="splash"><Logo size={72} /></div>}>
        <HashRouter>
          <Shell />
        </HashRouter>
      </DataProvider>
    </div>
  );
}
