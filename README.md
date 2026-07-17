# AmnesiaPanel

Бесплатное desktop-приложение для управления лотами FunPay (Electron).

Без подписок, без бота и без внешнего API лицензий — только клиент на вашем ПК.

## Скачать

- **Готовый установщик:** [Releases](../../releases) → `AmnesiaPanel-Setup-….exe`
- Или соберите сами (ниже)

## Возможности

- Вход по FunPay Golden Key (хранится только локально)
- Просмотр и массовое редактирование лотов
- Шаблоны, копирование лотов, история

## Golden Key

Ключ шифруется через Electron `safeStorage` и уходит **только** на FunPay как cookie.  
Подробнее: [docs/GOLDEN_KEY_AUDIT.md](docs/GOLDEN_KEY_AUDIT.md)

## Установка из исходников

Нужны Node.js 20+ и Windows x64.

```bash
npm run setup
```

Скрипт поставит зависимости, соберёт `AmnesiaPanel.exe` и создаст ярлык на рабочем столе.

Разработка:

```bash
npm run dev
```

Установщик NSIS:

```bash
npm run dist
```

## Лицензия

MIT — можно свободно использовать. См. [LICENSE](LICENSE).
