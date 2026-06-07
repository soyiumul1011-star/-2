import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages 배포 시 저장소 명인 '/-2/' 경로에서 정적 파일을 올바르게 찾을 수 있도록 base 설정을 추가합니다.
  base: './'
});
