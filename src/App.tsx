import { useEffect, useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useConfigStore } from '@/store/configStore';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import TitleBar from '@/components/layout/TitleBar';
import Toolbar from '@/components/layout/Toolbar';
import Sidebar from '@/components/layout/Sidebar';
import EditorArea from '@/components/editor/EditorArea';
import PreviewPanel from '@/components/preview/PreviewPanel';
import LogPanel from '@/components/layout/LogPanel';
import StatusBar from '@/components/layout/StatusBar';
import SettingsPanel from '@/components/settings/SettingsPanel';
import DeployPanel from '@/components/deploy/DeployPanel';
import ConfigPanel from '@/components/settings/ConfigPanel';
import NewProjectDialog from '@/components/project/NewProjectDialog';
import ImportProjectDialog from '@/components/project/ImportProjectDialog';
import EnvCheckDialog from '@/components/settings/EnvCheckDialog';

type View = 'editor' | 'settings' | 'deploy' | 'config';

export default function App() {
  const { currentProject, loadProjects } = useProjectStore();
  const { config, loadConfig, detectEnv, addLog, isDark } = useConfigStore();

  const [view, setView] = useState<View>('editor');
  const [showNewProject, setShowNewProject] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showEnvCheck, setShowEnvCheck] = useState(false);
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [previewWidth, setPreviewWidth] = useState(360);
  const [logHeight, setLogHeight] = useState(200);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingPreview, setIsResizingPreview] = useState(false);
  const [isResizingLog, setIsResizingLog] = useState(false);

  useEffect(() => {
    const init = async () => {
      await loadConfig();
      await loadProjects();
      await detectEnv();
    };
    init();
  }, []);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onCommandLog((log) => {
      addLog(log);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Resize handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar) {
        setSidebarWidth(Math.max(200, Math.min(450, e.clientX)));
      }
      if (isResizingPreview) {
        setPreviewWidth(Math.max(300, Math.min(800, window.innerWidth - e.clientX)));
      }
      if (isResizingLog) {
        setLogHeight(Math.max(100, Math.min(500, window.innerHeight - e.clientY)));
      }
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      setIsResizingPreview(false);
      setIsResizingLog(false);
    };

    if (isResizingSidebar || isResizingPreview || isResizingLog) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar, isResizingPreview, isResizingLog]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key === 'n') {
        e.preventDefault();
        setShowNewProject(true);
      }
      if (mod && e.key === 'o') {
        e.preventDefault();
        setShowImport(true);
      }
      if (mod && e.key === ',') {
        e.preventDefault();
        setView('settings');
      }
      if (mod && e.key === 'j') {
        e.preventDefault();
        setShowLogPanel((v) => !v);
      }
      if (mod && e.key === 'p') {
        e.preventDefault();
        setShowPreview((v) => !v);
      }
      if (e.key === 'Escape') {
        setShowNewProject(false);
        setShowImport(false);
        setShowEnvCheck(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Custom Title Bar (frameless window) */}
      <TitleBar />

      {/* Toolbar */}
      <Toolbar
        view={view}
        onViewChange={setView}
        onNewProject={() => setShowNewProject(true)}
        onImportProject={() => setShowImport(true)}
        onEnvCheck={() => setShowEnvCheck(true)}
        onToggleLogPanel={() => setShowLogPanel(!showLogPanel)}
        onTogglePreview={() => setShowPreview(!showPreview)}
        onShowLogPanel={() => setShowLogPanel(true)}
        showLogPanel={showLogPanel}
        showPreview={showPreview}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div style={{ width: sidebarWidth }} className="flex-shrink-0">
          <ErrorBoundary>
            <Sidebar onPostSelect={() => setView('editor')} />
          </ErrorBoundary>
        </div>

        {/* Sidebar Resize Handle */}
        <div
          className="resize-handle cursor-col-resize"
          onMouseDown={() => setIsResizingSidebar(true)}
        />

        {/* Main Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Editor + Preview */}
          <div className="flex-1 flex overflow-hidden">
            {/* Editor */}
            <div className="flex-1 min-w-0">
              <ErrorBoundary>
                {view === 'editor' && <EditorArea />}
                {view === 'settings' && <SettingsPanel />}
                {view === 'deploy' && <DeployPanel onShowLogPanel={() => setShowLogPanel(true)} />}
                {view === 'config' && <ConfigPanel />}
              </ErrorBoundary>
            </div>

            {/* Preview Resize Handle */}
            {showPreview && (
              <div
                className="resize-handle cursor-col-resize"
                onMouseDown={() => setIsResizingPreview(true)}
              />
            )}

            {/* Preview Panel */}
            {showPreview && (
              <div style={{ width: previewWidth }} className="flex-shrink-0">
                <PreviewPanel onClose={() => setShowPreview(false)} />
              </div>
            )}
          </div>

          {/* Log Panel Resize Handle */}
          {showLogPanel && (
            <div
              className="resize-handle-horizontal cursor-row-resize"
              onMouseDown={() => setIsResizingLog(true)}
            />
          )}

          {/* Log Panel */}
          {showLogPanel && (
            <div style={{ height: logHeight }} className="flex-shrink-0">
              <LogPanel />
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Dialogs */}
      {showNewProject && (
        <NewProjectDialog onClose={() => setShowNewProject(false)} />
      )}
      {showImport && (
        <ImportProjectDialog onClose={() => setShowImport(false)} />
      )}
      {showEnvCheck && (
        <EnvCheckDialog onClose={() => setShowEnvCheck(false)} />
      )}
    </div>
  );
}
