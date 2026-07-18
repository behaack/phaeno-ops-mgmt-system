const footer =
{  
  left: {
    sections: [
      {
        header: 'Phaeno Inc.',
        content: [
          {
            type: "label",
            label: '5270 California Avenue\r\nSuite 300\r\nIrvine, CA 92617',
            value: ''
          },
          {
            type: "email",
            label: 'info@phaenobiotech.com',
            value: 'info@phaenobiotech.com'
          }      
        ]
      }
    ]
  },
  center: {
    sections: [
      {
        header: 'Resources',
        content: [
          {
            type: 'link',
            label: 'Job Openings',
            value: '/about/job-openings'
          },
          {
            type: 'link',
            label: 'Investors',
            value: '/investors'
          },
          {
            type: 'external-link',
            label: 'Customer Portal',
            value: 'https://portal.cadexgenomics.com'
          }
        ]
      }      
    ]
  },
  right: {
    sections: [
      {
        header: 'Media',
        content: [
          {
            type: 'link',
            label: 'News & Events',
            value: '/media/news-and-events'
          },  
          {
            type: 'link',
            label: 'Press Releases',
            value: '/media/press-releases'
          },  
          {
            type: 'link',
            label: 'Phaeno Blog',
            value: '/media/blog'
          },  
          {
            type: 'link',
            label: 'Scientific Publications',
            value: '/media/scientific-publications'
          },  
          {
            type: 'link',
            label: 'White Papers',
            value: '/media/white-papers'
          },
          {
            type: 'social-media',
            label: '',
            value: ''      
          }
        ]
      }
    ]
  },
  bottom: [
    {
      type: 'link',
      label: 'Privacy Policy',
      value: '/privacy'
    },  
    {
      type: 'link',
      label: 'Terms of Use',
      value: '/tou'
    },  
    {
      type: 'link',
      label: 'Data Policies',
      value: '/data-policies'
    }
  ]
}

export default footer;