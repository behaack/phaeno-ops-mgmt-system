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
    submenu: null
  },
  {
    index: 3,
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
    index: 4,
    label: 'Media',
    path: '/media',
    submenu: [
      {
        index: 4.1,
        label: 'News & Events',
        path: '/media/news-and-events',
        submenu: null
      },
      {
        index: 4.2,
        label: 'Press Releases',
        path: '/media/press-releases',
        submenu: null        
      },
      {
        index: 4.3,
        label: 'Phaeno Blog',
        path: '/media/blog',
        submenu: null        
      },
      {
        index: 4.4,
        label: 'Scientific Publications',
        path: '/media/scientific-publications',
        submenu: null        
      },
      {
        index: 4.5,
        label: 'White Papers',
        path: '/media/white-papers',
        submenu: null
      }
    ]
  },  
  {
    index: 2,
    label: 'Contact',
    path: '/contact',
    submenu: null
  },  
]

export default menu
