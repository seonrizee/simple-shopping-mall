# 🚀 배포 가이드

간단한 쇼핑몰 프론트엔드를 다양한 플랫폼에 배포하는 방법을 안내합니다.

## 📋 배포 전 체크리스트

### 필수 체크사항
- [ ] 로컬에서 정상 동작 확인
- [ ] 반응형 디자인 테스트 완료
- [ ] 브라우저 호환성 확인
- [ ] 접근성 테스트 완료
- [ ] 성능 최적화 적용

### 선택사항
- [ ] 이미지 최적화 (WebP 변환)
- [ ] CSS/JS 압축
- [ ] Service Worker 추가 (PWA)
- [ ] CDN 설정

## 🌐 정적 호스팅 서비스 배포

### 1. Netlify 배포

#### 드래그 앤 드롭 배포 (가장 간단)
1. [Netlify](https://netlify.com) 접속
2. 프로젝트 폴더를 드래그하여 업로드
3. 자동으로 배포 완료!

#### Git 연동 배포 (권장)
```bash
# 1. Git 저장소 초기화
git init
git add .
git commit -m "Initial commit"

# 2. GitHub에 푸시
git remote add origin https://github.com/username/simple-shopping-mall
git push -u origin main

# 3. Netlify에서 Git 연동
# - New site from Git 선택
# - GitHub 저장소 연결
# - 자동 배포 설정
```

#### Netlify CLI 배포
```bash
# CLI 설치 및 로그인
npm install -g netlify-cli
netlify login

# 배포
netlify init
netlify deploy --prod
```

**Netlify 설정 파일** (`netlify.toml`):
```toml
[build]
  publish = "."
  
[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000"

[[headers]]
  for = "*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 2. Vercel 배포

#### Vercel CLI
```bash
# CLI 설치
npm install -g vercel

# 로그인 및 배포
vercel login
vercel --prod
```

#### GitHub 연동
1. [Vercel](https://vercel.com) 가입
2. "New Project" → GitHub 저장소 선택
3. 자동 배포 완료

**Vercel 설정 파일** (`vercel.json`):
```json
{
  "version": 2,
  "builds": [
    {
      "src": "**/*",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

### 3. GitHub Pages 배포

#### Settings 방법
1. GitHub 저장소 → Settings → Pages
2. Source: Deploy from a branch
3. Branch: main / (root)
4. Save

#### GitHub Actions 자동 배포
`.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm install
      
    - name: Build (if needed)
      run: npm run build
      
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: .
```

### 4. Firebase Hosting

```bash
# Firebase CLI 설치
npm install -g firebase-tools

# 로그인 및 초기화
firebase login
firebase init hosting

# 배포
firebase deploy
```

**Firebase 설정** (`firebase.json`):
```json
{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(css|js)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

## 🖥️ 전통적인 웹 서버 배포

### Apache 설정

**.htaccess 파일**:
```apache
# 캐싱 설정
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType image/webp "access plus 1 year"
</IfModule>

# GZIP 압축
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# 보안 헤더
<IfModule mod_headers.c>
    Header always set X-Frame-Options "DENY"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
```

### Nginx 설정

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/simple-shopping-mall;
    index index.html;

    # GZIP 압축
    gzip on;
    gzip_vary on;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # 캐싱 설정
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 보안 헤더
    add_header X-Frame-Options "DENY";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # SPA 라우팅 지원 (필요시)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 🔧 빌드 및 최적화

### 이미지 최적화
```bash
# ImageOptim-CLI 설치 (macOS)
npm install -g imageoptim-cli

# 이미지 최적화
imageoptim --directory images

# WebP 변환
cwebp -q 80 input.jpg -o output.webp
```

### CSS/JS 압축
```bash
# CSS 압축
npm install -g clean-css-cli
cleancss -o styles/main.min.css styles/main.css

# JS 압축 (UglifyJS)
npm install -g uglify-js
uglifyjs scripts/main.js -o scripts/main.min.js -c -m

# HTML 압축 (html-minifier)
npm install -g html-minifier
html-minifier --collapse-whitespace --remove-comments --minify-css --minify-js index.html -o index.min.html
```

## 🚀 성능 최적화

### 1. 이미지 최적화
```html
<!-- WebP 지원 브라우저용 -->
<picture>
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="상품 이미지">
</picture>

<!-- 반응형 이미지 -->
<img 
  srcset="image-400.jpg 400w, image-800.jpg 800w, image-1200.jpg 1200w"
  sizes="(max-width: 768px) 400px, (max-width: 1024px) 800px, 1200px"
  src="image-400.jpg" 
  alt="상품 이미지"
>
```

### 2. 폰트 최적화
```html
<!-- 폰트 미리 로드 -->
<link rel="preload" href="/fonts/pretendard.woff2" as="font" type="font/woff2" crossorigin>

<!-- 폰트 표시 최적화 -->
<style>
@font-face {
  font-family: 'Pretendard';
  font-display: swap;
  src: url('/fonts/pretendard.woff2') format('woff2');
}
</style>
```

### 3. Critical CSS
```html
<!-- 중요한 CSS 인라인 -->
<style>
  /* Critical CSS - above the fold 스타일만 */
  body { font-family: system-ui; }
  .header { background: white; }
</style>

<!-- 나머지 CSS 비동기 로드 -->
<link rel="preload" href="styles/main.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="styles/main.css"></noscript>
```

## 📊 배포 후 모니터링

### Google Analytics
```html
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### 성능 모니터링
```javascript
// Core Web Vitals 측정
import {getCLS, getFID, getFCP, getLCP, getTTFB} from 'web-vitals';

function sendToAnalytics(metric) {
  gtag('event', metric.name, {
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    event_category: 'Web Vitals',
    event_label: metric.id,
    non_interaction: true,
  });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### 에러 추적
```javascript
// 전역 에러 핸들링
window.addEventListener('error', (e) => {
  gtag('event', 'exception', {
    description: e.error.toString(),
    fatal: false
  });
});

window.addEventListener('unhandledrejection', (e) => {
  gtag('event', 'exception', {
    description: e.reason.toString(),
    fatal: false
  });
});
```

## 🔒 보안 고려사항

### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' https://www.googletagmanager.com;
               style-src 'self' 'unsafe-inline';
               img-src 'self' data: https:;
               font-src 'self';
               connect-src 'self';">
```

### HTTP 보안 헤더
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## 📋 배포 체크리스트

### 배포 전
- [ ] 로컬 테스트 완료
- [ ] 반응형 디자인 확인
- [ ] 접근성 테스트
- [ ] 성능 최적화
- [ ] 보안 헤더 설정
- [ ] 에러 페이지 준비
- [ ] robots.txt 생성
- [ ] sitemap.xml 생성

### 배포 후
- [ ] 실제 환경 테스트
- [ ] 성능 측정 (Lighthouse)
- [ ] 모니터링 설정
- [ ] 백업 계획 수립
- [ ] 도메인 연결 (필요시)
- [ ] SSL 인증서 설정
- [ ] 검색엔진 등록

## 💡 고급 배포 전략

### Blue-Green 배포
1. 기존 버전(Blue) 유지
2. 새 버전(Green) 배포
3. 테스트 완료 후 트래픽 전환
4. 문제 발생 시 즉시 롤백

### A/B 테스팅
```javascript
// 간단한 A/B 테스팅
const variant = Math.random() > 0.5 ? 'A' : 'B';
document.body.classList.add(`variant-${variant}`);
gtag('event', 'ab_test', { variant });
```

### CDN 활용
- 이미지, CSS, JS 파일을 CDN에 업로드
- 전세계 빠른 로딩 속도 확보
- 원본 서버 부하 감소

```html
<!-- CDN 예시 -->
<img src="https://cdn.example.com/images/product1.webp" alt="상품1">
<link rel="stylesheet" href="https://cdn.example.com/css/main.min.css">
```

---

**성공적인 배포를 위한 완전한 가이드입니다! 🎉**

*각 플랫폼의 특성에 맞는 최적화를 적용하여 최고의 사용자 경험을 제공하세요.*