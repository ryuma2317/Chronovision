import TopNav from './TopNav';

export default function DashboardShell({ children }) {
  return (
    <div className="min-h-screen bg-page">
      <TopNav />
      <main className="pt-nav-height">
        <div className="max-w-container-max mx-auto px-4 md:px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
