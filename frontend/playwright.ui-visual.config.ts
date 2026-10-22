import { defineConfig } from '@playwright/test'

if(process.platform!=='win32')throw new Error('Reviewed visual baselines use Windows Chromium. Run ui:test:visual on Windows; the regular gallery checks support every CI platform.')

export default defineConfig({
  testDir:'./ui-gallery/visual-tests',
  snapshotPathTemplate:'{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  outputDir:'./test-results/ui-visual',
  updateSnapshots:'none',
  fullyParallel:true,workers:2,forbidOnly:Boolean(process.env.CI),retries:0,reporter:'list',
  expect:{toHaveScreenshot:{animations:'disabled',caret:'hide',scale:'css',threshold:0.1,maxDiffPixels:80}},
  use:{baseURL:'http://127.0.0.1:4321',browserName:'chromium',locale:'en-US',timezoneId:'UTC',deviceScaleFactor:1,contextOptions:{reducedMotion:'reduce'},trace:'retain-on-failure'},
  webServer:{command:'node node_modules/vite/bin/vite.js --config ui-gallery/vite.config.ts --port 4321',url:'http://127.0.0.1:4321',reuseExistingServer:false},
  projects:[
    {name:'desktop-light',use:{viewport:{width:1280,height:900},colorScheme:'light'}},
    {name:'desktop-dark',use:{viewport:{width:1280,height:900},colorScheme:'dark'}},
    {name:'narrow-light',use:{viewport:{width:390,height:844},colorScheme:'light'}},
    {name:'narrow-dark',use:{viewport:{width:390,height:844},colorScheme:'dark'}},
  ],
})
