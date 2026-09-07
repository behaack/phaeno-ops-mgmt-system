import type { IMenuItem } from "./IMenuItem"

const menu: IMenuItem[] = [
  {
    index: 0,
    label: 'Home',
    path: '/',
    submenu: null
  },
  {
    index: 1,
    label: 'Technology',
    path: '/technology',
    submenu: [
      {
        index: 1.1,
        label: 'PSeq Platform',
        path: '/technology/pseq-platform',
        submenu: null
      },
      {    
        index: 1.2,
        label: 'PSeq & Multi-omics',
        path: '/technology/multi-omics',
        submenu: null
      },{ 
        index: 1.3,
        label: 'Why RNA Isoforms?',
        path: '/technology/why-isoforms-matter',
        submenu: null
      }
    ]
  },
  {
    index: 2,
    label: 'About',
    path: '/about',
    submenu: [
      {
        index: 3.1,
        label: 'About Us',
        path: '/about/about-us',
        submenu: null
      },
      {
        index: 3.2,
        label: 'Job Openings',
        path: '/about/job-openings',
        submenu: null
      }      
    ]
  },  
  {
    index: 3,
    label: 'Media',
    path: '/media',
    submenu: [
      {
        index: 3.1,
        label: 'White Papers',
        path: '/media/white-papers',
        submenu: null
      },
      {
        index: 3.2,
        label: 'Blog',
        path: '/media/blog',
        submenu: null
      }
    ]
  },
  {
    index: 4,
    label: 'Contact',
    path: '/contact',
    submenu: null
  },  
]

export default menu
