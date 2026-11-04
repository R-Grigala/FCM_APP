# დეველოპერული გარემოს დაყენება

აპში ქვედა ტაბით მთავარ ეკრანსა და `პარამეტრები` ეკრანს შორის გადადით. Route-ები `src/app/(tabs)/`-შია, ხოლო პარამეტრების კომპონენტი `src/components/SettingsScreen.tsx`-ში.

## მოთხოვნები

- Node.js და npm.
- Firebase პროექტი Cloud Messaging-ისთვის.
- Expo development build. React Native Firebase იყენებს native კოდს და Expo Go-ში არ მუშაობს.

## Firebase კონფიგურაცია

1. Firebase Console-ში დაამატეთ Android აპი package ID-ით `com.fcmapp.location` და ჩამოტვირთეთ `google-services.json`.
2. iOS აპისთვის გამოიყენეთ bundle ID `com.fcmapp.location` და ჩამოტვირთეთ `GoogleService-Info.plist`.
3. განათავსეთ შესაბამისი ფაილები პროექტის root-ში. `app.config.js` მათ native build-ის კონფიგურაციაში დაამატებს, თუ ფაილები არსებობს.
4. Firebase Cloud Messaging-ში ჩართეთ თქვენი პროექტისთვის საჭირო push შეტყობინებების პარამეტრები.

ეს ფაილები შეიცავს აპის Firebase-ის საჯარო კონფიგურაციას და განკუთვნილია მობილური აპისთვის. Firebase Admin SDK-ის service account JSON ან კერძო გასაღებები აპის bundle-ში არ ჩართოთ.

## სერვერის მისამართი

`src/config.ts`-ში შეცვალეთ API-ის ძირითადი მისამართი:

```ts
export const API_BASE_URL = 'http://192.168.0.10:5000';
```

აპი ამ მისამართზე `/api/v1` მარშრუტებს უმატებს. ადგილობრივი ტესტისთვის გამოიყენეთ კომპიუტერის LAN IP და დარწმუნდით, რომ ტელეფონი იმავე ქსელშია. `localhost` ტელეფონის საკუთარ მოწყობილობას აღნიშნავს. Android Emulator-ზე host კომპიუტერის მისამართია `10.0.2.2`; ფიზიკურ მოწყობილობაზე გამოიყენეთ კომპიუტერის LAN IP.

პროდუქციულ გარემოში გამოიყენეთ HTTPS. iOS App Transport Security და Android cleartext traffic-ის შეზღუდვებმა შეიძლება უბრალო HTTP კავშირი დაბლოკოს.

## Development build

### Android

```sh
npx expo run:android
npx expo start --dev-client
```

### iOS

macOS/Xcode-ზე:

```sh
npx expo run:ios
npx expo start --dev-client
```

თუ ადგილობრივი iOS toolchain არ გაქვთ, ააგეთ EAS development build:

```sh
npx eas-cli build --profile development --platform ios
```

Native config-ის ან dependency-ის შეცვლის შემდეგ development build ხელახლა ააგეთ.

## ტესტირების ნაკადი

1. გაუშვით აპი development build-ში და გასცით ლოკაციის ნებართვა.
2. ჩართეთ ლოკაციის გაზიარება; აპი არეგისტრირებს მოწყობილობას, აგზავნის `PATCH /api/v1/location/<device_id>/`-ს და მიმდინარე კოორდინატებს `POST`-ით აგზავნის.
3. გახსენით აპი გაზიარების ჩართულ მდგომარეობაში; აპმა კოორდინატები ხელახლა უნდა მიიღოს და სერვერზე განაახლოს. მთავარი ეკრანის ღილაკითაც შეგიძლიათ ლოკაციის ხელით განახლება და გაგზავნა.
4. გამორთეთ შეტყობინებები აპში; FCM ტოკენი იშლება და push აღარ უნდა გაიგზავნოს ამ ტოკენზე.
5. ხელახლა ჩართეთ შეტყობინებები; აპი განაახლებს მოწყობილობის რეგისტრაციას ახალი FCM token-ით.
6. სერვერიდან გააგზავნეთ FCM შეტყობინება აპის ეკრანზე ნაჩვენებ ახალ მოწყობილობის ტოკენზე.

Request body-ების სრული სქემა აღწერილია [server-api.md](server-api.md)-ში.
