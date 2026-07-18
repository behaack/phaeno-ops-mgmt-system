export enum ETeamMemberType {
  management,
  advisor,
  technical,
  busdev,
}

export interface ITeamMember {
  index: number
  type: ETeamMemberType
  fname: string
  lname: string
  title: string
  image: string
  linkedIn: string
}

const team: ITeamMember[] = [
  {
    index: 0,
    type: 0,
    fname: 'William',
    lname: 'Agnew, PhD',
    title: 'Founder, CEO',
    image: 'wagnew-illustrated.png',
    linkedIn: 'https://www.linkedin.com/in/william-agnew-a6482228/',
  },
  {
    index: 1,
    type: 0,
    fname: 'Mark',
    lname: 'Emerick, PhD',
    title: 'Founder, CSO',
    image: 'memerick.webp',
    linkedIn: 'https://www.linkedin.com/in/mark-emerick-712a943/',
  },
  {
    index: 2,
    type: 0,
    fname: 'Giovanni',
    lname: 'Parmigiani, PhD',
    title: 'Founder, CTO',
    image: 'gparmigiani.webp',
    linkedIn: 'https://www.linkedin.com/in/giovanni-parmigiani-024a11b/',
  },
  {
    index: 3,
    type: 0,
    fname: 'Hedi',
    lname: 'Mouchard',
    title: 'Founder, COO',
    image: 'hmouchard-illustrated-v2.png',
    linkedIn: 'https://www.linkedin.com/in/hedi-mouchard-50b6a47/',
  },
  {
    index: 4,
    type: 0,
    fname: 'Bill',
    lname: 'Haack, MA',
    title: 'CFO | CBO',
    image: 'bhaack-illustrated.png',
    linkedIn: 'https://www.linkedin.com/in/bill-haack-aa1a743/',
  },
  {
    index: 10000,
    type: 3,
    fname: 'James',
    lname: 'Wallace, MBA',
    title: 'VP, Business Development',
    image: 'jwallace-illustrated.png',
    linkedIn: 'https://www.linkedin.com/in/james-wallace-msc-mba-841152b/',
  },  
  // {
  //   index: 10001,
  //   type: 3,
  //   fname: 'Sam',
  //   lname: 'Crawford',
  //   title: 'Director, Business Development',
  //   image: 'scrawford.webp',
  //   linkedIn: 'https://www.linkedin.com/in/sam-crawford-71484815/',
  // },    
  {
    index: 1000,
    type: 2,
    fname: 'Baoqing',
    lname: 'Zhou, PhD',
    title: 'Senior Scientist',
    image: 'bzhou-illustrated.png',
    linkedIn: 'https://www.linkedin.com/in/baoqing-zhou-7717a552/',
  },
  {
    index: 1001,
    type: 2,
    fname: 'Brandon',
    lname: 'Young',
    title: 'Consulting Scientist',
    image: 'byoung-illustrated.png',
    linkedIn: 'https://www.linkedin.com/in/brandon-young-231b24/',
  },
  {
    index: 1002,
    type: 2,
    fname: 'Christopher',
    lname: ' Yourch',
    title: 'Consulting Software Engineer',
    image: 'cyourch-illustrated.png',
    linkedIn: 'https://www.linkedin.com/in/chris-yourch/',
  },    
  {
    index: 100,
    type: 1,
    fname: 'Samir',
    lname: 'Abed',
    title: 'Advisor',
    image: 'sabed-illustrated.png',
    linkedIn: 'https://www.linkedin.com/in/samir-abed-69195110/',
  },
  {
    index: 101,
    type: 1,
    fname: 'Mark',
    lname: 'Bouzyk, PhD',
    title: 'Advisor',
    image: 'mbouzyk-illustrated.png',
    linkedIn: 'https://www.linkedin.com/in/mark-b-8a42648/',
  },
  {
    index: 102,
    type: 1,
    fname: 'Ellen',
    lname: 'Beasley, PhD',
    title: 'Advisor',
    image: 'ebeasley-illustrated.png',
    linkedIn: 'https://www.linkedin.com/in/ellen-beasley-b58577/',
  },
  {
    index: 103,
    type: 1,
    fname: 'Ed',
    lname: 'Cho, PhD',
    title: 'Advisor',
    image: 'echo-illustrated.png',
    linkedIn: 'https://www.linkedin.com/in/edcho/',
  },
  {
    index: 104,
    type: 1,
    fname: 'Paul',
    lname: 'Owen',
    title: 'Advisor',
    image: 'powen-illustrated.png',
    linkedIn: 'https://www.linkedin.com/in/powen/',
  },
  {
    index: 105,
    type: 1,
    fname: 'Chase',
    lname: 'Spurlock, PhD',
    title: 'Advisor',
    image: 'cspurlock-illustrated.png',
    linkedIn: 'https://www.linkedin.com/in/chase-spurlock/',
  },
]

export default team
