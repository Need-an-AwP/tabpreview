/**
 * This type comes from vscode-material-icon-theme
 */

export type Manifest = {
  file?: string;
  folder?: string;
  folderExpanded?: string;
  folderNames?: Record<string, string>;
  folderNamesExpanded?: Record<string, string>;
  rootFolderNames?: Record<string, string>;
  rootFolderNamesExpanded?: Record<string, string>;
  rootFolder?: string;
  rootFolderExpanded?: string;
  fileExtensions?: Record<string, string>;
  fileNames?: Record<string, string>;
  languageIds?: Record<string, string>;
  iconDefinitions?: Record<string, { iconPath: string }>;
  light?: Manifest;
  highContrast?: Manifest;
  hidesExplorerArrows?: boolean;
};

