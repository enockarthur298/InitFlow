import { useEffect } from 'react';
import { useSupabaseConnection } from '~/lib/hooks/useSupabaseConnection';
import { classNames } from '~/utils/classNames';
import { useStore } from '@nanostores/react';
import { chatId } from '~/lib/persistence/useChatHistory';
import { fetchSupabaseStats } from '~/lib/stores/supabase';
import { Dialog, DialogRoot, DialogClose, DialogTitle, DialogButton } from '~/components/ui/Dialog';

export function SupabaseConnection() {
  const {
    connection: supabaseConn,
    connecting,
    fetchingStats,
    isProjectsExpanded,
    setIsProjectsExpanded,
    isDropdownOpen: isDialogOpen,
    setIsDropdownOpen: setIsDialogOpen,
    handleConnect,
    handleDisconnect,
    selectProject,
    handleCreateProject,
    updateToken,
    isConnected,
    fetchProjectApiKeys,
  } = useSupabaseConnection();

  const currentChatId = useStore(chatId);

  useEffect(() => {
    const handleOpenConnectionDialog = () => {
      setIsDialogOpen(true);
    };

    document.addEventListener('open-supabase-connection', handleOpenConnectionDialog);

    return () => {
      document.removeEventListener('open-supabase-connection', handleOpenConnectionDialog);
    };
  }, [setIsDialogOpen]);

  useEffect(() => {
    if (isConnected && currentChatId) {
      const savedProjectId = localStorage.getItem(`supabase-project-${currentChatId}`);

      /*
       * If there's no saved project for this chat but there is a global selected project,
       * use the global one instead of clearing it
       */
      if (!savedProjectId && supabaseConn.selectedProjectId) {
        // Save the current global project to this chat
        localStorage.setItem(`supabase-project-${currentChatId}`, supabaseConn.selectedProjectId);
      } else if (savedProjectId && savedProjectId !== supabaseConn.selectedProjectId) {
        selectProject(savedProjectId);
      }
    }
  }, [isConnected, currentChatId]);

  useEffect(() => {
    if (currentChatId && supabaseConn.selectedProjectId) {
      localStorage.setItem(`supabase-project-${currentChatId}`, supabaseConn.selectedProjectId);
    } else if (currentChatId && !supabaseConn.selectedProjectId) {
      localStorage.removeItem(`supabase-project-${currentChatId}`);
    }
  }, [currentChatId, supabaseConn.selectedProjectId]);

  useEffect(() => {
    if (isConnected && supabaseConn.token) {
      fetchSupabaseStats(supabaseConn.token).catch(console.error);
    }
  }, [isConnected, supabaseConn.token]);

  useEffect(() => {
    if (isConnected && supabaseConn.selectedProjectId && supabaseConn.token && !supabaseConn.credentials) {
      fetchProjectApiKeys(supabaseConn.selectedProjectId).catch(console.error);
    }
  }, [isConnected, supabaseConn.selectedProjectId, supabaseConn.token, supabaseConn.credentials]);

  return (
    <div className="relative">
      <div className="flex border border-bolt-elements-borderColor rounded-md overflow-hidden mr-2 text-sm">
        <Button
          active
          disabled={connecting}
          onClick={() => setIsDialogOpen(!isDialogOpen)}
          className="hover:bg-bolt-elements-item-backgroundActive !text-white flex items-center gap-2"
        >
          <img
            className="w-4 h-4"
            height="20"
            width="20"
            crossOrigin="anonymous"
            src="https://cdn.simpleicons.org/supabase"
          />
          {isConnected && supabaseConn.project && (
            <span className="ml-1 text-xs max-w-[100px] truncate">{supabaseConn.project.name}</span>
          )}
        </Button>
      </div>

      <DialogRoot open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {isDialogOpen && (
          <Dialog className="max-w-[520px] p-0 overflow-hidden shadow-xl">
            {/* Header with Initflow blue gradient */}
            <div className="bg-gradient-to-r from-[#3366FF] to-[#5E81FF] p-6 text-white">
              <DialogTitle className="flex items-center gap-2 text-white">
                <img
                  className="w-6 h-6"
                  height="24"
                  width="24"
                  crossOrigin="anonymous"
                  src="https://cdn.simpleicons.org/supabase/white"
                />
                {!isConnected ? 'Link Your Supabase Account' : 'Supabase Integration'}
              </DialogTitle>
              <p className="mt-2 text-sm text-white/80">
                {!isConnected 
                  ? 'Enhance your app with powerful database capabilities' 
                  : 'Manage your database connection and project settings'}
              </p>
            </div>

            <div className="p-6">
              {!isConnected ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-bolt-elements-textSecondary mb-2">Access Token</label>
                    <input
                      type="password"
                      value={supabaseConn.token}
                      onChange={(e) => updateToken(e.target.value)}
                      disabled={connecting}
                      placeholder="Paste your Supabase access token here"
                      className={classNames(
                        'w-full px-3 py-2 rounded-lg text-sm',
                        'bg-[#F8F8F8] dark:bg-[#1A1A1A]',
                        'border border-[#E5E5E5] dark:border-[#333333]',
                        'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
                        'focus:outline-none focus:ring-1 focus:ring-[#3366FF]',
                        'disabled:opacity-50',
                      )}
                    />
                    <div className="mt-2 text-sm text-bolt-elements-textSecondary">
                      <a
                        href="https://app.supabase.com/account/tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#3366FF] hover:underline inline-flex items-center gap-1"
                      >
                        Generate a token in Supabase Dashboard
                        <div className="i-ph:arrow-square-out w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-6">
                    <DialogClose asChild>
                      <button
                        className="px-4 py-2 rounded-lg text-sm border border-[#E5E5E5] dark:border-[#333333] text-bolt-elements-textSecondary hover:bg-[#F8F8F8] dark:hover:bg-[#252525]"
                      >
                        Skip for now
                      </button>
                    </DialogClose>
                    <button
                      onClick={handleConnect}
                      disabled={connecting || !supabaseConn.token}
                      className={classNames(
                        'px-4 py-2 rounded-lg text-sm flex items-center gap-2',
                        'bg-gradient-to-r from-[#3366FF] to-[#5E81FF] text-white',
                        'hover:from-[#2952CC] hover:to-[#4B6EE5]',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                      )}
                    >
                      {connecting ? (
                        <>
                          <div className="i-ph:spinner-gap animate-spin" />
                          Establishing connection...
                        </>
                      ) : (
                        <>
                          <div className="i-ph:plug-charging w-4 h-4" />
                          Link Account
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-[#F0F4FF] dark:bg-[#1A1F33] rounded-lg border border-[#D6E0FF] dark:border-[#2D3A66]">
                    <div className="w-10 h-10 rounded-full bg-[#3366FF]/20 flex items-center justify-center">
                      <div className="i-ph:user-circle w-6 h-6 text-[#3366FF]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-bolt-elements-textPrimary">{supabaseConn.user?.email}</h4>
                      <p className="text-xs text-bolt-elements-textSecondary">Role: {supabaseConn.user?.role}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[#3366FF]/10 text-[#3366FF]">
                      <div className="w-2 h-2 rounded-full bg-[#3366FF]" />
                      Active
                    </div>
                  </div>

                  {fetchingStats ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-bolt-elements-textSecondary p-4">
                      <div className="i-ph:spinner-gap w-5 h-5 animate-spin text-[#3366FF]" />
                      Retrieving your projects...
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <button
                          onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
                          className="bg-transparent text-left text-sm font-medium text-bolt-elements-textPrimary flex items-center gap-2"
                        >
                          <div className="i-ph:database w-4 h-4 text-[#3366FF]" />
                          Your Projects ({supabaseConn.stats?.totalProjects || 0})
                          <div
                            className={classNames(
                              'i-ph:caret-down w-4 h-4 transition-transform text-[#3366FF]',
                              isProjectsExpanded ? 'rotate-180' : '',
                            )}
                          />
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => fetchSupabaseStats(supabaseConn.token)}
                            className="px-2 py-1 rounded-md text-xs bg-[#F0F4FF] dark:bg-[#1A1F33] text-[#3366FF] hover:bg-[#D6E0FF] dark:hover:bg-[#2D3A66] flex items-center gap-1"
                            title="Refresh projects list"
                          >
                            <div className="i-ph:arrows-clockwise w-3 h-3" />
                            Refresh
                          </button>
                          <button
                            onClick={() => handleCreateProject()}
                            className="px-2 py-1 rounded-md text-xs bg-gradient-to-r from-[#3366FF] to-[#5E81FF] text-white hover:from-[#2952CC] hover:to-[#4B6EE5] flex items-center gap-1"
                          >
                            <div className="i-ph:plus w-3 h-3" />
                            Create Project
                          </button>
                        </div>
                      </div>

                      {isProjectsExpanded && (
                        <>
                          {!supabaseConn.selectedProjectId && (
                            <div className="mb-3 p-3 bg-[#F0F4FF] dark:bg-[#1A1F33] rounded-lg text-sm text-[#3366FF] border border-[#D6E0FF] dark:border-[#2D3A66]">
                              <div className="flex items-center gap-2">
                                <div className="i-ph:info w-4 h-4" />
                                Choose a project or create a new one for this session
                              </div>
                            </div>
                          )}

                          {supabaseConn.stats?.projects?.length ? (
                            <div className="grid gap-2 max-h-60 overflow-y-auto pr-1">
                              {supabaseConn.stats.projects.map((project) => (
                                <div
                                  key={project.id}
                                  className={classNames(
                                    "block p-3 rounded-lg border transition-all",
                                    supabaseConn.selectedProjectId === project.id
                                      ? "border-[#3366FF] bg-[#F0F4FF] dark:bg-[#1A1F33]"
                                      : "border-[#E5E5E5] dark:border-[#333333] hover:border-[#3366FF] dark:hover:border-[#3366FF]"
                                  )}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h5 className="text-sm font-medium text-bolt-elements-textPrimary flex items-center gap-1">
                                        <div className={classNames(
                                          "i-ph:database w-3 h-3",
                                          supabaseConn.selectedProjectId === project.id
                                            ? "text-[#3366FF]"
                                            : "text-bolt-elements-textSecondary"
                                        )} />
                                        {project.name}
                                      </h5>
                                      <div className="text-xs text-bolt-elements-textSecondary mt-1">
                                        {project.region}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => selectProject(project.id)}
                                      className={classNames(
                                        'px-3 py-1 rounded-md text-xs',
                                        supabaseConn.selectedProjectId === project.id
                                          ? 'bg-gradient-to-r from-[#3366FF] to-[#5E81FF] text-white'
                                          : 'bg-[#F0F0F0] dark:bg-[#252525] text-bolt-elements-textSecondary hover:bg-[#3366FF] hover:text-white',
                                      )}
                                    >
                                      {supabaseConn.selectedProjectId === project.id ? (
                                        <span className="flex items-center gap-1">
                                          <div className="i-ph:check w-3 h-3" />
                                          Active
                                        </span>
                                      ) : (
                                        'Use This'
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-bolt-elements-textSecondary flex items-center gap-2 p-4 bg-[#F8F8F8] dark:bg-[#1A1A1A] rounded-lg">
                              <div className="i-ph:info w-4 h-4" />
                              No projects found in your account
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between gap-2 mt-6 pt-4 border-t border-[#E5E5E5] dark:border-[#333333]">
                    <button
                      onClick={handleDisconnect}
                      className="px-3 py-1.5 rounded-lg text-sm border border-[#E5E5E5] dark:border-[#333333] text-bolt-elements-textSecondary hover:bg-[#F8F8F8] dark:hover:bg-[#252525]"
                    >
                      <div className="i-ph:plug-x w-4 h-4" />
                      Disconnect Account
                    </button>
                    <DialogClose asChild>
                      <button
                        className="px-3 py-1.5 rounded-lg text-sm bg-gradient-to-r from-[#3366FF] to-[#5E81FF] text-white hover:from-[#2952CC] hover:to-[#4B6EE5] flex items-center gap-1"
                      >
                        <div className="i-ph:check w-4 h-4" />
                        Apply Changes
                      </button>
                    </DialogClose>
                  </div>
                </div>
              )}
            </div>
          </Dialog>
        )}
      </DialogRoot>
    </div>
  );
}

interface ButtonProps {
  active?: boolean;
  disabled?: boolean;
  children?: any;
  onClick?: VoidFunction;
  className?: string;
}

function Button({ active = false, disabled = false, children, onClick, className }: ButtonProps) {
  return (
    <button
      className={classNames(
        'flex items-center p-1.5',
        {
          'bg-bolt-elements-item-backgroundDefault hover:bg-bolt-elements-item-backgroundActive text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary':
            !active && !className,
          'bg-bolt-elements-item-backgroundDefault text-bolt-elements-item-contentAccent': active && !disabled && !className,
          'bg-bolt-elements-item-backgroundDefault text-alpha-gray-20 dark:text-alpha-white-20 cursor-not-allowed':
            disabled,
        },
        className,
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}