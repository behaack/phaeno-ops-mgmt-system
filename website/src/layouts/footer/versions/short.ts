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
            label: 'Blog',
            value: '/blog'
          },
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
            value: 'https://portal.phaenobiotech.com'
          },          
        ]
      }      
    ]
  },
  right: {
    sections: [
      {
        header: 'Site Map',
        content: [
          {
            type: 'link',
            label: 'Home',
            value: '/'
          },  
          {
            type: 'link',
            label: 'Technology',
            value: '/technology'
          },  
          {
            type: 'link',
            label: 'Why RNA Isoforms?',
            value: '/why-isoforms-matter'
          },  
          {
            type: 'link',
            label: 'PSeq & Multi-omics',
            value: '/multi-omics'
          },  
          {
            type: 'link',
            label: 'About Us',
            value: '/about/about-us'
          },
          {
            type: 'link',
            label: 'Contact Us',
            value: '/contact'
          },
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
      label: 'Data Policies',
      value: '/data-policies'
    },    
  ]
}

export default footer;