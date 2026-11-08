import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'wouter';
import { Archive, ArrowLeft, ArrowUpRight, Check, ChevronRight, CirclePlus, FolderKanban, Layers3, LoaderCircle, Plus, Search, ShieldCheck, X } from 'lucide-react';
import { useArchiveProject, useCreateProject, useGetProject, useListProjects, getGetProjectQueryKey, getListProjectsQueryKey } from '@workspace/api-client-react';
import { useClerk, useUser } from '@clerk/react';

type ProjectStatusFilter = 'active' | 'archived' | 'all';
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <div className={`grid shrink-0 place-items-center rounded-xl bg-[#d8e26a] text-[#142825] ${small ? 'h-8 w-8' : 'h-10 w-10'}`}>
      <Layers3 size={small ? 16 : 19} strokeWidth={2.1} />
    </div>
  );
}

function WorkspaceFrame({ children, active = 'projects' }: { children: ReactNode; active?: string }) {
  const { signOut } = useClerkSafe();
  const { user } = useUserSafe();
  const name = user?.firstName || user?.username || 'Workspace owner';
  const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="nexus-shell flex min-h-[100dvh] text-foreground">
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-[#314340] bg-[#172a28] text-[#e9eee6] md:flex">
        <Link href="/projects" className="flex h-[76px] items-center gap-3 border-b border-white/[.08] px-6" data-testid="link-workspace-home">
          <BrandMark small />
          <span>
            <span className="block text-[14px] font-bold tracking-[.18em]">NEXUS</span>
            <span className="mono mt-0.5 block text-[8px] tracking-[.22em] text-[#9cae9e]">AI CONTROL WORKSPACE</span>
          </span>
        </Link>
        <div className="px-4 pt-7">
          <p className="mono mb-3 px-3 text-[9px] font-medium uppercase tracking-[.18em] text-[#849590]">Workspace</p>
          <Link href="/projects" className={`flex items-center gap-3 rounded-lg px-3 py-3 text-[12px] font-semibold transition-colors ${active === 'projects' ? 'border border-[#d8e26a]/20 bg-[#d8e26a]/[.1] text-[#f3f5df]' : 'text-[#aebbb3] hover:bg-white/[.05]'}`} data-testid="link-projects">
            <FolderKanban size={16} className={active === 'projects' ? 'text-[#d8e26a]' : ''} /> Projects
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#d8e26a]" />
          </Link>
        </div>
        <div className="mt-auto p-4">
          <div className="rounded-xl border border-white/[.08] bg-white/[.035] p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#d8e26a]"><ShieldCheck size={13} /> Human-directed</div>
            <p className="mt-2 text-[10px] leading-[1.65] text-[#aebbb3]">Every project stays inspectable. Decisions remain yours.</p>
          </div>
          <div className="mt-4 flex items-center gap-3 border-t border-white/[.08] pt-4">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#344c46] text-[10px] font-bold text-[#e6edc5]" data-testid="avatar-owner">{initials}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-semibold">{name}</p>
              <p className="mono mt-0.5 text-[8px] text-[#849590]">OWNER</p>
            </div>
            <button type="button" onClick={() => void signOut({ redirectUrl: basePath ? `${basePath}/` : '/' })} className="rounded-md px-2 py-1 text-[9px] text-[#aebbb3] hover:bg-white/[.08] hover:text-white" data-testid="button-sign-out">Sign out</button>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="flex h-[66px] items-center justify-between border-b border-border/80 bg-[#faf9f4]/75 px-4 sm:px-7 lg:px-10">
          <div className="flex items-center gap-3">
            <BrandMark small />
            <span className="mono text-[10px] text-muted-foreground md:hidden">NEXUS / PROJECTS</span>
            <span className="hidden text-[11px] font-semibold text-muted-foreground md:block">NEXUS AI <span className="mx-2 text-border">/</span> {active === 'project' ? 'Project detail' : 'Projects'}</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3b8a68]" />
            <span className="mono text-[9px] uppercase tracking-[.1em] text-muted-foreground">Private workspace</span>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function useClerkSafe() { return useClerk(); }
function useUserSafe() { return useUser(); }

export function ProjectsPage() {
  const [filter, setFilter] = useState<ProjectStatusFilter>('active');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [notice, setNotice] = useState('');
  const params = useMemo(() => ({ status: filter }), [filter]);
  const queryKey = getListProjectsQueryKey(params);
  const projectsQuery = useListProjects(params, { query: { queryKey } });
  const createProject = useCreateProject();
  const queryClient = useQueryClient();
  const projects = projectsQuery.data ?? [];
  const visible = projects.filter((project) => `${project.name} ${project.description ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  const activeCount = projects.filter((project) => project.status === 'active').length;

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    createProject.mutate({ data: { name: name.trim(), description: description.trim() || undefined } }, {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setName('');
        setDescription('');
        setShowCreate(false);
        setNotice('Project created. Your workspace is ready.');
        window.setTimeout(() => setNotice(''), 3600);
      },
    });
  };

  return (
    <WorkspaceFrame>
      <div className="mx-auto max-w-[1220px] px-4 pb-16 pt-8 sm:px-7 sm:pt-10 lg:px-10">
        <section className="entrance flex flex-col justify-between gap-6 border-b border-border/80 pb-7 sm:flex-row sm:items-end">
          <div>
            <div className="mono mb-3 flex items-center gap-2 text-[9px] font-medium uppercase tracking-[.18em] text-primary"><span className="h-px w-5 bg-primary" /> Control room / 01</div>
            <h1 className="text-[34px] font-semibold leading-tight tracking-[-.06em] sm:text-[43px]">Projects</h1>
            <p className="mt-2 max-w-[560px] text-[12px] leading-6 text-muted-foreground">A clear place to frame work, bring an AI team into the loop, and keep every decision visible.</p>
          </div>
          <button onClick={() => { setShowCreate(true); setNotice(''); }} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1d423a] px-4 text-[11px] font-bold text-[#f5f5e9] transition hover:bg-[#27564a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="button-create-project">
            <Plus size={15} /> New project
          </button>
        </section>

        <section className="entrance entrance-delay-1 mt-6 grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
          <div className="relative overflow-hidden rounded-2xl bg-[#1b3833] p-5 text-[#edf0e3] sm:p-7">
            <div className="nexus-grid absolute inset-0 opacity-40" />
            <div className="absolute -right-8 -top-20 h-64 w-64 rounded-full border border-[#d8e26a]/20" />
            <div className="absolute -right-2 -top-14 h-48 w-48 rounded-full border border-[#d8e26a]/20" />
            <div className="relative flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="mono text-[9px] uppercase tracking-[.16em] text-[#c8d18e]">Your operating surface</p>
                <h2 className="display-font mt-3 max-w-[520px] text-[23px] font-medium leading-tight tracking-[-.045em] sm:text-[29px]">Make the work visible.<br />Keep the steering wheel.</h2>
                <p className="mt-3 max-w-[450px] text-[11px] leading-5 text-[#c0cdc2]">Projects are the boundary for your AI teams: focused context, clear ownership, and human-approved direction.</p>
              </div>
              <div className="flex min-w-[150px] items-center gap-3 border-l border-white/15 pl-5">
                <span className="display-font text-[37px] font-semibold leading-none tracking-[-.07em] text-[#d8e26a]" data-testid="text-project-count">{projectsQuery.isLoading ? '—' : String(activeCount).padStart(2, '0')}</span>
                <span className="mono max-w-[68px] text-[8px] uppercase leading-[1.5] tracking-[.12em] text-[#b6c4b9]">active projects</span>
              </div>
            </div>
            <div className="relative mt-6 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
              <span className="flex items-center gap-1.5 rounded-full bg-white/[.08] px-2.5 py-1.5 text-[9px] text-[#e2e9dc]"><ShieldCheck size={12} className="text-[#d8e26a]" /> Human approval stays in the loop</span>
              <span className="mono ml-auto text-[8px] text-[#a9b9ad]">OWNER CONTROL / ENABLED</span>
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-2xl border border-card-border bg-card p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div><p className="mono text-[9px] uppercase tracking-[.16em] text-muted-foreground">Workspace principle</p><h2 className="display-font mt-3 text-[18px] font-semibold tracking-[-.04em]">Inspectable by default.</h2></div>
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-primary"><ShieldCheck size={17} /></div>
            </div>
            <p className="mt-4 text-[11px] leading-[1.75] text-muted-foreground">NEXUS helps people direct teams of AI workers without handing over the context or the final call.</p>
            <div className="mono mt-5 flex items-center gap-2 border-t border-border/70 pt-4 text-[8px] uppercase tracking-[.12em] text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Private to you <ArrowUpRight size={12} className="ml-auto" /></div>
          </div>
        </section>

        <section className="entrance entrance-delay-2 mt-9" aria-label="Project directory">
          <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="mono text-[9px] uppercase tracking-[.17em] text-muted-foreground">Directory</p><h2 className="display-font mt-1 text-[19px] font-semibold tracking-[-.04em]">Your project space <span className="ml-1 text-[11px] font-medium text-muted-foreground">({projects.length})</span></h2></div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative block">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a project…" className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-[10px] outline-none transition focus:border-primary sm:w-[190px]" data-testid="input-search-projects" />
              </label>
              <div className="flex h-9 items-center rounded-lg border border-border bg-card p-1">
                {(['active', 'archived', 'all'] as const).map((value) => (
                  <button key={value} onClick={() => setFilter(value)} className={`h-full rounded-md px-3 text-[9px] font-semibold capitalize transition ${filter === value ? 'bg-[#e6ead7] text-[#234238]' : 'text-muted-foreground hover:text-foreground'}`} data-testid={`button-filter-${value}`}>{value}</button>
                ))}
              </div>
            </div>
          </div>

          {notice && <div role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-[#b9d4c4] bg-[#eaf3ed] px-4 py-3 text-[10px] font-semibold text-[#285b43]" data-testid="status-project-created"><Check size={14} />{notice}</div>}
          {projectsQuery.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading projects">
              {[0, 1, 2].map((item) => <div key={item} className="h-[170px] animate-pulse rounded-xl border border-border bg-card p-5"><div className="h-3 w-1/3 rounded bg-muted" /><div className="mt-5 h-5 w-2/3 rounded bg-muted" /><div className="mt-3 h-3 w-full rounded bg-muted" /><div className="mt-2 h-3 w-3/4 rounded bg-muted" /></div>)}
            </div>
          ) : projectsQuery.isError ? (
            <div className="rounded-2xl border border-[#e3c6bc] bg-[#fbf0ec] px-6 py-10 text-center" data-testid="state-projects-error">
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#f1dcd4] text-[#914c3c]"><FolderKanban size={18} /></div>
              <h3 className="display-font mt-4 text-[16px] font-semibold">Projects didn’t load</h3>
              <p className="mt-1 text-[10px] text-muted-foreground">The workspace couldn’t reach your project directory.</p>
              <button onClick={() => void projectsQuery.refetch()} className="mt-4 rounded-lg border border-[#d4b6ab] bg-card px-3 py-2 text-[10px] font-semibold text-foreground hover:bg-[#f7e9e3]" data-testid="button-retry-projects">Try again</button>
            </div>
          ) : visible.length === 0 ? (
            <div className="relative overflow-hidden rounded-2xl border border-dashed border-[#bfc8b9] bg-[#f3f3e9] px-5 py-11 text-center" data-testid="state-projects-empty">
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#e8ebd8]/70 to-transparent" />
              <div className="relative mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-[#d8dfcc] bg-[#fafaf2] text-[#486455]"><FolderKanban size={21} /></div>
              <p className="mono relative mt-4 text-[8px] uppercase tracking-[.17em] text-muted-foreground">{search ? 'No matching work' : filter === 'archived' ? 'Nothing archived yet' : 'A clean slate'}</p>
              <h3 className="display-font relative mt-2 text-[19px] font-semibold tracking-[-.04em]">{search ? 'Try a different search.' : filter === 'archived' ? 'Your archive is clear.' : 'Start with one good project.'}</h3>
              <p className="relative mx-auto mt-2 max-w-[390px] text-[10px] leading-5 text-muted-foreground">{search ? 'We couldn’t find a project with that name or description.' : 'Create a focused space for work you want your AI team to help move forward.'}</p>
              {filter !== 'archived' && !search && <button onClick={() => setShowCreate(true)} className="relative mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1d423a] px-4 py-2.5 text-[10px] font-bold text-[#f5f5e9] hover:bg-[#27564a]" data-testid="button-empty-create"><CirclePlus size={14} /> Create your first project</button>}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((project) => (
                <Link href={`/projects/${project.id}`} key={project.id} className="surface-lift group flex min-h-[176px] flex-col rounded-xl border border-card-border bg-card p-5 text-left" data-testid={`card-project-${project.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#edf0e4] text-[#315346]"><FolderKanban size={16} /></div>
                    <span className={`mono flex items-center gap-1.5 rounded-full px-2 py-1 text-[8px] uppercase tracking-[.08em] ${project.status === 'active' ? 'bg-[#e8f1e9] text-[#38724c]' : 'bg-[#f0ece3] text-[#80735b]'}`}><span className={`h-1.5 w-1.5 rounded-full ${project.status === 'active' ? 'bg-[#4b9861]' : 'bg-[#9b8c6a]'}`} />{project.status}</span>
                  </div>
                  <h3 className="display-font mt-4 line-clamp-1 text-[15px] font-semibold tracking-[-.035em] group-hover:text-primary">{project.name}</h3>
                  <p className="mt-1.5 line-clamp-2 min-h-[32px] text-[10px] leading-[1.6] text-muted-foreground">{project.description || 'No project brief yet. Add context as the work takes shape.'}</p>
                  <div className="mono mt-auto flex items-center justify-between border-t border-border/70 pt-3 text-[8px] text-muted-foreground">
                    <span>Updated {new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(project.updatedAt))}</span>
                    <span className="flex items-center gap-1 opacity-70 group-hover:opacity-100">Open <ChevronRight size={12} /></span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
      {showCreate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#142522]/55 p-4 backdrop-blur-[3px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !createProject.isPending) setShowCreate(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="create-project-title" className="entrance w-full max-w-[480px] rounded-2xl border border-border bg-[#fbfaf5] p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between">
              <div><p className="mono text-[9px] uppercase tracking-[.16em] text-primary">New workspace</p><h2 id="create-project-title" className="display-font mt-2 text-[22px] font-semibold tracking-[-.05em]">Name the work.</h2><p className="mt-1 text-[10px] leading-5 text-muted-foreground">Start with a clear boundary. You can add more context later.</p></div>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-md p-2 text-muted-foreground hover:bg-muted" aria-label="Close dialog" data-testid="button-close-create"><X size={16} /></button>
            </div>
            <form onSubmit={submitCreate} className="mt-6 space-y-4">
              <label className="block"><span className="mb-1.5 block text-[10px] font-bold">Project name <span className="text-[#b34b3f]">*</span></span><input autoFocus required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Customer research synthesis" className="h-11 w-full rounded-lg border border-border bg-card px-3 text-[11px] outline-none placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/10" data-testid="input-project-name" /></label>
              <label className="block"><span className="mb-1.5 block text-[10px] font-bold">Brief <span className="font-normal text-muted-foreground">(optional)</span></span><textarea maxLength={4000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What are you trying to accomplish? Add context for your team." className="w-full resize-y rounded-lg border border-border bg-card px-3 py-2.5 text-[11px] leading-5 outline-none placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/10" data-testid="input-project-description" /></label>
              {createProject.isError && <p className="rounded-lg bg-[#f7e9e3] px-3 py-2 text-[10px] text-[#8b4738]" role="alert" data-testid="error-create-project">Couldn’t create that project. Check your connection and try again.</p>}
              <div className="flex justify-end gap-2 border-t border-border/80 pt-4">
                <button type="button" disabled={createProject.isPending} onClick={() => setShowCreate(false)} className="h-9 rounded-lg px-3 text-[10px] font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50" data-testid="button-cancel-create">Cancel</button>
                <button type="submit" disabled={createProject.isPending || !name.trim()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#1d423a] px-4 text-[10px] font-bold text-[#f5f5e9] hover:bg-[#27564a] disabled:cursor-not-allowed disabled:opacity-55" data-testid="button-submit-project">{createProject.isPending && <LoaderCircle size={13} className="animate-spin" />}{createProject.isPending ? 'Creating…' : 'Create project'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </WorkspaceFrame>
  );
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const projectId = id ?? '';
  const queryKey = getGetProjectQueryKey(projectId);
  const projectQuery = useGetProject(projectId, { query: { enabled: Boolean(projectId), queryKey } });
  const archiveProject = useArchiveProject();
  const queryClient = useQueryClient();

  const archive = () => {
    if (!projectQuery.data || projectQuery.data.status === 'archived') return;
    if (!window.confirm(`Archive “${projectQuery.data.name}”? You can still find it in the archive.`)) return;
    archiveProject.mutate({ projectId }, {
      onSuccess: async (updated) => {
        queryClient.setQueryData(getGetProjectQueryKey(projectId), updated);
        await queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setLocation('/projects');
      },
    });
  };

  return (
    <WorkspaceFrame active="project">
      <div className="mx-auto max-w-[1060px] px-4 pb-16 pt-8 sm:px-7 sm:pt-10 lg:px-10">
        <Link href="/projects" className="inline-flex items-center gap-2 text-[10px] font-semibold text-muted-foreground transition hover:text-foreground" data-testid="link-back-projects"><ArrowLeft size={14} /> All projects</Link>
        {projectQuery.isLoading ? (
          <div className="mt-7 animate-pulse rounded-2xl border border-border bg-card p-7"><div className="h-3 w-24 rounded bg-muted" /><div className="mt-6 h-8 w-1/2 rounded bg-muted" /><div className="mt-4 h-4 w-2/3 rounded bg-muted" /></div>
        ) : projectQuery.isError || !projectQuery.data ? (
          <div className="mt-7 rounded-2xl border border-[#e3c6bc] bg-[#fbf0ec] px-6 py-12 text-center" data-testid="state-project-error">
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#f1dcd4] text-[#914c3c]"><FolderKanban size={18} /></div>
            <h1 className="display-font mt-4 text-[20px] font-semibold">This project isn’t available.</h1>
            <p className="mt-1 text-[10px] text-muted-foreground">It may have moved, or you may not have access to it.</p>
            <button onClick={() => void projectQuery.refetch()} className="mt-4 rounded-lg border border-[#d4b6ab] bg-card px-3 py-2 text-[10px] font-semibold" data-testid="button-retry-project">Try again</button>
          </div>
        ) : (
          <>
            <section className="entrance mt-6 overflow-hidden rounded-2xl border border-[#294942] bg-[#1b3833] text-[#edf0e3]">
              <div className="relative px-5 py-7 sm:px-8 sm:py-9">
                <div className="nexus-grid absolute inset-0 opacity-40" />
                <div className="relative">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mono rounded-full bg-white/[.09] px-2.5 py-1 text-[8px] uppercase tracking-[.1em] text-[#e4e9d9]">Project workspace</span>
                    <span className={`mono flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[8px] uppercase ${projectQuery.data.status === 'active' ? 'bg-[#d8e26a]/15 text-[#e4ed9b]' : 'bg-white/10 text-[#d0d8ce]'}`}><span className={`h-1.5 w-1.5 rounded-full ${projectQuery.data.status === 'active' ? 'bg-[#d8e26a]' : 'bg-[#b9c1b5]'}`} />{projectQuery.data.status}</span>
                    <button type="button" disabled={projectQuery.data.status === 'archived' || archiveProject.isPending} onClick={archive} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-white/15 px-3 text-[9px] font-semibold text-[#e4e9d9] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-archive-project">{archiveProject.isPending ? <LoaderCircle size={12} className="animate-spin" /> : <Archive size={12} />}{projectQuery.data.status === 'archived' ? 'Archived' : 'Archive project'}</button>
                  </div>
                  <h1 className="display-font mt-6 max-w-[780px] break-words text-[30px] font-semibold leading-tight tracking-[-.06em] sm:text-[42px]" data-testid="text-project-name">{projectQuery.data.name}</h1>
                  <p className="mt-3 max-w-[680px] whitespace-pre-wrap text-[12px] leading-6 text-[#c0cdc2]" data-testid="text-project-description">{projectQuery.data.description || 'No brief has been added yet. This project space is ready for context whenever you are.'}</p>
                </div>
                <div className="relative mt-8 grid gap-4 border-t border-white/10 pt-4 sm:grid-cols-3">
                  <div><p className="mono text-[8px] uppercase tracking-[.13em] text-[#9eafa4]">Created</p><p className="mt-1.5 text-[10px] font-semibold">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(projectQuery.data.createdAt))}</p></div>
                  <div><p className="mono text-[8px] uppercase tracking-[.13em] text-[#9eafa4]">Last updated</p><p className="mt-1.5 text-[10px] font-semibold">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(projectQuery.data.updatedAt))}</p></div>
                  <div><p className="mono text-[8px] uppercase tracking-[.13em] text-[#9eafa4]">Project ID</p><p className="mono mt-1.5 break-all text-[9px] text-[#d8e26a]" data-testid="text-project-id">{projectQuery.data.id}</p></div>
                </div>
              </div>
            </section>
            <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_.62fr]">
              <div className="rounded-2xl border border-card-border bg-card p-5 sm:p-6">
                <p className="mono text-[9px] uppercase tracking-[.16em] text-muted-foreground">Project record</p>
                <h2 className="display-font mt-2 text-[17px] font-semibold tracking-[-.035em]">A reliable source of context.</h2>
                <p className="mt-2 max-w-[500px] text-[10px] leading-[1.75] text-muted-foreground">This project holds your brief and ownership boundary. As NEXUS capabilities expand, work remains grounded in the context you set here.</p>
                <div className="mt-5 flex items-start gap-3 rounded-xl bg-[#eff1e7] p-4"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#42684e]" /><p className="text-[9px] leading-[1.7] text-[#4d6252]">No work is started or approved on your behalf from this screen. You remain in control.</p></div>
              </div>
              <div className="rounded-2xl border border-card-border bg-card p-5 sm:p-6">
                <p className="mono text-[9px] uppercase tracking-[.16em] text-muted-foreground">Activity</p>
                <h2 className="display-font mt-2 text-[17px] font-semibold tracking-[-.035em]">Project created</h2>
                <div className="mt-5 flex gap-3">
                  <div className="mt-1 flex w-4 justify-center"><span className="h-2 w-2 rounded-full bg-primary" /></div>
                  <div><p className="text-[10px] font-semibold">Workspace initialized</p><p className="mono mt-1 text-[8px] text-muted-foreground">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(projectQuery.data.createdAt))}</p></div>
                </div>
                {projectQuery.data.archivedAt && <div className="mt-4 flex gap-3"><div className="mt-1 flex w-4 justify-center"><span className="h-2 w-2 rounded-full bg-[#9b8c6a]" /></div><div><p className="text-[10px] font-semibold">Moved to archive</p><p className="mono mt-1 text-[8px] text-muted-foreground">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(projectQuery.data.archivedAt))}</p></div></div>}
              </div>
            </section>
            {archiveProject.isError && <p role="alert" className="mt-4 rounded-lg bg-[#f7e9e3] px-4 py-3 text-[10px] text-[#8b4738]" data-testid="error-archive-project">Couldn’t archive this project. Please try again.</p>}
          </>
        )}
      </div>
    </WorkspaceFrame>
  );
}
