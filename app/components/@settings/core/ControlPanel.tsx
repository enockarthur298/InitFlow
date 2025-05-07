import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@nanostores/react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { classNames } from '~/utils/classNames';
import { TabManagement } from '~/components/@settings/shared/components/TabManagement';
import { TabTile } from '~/components/@settings/shared/components/TabTile';
import { useUpdateCheck } from '~/lib/hooks/useUpdateCheck';
import { useFeatures } from '~/lib/hooks/useFeatures';
import { useNotifications } from '~/lib/hooks/useNotifications';
import { useConnectionStatus } from '~/lib/hooks/useConnectionStatus';
import { useDebugStatus } from '~/lib/hooks/useDebugStatus';
import {
  tabConfigurationStore,
  developerModeStore,
  resetTabConfiguration,
} from '~/lib/stores/settings';
import { profileStore } from '~/lib/stores/profile';
import type { TabType, TabVisibilityConfig, Profile } from './types';
import { TAB_LABELS, DEFAULT_TAB_CONFIG } from './constants';
import { DialogTitle } from '~/components/ui/Dialog';

// Import all tab components
import ProfileTab from '~/components/@settings/tabs/profile/ProfileTab';
import SettingsTab from '~/components/@settings/tabs/settings/SettingsTab';
import NotificationsTab from '~/components/@settings/tabs/notifications/NotificationsTab';
import FeaturesTab from '~/components/@settings/tabs/features/FeaturesTab';
import { DataTab } from '~/components/@settings/tabs/data/DataTab';
import DebugTab from '~/components/@settings/tabs/debug/DebugTab';
import { EventLogsTab } from '~/components/@settings/tabs/event-logs/EventLogsTab';
import UpdateTab from '~/components/@settings/tabs/update/UpdateTab';
import ConnectionsTab from '~/components/@settings/tabs/connections/ConnectionsTab';
import CloudProvidersTab from '~/components/@settings/tabs/providers/cloud/CloudProvidersTab';
import ServiceStatusTab from '~/components/@settings/tabs/providers/status/ServiceStatusTab';
import LocalProvidersTab from '~/components/@settings/tabs/providers/local/LocalProvidersTab';
import TaskManagerTab from '~/components/@settings/tabs/task-manager/TaskManagerTab';
import BillingTab from '~/components/@settings/tabs/billing/BillingTab';

interface ControlPanelProps {
  open: boolean;
  onClose: () => void;
}

interface TabWithDevType extends TabVisibilityConfig {
  isExtraDevTab?: boolean;
}

interface ExtendedTabConfig extends TabVisibilityConfig {
  isExtraDevTab?: boolean;
  category?: string; // Add the category property to the interface
}

interface BaseTabConfig {
  id: TabType;
  visible: boolean;
  window: 'user' | 'developer';
  order: number;
}

const TAB_DESCRIPTIONS: Record<TabType, string> = {
  profile: 'Manage your profile and account settings',
  settings: 'Configure application preferences',
  notifications: 'View and manage your notifications',
  features: 'Explore new and upcoming features',
  data: 'Manage your data and storage',
  'cloud-providers': 'Configure cloud AI providers and models',
  'local-providers': 'Configure local AI providers and models',
  'service-status': 'Monitor cloud LLM service status',
  connection: 'Check connection status and settings',
  debug: 'Debug tools and system information',
  'event-logs': 'View system events and logs',
  update: 'Check for updates and release notes',
  'task-manager': 'Monitor system resources and processes',
  'tab-management': 'Configure visible tabs and their order',
  billing: 'Manage your subscription and billing details',
};

// Beta status for experimental features
const BETA_TABS = new Set<TabType>(['task-manager', 'service-status', 'update', 'local-providers', 'billing']);

const BetaLabel = () => (
  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-[#3366FF]/10 dark:bg-[#3366FF]/20">
    <span className="text-[10px] font-medium text-[#3366FF] dark:text-[#3366FF]">BETA</span>
  </div>
);

export const ControlPanel = ({ open, onClose }: ControlPanelProps) => {
  // State
  const [activeTab, setActiveTab] = useState<TabType | null>(null);
  const [loadingTab, setLoadingTab] = useState<TabType | null>(null);
  const [showTabManagement, setShowTabManagement] = useState(false);

  // Store values
  const tabConfiguration = useStore(tabConfigurationStore);
  const developerMode = useStore(developerModeStore);
  const profile = useStore(profileStore) as Profile;

  // Status hooks
  const { hasUpdate, currentVersion, acknowledgeUpdate } = useUpdateCheck();
  const { hasNewFeatures, unviewedFeatures, acknowledgeAllFeatures } = useFeatures();
  const { hasUnreadNotifications, unreadNotifications, markAllAsRead } = useNotifications();
  const { hasConnectionIssues, currentIssue, acknowledgeIssue } = useConnectionStatus();
  const { hasActiveWarnings, activeIssues, acknowledgeAllIssues } = useDebugStatus();

  // Memoize the base tab configurations to avoid recalculation
  const baseTabConfig = useMemo(() => {
    return new Map(DEFAULT_TAB_CONFIG.map((tab) => [tab.id, tab]));
  }, []);

  // Unified tab display logic - show all available tabs in a single view
  const visibleTabs = useMemo(() => {
    if (!tabConfiguration?.userTabs || !Array.isArray(tabConfiguration.userTabs)) {
      
      resetTabConfiguration();
      return [];
    }
  
    const notificationsDisabled = profile?.preferences?.notifications === false;
  
    // Define tab categories for organization
    const tabCategories = {
      account: ['profile', 'settings', 'billing'],
      content: ['notifications', 'features', 'data', 'update'],
      providers: ['cloud-providers', 'local-providers', 'service-status'],
      system: ['connection', 'debug', 'event-logs', 'task-manager'],
      management: ['tab-management']
    };
    
    // Combine all tabs from user and developer modes
    const allTabs = new Set([
      ...DEFAULT_TAB_CONFIG.map(tab => tab.id),
      ...tabConfiguration.userTabs.map(tab => tab.id),
      ...(tabConfiguration.developerTabs || []).map(tab => tab.id)
    ]);
    
    // Create a unified tab list
    const unifiedTabs: ExtendedTabConfig[] = [];
    let order = 0;
    
    // Process tabs by category for better organization
    Object.entries(tabCategories).forEach(([category, tabIds]) => {
      tabIds.forEach(tabId => {
        if (allTabs.has(tabId as TabType)) {
          // Skip notifications if disabled in preferences
          if (tabId === 'notifications' && notificationsDisabled) {
            return;
          }
          
          // Find existing configuration for this tab
          const existingTab = 
            tabConfiguration.userTabs.find(t => t.id === tabId) || 
            tabConfiguration.developerTabs?.find(t => t.id === tabId) ||
            DEFAULT_TAB_CONFIG.find(t => t.id === tabId);
          
          unifiedTabs.push({
            id: tabId as TabType,
            visible: true, // Show all tabs in the unified view
            window: existingTab?.window || 'user',
            order: order++,
            category // Add category for potential future grouping
          });
        }
      });
    });
    
    return unifiedTabs;
  }, [tabConfiguration, profile?.preferences?.notifications]);

  // Optimize animation performance with layout animations
  const gridLayoutVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 20,
        mass: 0.6,
      },
    },
  };

  // Reset to default view when modal opens/closes
  useEffect(() => {
    if (!open) {
      // Reset when closing
      setActiveTab(null);
      setLoadingTab(null);
      setShowTabManagement(false);
    } else {
      // When opening, set to null to show the main view
      setActiveTab(null);
    }
  }, [open]);

  // Handle closing
  const handleClose = () => {
    setActiveTab(null);
    setLoadingTab(null);
    setShowTabManagement(false);
    onClose();
  };

  // Handlers
  const handleBack = () => {
    if (showTabManagement) {
      setShowTabManagement(false);
    } else if (activeTab) {
      setActiveTab(null);
    }
  };

  const getTabComponent = (tabId: TabType | 'tab-management') => {
    if (tabId === 'tab-management') {
      return <TabManagement />;
    }

    switch (tabId) {
      case 'profile':
        return <ProfileTab />;
      case 'settings':
        return <SettingsTab />;
      case 'notifications':
        return <NotificationsTab />;
      case 'features':
        return <FeaturesTab />;
      case 'data':
        return <DataTab />;
      case 'cloud-providers':
        return <CloudProvidersTab />;
      case 'local-providers':
        return <LocalProvidersTab />;
      case 'connection':
        return <ConnectionsTab />;
      case 'debug':
        return <DebugTab />;
      case 'event-logs':
        return <EventLogsTab />;
      case 'update':
        return <UpdateTab />;
      case 'task-manager':
        return <TaskManagerTab />;
      case 'service-status':
        return <ServiceStatusTab />;
      case 'billing':
        return <BillingTab />;
      default:
        return null;
    }
  };

  const getTabUpdateStatus = (tabId: TabType): boolean => {
    switch (tabId) {
      case 'update':
        return hasUpdate;
      case 'features':
        return hasNewFeatures;
      case 'notifications':
        return hasUnreadNotifications;
      case 'connection':
        return hasConnectionIssues;
      case 'debug':
        return hasActiveWarnings;
      default:
        return false;
    }
  };

  const getStatusMessage = (tabId: TabType): string => {
    switch (tabId) {
      case 'update':
        return `New update available (v${currentVersion})`;
      case 'features':
        return `${unviewedFeatures.length} new feature${unviewedFeatures.length === 1 ? '' : 's'} to explore`;
      case 'notifications':
        return `${unreadNotifications.length} unread notification${unreadNotifications.length === 1 ? '' : 's'}`;
      case 'connection':
        return currentIssue === 'disconnected'
          ? 'Connection lost'
          : currentIssue === 'high-latency'
            ? 'High latency detected'
            : 'Connection issues detected';
      case 'debug': {
        const warnings = activeIssues.filter((i) => i.type === 'warning').length;
        const errors = activeIssues.filter((i) => i.type === 'error').length;

        return `${warnings} warning${warnings === 1 ? '' : 's'}, ${errors} error${errors === 1 ? '' : 's'}`;
      }
      default:
        return '';
    }
  };

  const handleTabClick = (tabId: TabType) => {
    setLoadingTab(tabId);
    setActiveTab(tabId);
    setShowTabManagement(false);

    // Acknowledge notifications based on tab
    switch (tabId) {
      case 'update':
        acknowledgeUpdate();
        break;
      case 'features':
        acknowledgeAllFeatures();
        break;
      case 'notifications':
        markAllAsRead();
        break;
      case 'connection':
        acknowledgeIssue();
        break;
      case 'debug':
        acknowledgeAllIssues();
        break;
    }

    // Clear loading state after a delay
    setTimeout(() => setLoadingTab(null), 500);
  };

  return (
    <RadixDialog.Root open={open}>
      <RadixDialog.Portal>
        <div className="fixed inset-0 flex items-center justify-center z-[100]">
          <RadixDialog.Overlay asChild>
            <motion.div
              className="absolute inset-0 bg-black/70 dark:bg-black/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          </RadixDialog.Overlay>

          <RadixDialog.Content
            aria-describedby={undefined}
            onEscapeKeyDown={handleClose}
            onPointerDownOutside={handleClose}
            className="relative z-[101]"
          >
            <motion.div
              className={classNames(
                'w-[1200px] h-[90vh]',
                'rounded-2xl shadow-2xl',
                'border border-[#E4E9F2]',
                'flex flex-col overflow-hidden',
                'relative',
                'bg-[#F7F9FC] dark:bg-[#222B45]'
              )}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E9F2] dark:border-[#2E3A59] bg-white dark:bg-[#1A2138]">
                  <div className="flex items-center space-x-4">
                    {(activeTab || showTabManagement) && (
                      <button
                        onClick={handleBack}
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-transparent hover:bg-[#3366FF]/10 dark:hover:bg-[#3366FF]/20 group transition-all duration-200"
                      >
                        <div className="i-ph:arrow-left w-4 h-4 text-[#8F9BB3] dark:text-[#C5CEE0] group-hover:text-[#3366FF] transition-colors" />
                      </button>
                    )}
                    <DialogTitle className="text-xl font-semibold text-[#222B45] dark:text-white">
                      {showTabManagement ? 'Tab Management' : activeTab ? TAB_LABELS[activeTab] : 'Settings'}
                    </DialogTitle>
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={handleClose}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-transparent hover:bg-[#3366FF]/10 dark:hover:bg-[#3366FF]/20 group transition-all duration-200"
                  >
                    <div className="i-ph:x w-4 h-4 text-[#8F9BB3] dark:text-[#C5CEE0] group-hover:text-[#3366FF] transition-colors" />
                  </button>
                </div>

                {/* Content */}
                <div
                  className={classNames(
                    'flex-1',
                    'overflow-y-auto',
                    'hover:overflow-y-auto',
                    'scrollbar scrollbar-w-2',
                    'scrollbar-track-transparent',
                    'scrollbar-thumb-[#8F9BB3] hover:scrollbar-thumb-[#6B7A99]',
                    'dark:scrollbar-thumb-[#C5CEE0] dark:hover:scrollbar-thumb-[#E4E9F2]',
                    'will-change-scroll',
                    'touch-auto',
                  )}
                >
                  <motion.div
                    key={activeTab || 'home'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-6"
                  >
                    {showTabManagement ? (
                      <TabManagement />
                    ) : activeTab ? (
                      getTabComponent(activeTab)
                    ) : (
                      <div className="space-y-8">
                        {/* Account & Preferences Section - Updated with Billing */}
                        <div>
                          <h2 className="text-lg font-medium text-[#222B45] dark:text-white mb-4">Account & Preferences</h2>
                          <motion.div
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative"
                            variants={gridLayoutVariants}
                            initial="hidden"
                            animate="visible"
                          >
                            <AnimatePresence mode="popLayout">
                              {visibleTabs
                                .filter(tab => ['profile', 'settings', 'billing'].includes(tab.id))
                                .map((tab) => (
                                  <motion.div 
                                    key={tab.id} 
                                    layout 
                                    variants={itemVariants} 
                                    className="aspect-[1.5/1]"
                                  >
                                    <TabTile
                                      tab={tab}
                                      onClick={() => handleTabClick(tab.id as TabType)}
                                      isActive={activeTab === tab.id}
                                      hasUpdate={getTabUpdateStatus(tab.id)}
                                      statusMessage={getStatusMessage(tab.id)}
                                      description={TAB_DESCRIPTIONS[tab.id]}
                                      isLoading={loadingTab === tab.id}
                                      className="h-full relative"
                                    >
                                      {BETA_TABS.has(tab.id) && <BetaLabel />}
                                    </TabTile>
                                  </motion.div>
                                ))}
                            </AnimatePresence>
                          </motion.div>
                        </div>
                        
                        {/* Content & Features Section */}
                        <div>
                          <h2 className="text-lg font-medium text-[#222B45] dark:text-white mb-4">Content & Features</h2>
                          <motion.div
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative"
                            variants={gridLayoutVariants}
                            initial="hidden"
                            animate="visible"
                          >
                            <AnimatePresence mode="popLayout">
                              {visibleTabs
                                .filter(tab => ['features', 'data', 'notifications', 'update'].includes(tab.id))
                                .map((tab) => (
                                  <motion.div 
                                    key={tab.id} 
                                    layout 
                                    variants={itemVariants} 
                                    className="aspect-[1.5/1]"
                                  >
                                    <TabTile
                                      tab={tab}
                                      onClick={() => handleTabClick(tab.id as TabType)}
                                      isActive={activeTab === tab.id}
                                      hasUpdate={getTabUpdateStatus(tab.id)}
                                      statusMessage={getStatusMessage(tab.id)}
                                      description={TAB_DESCRIPTIONS[tab.id]}
                                      isLoading={loadingTab === tab.id}
                                      className="h-full relative"
                                    >
                                      {BETA_TABS.has(tab.id) && <BetaLabel />}
                                    </TabTile>
                                  </motion.div>
                                ))}
                            </AnimatePresence>
                          </motion.div>
                        </div>
                        {/* AI Providers Section - Removed */}
                        {/* System & Advanced Section - Already Removed */}
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </RadixDialog.Content>
        </div>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};