import {defineConfig, loadEnv} from 'vite'
import react from '@vitejs/plugin-react-swc'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    plugins: [react(), tsconfigPaths()],
    server: {
      port: parseInt(env.VITE_PORT, 10) || 5173,
      allowedHosts: env.VITE_ALLOWED_HOSTS.split(',') || ['localhost'],
    },
  };
});