export const IPC_CHANNELS = {
  // Project
  PROJECT_CREATE: 'project:create',
  PROJECT_OPEN: 'project:open',
  PROJECT_DELETE: 'project:delete',
  PROJECT_LIST: 'project:list',
  PROJECT_IMPORT: 'project:import',

  // Posts
  POST_CREATE: 'post:create',
  POST_UPDATE: 'post:update',
  POST_DELETE: 'post:delete',
  POST_LIST: 'post:list',
  POST_READ: 'post:read',
  POST_PUBLISH_DRAFT: 'post:publish-draft',

  // Hexo
  HEXO_INIT: 'hexo:init',
  HEXO_GENERATE: 'hexo:generate',
  HEXO_SERVER: 'hexo:server',
  HEXO_SERVER_STOP: 'hexo:server-stop',
  HEXO_DEPLOY: 'hexo:deploy',
  HEXO_CLEAN: 'hexo:clean',

  // Git
  GIT_INIT: 'git:init',
  GIT_ADD: 'git:add',
  GIT_COMMIT: 'git:commit',
  GIT_PUSH: 'git:push',
  GIT_STATUS: 'git:status',
  GIT_PULL: 'git:pull',

  // Environment
  ENV_DETECT: 'env:detect',

  // File operations
  FILE_SAVE: 'file:save',
  FILE_READ: 'file:read',
  FILE_COPY_IMAGE: 'file:copy-image',
  FILE_COPY_IMAGE_DATA: 'file:copy-image-data',
  FILE_WATCH: 'file:watch',
  FILE_UNWATCH: 'file:unwatch',

  // Database / Config
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
  DEPLOY_CONFIG_GET: 'deploy-config:get',
  DEPLOY_CONFIG_SET: 'deploy-config:set',

  // Dialog
  DIALOG_SELECT_DIRECTORY: 'dialog:select-directory',
  DIALOG_SELECT_FILE: 'dialog:select-file',

  // Events (main → renderer)
  EVENT_FILE_CHANGED: 'event:file-changed',
  EVENT_COMMAND_LOG: 'event:command-log',

  // Logs
  LOG_GET_ALL: 'log:get-all',

  // Config files
  CONFIG_READ_YML: 'config:read-yml',
  CONFIG_WRITE_YML: 'config:write-yml',

  // Theme
  THEME_LIST: 'theme:list',
  THEME_INSTALL_NPM: 'theme:install-npm',
  THEME_INSTALL_GIT: 'theme:install-git',
  THEME_GET_POPULAR: 'theme:get-popular',

  // Shell
  SHELL_OPEN_EXTERNAL: 'shell:open-external',

  // Window controls
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:is-maximized',
} as const;
