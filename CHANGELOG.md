# Change Log

All notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning](http://semver.org/).

## [2.2.1-ru.1] - 2026-10-28

### Changed
- Форма создания пользователя: роль «User» и «Унаследованные права» заданы явно, рядом с языком ru-RU и поясом Europe/Moscow. Добавлен тест значений по умолчанию.

## [2.2.0-ru.1] - 2026-10-18

Подключены остальные функции форка LinkPhoenix, из сборки убрано всё, что недоступно без лицензии Enterprise.

### Added
- Списки: настройка порядка и видимости столбцов (запоминается в браузере), переключатель «Только проблемы» у отчётов, дерево почтовых ящиков, подсказки и ссылки в очереди доставки.
- Журнал: сохранение наборов фильтров («Пресеты»), кнопка «Обновить» с паузой и автообновление.
- Значки «Первые шаги» и «Обзор» в боковой панели.

### Removed
- Весь интерфейс Enterprise (панель мониторинга, трассировка, арендаторы, ИИ и др.): без лицензии на сервере он не работает. Проверено: сервер отвечает «This feature is only available in the Enterprise edition».
- Понятие редакции и «замки» на закрытых пунктах меню, полях и действиях, окно «Попробовать Enterprise».
- Неиспользуемый код: значки хранилищ, формат размера, служебный токен для разработки, обёртка динамических значков Lucide, диаграммы recharts, вкладки, сквозные тесты Playwright, снимки экранов, файлы правил для ИИ-агентов, около 130 лишних экспортов.
- Пакет значков Lucide целиком: подключены только нужные 145 значков. Размер JavaScript уменьшился с 3,28 до 2,46 МБ, архив webui.zip с 1,11 до 0,85 МБ, репозиторий с 5,9 до 3,7 МБ.

## [2.1.0-ru.1] - 2026-10-18

Слияние с доработками форка [LinkPhoenix/stalwart-webui-fork](https://github.com/LinkPhoenix/stalwart-webui-fork) (версия 1.3.2), все тексты переведены на русский.

### Added
- Страница «Обзор»: карточки с количеством пользователей, групп, доменов, ролей, подписей DKIM, сертификатов TLS, очереди, отчётов и других объектов; главная страница по умолчанию.
- Страница «Первые шаги»: чек-лист для нового сервера (домен, DKIM, сертификат TLS, администратор, отчёты DMARC).
- Страница «Оформление»: светлая и тёмная тема, 7 цветовых тем, скруглённые или прямые углы, плотность списков.
- Страница «История изменений» (из CHANGELOG.md) и пункты «Оформление» и «История изменений» в меню пользователя; в верхней панели показаны имя и адрес пользователя.
- Списки: столбцы «Использование / квота» с индикатором, «Псевдонимы», «Роль» у пользователей и групп; столбцы с числом прав у ролей; столбцы сводки у отчётов DMARC, TLS и ARF с цветными метками; дополнительные столбцы у доменов, списков рассылки, слушателей, DNS-серверов, каталогов и вебхуков.
- Сортировка по столбцам, которые сервер не сортирует (загрузка всех строк с защитой от слишком больших выборок).
- Фильтры «Уровень» и «Событие» в журнале (применяются в браузере, так как сервер их не поддерживает).
- Экспорт списка в CSV, выбор числа строк на странице (25, 50, 100, 200), массовая смена квоты диска.
- Редактор скриптов Sieve с подсветкой синтаксиса.
- Показ отрицательного использования диска с подсказкой, как пересчитать квоту.
- Результаты JMAP возвращаются в порядке запроса даже при пакетной выборке.
- Модульные тесты (vitest): 76 проверок.
- Переведено на русский около 150 новых строк интерфейса и названия новых столбцов.

### Changed
- Главной страницей вместо панели мониторинга Enterprise стал «Обзор».
- Выключатели: зелёный цвет для включённых и красный для выключенных значений.
- Поля ввода и списки используют фон `bg-field`.

### Not included
- Из форка LinkPhoenix не перенесены: переработанная боковая панель и оболочка, настройка порядка и видимости столбцов, пресеты фильтров журнала и автообновление, дерево почтовых ящиков, фильтр «только проблемы» у отчётов, значки хранилищ.

## [2.0.0-ru.2] - 2026-10-18

### Fixed
- Вход: если сервер не поддерживает документы метаданных клиента OAuth (Stalwart 0.16), используется идентификатор клиента `stalwart-webui`.

Полная русская локализация.

### Changed
- Словарь схемы `src/i18n/schema-ru.json` расширен до 5716 записей: покрыто 96,2% строк (5716 из 5942), включая все разрешения, типы событий (названия и пояснения) и метрики.
- Без перевода намеренно оставлены 226 строк: названия продуктов и протоколов, алгоритмы, коды регионов (FoundationDB, Kafka, DKIM, ECDSA, us-east-1 и т. п.).

## [2.0.0-ru.1] - 2026-10-18

Русская версия (форк).

### Added
- Русская локализация интерфейса: `src/i18n/ru.json` (413 строк, русские формы множественного числа) и словарь схемы сервера `src/i18n/schema-ru.json`.
- `src/lib/localizeSchema.ts`: подмена текстов схемы, названия языков и часовых поясов через `Intl`, русские значения по умолчанию (`ru-RU`, `Europe/Moscow`).
- `scripts/extract-strings.mjs` и `docs/TRANSLATION.md` для продолжения перевода.
- Переведено около 60 % строк схемы (навигация, списки, описания объектов, все подписи полей форм, значения выпадающих списков). Пояснения к полям пока на английском.

### Removed
- Код только для Enterprise (панель мониторинга, трассировка), рекламные окна Enterprise.

### Changed
- Разделы, поля и действия, недоступные в Community, скрываются.

## [2.0.0] - 2026-XX-XX

### Added

### Changed

### Fixed

## [1.0.11] - 2026-09-15

### Added
- Sievepad integration.

### Changed

### Fixed

## [1.0.10] - 2026-09-04

### Added

### Changed

### Fixed
- Re-added map entries and object list items are seeded with their schema defaults, including a value for every non-nullable boolean.

## [1.0.9] - 2026-08-24

### Added
- Server configurable OAuth client ID.

### Changed

### Fixed

## [1.0.8] - 2026-07-31

### Added
- Remember the last visited page when switching sections (credits @LinkPhoenix).

### Changed
- Enum list filters with many options render as a searchable combobox (credits @LinkPhoenix).
- Object cells display the variant label as a badge instead of the raw type name (credits @LinkPhoenix).
- Empty date pickers open on the current date and time (credits @LinkPhoenix).

### Fixed
- Custom logos no longer flash when navigating between pages.
- Landing no longer flashes "Select a view" before redirecting to the default page.

## [1.0.7] - 2026-07-30

### Added
- `Ctrl+K` / `Cmd+K` command palette for global search (credits @LinkPhoenix).
- Calendar date picker for date and time fields (credits @LinkPhoenix).
- Dynamic document titles per page (credits @LinkPhoenix).

### Changed
- Code-split the admin shell and heavy feature pages to speed up the initial load (credits @LinkPhoenix).
- Center forms horizontally on wide screens (credits @LinkPhoenix).

### Fixed
- Redirect URLs without a view to the first accessible page of their section (credits @LinkPhoenix).
- Sidebar groups auto-open and scroll the active item into view after navigation (credits @LinkPhoenix).
- Keep the sidebar section synced with the URL on full page loads (credits @LinkPhoenix).
- Date and time fields no longer shift values by the UTC offset when editing (credits @LinkPhoenix).
- Clip the table header background inside the rounded card border (credits @LinkPhoenix).
- Keep the selected account across page reloads (#17).
- Refresh open views when switching accounts (#17).
- Custom logos no longer flash the default logo while loading.

## [1.0.6] - 2026-07-28

### Added
- WebUI version is now displayed when hovering over the logo.

### Changed

### Fixed
- Properly serialize `date` filters when applying them to the list filter.

## [1.0.5] - 2026-06-21

### Added

### Changed

### Fixed
- Redirect to `/login` when there is no refresh token.
- Include required JMAP capabilities in `using`.
- Default scopes omit `offline_access`.

## [1.0.4] - 2026-05-11

### Added

### Changed

### Fixed
- Align `base32` alphabet with the server.

## [1.0.3] - 2026-05-05

### Added

### Changed

### Fixed
- Broken "Delivery History" link on OSS/Community editions.
- Resolve object ids in map keys.

## [1.0.2] - 2026-04-30

### Added
- OIDC:
    - Include `email` and `profile` scopes in OIDC authentication requests.
- TOTP:
    - Add "Copy Secret" button to TOTP setup flow.

### Changed

### Fixed
- Display validation errors returned by the server.

## [1.0.1] - 2026-04-25

### Added
- OIDC:
    - Logout users from IdP when logging out of the app.
    - Include `openid` scope in OIDC authentication requests.

### Changed

### Fixed
- Mobile display issues.
- Editing a secret clears its masked value.
- Array label properties crashes app.

## [1.0.0] - 2026-04-20

### Added
- Initial release.

### Changed

### Fixed

