import { type ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Activity, AlertCircle, ArrowUpRight, Check, Clock3, Database, Layers3, RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { ClerkProvider, Show, SignIn, SignUp, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { getHealthCheckQueryKey, getReadinessCheckQueryKey, useHealthCheck, useReadinessCheck } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { ProjectDetailPage, ProjectsPage } from '@/pages/projects';
import {
  Route,
  Redirect,
  Switch,
  useLocation,
  Router as WouterRouter,
  Link,
} from 'wouter';

const queryClient = new QueryClient();
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: 'top' as const,
    socialButtonsVariant: 'blockButton' as const,
  },
  variables: {
    colorPrimary: '#28584b',
    colorForeground: '#20332f',
    colorMutedForeground: '#697873',
    colorDanger: '#a84f42',
    colorBackground: '#fbfaf5',
    colorInput: '#fffefa',
    colorInputForeground: '#20332f',
    colorNeutral: '#20332f',
    fontFamily: 'Manrope, sans-serif',
    borderRadius: '0.7rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fbfaf5] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#dedfd2]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#20332f] font-semibold tracking-tight',
    headerSubtitle: 'text-[#697873]',
    socialButtonsBlockButtonText: 'text-[#20332f] font-semibold',
    formFieldLabel: 'text-[#344843] font-semibold',
    footerActionLink: 'text-[#28584b] font-semibold',
    footerActionText: 'text-[#697873]',
    dividerText: 'text-[#7c8983]',
    identityPreviewEditButton: 'text-[#28584b]',
    formFieldSuccessText: 'text-[#357653]',
    alertText: 'text-[#8f4439]',
    logoBox: 'mb-2',
    logoImage: 'max-h-10',
    socialButtonsBlockButton: 'border-[#d8ddd3] bg-[#fffefa] hover:bg-[#f1f2e9]',
    formButtonPrimary: 'bg-[#28584b] hover:bg-[#1d4338] text-[#f5f5e9] font-semibold',
    formFieldInput: 'border-[#d8ddd3] bg-[#fffefa] text-[#20332f]',
    footerAction: 'border-t border-[#e5e5da]',
    dividerLine: 'bg-[#e1e3d8]',
    alert: 'border-[#e6c7bd] bg-[#fbefeb]',
    otpCodeFieldInput: 'border-[#d8ddd3] bg-[#fffefa]',
    formFieldRow: 'gap-1.5',
    main: 'gap-5',
  },
};

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
          <div className="flex items-center gap-2">
            <Link href="/sign-in" className="hidden rounded-md px-3 py-2 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground sm:inline-flex" data-testid="link-sign-in">Sign in</Link>
            <Link href="/sign-up" className="inline-flex items-center rounded-md bg-[#1d423a] px-3.5 py-2 text-[10px] font-bold text-[#f5f5e9] transition hover:bg-[#27564a]" data-testid="link-sign-up">Create account <ArrowUpRight size={12} className="ml-1" /></Link>
            <div className="flex items-center gap-2 rounded-full border border-border/80 bg-card/70 px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-40 ${ready ? 'animate-ping bg-emerald-500' : 'hidden'}`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${loading ? 'bg-amber-500' : ready ? 'bg-emerald-600' : hasError ? 'bg-rose-600' : 'bg-amber-500'}`} />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {loading ? 'Checking services' : hasError ? 'Check failed' : ready ? 'Foundation ready' : 'Not ready'}
            </span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1180px] px-5 pb-12 pt-9 sm:px-8 sm:pt-12 lg:px-12">
          <section className="entrance flex flex-col justify-between gap-6 border-b border-border/80 pb-8 sm:flex-row sm:items-end">
            <div>
              <div className="mono mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-primary">
                <span className="h-px w-5 bg-primary" /> Control plane / 01
              </div>
              <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.055em] text-foreground sm:text-[42px]">
                AI work, in your hands.
              </h1>
              <p className="mt-2 max-w-[530px] text-[13px] leading-6 text-muted-foreground">
                A control workspace for directing AI teams — with project work you can inspect and decisions that stay yours.
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

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/projects" /></Show>
      <Show when="signed-out"><Home /></Show>
    </>
  );
}

function ProtectedProjects() {
  return (
    <>
      <Show when="signed-in"><ProjectsPage /></Show>
      <Show when="signed-out"><Redirect to="/" /></Show>
    </>
  );
}

function ProtectedProjectDetail() {
  return (
    <>
      <Show when="signed-in"><ProjectDetailPage /></Show>
      <Show when="signed-out"><Redirect to="/" /></Show>
    </>
  );
}

function SignInPage() {
  return (
    <div className="nexus-grain relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#e9ede1] px-4 py-10">
      <div className="absolute inset-0 nexus-grid opacity-50" />
      <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full border border-[#9dad8d]/40" />
      <div className="absolute -right-20 bottom-1/4 h-80 w-80 rounded-full border border-[#9dad8d]/35" />
      <div className="relative z-10 w-full">
        <div className="mb-6 text-center">
          <p className="mono text-[9px] font-medium uppercase tracking-[.2em] text-[#496558]">NEXUS AI / CONTROL WORKSPACE</p>
          <p className="display-font mt-2 text-[18px] font-semibold tracking-[-.04em] text-[#20332f]">Your work, under your direction.</p>
        </div>
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
        <Link href="/" className="relative z-10 mx-auto mt-5 block w-fit text-[10px] font-semibold text-[#536961] hover:text-[#20332f]" data-testid="link-auth-home">Back to NEXUS</Link>
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="nexus-grain relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#e9ede1] px-4 py-10">
      <div className="absolute inset-0 nexus-grid opacity-50" />
      <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full border border-[#9dad8d]/40" />
      <div className="absolute -right-20 bottom-1/4 h-80 w-80 rounded-full border border-[#9dad8d]/35" />
      <div className="relative z-10 w-full">
        <div className="mb-6 text-center">
          <p className="mono text-[9px] font-medium uppercase tracking-[.2em] text-[#496558]">NEXUS AI / CONTROL WORKSPACE</p>
          <p className="display-font mt-2 text-[18px] font-semibold tracking-[-.04em] text-[#20332f]">Build a team you can actually direct.</p>
        </div>
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
        <Link href="/" className="relative z-10 mx-auto mt-5 block w-fit text-[10px] font-semibold text-[#536961] hover:text-[#20332f]" data-testid="link-auth-home">Back to NEXUS</Link>
      </div>
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== userId) client.clear();
      previousUserId.current = userId;
    });
    return unsubscribe;
  }, [addListener, client]);
  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: 'Welcome back', subtitle: 'Pick up where your team left off.' } },
        signUp: { start: { title: 'Make room for better work', subtitle: 'Create your NEXUS workspace.' } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkQueryClientCacheInvalidator />
      <RoutedPages />
    </ClerkProvider>
  );
}

function RoutedPages() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/projects" component={ProtectedProjects} />
        <Route path="/projects/:id" component={ProtectedProjectDetail} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
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
        <WouterRouter base={basePath}>
          <ClerkProviderWithRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
