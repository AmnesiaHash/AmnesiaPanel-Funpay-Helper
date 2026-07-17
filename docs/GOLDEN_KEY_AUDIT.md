# Аудит пути FunPay Golden Key

Куда уходит ключ в этом клиенте.

## 1. Ввод ключа

- UI: `src/renderer/pages/ConnectPage.tsx`
- IPC → `src/main/ipc/auth.ipc.ts` → `FunPayService.connect()`

## 2. Хранение на ПК

Файл: `src/main/services/key-store.service.ts`

- Шифрование через Electron `safeStorage`
- Локальная SQLite в userData
- Без сетевого вызова при сохранении

## 3. Использование

Файл: `src/main/api/funpay-client.ts`

- Cookie `golden_key` только для запросов на FunPay (`FUNPAY_BASE_URL`)

## 4. Подписки / сторонние API

В этой open-source сборке **нет** системы подписок и лицензионного API.
Golden Key никуда, кроме FunPay, не отправляется.
