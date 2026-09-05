export interface MenuItem {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  divider?: boolean;
  hasSubmenu?: boolean;
  subItems?: MenuItem[];
  action?: () => void;
}

export interface MenuGroup {
  title: string;
  accessKey?: string;
  items: MenuItem[];
}

export interface ToolbarAction {
  id: string;
  label: string;
  icon: string;
  tooltip?: string;
  color?: string;
}

export interface WindowPosition {
  x: number;
  y: number;
}
