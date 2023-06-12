import { defineConfig } from 'umi';

export default defineConfig({
  nodeModulesTransform: {
    type: 'none',
  },
  routes: [
    { path: '/', component: '@/pages/quickStart' },
    { path: '/use_case_1', component: '@/pages/use_case_1' },
    { path: '/use_case_2', component: '@/pages/use_case_2' },
    { path: '/use_case_3', component: '@/pages/use_case_3' },
  ],
  fastRefresh: {},
});
