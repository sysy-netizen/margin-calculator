/** @type {import('next').NextConfig} */
const nextConfig = {
  // codivostudio-web(Astro)이 /tools/margin-calculator/ 경로로 이 앱을 프록시하므로
  // excel_merge와 동일하게 basePath를 맞춘다.
  basePath: "/tools/margin-calculator",
  // basePath 때문에 vercel.app 루트(/)는 404가 되므로, 루트 접속은 앱 경로로 보낸다.
  async redirects() {
    return [
      { source: "/", destination: "/tools/margin-calculator", basePath: false, permanent: false },
    ];
  },
};

module.exports = nextConfig;
