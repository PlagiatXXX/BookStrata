# Changelog

## 1.0.0 (2026-06-16)


### Features

* add NSFW detection + content flags system ([0b081f1](https://github.com/PlagiatXXX/BookStrata/commit/0b081f18ac6bb2a1ae049cb610a910337a5289eb))
* add pro subscription, custom themes, cover uploads, and fix slug pagination bugs ([fa2ebd4](https://github.com/PlagiatXXX/BookStrata/commit/fa2ebd40d0792e713ba81464cd8f876147e81f3f))
* **auth:** email verification, OAuth VK/Google, защита от фейков ([82401ba](https://github.com/PlagiatXXX/BookStrata/commit/82401bafab130ca47dcf9e8d0c0bb77e7bc41a0f))
* **auth:** implement auto-generated password reset via SMTP ([41be217](https://github.com/PlagiatXXX/BookStrata/commit/41be2174a9c9469b8cd03f551b2924e80ca91965))
* **auth:** transition to secure token-based password recovery ([e6aeb44](https://github.com/PlagiatXXX/BookStrata/commit/e6aeb44a06dd59963439e6a920657560c8bb2af8))
* **community:** enable functional search and improve search UX ([cae4005](https://github.com/PlagiatXXX/BookStrata/commit/cae4005de9c9e3fffdab8280997e36ba73ff057d))
* **export:** implement custom export themes and watermarks ([6127716](https://github.com/PlagiatXXX/BookStrata/commit/612771611b9fbb0b0010278987f15eea39de71ec))
* **fork:** implement tier list forking system and deep audit ([4044d4a](https://github.com/PlagiatXXX/BookStrata/commit/4044d4abc341256e1d4f4ea0fc3e1eb319c5abce))
* **fork:** implement tier list forking system and deep audit ([bc51e19](https://github.com/PlagiatXXX/BookStrata/commit/bc51e19afda1f0b2ca058ea6faf01a6909b1b349))
* **gamification:** implement achievement system and titles ([b970c0a](https://github.com/PlagiatXXX/BookStrata/commit/b970c0afba8fac073a32aa6e6a10c0c7773c4d85))
* implement achievement system and fix auth refresh logic ([612c7e1](https://github.com/PlagiatXXX/BookStrata/commit/612c7e15bbb92638329a558f1fba6393fd6192af))
* implement achievements pagination and sorting in profile ([9702de6](https://github.com/PlagiatXXX/BookStrata/commit/9702de663aa210d44e934bb0e3a2210923f31702))
* implement atomic manual save and draft system ([1847108](https://github.com/PlagiatXXX/BookStrata/commit/1847108fdbeefea9ee5d748f5fc4b9d905115474))
* implement atomic manual save and draft system ([f9e7c9c](https://github.com/PlagiatXXX/BookStrata/commit/f9e7c9c88c9c863df596f8d5a23f6bcaa31a077c))
* implement atomic manual save and draft system without lockfiles ([feda113](https://github.com/PlagiatXXX/BookStrata/commit/feda1132676f29b22083ad33f94ba4a1a023198f))
* implement audit-driven fixes and performance optimizations ([ae6562f](https://github.com/PlagiatXXX/BookStrata/commit/ae6562f0c59ab7e2a3f9d83ae430f77c260e85a1))
* implement battles foundation and community page gating ([5f0c4df](https://github.com/PlagiatXXX/BookStrata/commit/5f0c4df280501da4e9152cf505b780d8d1cdaebb))
* refactor achievements system and add new badges ([ead116b](https://github.com/PlagiatXXX/BookStrata/commit/ead116b92e225c329e28f940a7b073b7cd469d46))
* security-заголовки (X-Frame-Options, HSTS, CSP) + синхронизация CSP во всех источниках ([da7417a](https://github.com/PlagiatXXX/BookStrata/commit/da7417a755f0c416fcae65013543ceaf2b757e17))
* **ui:** 🎨 Palette: Enhance LikeButton Accessibility and UX ([6042751](https://github.com/PlagiatXXX/BookStrata/commit/60427515c4d169705a0e39961f96ec2f880acb1d))
* **ui:** add '/' keyboard shortcut to focus search bar ([7c692f7](https://github.com/PlagiatXXX/BookStrata/commit/7c692f7a9f9c4700e313718fcc696e87dc032577))
* video background, moderation tools, violators tab, admin stats ([ced1191](https://github.com/PlagiatXXX/BookStrata/commit/ced1191646a962afbea7f9c28844864feb92ef69))
* авто-логин после регистрации — register() возвращает токены, пользователь сразу попадает в приложение ([df75c19](https://github.com/PlagiatXXX/BookStrata/commit/df75c196c9aae1e20d4c8e7f9b3f6e4da873bf88))
* адаптивные изображения скриншотов с srcset/sizes (экономия ~400KB) ([9a9f076](https://github.com/PlagiatXXX/BookStrata/commit/9a9f076470794fffa92cad117d0dbf28f61e23eb))
* админ-скрипт сброса пароля (для ручного восстановления доступа) ([61d03c5](https://github.com/PlagiatXXX/BookStrata/commit/61d03c53d0848c2eaf0b157e92b0a4e4f49ce8a1))
* отключена верификация email — регистрация без подтверждения, восстановление пароля по почте без проверки ([7046b9c](https://github.com/PlagiatXXX/BookStrata/commit/7046b9cc755fd226af2ec77d0720fdf26054970f))
* сжатие видео (lending-hero 4.8→1.0MB, library4k 6.9→0.9MB) + ленивый Sentry (-450KB из бандла) ([a74ef67](https://github.com/PlagiatXXX/BookStrata/commit/a74ef6720b826c5f02abe8d681a44432724dca85))
* цели Метрики для ИИ-библиотекаря и аватаров ([346d42d](https://github.com/PlagiatXXX/BookStrata/commit/346d42d26fab1f4fa9972f2e0f861e19d2127844))
* цели Яндекс.Метрики (login, register, like, book_search, export_png) ([1e21431](https://github.com/PlagiatXXX/BookStrata/commit/1e21431bc9e4dc89da813b4c32b78dbd0266a778))
* цель donate_copy для Яндекс.Метрики ([b9d77e6](https://github.com/PlagiatXXX/BookStrata/commit/b9d77e66ea125d320e85672d2d0daeee761b3947))


### Bug Fixes

* avatar not updating in Header after profile change ([93e4703](https://github.com/PlagiatXXX/BookStrata/commit/93e470341477d3788a2591dbe1b51c1318ec30b4))
* **ci:** линтер не блокирует пайплайн (continue-on-error) ([b648bae](https://github.com/PlagiatXXX/BookStrata/commit/b648bae12c652d1f2c4f13229688aa6d230b7fc7))
* CMD path в Dockerfile и nginx без SSL для первого запуска ([3307b61](https://github.com/PlagiatXXX/BookStrata/commit/3307b61eae8c340e795a9bf053e340de3bfba2b7))
* **config:** отключить subject-case в commitlint для русского языка ([858e23f](https://github.com/PlagiatXXX/BookStrata/commit/858e23f0a2818539d988b2fea8a4004eb86ad48e))
* CSP wildcard, кэширование скриншотов/изобр/видео в nginx, сжатие hero-bg 311→17KB ([73b5498](https://github.com/PlagiatXXX/BookStrata/commit/73b54980e7cfc60bf69c36652233aa59f339eee6))
* CSP для Яндекс.Метрики (WebSocket, frame, yastatic) ([26c2c10](https://github.com/PlagiatXXX/BookStrata/commit/26c2c10cab2d87e8fc62ef4b7bab4710236b125a))
* deprecation warning nginx http2 ([6b967d9](https://github.com/PlagiatXXX/BookStrata/commit/6b967d9c1e7c9f4756646050971fb35de725db00))
* fix-s3-urls.ts — защита от null в url ([f15af5f](https://github.com/PlagiatXXX/BookStrata/commit/f15af5fe7624ae4e377ffa03e40eee83cbeac681))
* nginx production config with HTTPS ([7c254e5](https://github.com/PlagiatXXX/BookStrata/commit/7c254e567ba967c1d3fdfdb6af99a7c0315c0994))
* profile -&gt; profiles в docker-compose ([2a6eea0](https://github.com/PlagiatXXX/BookStrata/commit/2a6eea0483b9ae36107c71198e384796cf196692))
* **security:** prevent DOM XSS in tier list export watermark ([4dd3618](https://github.com/PlagiatXXX/BookStrata/commit/4dd361867b6470e8bbb651958f0e6124568f0ea2))
* **ui:** исправить все ошибки и предупреждения линтера (33 проблемы) ([eaf04bf](https://github.com/PlagiatXXX/BookStrata/commit/eaf04bf7742dcf8c0c7915b2a138c3cfd4dc6e47))
* Unisender API — recipients вместо to, убран body_type ([8b22326](https://github.com/PlagiatXXX/BookStrata/commit/8b2232694106217f55f8a6e36dfbf63c085902cc))
* восстановление проекта после потери данных ([b0d1f00](https://github.com/PlagiatXXX/BookStrata/commit/b0d1f0029eb0854ccc6ff098135a757ee7dbf52f))
* закрыл порты Postgres (5432) и Redis (6379) — только localhost ([d5089f4](https://github.com/PlagiatXXX/BookStrata/commit/d5089f4adb293eee2ffe06a608e26d398bed8ef0))
* замена SMTP/nodemailer на Unisender API (HTTPS, не блокируется хостингом) ([917d868](https://github.com/PlagiatXXX/BookStrata/commit/917d8686238d2df3c2cf480ffdd6d7d6f5a66dca))
* обработка ошибки зарезервированного username при регистрации (была 500) ([db106cc](https://github.com/PlagiatXXX/BookStrata/commit/db106cc9782744867be2db028d7b2b30a705f2d6))
* плейсхолдеры на странице авторизации ([f25683f](https://github.com/PlagiatXXX/BookStrata/commit/f25683fff1c7f53c23bc62b2c524ab04581903fe))
* поиск на странице новостей не сбрасывался после очистки ([3820e8e](https://github.com/PlagiatXXX/BookStrata/commit/3820e8e13f430584eb5d8538a3c9ed4af86b7113))
* убраны плейсхолдеры в форме авторизации, исправлена оранжевая линия под паролем ([2650947](https://github.com/PlagiatXXX/BookStrata/commit/265094798bcb8723ce3f591c48e7dcb2cd9c8e2e))


### Performance Improvements

* **backend:** parallelize metadata and count queries in TierListService ([070c943](https://github.com/PlagiatXXX/BookStrata/commit/070c943525756f19334a4a7b0d22c93f55f09883))
* **dashboard:** optimize re-renders with memoization and reducer guards ([68d6074](https://github.com/PlagiatXXX/BookStrata/commit/68d6074606d07ee80410e7e7a6d3cbf81e0bb7e8))
* **frontend:** optimize useTierList reducer for referential integrity ([057a169](https://github.com/PlagiatXXX/BookStrata/commit/057a16919cf3c9ba0e0ea1d92713673dc46add99))


### Reverts

* возврат на SMTP (nodemailer), удалён Unisender API ([bc919fb](https://github.com/PlagiatXXX/BookStrata/commit/bc919fb489a3697558e0061cb260538b5723720f))
