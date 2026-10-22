import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir:'./ui-gallery/tests',testMatch:'workflow-behavior.spec.ts',
  fullyParallel:true,workers:2,forbidOnly:Boolean(process.env.CI),retries:0,
  reporter:'list',outputDir:'./test-results/ui-cross-browser',
  use:{baseURL:'http://127.0.0.1:4323',locale:'en-US',timezoneId:'UTC',trace:'retain-on-failure',screenshot:'only-on-failure',contextOptions:{reducedMotion:'reduce'}},
  webServer:{command:'node node_modules/vite/bin/vite.js --config ui-gallery/vite.config.ts --port 4323',url:'http://127.0.0.1:4323',reuseExistingServer:false},
  projects:[
    {name:'firefox-desktop',use:{browserName:'firefox',viewport:{width:1280,height:900},colorScheme:'light'}},
    {name:'webkit-phone',use:{browserName:'webkit',viewport:{width:390,height:844},colorScheme:'dark'}},
  ],
})
