import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Activity, AlertCircle, ArrowUpRight, Check, Clock3, Database, Layers3, RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { getHealthCheckQueryKey, getReadinessCheckQueryKey, useHealthCheck, useReadinessCheck } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Home() {
  const health = useHealthCheck({
    query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 30_000, retry: 1 },
  });
  const readiness = useReadinessCheck({
    query: { queryKey: getReadinessCheckQueryKey(), refetchInterval: 30_000, retry: 1 },
  });

  const loading = health.isLoading || readiness.isLoading;
  const ready = readiness.data?.status === 'ready' && readiness.data.database === 'ok';
  const hasError = health.isError || readiness.isError;
  const checkedAt = readiness.data?.checkedAt;
  const checkedLabel = checkedAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(checkedAt))
    : null;

  return (
    <div className="nexus-shell flex min-h-[100dvh] text-foreground">
      <aside className="hidden w-[252px] shrink-0 flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] md:flex">
        <div className="flex h-[88px] items-center gap-3 border-b border-[hsl(var(--sidebar-border))] px-7">
          <div className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-200/20 bg-emerald-300/10 text-emerald-300">
            <Layers3 size={18} strokeWidth={1.8} />
          </div>
          <div>
            <div className="text-[15px] font-extrabold tracking-[0.18em] text-[#f1f0e9]">NEXUS</div>
            <div className="mt-0.5 text-[9px] font-semibold tracking-[0.25em] text-slate-400">AI WORKSPACE</div>
          </div>
        </div>

        <div className="px-4 pt-8">
          <p className="mb-3 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Workspace</p>
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200/10 bg-emerald-200/[0.08] px-3 py-3 text-[13px] font-semibold text-[#ecf4ed]">
            <Activity size={16} className="text-emerald-300" />
            Foundation overview
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-300" />
          </div>
        </div>

        <div className="mt-auto px-6 pb-6">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
              <ShieldCheck size={13} /> Supervised by design
            </div>
            <p className="mt-2.5 text-[11px] leading-[1.65] text-slate-400">
              NEXUS keeps people in control of every team and system action.
            </p>
          </div>
          <div className="mono mt-5 flex items-center justify-between text-[9px] uppercase tracking-[0.13em] text-slate-500">
            <span>Foundation</span><span>Phase 01</span>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex h-[68px] items-center justify-between border-b border-border/80 px-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card text-primary md:hidden">
              <Layers3 size={16} />
            </div>
            <div className="text-[11px] font-semibold text-muted-foreground">
              <span className="hidden sm:inline">NEXUS AI</span>
              <span className="mx-2 text-border">/</span>
              <span className="text-foreground">Overview</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border/80 bg-card/70 px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-40 ${ready ? 'animate-ping bg-emerald-500' : 'hidden'}`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${loading ? 'bg-amber-500' : ready ? 'bg-emerald-600' : hasError ? 'bg-rose-600' : 'bg-amber-500'}`} />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {loading ? 'Checking services' : hasError ? 'Check failed' : ready ? 'Foundation ready' : 'Not ready'}
            </span>
          </div>
        </header>

        <div className="mx-auto max-w-[1180px] px-5 pb-12 pt-9 sm:px-8 sm:pt-12 lg:px-12">
          <section className="entrance flex flex-col justify-between gap-6 border-b border-border/80 pb-8 sm:flex-row sm:items-end">
            <div>
              <div className="mono mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-primary">
                <span className="h-px w-5 bg-primary" /> Control plane / 01
              </div>
              <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.055em] text-foreground sm:text-[42px]">
                Foundation overview
              </h1>
              <p className="mt-2 max-w-[530px] text-[13px] leading-6 text-muted-foreground">
                A clear view of the NEXUS runtime and its database connection.
              </p>
            </div>
            <div className="mono flex items-center gap-2 pb-1 text-[10px] text-muted-foreground">
              <Clock3 size={13} />
              {checkedLabel ? <>Last readiness check <span className="text-foreground">{checkedLabel}</span></> : 'Awaiting first check'}
            </div>
          </section>

          <section className="entrance entrance-delay-1 mt-7 grid gap-4 lg:grid-cols-[1.12fr_0.88fr]">
            <div className={`relative overflow-hidden rounded-2xl border p-6 sm:p-8 ${ready ? 'border-emerald-900/10 bg-[#e6eee6]' : hasError ? 'border-rose-900/10 bg-[#f5e9e4]' : 'border-amber-900/10 bg-[#f2eee3]'}`} data-testid="status-overview">
              <div className="absolute right-0 top-0 h-44 w-44 translate-x-[28%] -translate-y-[28%] rounded-full border border-current opacity-[0.06]" />
              <div className="absolute right-5 top-5 h-32 w-32 translate-x-[28%] -translate-y-[28%] rounded-full border border-current opacity-[0.06]" />
              <div className="relative flex items-start justify-between gap-5">
                <div>
                  <div className="mono text-[10px] font-medium uppercase tracking-[0.16em] text-foreground/55">Platform readiness</div>
                  <h2 className="mt-5 text-[26px] font-semibold tracking-[-0.05em] text-foreground sm:text-[30px]" data-testid="status-readiness">
                    {loading ? 'Checking the foundation' : hasError ? 'Status unavailable' : ready ? 'Ready for the next step' : 'Not ready yet'}
                  </h2>
                  <p className="mt-2 max-w-[440px] text-[12px] leading-5 text-foreground/65">
                    {loading
                      ? 'Requesting live health and readiness checks from the API.'
                      : hasError
                        ? 'One or more live checks could not be completed. Review the service details below.'
                        : ready
                          ? 'The API reports ready and confirms its required database is reachable.'
                          : 'The API reports that one or more required components are not ready.'}
                  </p>
                </div>
                <div className={`mt-1 grid h-12 w-12 shrink-0 place-items-center rounded-xl ${ready ? 'bg-emerald-900 text-emerald-50' : hasError ? 'bg-rose-900 text-rose-50' : 'bg-amber-900 text-amber-50'}`}>
                  {loading ? <span className="h-5 w-5 animate-pulse rounded-md bg-amber-50/55" /> : hasError ? <AlertCircle size={21} /> : ready ? <Check size={22} /> : <Activity size={21} />}
                </div>
              </div>
              <div className="relative mt-7 flex flex-wrap items-center gap-2 border-t border-foreground/10 pt-4">
                <span className="mono rounded-md bg-white/50 px-2.5 py-1.5 text-[10px] text-foreground/70">GET /api/healthz</span>
                <span className="mono rounded-md bg-white/50 px-2.5 py-1.5 text-[10px] text-foreground/70">GET /api/readyz</span>
                <span className="ml-auto text-[10px] font-semibold text-foreground/55">Auto-check every 30 seconds</span>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-card-border bg-card p-6 sm:p-7">
              <div className="flex items-start justify-between">
                <div>
                  <p className="mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Phase 01</p>
                  <h2 className="mt-3 text-[19px] font-semibold tracking-[-0.04em]">A dependable starting point.</h2>
                </div>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-primary"><Layers3 size={17} /></div>
              </div>
              <p className="mt-4 text-[12px] leading-[1.7] text-muted-foreground">
                This foundation establishes the application shell and live service visibility before any team workflows are introduced.
              </p>
              <div className="mt-5 flex items-center gap-2 border-t border-border/70 pt-4 text-[10px] font-semibold text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Supervised workspace foundation
                <ArrowUpRight size={13} className="ml-auto opacity-50" />
              </div>
            </div>
          </section>

          <section className="entrance entrance-delay-2 mt-10" aria-labelledby="service-heading">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="mono text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Live diagnostics</p>
                <h2 id="service-heading" className="mt-1.5 text-[18px] font-semibold tracking-[-0.04em]">Service health</h2>
              </div>
              <span className="mono text-[9px] uppercase tracking-[0.13em] text-muted-foreground">Two checks</span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-card-border bg-card">
              <ServiceRow
                icon={<Server size={17} />}
                title="Application API"
                description="Core NEXUS service response"
                detail="GET /api/healthz"
                loading={health.isLoading}
                error={health.isError}
                value={health.data?.status}
                onRetry={() => void health.refetch()}
                testId="health-api"
              />
              <div className="mx-5 border-t border-border/70 sm:mx-6" />
              <ServiceRow
                icon={<Database size={17} />}
                title="Database"
                description="Required PostgreSQL connectivity"
                detail="GET /api/readyz"
                loading={readiness.isLoading}
                error={readiness.isError}
                value={readiness.data?.database}
                onRetry={() => void readiness.refetch()}
                testId="health-database"
              />
              {readiness.data && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-muted/30 px-5 py-3 sm:px-6">
                  <span className="text-[10px] text-muted-foreground">Readiness endpoint response</span>
                  <span className={`mono rounded px-2 py-1 text-[10px] ${readiness.data.status === 'ready' ? 'bg-emerald-900/[0.07] text-emerald-800' : 'bg-amber-900/[0.08] text-amber-800'}`} data-testid="readiness-response">
                    {readiness.data.status}
                  </span>
                </div>
              )}
            </div>
          </section>

          <section className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="flex gap-3 rounded-xl border border-border/75 bg-card/55 px-4 py-4">
              <div className="mt-0.5 text-primary"><ShieldCheck size={16} /></div>
              <div>
                <h3 className="text-[11px] font-bold">Human oversight stays central</h3>
                <p className="mt-1 text-[10px] leading-[1.6] text-muted-foreground">This phase exposes readiness only. No autonomous actions are enabled.</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/75 bg-card/55 px-4 py-4">
              <div className="mt-0.5 text-primary"><Activity size={16} /></div>
              <div>
                <h3 className="text-[11px] font-bold">Live signals, not assumptions</h3>
                <p className="mt-1 text-[10px] leading-[1.6] text-muted-foreground">Health and database states below come directly from the service checks.</p>
              </div>
            </div>
          </section>

          <footer className="mono mt-12 flex flex-col gap-2 border-t border-border/70 pt-4 text-[9px] uppercase tracking-[0.12em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>NEXUS AI <span className="mx-1.5 text-border">/</span> Foundation overview</span>
            <span>Phase 01 <span className="mx-1.5 text-border">·</span> Service visibility</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function ServiceRow({
  icon,
  title,
  description,
  detail,
  loading,
  error,
  value,
  onRetry,
  testId,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  detail: string;
  loading: boolean;
  error: boolean;
  value?: string;
  onRetry: () => void;
  testId: string;
}) {
  const healthy = !loading && !error && (value === 'ok' || value === 'ready' || value === 'healthy');
  return (
    <div className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:px-6" data-testid={`${testId}-row`}>
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${healthy ? 'bg-accent text-primary' : error ? 'bg-rose-900/[0.07] text-rose-700' : 'bg-muted text-muted-foreground'}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[12px] font-bold text-foreground">{title}</h3>
            <span className="mono rounded border border-border/70 px-1.5 py-0.5 text-[9px] text-muted-foreground" data-testid={`${testId}-state`}>
              {loading ? 'checking' : error ? 'unavailable' : value ?? 'unknown'}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 pl-[54px] sm:justify-end sm:pl-0">
        <span className="mono text-[9px] text-muted-foreground">{detail}</span>
        {error ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-[10px] font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid={`button-retry-${testId}`}
          >
            <RefreshCw size={11} /> Retry
          </button>
        ) : (
          <span className={`h-2 w-2 rounded-full ${loading ? 'animate-pulse bg-amber-500' : healthy ? 'bg-emerald-600' : 'bg-amber-500'}`} aria-label={loading ? 'Checking' : healthy ? 'Available' : 'Not ready'} />
        )}
      </div>
    </div>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
