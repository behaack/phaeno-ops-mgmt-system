export interface IMenuItem {
  index: number,
  label: string,
  path: string
  submenu: IMenuItem[] | null
}