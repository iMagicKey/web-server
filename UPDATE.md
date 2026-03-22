# UPDATE — imagic-web-server

> Аудит проведён: 2026-03-22. Версия на момент аудита: 1.0.7

---

## Критические баги (исправить немедленно)

- [ ] **Устаревший модуль `querystring`** — Node.js помечает `querystring` как legacy с v16. Заменить на WHATWG `URLSearchParams`:
  ```js
  // Было:
  import querystring from 'querystring'
  const query = querystring.parse(rawQuery)
  // Стало:
  const query = Object.fromEntries(new URLSearchParams(rawQuery))
  ```

- [ ] **Route regex компилируется на каждый запрос** — `getRouteRegex()` создаёт новый `RegExp` при каждом входящем запросе для каждого маршрута. Маршруты статичны после `createRoute()`. Нужно компилировать regex один раз в `createRoute()` и кэшировать на объекте маршрута.

- [ ] **`res.json`, `res.status`, `res.redirect` создаются заново на каждый запрос** — эти хелперы определяются внутри `requestListener` при каждом запросе. Нужно вынести на прототип или определить один раз как factory-функции вне listener.

- [ ] **Статические ассеты без `Content-Type`** — `readStream.pipe(res)` стримит файл без установки заголовка `Content-Type`. Браузеры могут некорректно интерпретировать тип файла. Нужно определять MIME-тип по расширению файла.

- [ ] **Двойной парсинг URL** — `req.url.split('?')` выполняется в `requestListener`, результат сохраняется, но в `handleRequest` выполняется повторно. Второй парсинг лишний — использовать уже разобранный url.

- [ ] **3 FS-вызова для статики** — `fs.existsSync` + `fs.statSync` + `fs.createReadStream` = три отдельных обращения к файловой системе. Нужно объединить: `fs.stat` + `fs.createReadStream` в одном callback-е.

---

## package.json

- [ ] Добавить `"exports"`:
  ```json
  "exports": { ".": "./src/index.js", "./package.json": "./package.json" }
  ```
- [ ] Добавить `"files": ["src", "README.md", "LICENSE"]`
- [ ] Добавить `"sideEffects": false`
- [ ] Добавить `devDependencies` — сейчас их нет совсем:
  ```json
  "@eslint/js": "^10.0.1",
  "chai": "^5.x",
  "eslint": "^10.1.0",
  "eslint-config-prettier": "^10.1.8",
  "eslint-plugin-import": "^2.32.0",
  "eslint-plugin-n": "^17.24.0",
  "eslint-plugin-prettier": "^5.5.5",
  "eslint-plugin-promise": "^7.2.1",
  "globals": "^16.x",
  "prettier": "^3.8.1"
  ```
- [ ] Обновить `"scripts.test"`: `"node --test ./tests/**/*.test.js"`

---

## ESLint

- [ ] Создать `eslint.config.js` по стандарту (заменить текущий `.eslintrc`-файл)
- [ ] Создать `.prettierrc.json`
- [ ] Установить ESLint `^10.1.0`

---

## Тесты

Тестов нет совсем. Написать `tests/web-server.test.js`:

- [ ] Регистрация и совпадение маршрутов: точное совпадение, параметризованные, wildcard, regex
- [ ] Парсинг query string в `req.query`
- [ ] Параметры маршрута в `req.params`
- [ ] Method-specific routing: GET не совпадает с POST
- [ ] Middleware вызываются в порядке регистрации
- [ ] `next()` в middleware переходит к следующему middleware, затем к маршруту
- [ ] `res.json(data)` — `Content-Type: application/json` + правильное тело
- [ ] `res.status(404).json(data)` — правильный status code
- [ ] `res.redirect(301, '/new')` — заголовок Location + статус 301
- [ ] Статика: файл по корректному пути возвращается с правильным Content-Type
- [ ] Статика: 404 для несуществующего файла
- [ ] HTTPS сервер через self-signed сертификат
- [ ] `nextRequestHandler` вызывается когда маршрут не найден
- [ ] Route regex кэшируется — объект RegExp одинаков при повторных вызовах (после оптимизации)

---

## Улучшения API (minor bump)

- [ ] **Встроенный JSON body parser** — опция конструктора `{ bodyParser: true }` или отдельный middleware:
  ```js
  server.use(server.bodyParser({ maxSize: 1024 * 1024 }))
  // После: req.body доступен
  ```

- [ ] **Ограничение размера тела** — без `maxBodySize` злонамеренный клиент может залить память

- [ ] **CORS helper** — опция или middleware:
  ```js
  server.use(server.cors({ origins: ['https://example.com'] }))
  ```

- [ ] **Graceful shutdown** — экспортировать `close()` метод:
  ```js
  await server.close()  // ждёт завершения текущих запросов
  ```

- [ ] **Удалить маршрут** — сейчас маршруты только добавляются, нет `removeRoute(id)`

- [ ] **`nextRequestHandler` через конструктор** — сейчас это мутируемое публичное свойство. Лучше принимать через constructor options.

---

## Задачи (backlog)

- [ ] WebSocket поддержка (upgrade handler)
- [ ] Server-Sent Events (SSE) helper
- [ ] Request ID middleware (автоматический `X-Request-Id`)
- [ ] Встроенный rate limiter (перенести из `imagic-middleware` когда создадим)
- [ ] TypeScript `.d.ts`
